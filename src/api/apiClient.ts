// src/api/apiClient.ts - FINAL COMPLETE VERSION
import axios, {
	type AxiosError,
	type AxiosInstance,
	type AxiosRequestConfig,
	type AxiosResponse,
	type InternalAxiosRequestConfig,
} from "axios";
import { GLOBAL_CONFIG } from "@/global-config";
import useUserStore from "@/store/userStore";

// Create separate instances for different base URLs
const mainApiInstance = axios.create({
	baseURL: GLOBAL_CONFIG.apiBaseUrl,
	timeout: 50000,
	headers: {
		"Content-Type": "application/json;charset=utf-8",
		Accept: "application/json",
		"X-Requested-With": "XMLHttpRequest",
	},
});

const loyaltyApiInstance = axios.create({
	baseURL: GLOBAL_CONFIG.loyaltyApiBaseUrl,
	timeout: 50000,
	headers: {
		"Content-Type": "application/json;charset=utf-8",
		Accept: "application/json",
		"X-Requested-With": "XMLHttpRequest",
	},
});

// Enhanced request interceptor with better token handling
const requestInterceptor = (config: InternalAxiosRequestConfig) => {
	const token = useUserStore.getState().userToken?.accessToken;

	console.log("🔐 API Request:", {
		url: config.url,
		method: config.method,
		hasToken: !!token,
		baseURL: config.baseURL,
	});

	// Clone config to avoid mutation issues
	const newConfig = { ...config };
	newConfig.headers = newConfig.headers || {};

	// Add header to prevent browser auth dialog
	newConfig.headers["X-Requested-With"] = "XMLHttpRequest";

	if (token) {
		newConfig.headers.Authorization = `Bearer ${token}`;
	}

	return newConfig;
};

// COMPLETE RESPONSE INTERCEPTOR WITH ERROR HANDLER
const responseInterceptor = {
	success: (res: AxiosResponse) => {
		console.log(`✅ API Success: ${res.status} ${res.config.method?.toUpperCase()} ${res.config.url}`);

		// Debug logging for all responses
		console.log("🔍 Response data:", res.data);
		console.log("🔍 Response data type:", typeof res.data);

		if (res.data && typeof res.data === "object") {
			console.log("🔍 Response keys:", Object.keys(res.data));
			console.log("🔍 Response is empty?", Object.keys(res.data).length === 0);
		}

		// Remove WWW-Authenticate headers to prevent browser auth dialog
		if (res.headers) {
			delete res.headers["www-authenticate"];
			delete res.headers["WWW-Authenticate"];
		}

		// FIX: Handle empty responses for credit score endpoint
		if (res.config.url?.includes("/credit/score")) {
			console.log("🔍 Credit score endpoint detected, checking response...");

			// Check if response is empty/null
			if (!res.data || (typeof res.data === "object" && Object.keys(res.data).length === 0)) {
				console.warn("⚠️ Empty credit score response detected");

				// Try to extract merchant ID from request
				let merchantId = "unknown";
				try {
					if (res.config.data) {
						const requestData = typeof res.config.data === "string" ? JSON.parse(res.config.data) : res.config.data;
						merchantId = requestData.merchant_id || requestData.merchantId || "unknown";
					}
				} catch (e) {
					console.error("Failed to parse request data:", e);
				}

				// Return a placeholder response for empty data
				const placeholderResponse = {
					merchant_id: merchantId,
					score: 0,
					grade: "N/A",
					calculated_on: new Date().toISOString(),
					data_period: {
						from: new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(), // 30 days ago
						to: new Date().toISOString(),
					},
					breakdown: {},
					is_provisional: true,
					_isPlaceholder: true, // Flag to identify placeholder data
					message: "Credit score not yet calculated",
				};

				console.log("🔄 Returning placeholder response for merchant:", merchantId);
				return placeholderResponse;
			}
		}

		return res.data;
	},

	// COMPLETE ERROR HANDLER:
	error: (error: AxiosError) => {
		const method = error.config?.method?.toUpperCase() || "REQUEST";
		const url = error.config?.url || "unknown endpoint";
		const status = error.response?.status;

		console.error(`❌ API Error: ${method} ${url}`, {
			status: status,
			data: error.response?.data,
			message: error.message,
		});

		// Remove WWW-Authenticate headers to prevent browser auth dialog
		if (error.response?.headers) {
			delete error.response.headers["www-authenticate"];
			delete error.response.headers["WWW-Authenticate"];
		}

		// Handle specific HTTP status codes
		if (status === 401) {
			console.log("🔐 Unauthorized - clearing user store");
			useUserStore.getState().actions.clearUserInfoAndToken();

			// Only redirect if not already on login page
			if (!window.location.pathname.includes("/login")) {
				window.location.href = "/login";
			}

			return Promise.reject(new Error("Session expired. Please login again."));
		}

		if (status === 403) {
			console.warn("⛔ Forbidden access to resource");
			return Promise.reject(new Error("You don't have permission to access this resource."));
		}

		if (status === 404) {
			console.warn("🔍 Resource not found");
			return Promise.reject(new Error("The requested resource was not found."));
		}

		if (status === 400) {
			console.warn("⚠️ Bad request");
			// Extract validation errors if available
			const data = error.response?.data as any;
			if (data?.errors) {
				const errorMessages = Object.values(data.errors).flat().join(", ");
				return Promise.reject(new Error(`Validation error: ${errorMessages}`));
			}
		}

		if (status === 500) {
			console.error("💥 Server error occurred");
			return Promise.reject(new Error("Server error. Please try again later."));
		}

		// Extract error message from response
		let errorMessage = "An unexpected error occurred";

		if (error.response?.data) {
			const data = error.response.data as any;
			if (data.message) {
				errorMessage = data.message;
			} else if (data.error) {
				errorMessage = data.error;
			} else if (data.detail) {
				errorMessage = data.detail;
			} else if (typeof data === "string") {
				errorMessage = data;
			} else if (Array.isArray(data)) {
				errorMessage = data.join(", ");
			}
		}

		// For network errors
		if (error.message === "Network Error") {
			errorMessage = "Network error. Please check your internet connection.";
		}

		// For timeout errors
		if (error.code === "ECONNABORTED") {
			errorMessage = "Request timeout. Please try again.";
		}

		// Reject with a proper error
		return Promise.reject(new Error(errorMessage));
	},
};

// Apply interceptors
mainApiInstance.interceptors.request.use(requestInterceptor);
loyaltyApiInstance.interceptors.request.use(requestInterceptor);

mainApiInstance.interceptors.response.use(responseInterceptor.success, responseInterceptor.error);
loyaltyApiInstance.interceptors.response.use(responseInterceptor.success, responseInterceptor.error);

class APIClient {
	private instance: AxiosInstance;

	constructor(instance: AxiosInstance) {
		this.instance = instance;
	}

	get<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "GET" });
	}

	post<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "POST" });
	}

	put<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "PUT" });
	}

	delete<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.request<T>({ ...config, method: "DELETE" });
	}

	request<T = unknown>(config: AxiosRequestConfig): Promise<T> {
		return this.instance.request<any, T>(config);
	}
}

// Export both API clients
export const mainApiClient = new APIClient(mainApiInstance);
export const loyaltyApiClient = new APIClient(loyaltyApiInstance);

// Default export for backward compatibility (uses main API)
export default mainApiClient;
