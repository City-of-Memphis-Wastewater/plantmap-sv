// src/lib/plot/types.ts

export interface PlotOptions {
	tags: string[];
	start?: string;
	end?: string;
	days?: number;
	datapointCount?: number;
	secondsBetweenPoints?: number;
	functionType?: string;
}

export interface ResolvedPlotRequest {
	tags: string[];
	startSeconds: number;
	endSeconds: number;
	secondsBetweenPoints: number;
	functionType: string;
}
