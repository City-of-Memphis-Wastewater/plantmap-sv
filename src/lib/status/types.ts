export interface Status {
	protocolVersion: number;

	application: {
		name: string;
		version: string;
	};

	runtime: {
		environment: 'development' | 'production';
		pid: number;
		uptimeSeconds: number;
	};

	server: {
		status: 'ready';
		startedAt: string;
	};

}
