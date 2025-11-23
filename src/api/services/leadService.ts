// src/api/services/leadService.ts - NEW FILE
import { loyaltyApiClient } from "../apiClient";

export interface LeadDto {
	name: string;
	gender: string;
	locality: string;
	phoneNumber: string;
	customerType: "BUSINESS" | "PERSONAL";
	collectedBy: string;
}

export interface Lead {
	customerId: number;
	phoneNumber: string;
	name: string;
	gender: string;
	locality: string;
	customerType: "BUSINESS" | "PERSONAL";
	collectedBy: string;
	createdAt: string;
	lead: boolean;
}

export interface ApiResponse<T = any> {
	status: string;
	message: string;
	respObject?: T;
}

const createOrUpdateLead = (data: LeadDto) =>
	loyaltyApiClient.post<ApiResponse>({
		url: "/leads/add",
		data,
	});

const listLeadsByDate = (startDate: string, endDate: string) =>
	loyaltyApiClient.get<ApiResponse<Lead[]>>({
		url: "/leads",
		params: { start: startDate, end: endDate },
	});

export default {
	createOrUpdateLead,
	listLeadsByDate,
};
