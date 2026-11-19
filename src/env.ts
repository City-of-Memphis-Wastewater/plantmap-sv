import { defineEnvVars } from '@sveltejs/kit/env';

export const variables = defineEnvVars({
  OVATION_EDS_ENDPOINT: {},
  OVATION_EDS_SUFFIX: {},
  OVATION_EDS_TIMEOUT_MS: {}
});

