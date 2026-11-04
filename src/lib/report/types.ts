import type { DownloadFormat } from '../download/context.ts';

/**
 * Configuration for an automated PlantMap report.
 */
export interface ReportInputJson {
    name?: string;
    recipients: string[];
    subject?: string;
    body?: string;
    downloads: ReportDownloadCall[];
}

/**
 * One download operation within a report.
 */
export interface ReportDownloadCall {
    tagsFile: string;
    days?: number;
    formats?: DownloadFormat[];
    secondsBetweenPoints?: number;
}
