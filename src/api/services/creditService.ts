// src/api/services/creditService.ts - COMPLETE FIXED VERSION
import { loyaltyApiClient } from "@/api/apiClient";

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
	_isPlaceholder?: boolean; // Optional flag for placeholder data
	message?: string; // Optional message
}

export const creditService = {
	getCreditScore: async (merchantId: string): Promise<CreditScoreResponse> => {
		const request: CreditScoreRequest = {
			merchant_id: merchantId,
			merchantId: merchantId,
		};

		console.log("📡 Making FRESH credit score request for merchant:", merchantId);

		try {
			const response = await loyaltyApiClient.post<CreditScoreResponse>({
				url: "/credit/score",
				data: request,
				headers: {
					"Cache-Control": "no-cache",
					Pragma: "no-cache",
				},
			});

			// Enhanced response validation
			console.log("🔍 Credit score response received:", {
				response,
				type: typeof response,
				isObject: response && typeof response === "object",
				keys: response ? Object.keys(response) : "null",
				hasScore: response && "score" in response,
			});

			// Validate the response structure
			if (!response || typeof response !== "object") {
				console.error("❌ Invalid response type:", typeof response);
				throw new Error("Invalid API response format");
			}

			// Check if it's a placeholder response from the interceptor
			if (response._isPlaceholder) {
				console.log("ℹ️ Using placeholder credit score data");
				return response;
			}

			// Validate required fields
			if (response.score === undefined || response.score === null) {
				console.warn("⚠️ Credit score missing 'score' field, using placeholder");
				return {
					...response,
					score: 0,
					grade: "N/A",
					is_provisional: true,
					_isPlaceholder: true,
					message: "Score data not available",
				};
			}

			console.log("✅ Credit score API success:", response);
			return response;
		} catch (error: any) {
			console.error("❌ Credit score API failed:", error);
			console.error("❌ Error status:", error.response?.status);
			console.error("❌ Error data:", error.response?.data);

			if (error.response?.status === 304) {
				console.log("🔄 304 Received - Retrying with cache busting...");
				return await creditService.getCreditScoreNoCache(merchantId);
			}

			// Return a placeholder on error for merchants
			console.log("🔄 Returning fallback data due to error");
			return {
				merchant_id: merchantId,
				score: 0,
				grade: "N/A",
				calculated_on: new Date().toISOString(),
				data_period: {
					from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(),
					to: new Date().toISOString(),
				},
				breakdown: {},
				is_provisional: true,
				_isPlaceholder: true,
				message: error.message || "Unable to fetch credit score",
			};
		}
	},

	getCreditScoreNoCache: async (merchantId: string): Promise<CreditScoreResponse> => {
		const request: CreditScoreRequest = {
			merchant_id: merchantId,
			merchantId: merchantId,
		};

		console.log("📡 Making NO-CACHE credit score request");

		const response = await loyaltyApiClient.post<CreditScoreResponse>({
			url: "/credit/score",
			data: request,
			headers: {
				"Cache-Control": "no-cache, no-store, must-revalidate",
				Pragma: "no-cache",
				Expires: "0",
			},
			params: {
				_: Date.now(),
			},
		});

		return response;
	},
};

export default creditService;
