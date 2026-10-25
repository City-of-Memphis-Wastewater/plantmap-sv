// src/lib/download-tabular/types.ts

/**
 * Supported download formats.
 */
export const FILE_TYPES = ['xlsx', 'csv', 'json', 'png'] as const;

/**
 * Valid download format.
 */
export type FileType = (typeof FILE_TYPES)[number];

/**
 * Options accepted by the download endpoint.
 */
export interface DownloadOptions {
    format: FileType;
}
