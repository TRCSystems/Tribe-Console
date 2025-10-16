// src/api/services/merchantService.ts
import { loyaltyApiClient } from "../apiClient";

export interface Merchant {
	id: string;
	businessName: string;
	location: string;
	tillNumber: string;
	businessType: string;
	createdAt: string;
	updatedAt: string;
}

export interface CreateMerchantRequest {
	businessName: string;
	location: string;
	tillNumber: string;
	businessType: string;
}

const createMerchant = (data: CreateMerchantRequest) =>
	loyaltyApiClient.post<Merchant>({ url: "/merchants/createMerchant", data });

const getMerchants = () => loyaltyApiClient.get<Merchant[]>({ url: "/merchants" });

const getMerchantById = (id: string) => loyaltyApiClient.get<Merchant>({ url: `/merchants/${id}` });

export default {
	createMerchant,
	getMerchants,
	getMerchantById,
};
