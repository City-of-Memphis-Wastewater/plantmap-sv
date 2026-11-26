import os from 'node:os';
import path from 'node:path';

export const PLANTMAP_HOME = path.join(os.homedir(), '.plantmap-sv');

export const DEFAULT_EXPORT_DIR = path.join(
    PLANTMAP_HOME,
    'export'
);

export const PLOT_DIAGNOSTIC_DIR = path.join(
    PLANTMAP_HOME,
    'plot-diagnostic'
);

export const DOWNLOAD_API_PATH = '/api/download';

export const SUPPORTED_DOWNLOAD_FORMATS = ['csv', 'json', 'svg'] as const;

export type DownloadFormat = (typeof SUPPORTED_DOWNLOAD_FORMATS)[number];

export const DEFAULT_DOWNLOAD_FORMAT = 'csv';

