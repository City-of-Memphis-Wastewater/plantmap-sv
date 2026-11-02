export const DOWNLOAD_API_PATH = '/api/download';

export const SUPPORTED_DOWNLOAD_FORMATS = ['csv', 'json', 'svg'] as const;

export type DownloadFormat = (typeof SUPPORTED_DOWNLOAD_FORMATS)[number];

export const DEFAULT_DOWNLOAD_FORMAT = 'csv'
