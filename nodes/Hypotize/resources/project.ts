import type { INodeProperties } from 'n8n-workflow';
import { getManyFields, projectLocator } from '../shared/descriptions';

const showFor = (operation: string[]) => ({ resource: ['project'], operation });

export const projectDescription: INodeProperties[] = [
	{
		displayName: 'Operation',
		name: 'operation',
		type: 'options',
		noDataExpression: true,
		displayOptions: { show: { resource: ['project'] } },
		options: [
			{
				name: 'Get',
				value: 'get',
				action: 'Get a project',
				description: 'Get one project with its framework, settings and your role',
				routing: {
					request: { method: 'GET', url: '=/projects/{{ $parameter.projectId }}' },
				},
			},
			{
				name: 'Get Many',
				value: 'getAll',
				action: 'Get many projects',
				description: 'Get the projects you can access, with your role',
				routing: {
					request: { method: 'GET', url: '/projects' },
					output: { postReceive: [{ type: 'rootProperty', properties: { property: 'items' } }] },
				},
			},
		],
		default: 'getAll',
	},
	{ ...projectLocator, displayOptions: { show: showFor(['get']) } },
	...getManyFields(showFor(['getAll'])),
];
