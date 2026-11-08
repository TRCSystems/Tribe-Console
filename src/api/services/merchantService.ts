// src/api/services/merchantService.ts - FINAL CORRECTED VERSION
import { loyaltyApiClient } from "../apiClient";

export interface Merchant {
	id: number;
	businessName: string;
	businessType: string;
	location: string;
	tillNumber: string;
	businessPhone: string;
	merchantOtp?: string;
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

export interface CreateMerchantRequest {
	businessName: string;
	businessType: string;
	location: string;
	tillNumber: string;
	businessPhone: string;
}

export interface ApiResponse<T = any> {
	status: string;
	message: string;
	respObject?: T;
}

const createMerchant = (data: CreateMerchantRequest) =>
	loyaltyApiClient.post<ApiResponse>({
		url: "/merchants/createMerchant",
		data: {
			...data,
			// Set default values for optional fields
			merchantOtp: "",
			metaConnected: false,
			metaSyncEnabled: false,
		},
	});

const getMerchants = () =>
	loyaltyApiClient
		.get<Merchant[]>({
			url: "/merchants",
		})
		.then((response) => {
			console.log("🛠️ Merchants API raw response:", response);

			// Handle different response structures
			let merchants: Merchant[] = [];
			// The backend has returned several shapes over time; read it loosely.
			const raw = response as any;

			if (Array.isArray(raw)) {
				merchants = raw;
			} else if (raw?.respObject && Array.isArray(raw.respObject)) {
				merchants = raw.respObject;
			} else if (raw && typeof raw === "object") {
				const arrays = Object.values(raw).filter((val) => Array.isArray(val)) as Merchant[][];
				if (arrays.length > 0) {
					merchants = arrays[0];
				} else if (raw.id || raw.businessName) {
					merchants = [raw];
				}
			}

			console.log(`✅ Extracted ${merchants.length} merchants`);
			return merchants;
		})
		.catch((error) => {
			console.error("❌ Merchants API error:", error);
			throw error;
		});

const getMerchantById = (id: string) =>
	loyaltyApiClient.get<Merchant>({
		url: `/merchants/${id}`,
	});

const getMerchantByTill = (tillNumber: string) =>
	loyaltyApiClient.get<Merchant>({
		url: `/merchants/till/${tillNumber}`,
	});

const updateMerchant = (id: string, data: Partial<Merchant>) =>
	loyaltyApiClient.put<Merchant>({
		url: `/merchants/${id}`,
		data,
	});

const deleteMerchant = (id: string) =>
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
