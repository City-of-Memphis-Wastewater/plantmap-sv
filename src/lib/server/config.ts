import { z } from 'zod';
import { env } from '$env/dynamic/private';

const EnvSchema = z.object({
	OVATION_EDS_ENDPOINT: z.string().url().default('https://000.00.0.000:00000'),
	OVATION_EDS_SUFFIX: z.string().default('.UNIT0@NET0'),
	OVATION_EDS_TIMEOUT_MS: z.coerce.number().default(5000)
});

export const envConfig = EnvSchema.parse(env);
