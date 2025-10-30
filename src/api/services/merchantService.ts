// src/api/services/merchantService.ts - UPDATED WITH DELETE
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

export interface UpdateMerchantRequest {
	businessName: string;
	location: string;
	tillNumber: string;
	businessType: string;
}

const createMerchant = (data: CreateMerchantRequest) =>
	loyaltyApiClient.post<Merchant>({ url: "/merchants/createMerchant", data });

const getMerchants = () => loyaltyApiClient.get<Merchant[]>({ url: "/merchants" });

const getMerchantById = (id: string) => loyaltyApiClient.get<Merchant>({ url: `/merchants/${id}` });

const updateMerchant = (id: string, data: UpdateMerchantRequest) =>
	loyaltyApiClient.put<Merchant>({ url: `/merchants/${id}`, data });

const deleteMerchant = (id: string) => loyaltyApiClient.delete<void>({ url: `/merchants/${id}` });

export default {
	createMerchant,
	getMerchants,
	getMerchantById,
	updateMerchant,
	deleteMerchant, // ← ADD THIS
};
