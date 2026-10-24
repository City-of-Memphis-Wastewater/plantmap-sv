// src/lib/database/types.ts

export interface DatabasePayload {
    sensorId: string;
    timestamp: number;
    value: number | null;
    quality: string | null;
}

export interface DatabaseStatus {
    ready: boolean;
    path: string;
    error?: string;
}

export interface WriteConfirmation {
    sensorId: string;
    timestamp: number;
    written: boolean;
    error?: string;
}
