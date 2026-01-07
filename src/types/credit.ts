// src/types/credit.ts
export interface CreditScoreRequest {
	merchant_id: string;
	merchantId?: string;
}

export interface DataPeriod {
	from: string;
	to: string;
}

export interface CreditScoreResponse {
	merchant_id: string;
	score: number;
	grade: string;
	calculated_on: string;
	data_period: DataPeriod;
	breakdown: Record<string, any>;
	is_provisional: boolean;
}

export interface ScoreRange {
	min: number;
	max: number;
	grade: string;
	color: string;
	label: string;
}
