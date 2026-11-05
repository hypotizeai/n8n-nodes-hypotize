import type { INodeProperties } from 'n8n-workflow';
import {
	FINAL_STATUS_OPTIONS,
	FRAMEWORK_OPTIONS,
	FUNNEL_OPTIONS,
	RESULT_OPTIONS,
	STATUS_OPTIONS,
	TRANSITION_OPTIONS,
} from '../shared/constants';
import {
	expectedUpdatedAtOption,
	experimentIdField,
	getManyFields,
	idempotencyKeyOption,
	projectLocator,
} from '../shared/descriptions';
import { fillExpectedUpdatedAt, SPLIT_LIST, TO_ISO } from '../shared/utils';

const showFor = (operation: string[]) => ({ resource: ['experiment'], operation });

const body = (property: string, value?: string) => ({
	send: { type: 'body' as const, property, ...(value ? { value } : {}) },
});

/* Text fields shared by Create Idea and Update. */
const textFields: INodeProperties[] = [
	{
		displayName: 'Baseline Value',
		name: 'baselineValue',
		type: 'string',
		default: '',
		description: 'Where the metric stands today, e.g. 2.1% trial to paid',
		routing: body('baseline_value'),
	},
	{
		displayName: 'Description',
		name: 'description',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		routing: body('description'),
	},
	{
		displayName: 'Fail Criterion',
		name: 'failCriterion',
		type: 'string',
		default: '',
		description: 'The result that means the idea did not work',
		routing: body('fail_criterion'),
	},
	{
		displayName: 'Hypothesis',
		name: 'hypothesis',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		placeholder: 'If we..., then..., because...',
		routing: body('hypothesis'),
	},
	{
		displayName: 'Success Metric',
		name: 'successMetric',
		type: 'string',
		default: '',
		description: 'The result that means the idea worked',
		routing: body('success_metric'),
	},
	{
		displayName: 'Tags',
		name: 'tags',
		type: 'string',
		default: '',
		description: 'Comma-separated tag names',
		routing: body('tags', SPLIT_LIST),
	},
	{
		displayName: 'Target Metric',
		name: 'targetMetric',
		type: 'string',
		default: '',
		description: 'The metric the experiment should move',
		routing: body('target_metric'),
	},
	{
		displayName: 'Target Segment',
		name: 'targetSegment',
		type: 'string',
		default: '',
		description: 'Who sees the change',
		routing: body('target_segment'),
	},
];

const dateFields: INodeProperties[] = [
	{
		displayName: 'Due Date',
		name: 'dueDate',
		type: 'dateTime',
		default: '',
		routing: body('due_date', TO_ISO),
	},
	{
		displayName: 'Start Date',
		name: 'startDate',
		type: 'dateTime',
		default: '',
		routing: body('start_date', TO_ISO),
	},
];

const sorted = (fields: INodeProperties[]): INodeProperties[] =>
	[...fields].sort((a, b) => a.displayName.localeCompare(b.displayName));

export const experimentDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['experiment'] } },
		options: [
			{
				name: 'Create Idea',
				value: 'createIdea',
				action: 'Create an idea',
				description: 'Add an idea to the project backlog. It starts in the Idea status.',
				routing: {
					request: { method: 'POST', url: '=/projects/{{ $parameter.projectId }}/ideas' },
				},
			},
			{
				name: 'Get',
				value: 'get',
				action: 'Get an experiment',
				description: 'Get one experiment with its scores, variants, outcome and comments',
				routing: {
					request: { method: 'GET', url: '=/experiments/{{ $parameter.experimentId }}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many experiments',
				description: 'Get the ideas and tests of a project, most recently updated first',
				routing: {
					request: {
						method: 'GET',
						url: '=/projects/{{ $parameter.projectId }}/experiments',
						arrayFormat: 'repeat',
					},
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'items' } }] },
				},
			},
			{
				name: 'Import',
				value: 'import',
				action: 'Import experiments',
				description:
					'Import up to 50 existing experiments at any stage. One invalid row rolls back the whole batch.',
				routing: {
					request: {
						method: 'POST',
						url: '=/projects/{{ $parameter.projectId }}/experiments/import',
					},
				},
			},
			{
				name: 'Move to Stage',
				value: 'transition',
				action: 'Move an experiment to a stage',
				description: 'Move the experiment to another pipeline stage, such as Running',
				routing: {
					request: {
						method: 'POST',
						url: '=/experiments/{{ $parameter.experimentId }}/transition',
					},
					send: { preSend: [fillExpectedUpdatedAt] },
				},
			},
			{
				name: 'Record Outcome',
				value: 'recordOutcome',
				action: 'Record the outcome of an experiment',
				description:
					'Record the result, what happened and the learning. Set Final Status to also close the test.',
				routing: {
					request: {
						method: 'POST',
						url: '=/experiments/{{ $parameter.experimentId }}/outcome',
					},
					send: { preSend: [fillExpectedUpdatedAt] },
				},
			},
			{
				name: 'Update',
				value: 'update',
				action: 'Update an experiment',
				description: 'Change the hypothesis, metrics, dates and other fields',
				routing: {
					request: { method: 'PATCH', url: '=/experiments/{{ $parameter.experimentId }}' },
					send: { preSend: [fillExpectedUpdatedAt] },
				},
			},
		],
		default: 'createIdea',
	},

	{
		...projectLocator,
		displayOptions: { show: showFor(['createIdea', 'getAll', 'import']) },
	},
	{
		...experimentIdField,
		displayOptions: { show: showFor(['get', 'update', 'transition', 'recordOutcome']) },
	},

	// Create Idea
	{
		displayName: 'Title',
		name: 'title',
		type: 'string',
		default: '',
		required: true,
		displayOptions: { show: showFor(['createIdea']) },
		description: 'A short name for the idea, up to 240 characters',
		routing: body('title'),
	},
	{
		displayName: 'Short Idea',
		name: 'shortIdea',
		type: 'string',
		typeOptions: { rows: 2 },
		default: '',
		required: true,
		displayOptions: { show: showFor(['createIdea']) },
		description: 'The idea in one or two sentences',
		routing: body('short_idea'),
	},
	{
		displayName: 'Funnel Stage',
		name: 'funnel',
		type: 'options',
		options: FUNNEL_OPTIONS,
		default: 'Acquisition',
		required: true,
		displayOptions: { show: showFor(['createIdea']) },
		description: 'The funnel stage the idea works on',
		routing: body('funnel'),
	},
	{
		displayName: 'Additional Fields',
		name: 'additionalFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showFor(['createIdea']) },
		options: sorted([
			...textFields,
			...dateFields,
			{
				displayName: 'Framework',
				name: 'framework',
				type: 'options',
				options: FRAMEWORK_OPTIONS,
				default: 'ICE',
				description: 'The scoring framework. Default: the project framework.',
				routing: body('framework'),
			},
		]),
	},

	// Get Many
	...getManyFields(showFor(['getAll'])),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show: showFor(['getAll']) },
		options: [
			{
				displayName: 'Funnel Stages',
				name: 'funnel',
				type: 'multiOptions',
				options: FUNNEL_OPTIONS,
				default: [],
				routing: { send: { type: 'query', property: 'funnel' } },
			},
			{
				displayName: 'Statuses',
				name: 'statuses',
				type: 'multiOptions',
				options: STATUS_OPTIONS,
				default: [],
				routing: { send: { type: 'query', property: 'statuses' } },
			},
			{
				displayName: 'Tags',
				name: 'tags',
				type: 'string',
				default: '',
				description: 'Comma-separated tag names. Experiments with all of these tags match.',
				routing: { send: { type: 'query', property: 'tags', value: SPLIT_LIST } },
			},
			{
				displayName: 'Updated After',
				name: 'updatedAfter',
				type: 'dateTime',
				default: '',
				description: 'Only experiments changed after this time',
				routing: { send: { type: 'query', property: 'updated_after', value: TO_ISO } },
			},
		],
	},

	// Import
	{
		displayName: 'Experiments (JSON)',
		name: 'experiments',
		type: 'json',
		default:
			'[\n  {\n    "title": "",\n    "short_idea": "",\n    "funnel": "Acquisition",\n    "status": "Idea"\n  }\n]',
		required: true,
		displayOptions: { show: showFor(['import']) },
		description:
			'An array of up to 50 experiments. Each one takes the fields of Create Idea plus status, result and outcome fields. See the OpenAPI document for the full schema.',
		routing: {
			send: {
				type: 'body',
				property: 'experiments',
				value: '={{ typeof $value === "string" ? JSON.parse($value) : $value }}',
			},
		},
	},

	// Update
	{
		displayName: 'Update Fields',
		name: 'updateFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showFor(['update']) },
		options: sorted([
			...textFields.map((field) =>
				field.name === 'tags'
					? { ...field, description: 'Comma-separated tag names. They replace the current tags.' }
					: field,
			),
			...dateFields,
			{
				displayName: 'Funnel Stage',
				name: 'funnel',
				type: 'options',
				options: FUNNEL_OPTIONS,
				default: 'Acquisition',
				routing: body('funnel'),
			},
			{
				displayName: 'Short Idea',
				name: 'shortIdea',
				type: 'string',
				default: '',
				routing: body('short_idea'),
			},
			{
				displayName: 'Title',
				name: 'title',
				type: 'string',
				default: '',
				routing: body('title'),
			},
		]),
	},

	// Move to Stage
	{
		displayName: 'Stage',
		name: 'toStatus',
		type: 'options',
		options: TRANSITION_OPTIONS,
		default: 'Running',
		required: true,
		displayOptions: { show: showFor(['transition']) },
		description:
			'The stage to move the experiment to. The lifecycle rules apply: for example, a test cannot close without an outcome.',
		routing: body('to_status'),
	},

	// Record Outcome
	{
		displayName: 'Result',
		name: 'result',
		type: 'options',
		options: RESULT_OPTIONS,
		default: 'Win',
		required: true,
		displayOptions: { show: showFor(['recordOutcome']) },
		routing: body('result'),
	},
	{
		displayName: 'What Happened',
		name: 'actualResult',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		required: true,
		displayOptions: { show: showFor(['recordOutcome']) },
		description: 'The measured result, e.g. trial to paid went from 2.1% to 2.6%',
		routing: body('actual_result'),
	},
	{
		displayName: 'Learning',
		name: 'learningSummary',
		type: 'string',
		typeOptions: { rows: 3 },
		default: '',
		required: true,
		displayOptions: { show: showFor(['recordOutcome']) },
		description: 'What the team learned, in a sentence or two',
		routing: body('learning_summary'),
	},
	{
		displayName: 'Additional Fields',
		name: 'outcomeFields',
		type: 'collection',
		placeholder: 'Add Field',
		default: {},
		displayOptions: { show: showFor(['recordOutcome']) },
		options: [
			{
				displayName: 'Ended At',
				name: 'endedAt',
				type: 'dateTime',
				default: '',
				description: 'When the test ended. Left unchanged if empty.',
				routing: body('ended_at', TO_ISO),
			},
			{
				displayName: 'Evidence Links',
				name: 'evidenceLinks',
				type: 'string',
				default: '',
				description: 'Comma-separated links to dashboards, reports or screenshots',
				routing: body('evidence_links', SPLIT_LIST),
			},
			{
				displayName: 'Final Status',
				name: 'finalStatus',
				type: 'options',
				options: FINAL_STATUS_OPTIONS,
				default: 'Learned',
				description:
					'The closed stage to move the test to, e.g. Winning for a Win. Without it the experiment stays in its current stage.',
				routing: body('final_status'),
			},
			{
				displayName: 'Next Steps',
				name: 'nextSteps',
				type: 'string',
				default: '',
				routing: body('next_steps'),
			},
			{
				displayName: 'Winner Variant',
				name: 'winnerVariant',
				type: 'string',
				default: '',
				description: 'The key of the winning variant, e.g. B',
				routing: body('winner_variant'),
			},
		],
	},

	// Options shared by the writes
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showFor(['update', 'transition', 'recordOutcome']) },
		options: [expectedUpdatedAtOption, idempotencyKeyOption],
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show: showFor(['createIdea', 'import']) },
		options: [idempotencyKeyOption],
	},
];
