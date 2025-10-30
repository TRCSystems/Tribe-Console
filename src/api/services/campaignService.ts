// src/api/services/campaignService.ts - UPDATED WITH DELETE
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

export interface UpdateCampaignRequest {
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

const updateCampaign = (id: string, data: UpdateCampaignRequest) =>
	loyaltyApiClient.put<Campaign>({ url: `/campaigns/${id}`, data });

const deleteCampaign = (id: string) => loyaltyApiClient.delete<void>({ url: `/campaigns/${id}` });

export default {
	createCampaign,
	getCampaigns,
	getCampaignById,
	updateCampaign,
	deleteCampaign, // ← ADD THIS
};
