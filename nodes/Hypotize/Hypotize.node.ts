import { NodeConnectionTypes, type INodeType, type INodeTypeDescription } from 'n8n-workflow';
import { getProjects } from './listSearch';
import { commentDescription } from './resources/comment';
import { experimentDescription } from './resources/experiment';
import { learningDescription } from './resources/learning';
import { projectDescription } from './resources/project';
import { BASE_URL } from './shared/constants';
import { withApiErrors } from './shared/utils';

export class Hypotize implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'Hypotize',
		name: 'hypotize',
		icon: { light: 'file:../../icons/hypotize.svg', dark: 'file:../../icons/hypotize.dark.svg' },
		group: ['transform'],
		version: 1,
		subtitle: '={{ $parameter["operation"] + ": " + $parameter["resource"] }}',
		description: 'Read and write growth experiments, ideas and learnings in Hypotize',
		defaults: {
			name: 'Hypotize',
		},
		usableAsTool: true,
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'hypotizeApi',
				required: true,
			},
		],
		requestDefaults: {
			baseURL: BASE_URL,
			// Errors are thrown by throwOnApiError with the API code and message.
			ignoreHttpStatusErrors: true,
			headers: {
				Accept: 'application/json',
				'Content-Type': 'application/json',
			},
		},
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{ name: 'Comment', value: 'comment' },
					{ name: 'Experiment', value: 'experiment' },
					{ name: 'Learning', value: 'learning' },
					{ name: 'Project', value: 'project' },
				],
				default: 'experiment',
			},
			...withApiErrors([
				...experimentDescription,
				...learningDescription,
				...commentDescription,
				...projectDescription,
			]),
		],
	};

	methods = {
		listSearch: {
			getProjects,
		},
	};
}
