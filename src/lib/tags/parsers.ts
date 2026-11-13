export interface ResolveTagsOptions {
    values?: string[];
    files?: string[];
    cwd?: string;
    detectFiles?: boolean;
}

export async function resolveTags({
    values = [],
    files = [],
    cwd = process.cwd(),
    detectFiles = false
}: ResolveTagsOptions): Promise<string[]> {
    // One implementation:
    // 1. Read explicitly supplied files.
    // 2. If detectFiles, inspect values for readable files.
    // 3. Normalize, remove comments, uppercase, deduplicate.
}
