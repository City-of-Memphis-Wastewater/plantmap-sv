// request.ts
interface ResolvedPlotRequest {
	tags: string[];
	startSeconds: number;
	endSeconds: number;
	//datapointCount: number;
	secondsBetweenPoints: number;
	functionType: string;
}
