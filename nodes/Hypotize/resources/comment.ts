import type { INodeProperties } from 'n8n-workflow';
import { experimentIdField, idempotencyKeyOption } from '../shared/descriptions';

const show = { resource: ['comment'], operation: ['create'] };

export const commentDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['comment'] } },
		options: [
			{
				name: 'Create',
				value: 'create',
				action: 'Add a comment to an experiment',
				description: 'Add a dated comment. It does not change the experiment updated_at.',
				routing: {
					request: {
						method: 'POST',
						url: '=/experiments/{{ $parameter.experimentId }}/comments',
					},
				},
			},
		],
		default: 'create',
	},
	{ ...experimentIdField, displayOptions: { show } },
	{
		displayName: 'Content',
		name: 'content',
		type: 'string',
		typeOptions: { rows: 4 },
		default: '',
		required: true,
		displayOptions: { show },
		description: 'The comment text, up to 10,000 characters',
		routing: { send: { type: 'body', property: 'content' } },
	},
	{
		displayName: 'Options',
		name: 'options',
		type: 'collection',
		placeholder: 'Add Option',
		default: {},
		displayOptions: { show },
		options: [idempotencyKeyOption],
	},
];
