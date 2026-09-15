/** Immutable, public summary captured when a report is generated. */
export interface ReportTemplateSnapshot {
	generatedAt: string;
	rangeStart: string | null;
	rangeEnd: string | null;
	collected: number;
	analysed: number;
	mentioned: number;
	pending: number;
	providers: {
		name: string;
		collected: number;
		analysed: number;
		mentioned: number;
		pending: number;
	}[];
	questions: {
		prompt: string;
		collected: number;
		analysed: number;
		mentioned: number;
	}[];
	competitors: { name: string; count: number }[];
	sourceCount: number;
	uniqueSourceUrls: number;
	sourceDomains: number;
	registeredDomainSources: number;
	sources: { domain: string; count: number }[];
	evidence: {
		ref: string;
		model: string;
		prompt: string;
		time: string;
		text: string;
	}[];
	records: {
		ref: string;
		model: string;
		prompt: string;
		time: string;
		status: "mentioned" | "not_mentioned" | "pending";
		sources: number;
	}[];
}
