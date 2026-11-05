import type { IDataObject, INodeProperties } from 'n8n-workflow';

export const projectLocator: INodeProperties = {
	displayName: 'Project',
	name: 'projectId',
	type: 'resourceLocator',
	default: { mode: 'list', value: '' },
	required: true,
	description: 'The Hypotize project',
	modes: [
		{
			displayName: 'From List',
			name: 'list',
			type: 'list',
			placeholder: 'Select a project...',
			typeOptions: {
				searchListMethod: 'getProjects',
				searchable: true,
			},
		},
		{
			displayName: 'ID',
			name: 'id',
			type: 'string',
			placeholder: 'e.g. 457d9c6c-44f8-4a44-a25d-27f2b6327328',
		},
	],
};

export const experimentIdField: INodeProperties = {
	displayName: 'Experiment ID',
	name: 'experimentId',
	type: 'string',
	default: '',
	required: true,
	placeholder: 'e.g. 45888114-a93a-4670-83ff-062a01deacf3',
	description:
		'The ID of the experiment. An idea is an experiment in the Idea status, so its ID works here too.',
};

export const expectedUpdatedAtOption: INodeProperties = {
	displayName: 'Expected Updated At',
	name: 'expectedUpdatedAt',
	type: 'string',
	default: '',
	placeholder: 'e.g. 2026-11-05T10:00:00.000Z',
	description:
		'The updated_at you last read. If someone changed the experiment since then, the call fails with STALE_EXPERIMENT instead of overwriting their change. Leave empty to use the current version.',
	routing: { send: { type: 'body', property: 'expected_updated_at' } },
};

export const idempotencyKeyOption: INodeProperties = {
	displayName: 'Idempotency Key',
	name: 'idempotencyKey',
	type: 'string',
	default: '',
	placeholder: 'e.g. order-1042-idea',
	description:
		'8 to 200 characters. A retry with the same key and the same data within 24 hours returns the first response and writes nothing new. On Update, Move to Stage and Record Outcome, also set Expected Updated At: if it is empty, a retry reads the newer updated_at, the data differs and the call fails with IDEMPOTENCY_KEY_REUSED.',
	routing: { request: { headers: { 'Idempotency-Key': '={{ $value }}' } } },
};

/* Cursor pagination shared by every "Get Many": items + next_cursor. */
export function getManyFields(
	show: { resource: string[]; operation: string[] },
	maxLimit = 100,
): INodeProperties[] {
	return [
		{
			displayName: 'Return All',
			name: 'returnAll',
			type: 'boolean',
			displayOptions: { show },
			default: false,
			description: 'Whether to return all results or only up to a given limit',
			routing: {
				send: { paginate: '={{ $value }}', type: 'query', property: 'limit', value: '100' },
				operations: {
					pagination: {
						type: 'generic',
						properties: {
							continue: '={{ !!$response.body?.next_cursor }}',
							// n8n merges this over every request shallowly, the first one included
							// ($response is empty then): keep limit and filters, add the cursor when there is one.
							request: {
								// An expression that resolves to the whole query object at run time.
								qs: '={{ Object.assign({}, $request.qs, $response.body?.next_cursor ? { cursor: $response.body.next_cursor } : {}) }}' as unknown as IDataObject,
							},
						},
					},
				},
			},
		},
		{
			displayName: 'Limit',
			name: 'limit',
			type: 'number',
			displayOptions: { show: { ...show, returnAll: [false] } },
			typeOptions: { minValue: 1, maxValue: maxLimit },
			default: 50,
			description: 'Max number of results to return',
			routing: {
				send: { type: 'query', property: 'limit' },
				output: { maxResults: '={{ $value }}' },
			},
		},
	];
}
