import type {
	IDataObject,
	ILoadOptionsFunctions,
	INodeListSearchItems,
	INodeListSearchResult,
} from 'n8n-workflow';
import { hypotizeApiRequest } from './shared/transport';

/* The API has no project search: read a page and filter by name here. */
export async function getProjects(
	this: ILoadOptionsFunctions,
	filter?: string,
	paginationToken?: string,
): Promise<INodeListSearchResult> {
	const response = await hypotizeApiRequest.call(this, 'GET', '/projects', {
		limit: 100,
		...(paginationToken ? { cursor: paginationToken } : {}),
	});
	const needle = (filter ?? '').toLowerCase();
	const results: INodeListSearchItems[] = ((response.items ?? []) as IDataObject[])
		.filter((project) =>
			String(project.name ?? '')
				.toLowerCase()
				.includes(needle),
		)
		.map((project) => ({
			name: `${project.name as string}${project.workspace_name ? ` (${project.workspace_name as string})` : ''}`,
			value: project.id as string,
		}));
	return {
		results,
		paginationToken: (response.next_cursor as string | null) ?? undefined,
	};
}
