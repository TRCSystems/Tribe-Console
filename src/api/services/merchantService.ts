// src/api/services/merchantService.ts - FIXED TO MATCH API
import { loyaltyApiClient } from "../apiClient";

export interface Merchant {
	id: number;
	businessName: string;
	location: string;
	tillNumber: string;
	businessType: string;
	createdAt: string;
	metaConnected?: boolean;
	facebookPageId?: string;
	facebookPageToken?: string;
	facebookUserToken?: string;
	instagramBusinessAccountId?: string;
	metaCatalogId?: string;
	metaCommerceMerchantSettingsId?: string;
	metaTokenExpiresAt?: string;
	metaSyncEnabled?: boolean;
	metaLastSyncAt?: string;
	metaSyncError?: string;
}

export interface ApiResponse<T = any> {
	status: string;
	message: string;
	respObject?: T;
}

// Enhanced merchants API with better error handling
const createMerchant = (data: Omit<Merchant, "id" | "createdAt">) =>
	loyaltyApiClient.post<ApiResponse>({
		url: "/merchants/createMerchant",
		data,
	});

const getMerchants = () =>
	loyaltyApiClient
		.get<any>({
			url: "/merchants",
		})
		.then((response) => {
			console.log("🛠️ Merchants API raw response:", response);

			// Handle different response formats more robustly
			if (Array.isArray(response)) {
				console.log("🛠️ Merchants: Direct array response");
				return response;
			} else if (response?.respObject && Array.isArray(response.respObject)) {
				console.log("🛠️ Merchants: Array in respObject");
				return response.respObject;
			} else if (response?.data && Array.isArray(response.data)) {
				console.log("🛠️ Merchants: Array in data");
				return response.data;
			} else if (response && typeof response === "object") {
				// If it's an object but not the expected structure, try to extract any array
				const possibleArrays = Object.values(response).filter((val) => Array.isArray(val));
				if (possibleArrays.length > 0) {
					console.log("🛠️ Merchants: Found array in object values");
					return possibleArrays[0];
				}
			}

			console.warn("🛠️ Merchants API returned unexpected format, returning empty array:", response);
			return [];
		})
		.catch((error) => {
			console.error("🛠️ Merchants API error:", error);
			return []; // Return empty array on error to prevent crashes
		});

const getMerchantById = (id: number) =>
	loyaltyApiClient.get<Merchant>({
		url: `/merchants/${id}`,
	});

const getMerchantByTill = (tillNumber: string) =>
	loyaltyApiClient.get<Merchant>({
		url: `/merchants/till/${tillNumber}`,
	});

const updateMerchant = (id: number, data: Merchant) =>
	loyaltyApiClient.put<Merchant>({
		url: `/merchants/${id}`,
		data,
	});

const deleteMerchant = (id: number) =>
	loyaltyApiClient.delete<void>({
		url: `/merchants/${id}`,
	});

export default {
	createMerchant,
	getMerchants,
	getMerchantById,
	getMerchantByTill,
	updateMerchant,
	deleteMerchant,
};
