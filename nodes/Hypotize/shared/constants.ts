import type { INodePropertyOptions } from 'n8n-workflow';

export const BASE_URL = 'https://api.hypotize.ai/v1';

const option = (value: string): INodePropertyOptions => ({ name: value, value });

// Testing and Analysis are legacy names of Running and Analyzing: the API still accepts them.
export const STATUS_OPTIONS = [
	'Idea',
	'Approved',
	'Ready',
	'Running',
	'Analyzing',
	'Winning',
	'Failed',
	'Inconclusive',
	'Learned',
	'Archived',
].map(option);

export const TRANSITION_OPTIONS = STATUS_OPTIONS.filter((status) => status.value !== 'Idea');

export const FINAL_STATUS_OPTIONS = ['Winning', 'Failed', 'Inconclusive', 'Learned'].map(option);

export const FUNNEL_OPTIONS = [
	'Awareness',
	'Acquisition',
	'Activation',
	'Revenue',
	'Retention',
	'Referral',
].map(option);

export const RESULT_OPTIONS = ['Win', 'Lose', 'Neutral'].map(option);

export const FRAMEWORK_OPTIONS = ['ICE', 'PIE', 'RICE'].map(option);
