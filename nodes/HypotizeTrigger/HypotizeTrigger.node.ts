import {
	NodeApiError,
	NodeConnectionTypes,
	type IDataObject,
	type INodeExecutionData,
	type INodeType,
	type INodeTypeDescription,
	type IPollFunctions,
	type JsonObject,
} from 'n8n-workflow';
import { getProjects } from '../Hypotize/listSearch';
import { STATUS_OPTIONS } from '../Hypotize/shared/constants';
import { projectLocator } from '../Hypotize/shared/descriptions';
import { hypotizeApiRequest } from '../Hypotize/shared/transport';

type Event = 'experimentUpdated' | 'experimentStageChanged' | 'learningUpdated';

interface PollState {
	project?: string;
	event?: Event;
	// When the trigger was activated: older experiments seen for the first time are not new.
	activatedAt?: string;
	// Newest updated_at already handled, and the keys handled at exactly that time:
	// the API returns ms-precision timestamps, so the boundary row can come back.
	cursor?: string;
	seenAtCursor?: string[];
	// A scan cut short by the page or time budget resumes here on the next poll,
	// so no change between the cursor and the end of the scan is lost.
	pending?: { page: string; newest?: string; atNewest: string[] };
	// Last stage seen for each experiment, for "Experiment Moved to a Stage".
	// stagesTrimmed: the map dropped old entries, so an unknown experiment may not be new.
	stages?: Record<string, string>;
	stagesTrimmed?: boolean;
	// Fingerprint of each learning, so a change that leaves the learning as it was emits nothing.
	learnings?: Record<string, string>;
}

const PAGE_SIZE = 100;
const MAX_PAGES = 20;
const MAX_TRACKED = 10000;

export class HypotizeTrigger implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hypotize Trigger',
		name: 'hypotizeTrigger',
		icon: { light: 'file:../../icons/hypotize.svg', dark: 'file:../../icons/hypotize.dark.svg' },
		group: ['trigger'],
		version: 1,
		subtitle: '={{ $parameter["event"] }}',
		description: 'Starts the workflow when experiments or learnings change in Hypotize',
		defaults: {
			name: 'Hypotize Trigger',
		},
		polling: true,
		inputs: [],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'hypotizeApi',
				required: true,
			},
		],
		properties: [
			{
				displayName: 'Trigger On',
				name: 'event',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Experiment Created or Updated',
						value: 'experimentUpdated',
						description: 'A new idea, or any change to an experiment',
					},
					{
						name: 'Experiment Moved to a Stage',
						value: 'experimentStageChanged',
						description: 'An experiment enters a pipeline stage, for example Running or Winning',
					},
					{
						name: 'Learning Recorded or Updated',
						value: 'learningUpdated',
						description: 'An outcome and learning is recorded or changed on a closed experiment',
					},
				],
				default: 'experimentStageChanged',
			},
			projectLocator,
			{
				displayName: 'Stages',
				name: 'statuses',
				type: 'multiOptions',
				options: STATUS_OPTIONS,
				default: [],
				displayOptions: { show: { event: ['experimentUpdated', 'experimentStageChanged'] } },
				description: 'Only experiments in these stages. Leave empty for all stages.',
			},
		],
	};

	methods = {
		listSearch: {
			getProjects,
		},
	};

	async poll(this: IPollFunctions): Promise<INodeExecutionData[][] | null> {
		const event = this.getNodeParameter('event') as Event;
		const projectId = this.getNodeParameter('projectId', '', { extractValue: true }) as string;
		const statuses = (this.getNodeParameter('statuses', []) as string[]).filter(Boolean);
		const path =
			event === 'learningUpdated'
				? `/projects/${encodeURIComponent(projectId)}/learnings`
				: `/projects/${encodeURIComponent(projectId)}/experiments`;
		const idOf = (row: IDataObject) =>
			String(event === 'learningUpdated' ? row.experiment_id : row.id);
		const keyOf = (row: IDataObject) => `${idOf(row)}|${String(row.updated_at)}`;

		try {
			// Manual test: show the latest row so the user can map fields.
			if (this.getMode() === 'manual') {
				const page = await hypotizeApiRequest.call(this, 'GET', path, { limit: 1 });
				const rows = (page.items ?? []) as IDataObject[];
				return rows.length ? [this.helpers.returnJsonArray(rows)] : null;
			}

			const state = this.getWorkflowStaticData('node') as PollState;
			// A different project or event, or a state this version cannot read, starts from scratch.
			if (
				state.project !== projectId ||
				state.event !== event ||
				(state.cursor !== undefined && !isTimestamp(state.cursor))
			) {
				for (const key of Object.keys(state)) delete (state as IDataObject)[key];
				state.project = projectId;
				state.event = event;
			}
			state.activatedAt ??= new Date().toISOString();
			const baseline = !state.cursor;

			const scan = await readPages.call(this, path, event, {
				since: state.cursor,
				statuses,
				startPage: state.pending?.page,
				// Baselines only need the newest page, except "Moved to a Stage",
				// which needs every experiment's current stage.
				onePage: baseline && event !== 'experimentStageChanged',
			});

			// The newest change of this scan: the first row of its first page.
			const first = state.pending ?? {
				newest: scan.rows.length ? String(scan.rows[0].updated_at) : undefined,
				atNewest: [] as string[],
			};
			if (!state.pending && first.newest) {
				first.atNewest = scan.rows
					.filter((row) => String(row.updated_at) === first.newest)
					.map(keyOf);
			}

			const seen = new Set(state.seenAtCursor ?? []);
			const fresh = scan.rows.filter((row) => !seen.has(keyOf(row)));
			let emit: IDataObject[] = [];

			if (event === 'experimentStageChanged') {
				const stages = state.stages ?? {};
				for (const row of fresh) {
					const id = idOf(row);
					const before = stages[id];
					let moved = before !== String(row.status);
					// The full baseline knows every experiment, so an unknown one is new. Once the map
					// has dropped old entries, only one created after activation is: the others fell
					// out of the map and their stage did not change.
					if (!baseline && before === undefined && state.stagesTrimmed) {
						const { experiment } = await hypotizeApiRequest.call(
							this,
							'GET',
							`/experiments/${encodeURIComponent(id)}`,
						);
						moved = String((experiment as IDataObject)?.created_at ?? '') >= state.activatedAt;
					}
					if (!baseline && moved) emit.push(row);
					delete stages[id];
					stages[id] = String(row.status);
				}
				state.stagesTrimmed ||= Object.keys(stages).length > MAX_TRACKED;
				state.stages = keepNewest(stages);
			} else if (event === 'learningUpdated') {
				const learnings = state.learnings ?? {};
				for (const row of fresh) {
					const id = idOf(row);
					const print = fingerprint(row);
					if (!baseline && learnings[id] !== print) emit.push(row);
					delete learnings[id];
					learnings[id] = print;
				}
				state.learnings = keepNewest(learnings);
			} else if (!baseline) {
				emit = fresh;
			}
			if (statuses.length && event !== 'learningUpdated') {
				emit = emit.filter((row) => statuses.includes(String(row.status)));
			}

			if (scan.nextPage) {
				state.pending = { page: scan.nextPage, newest: first.newest, atNewest: first.atNewest };
			} else {
				delete state.pending;
				if (first.newest && (!state.cursor || first.newest > state.cursor)) {
					state.cursor = first.newest;
					state.seenAtCursor = first.atNewest;
				} else if (first.newest && first.newest === state.cursor) {
					state.seenAtCursor = [...new Set([...seen, ...first.atNewest])];
				}
				// An empty project: start from now.
				state.cursor ??= state.activatedAt;
			}

			if (!emit.length) return null;
			// Oldest first, so the workflow handles changes in the order they happened.
			emit.sort((a, b) => String(a.updated_at).localeCompare(String(b.updated_at)));
			return [this.helpers.returnJsonArray(emit)];
		} catch (error) {
			throw new NodeApiError(this.getNode(), error as JsonObject);
		}
	}
}

const isTimestamp = (value: unknown): value is string =>
	typeof value === 'string' && !Number.isNaN(Date.parse(value));

// Everything but updated_at: a change that leaves the learning as it was (a tag, say) is not a new learning.
function fingerprint(row: IDataObject): string {
	const rest = { ...row };
	delete rest.updated_at;
	const text = JSON.stringify(rest);
	let hash = 5381;
	for (let index = 0; index < text.length; index++) {
		hash = ((hash << 5) + hash + text.charCodeAt(index)) | 0;
	}
	return `${text.length}:${hash >>> 0}`;
}

// Keys are re-inserted on every sighting, so the oldest entries are the least recently changed.
function keepNewest(map: Record<string, string>): Record<string, string> {
	const keys = Object.keys(map);
	if (keys.length <= MAX_TRACKED) return map;
	return Object.fromEntries(keys.slice(keys.length - MAX_TRACKED).map((key) => [key, map[key]]));
}

/* Reads the rows changed at or after `since`, newest first, page by page.
   Experiments: the API filters with updated_after (strictly after), so the query starts
   1 ms earlier and the caller dedupes the boundary. Learnings have no such filter,
   so pages are read until a row older than `since` shows up.
   Stops after MAX_PAGES pages or most of the poll's time budget and returns where to resume. */
async function readPages(
	this: IPollFunctions,
	path: string,
	event: Event,
	options: { since?: string; statuses: string[]; startPage?: string; onePage: boolean },
): Promise<{ rows: IDataObject[]; nextPage?: string }> {
	const { since, statuses, onePage } = options;
	const rows: IDataObject[] = [];
	const startedAt = Date.now();
	const budget = typeof this.getPollBudgetMs === 'function' ? this.getPollBudgetMs() * 0.8 : 60_000;
	let page = options.startPage;

	for (let count = 0; count < MAX_PAGES; count++) {
		const qs: IDataObject = { limit: PAGE_SIZE };
		if (page) qs.cursor = page;
		if (since && event !== 'learningUpdated') {
			qs.updated_after = new Date(Date.parse(since) - 1).toISOString();
		}
		// Stage filtering happens in poll() for "Moved to a Stage": an experiment leaving
		// a watched stage still has to update the stage map.
		if (event === 'experimentUpdated' && statuses.length) qs.statuses = statuses;

		const response = await hypotizeApiRequest.call(this, 'GET', path, qs);
		const items = (response.items ?? []) as IDataObject[];
		let done = false;
		for (const item of items) {
			// Rows without a timestamp sort last and can never be ordered against the cursor.
			if (!isTimestamp(item.updated_at)) {
				done = true;
				break;
			}
			if (since && String(item.updated_at) < since) {
				done = true;
				break;
			}
			rows.push(item);
		}

		page = (response.next_cursor as string | null) ?? undefined;
		if (!page || done || onePage) return { rows };
		if (Date.now() - startedAt > budget) break;
	}
	return { rows, nextPage: page };
}
