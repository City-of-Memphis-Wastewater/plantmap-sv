import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
	OVATION_EDS_ENDPOINT: {
		schema: (value) => value
	},
	OVATION_EDS_SUFFIX: {
		schema: (value) => value
	},
	OVATION_EDS_TIMEOUT_MS: {
		schema: (value) => value
	}
});
