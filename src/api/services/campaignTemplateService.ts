// src/api/services/campaignTemplateService.ts
import { loyaltyApiClient } from "../apiClient";

export interface CampaignTemplate {
	id: string;
	name: string;
	category: string;
	tags: string[];
	content: string;
	description: string;
}

const getCampaignTemplates = () => loyaltyApiClient.get<CampaignTemplate[]>({ url: "/campaign-templates" });

const searchTemplatesByTag = (tag: string) =>
	loyaltyApiClient.get<CampaignTemplate[]>({
		url: "/campaign-templates/search",
		params: { tag },
	});

const searchTemplatesByCategory = (category: string) =>
	loyaltyApiClient.get<CampaignTemplate[]>({
		url: "/campaign-templates/search",
		params: { category },
	});

export default {
	getCampaignTemplates,
	searchTemplatesByTag,
	searchTemplatesByCategory,
};
