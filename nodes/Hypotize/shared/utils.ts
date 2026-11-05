import {
	NodeApiError,
	type IDataObject,
	type IExecuteSingleFunctions,
	type IHttpRequestOptions,
	type IN8nHttpFullResponse,
	type INodeExecutionData,
	type INodeProperties,
	type JsonObject,
	type PostReceiveAction,
} from 'n8n-workflow';
import { hypotizeApiRequest } from './transport';

// "a, b,c" or one per line -> ["a", "b", "c"]
export const SPLIT_LIST = `={{ String($value).split(/[\\n,]/).map((item) => item.trim()).filter((item) => item.length > 0) }}`;

// Any date the picker or an expression gives -> ISO 8601 with offset, as the API requires.
// Empty or null stays null, which clears the date on an update (new Date(null) would be 1970).
export const TO_ISO = '={{ $value ? new Date($value).toISOString() : null }}';

/* Updates, stage moves and outcomes need the experiment's current updated_at.
   When the user leaves it empty, read the experiment first: one extra call, no 409 on a fresh read. */
export async function fillExpectedUpdatedAt(
	this: IExecuteSingleFunctions,
	requestOptions: IHttpRequestOptions,
): Promise<IHttpRequestOptions> {
	const body = (requestOptions.body ?? {}) as IDataObject;
	if (typeof body.expected_updated_at === 'string' && body.expected_updated_at !== '') {
		return requestOptions;
	}
	const experimentId = this.getNodeParameter('experimentId') as string;
	const response = await hypotizeApiRequest.call(
		this,
		'GET',
		`/experiments/${encodeURIComponent(experimentId)}`,
	);
	const experiment = (response.experiment ?? {}) as IDataObject;
	requestOptions.body = { ...body, expected_updated_at: experiment.updated_at };
	return requestOptions;
}

/* Without this, n8n replaces a 4xx with a generic "request is invalid" text.
   The API error code (STALE_EXPERIMENT, EXPERIMENT_NOT_READY...) is what tells the user what to fix. */
export async function throwOnApiError(
	this: IExecuteSingleFunctions,
	items: INodeExecutionData[],
	response: IN8nHttpFullResponse,
): Promise<INodeExecutionData[]> {
	if (response.statusCode < 400) return items;
	const error = ((response.body as IDataObject | undefined)?.error ?? {}) as IDataObject;
	const code = typeof error.code === 'string' ? error.code : `HTTP_${response.statusCode}`;
	const message = typeof error.message === 'string' ? error.message : 'Hypotize API error';
	const details = Object.fromEntries(
		Object.entries(error).filter(([key]) => key !== 'code' && key !== 'message'),
	);
	throw new NodeApiError(this.getNode(), error as JsonObject, {
		message: `${code}: ${message}`,
		description: Object.keys(details).length ? JSON.stringify(details) : undefined,
		httpCode: String(response.statusCode),
	});
}

/* Puts throwOnApiError first in every operation, so it runs before rootProperty. */
export function withApiErrors(properties: INodeProperties[]): INodeProperties[] {
	return properties.map((property) => {
		if (property.name !== 'operation' || !property.options) return property;
		return {
			...property,
			options: property.options.map((option) => {
				if (!('routing' in option) || !option.routing) return option;
				const postReceive = (option.routing.output?.postReceive ?? []) as PostReceiveAction[];
				return {
					...option,
					routing: {
						...option.routing,
						output: { ...option.routing.output, postReceive: [throwOnApiError, ...postReceive] },
					},
				};
			}),
		};
	});
}
