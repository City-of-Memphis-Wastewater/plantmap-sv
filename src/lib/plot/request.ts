// request.ts
interface ResolvedPlotRequest {
	tags: string[];
	startSeconds: number;
	endSeconds: number;
	windowSeconds: number;
	datapointCount: number;
	stepSeconds: number;
	functionType: string;
}
