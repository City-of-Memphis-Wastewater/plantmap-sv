// src/lib/plot/context.ts

/**
 * Shared configuration for historical telemetry plots.
 *
 * Keep defaults and input constraints here so the CLI, page,
 * URL parser, and API apply the same rules.
 */

// General defaults
export const DEFAULT_TAGS = ['M100FI'];
export const DEFAULT_DAYS = 2;
export const DEFAULT_DATAPOINT_COUNT = 400;
export const DEFAULT_SECONDS_BETWEEN_POINTS = 60;
export const DEFAULT_FUNCTION_TYPE = 'VALUE';

// Input limits
export const MAX_TAGS = 25;
export const MAX_DAYS = 365;
export const MAX_DATAPOINT_COUNT = 1_000_000;
export const MAX_SECONDS_BETWEEN_POINTS = 86_400;

// Time units
export const SECONDS_PER_DAY = 86_400;

// Supported sampling intervals, in seconds
export const NICE_SAMPLING_INTERVALS = [
	1, 2, 5, 10, 15, 30, 60, 120, 300, 600, 900, 1800, 3600, 7200, 14_400, 28_800, 86_400
] as const;

// Aggregation function validation
export const VALID_FUNCTION_TYPE = /^[A-Z][A-Z0-9_]{0,19}$/;

export const SUPPORTED_FUNCTION_TYPES = ['AVG', 'VALUE'] as const;

// API and page paths
export const PLOT_PAGE_PATH = '/plot';
export const PLOT_API_PATH = '/api/plot';
