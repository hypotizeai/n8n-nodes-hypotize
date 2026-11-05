import type { INodeProperties } from 'n8n-workflow';
import { RESULT_OPTIONS, STATUS_OPTIONS } from '../shared/constants';
import { getManyFields, projectLocator } from '../shared/descriptions';
import { TO_ISO } from '../shared/utils';

const show = { resource: ['learning'], operation: ['getAll'] };

export const learningDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['learning'] } },
		options: [
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many learnings',
				description:
					'Get the results and learnings of closed experiments, most recently updated first',
				routing: {
					request: {
						method: 'GET',
						url: '=/projects/{{ $parameter.projectId }}/learnings',
						arrayFormat: 'repeat',
					},
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'items' } }] },
				},
			},
		],
		default: 'getAll',
	},
	{ ...projectLocator, displayOptions: { show } },
	...getManyFields(show),
	{
		displayName: 'Filters',
		name: 'filters',
		type: 'collection',
		placeholder: 'Add Filter',
		default: {},
		displayOptions: { show },
		options: [
			{
				displayName: 'Ended After',
				name: 'endedAfter',
				type: 'dateTime',
				default: '',
				description:
					'Only experiments that ended after this time. Experiments without an end date are left out.',
				routing: { send: { type: 'query', property: 'ended_after', value: TO_ISO } },
			},
			{
				displayName: 'Results',
				name: 'results',
				type: 'multiOptions',
				options: RESULT_OPTIONS,
				default: [],
				description: 'Only these results',
				routing: { send: { type: 'query', property: 'results' } },
			},
			{
				displayName: 'Statuses',
				name: 'statuses',
				type: 'multiOptions',
				options: STATUS_OPTIONS,
				default: ['Winning', 'Failed', 'Inconclusive', 'Learned'],
				description: 'Only experiments in these statuses. Default: the four closed statuses.',
				routing: { send: { type: 'query', property: 'statuses' } },
			},
		],
	},
];
