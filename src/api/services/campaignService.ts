// src/api/services/campaignService.ts
import { loyaltyApiClient } from "../apiClient";

export interface CampaignMessage {
	message: string;
}

export interface Campaign {
	id: string;
	campaignName: string;
	campaignType: string;
	targetAudience: string;
	startDate: string;
	endDate: string;
	messages: CampaignMessage[];
	createdAt: string;
	updatedAt: string;
}

export interface CreateCampaignRequest {
	campaignName: string;
	campaignType: string;
	targetAudience: string;
	startDate: string;
	endDate: string;
	messages: CampaignMessage[];
}

const createCampaign = (data: CreateCampaignRequest) =>
	loyaltyApiClient.post<Campaign>({ url: "/campaigns/createCampaign", data });

const getCampaigns = () => loyaltyApiClient.get<Campaign[]>({ url: "/campaigns" });

const getCampaignById = (id: string) => loyaltyApiClient.get<Campaign>({ url: `/campaigns/${id}` });

export default {
	createCampaign,
	getCampaigns,
	getCampaignById,
};
