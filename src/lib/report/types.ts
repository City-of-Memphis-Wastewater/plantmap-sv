import type { DownloadFormat } from '../download/context.ts';
import type { SendEmailResult } from '../email/types.ts';

export interface ReportInputJson {
    name?: string;
    recipients: string[];
    subject?: string;
    body?: string;
    outputDir?: string;
    downloads: ReportDownloadCall[];
}

export interface ReportDownloadCall {
    tags?: string[];
    tagsFiles?: string[];
    days?: number;
    formats?: DownloadFormat[];
    secondsBetweenPoints?: number;
}

export interface ReportResult {
    name: string;
    attachments: string[];
    email?: SendEmailResult;
}
