import type {
	IDataObject,
	IExecuteSingleFunctions,
	IHttpRequestMethods,
	ILoadOptionsFunctions,
	IPollFunctions,
} from 'n8n-workflow';
import { BASE_URL } from './constants';

export async function hypotizeApiRequest(
	this: IExecuteSingleFunctions | ILoadOptionsFunctions | IPollFunctions,
	method: IHttpRequestMethods,
	path: string,
	qs: IDataObject = {},
): Promise<IDataObject> {
	return (await this.helpers.httpRequestWithAuthentication.call(this, 'hypotizeApi', {
		method,
		baseURL: BASE_URL,
		url: path,
		qs,
		arrayFormat: 'repeat',
		headers: { Accept: 'application/json' },
		json: true,
	})) as IDataObject;
}
