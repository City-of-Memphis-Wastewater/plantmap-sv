// src/lib/plot/types.ts

export interface TimeRangeInput {
	start?: string;
	end?: string;
	windowDays?: number;
}

export interface ResolvedTimeRange {
	startSeconds: number;
	endSeconds: number;
	windowSeconds: number;
}

export interface SamplingInput {
	datapointCount?: number;
	secondsBetweenPoints?: number;
}

export interface ResolvedSampling {
	secondsBetweenPoints: number;
}

export interface AllTimeInputs extends TimeRangeInput, SamplingInput {}

export interface ResolvedTimeAspects extends ResolvedTimeRange, ResolvedSampling {}

export interface PlotOptions extends AllTimeInputs {
	tags: string[];
	functionType?: string;
}

export interface ResolvedPlotRequest extends ResolvedTimeAspects {
	tags: string[];
	functionType: string;
}
