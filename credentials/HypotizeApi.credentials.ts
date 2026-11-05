import type {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class HypotizeApi implements ICredentialType {
	name = 'hypotizeApi';

	displayName = 'Hypotize API';

	icon: Icon = { light: 'file:../icons/hypotize.svg', dark: 'file:../icons/hypotize.dark.svg' };

	documentationUrl = 'https://hypotize.ai/developers?utm_source=n8n&utm_medium=integration';

	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: { password: true },
			required: true,
			default: '',
			placeholder: 'hyp_...',
			description:
				'Create a key in Hypotize, Settings, API keys. Choose Read and write to create and update experiments.',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				Authorization: '=Bearer {{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://api.hypotize.ai/v1',
			url: '/projects',
			qs: { limit: 1 },
			method: 'GET',
		},
	};
}
