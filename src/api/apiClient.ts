// src/api/apiClient.ts - FIXED USING YOUR GLOBAL CONFIG
import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { toast } from "sonner";
import type { Result } from "#/api";
import { ResultStatus } from "#/enum";
import { GLOBAL_CONFIG } from "@/global-config";
import { t } from "@/locales/i18n";
import useUserStore from "@/store/userStore";

// Create separate instances for different base URLs - USING YOUR EXISTING CONFIG
const mainApiInstance = axios.create({
	baseURL: GLOBAL_CONFIG.apiBaseUrl,
	timeout: 50000,
	headers: {
		"Content-Type": "application/json;charset=utf-8",
		Accept: "application/json",
		"X-Requested-With": "XMLHttpRequest",
	},
});

// FIXED: Use your existing loyaltyApiBaseUrl from global config
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
const requestInterceptor = (config: AxiosRequestConfig) => {
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

// Enhanced response interceptor to handle API responses properly
const responseInterceptor = {
	success: (res: AxiosResponse) => {
		console.log(`✅ API Success: ${res.status} ${res.config.method?.toUpperCase()} ${res.config.url}`);

		// Remove WWW-Authenticate headers to prevent browser auth dialog
		if (res.headers) {
			delete res.headers["www-authenticate"];
			delete res.headers["WWW-Authenticate"];
		}

		return res.data;
	},
	error: (error: AxiosError) => {
		// Handle cancellation differently
		if (axios.isCancel(error)) {
			return Promise.reject(error);
		}

		const { response, config } = error || {};

		console.group(`❌ API Error: ${response?.status} ${config?.method?.toUpperCase()} ${config?.url}`);
		console.log("Status:", response?.status);
		console.log("Error message:", error.message);
		console.log("Response data:", response?.data);
		console.groupEnd();

		// Remove WWW-Authenticate headers from error response
		if (response?.headers) {
			delete response.headers["www-authenticate"];
			delete response.headers["WWW-Authenticate"];
		}

		// Special handling for 401 - Enhanced logic
		if (response?.status === 401) {
			console.log("🔐 Authentication failed (401) - checking auth state");

			const currentState = useUserStore.getState();
			console.log("🔐 Current auth state:", {
				isAuthenticated: currentState.isAuthenticated,
				hasToken: !!currentState.userToken,
				merchantId: currentState.merchantId,
			});

			// Clear authentication state
			useUserStore.getState().actions.clearUserInfoAndToken();

			setTimeout(() => {
				toast.error("Session expired. Please login again.", {
					position: "top-center",
					duration: 5000,
				});

				// Only redirect if not already on login page
				if (!window.location.pathname.includes("/login")) {
					window.location.href = "/login";
				}
			}, 100);

			return Promise.reject(error);
		}

		// For other errors, show appropriate message
		let errMsg = error.message || t("sys.api.errorMessage");

		if (response?.data) {
			if (typeof response.data === "string") {
				errMsg = response.data;
			} else if (response.data.message) {
				errMsg = response.data.message;
			} else if (response.data.error) {
				errMsg = response.data.error;
			}
		}

		// Don't show toast for 401 (handled above) or if it's a network error
		if (response?.status !== 401 && error.code !== "NETWORK_ERROR") {
			toast.error(errMsg, { position: "top-center" });
		}

		return Promise.reject(error);
	},
};

// Apply interceptors
mainApiInstance.interceptors.request.use(requestInterceptor);
loyaltyApiInstance.interceptors.request.use(requestInterceptor);

mainApiInstance.interceptors.response.use(responseInterceptor.success, responseInterceptor.error);
loyaltyApiInstance.interceptors.response.use(responseInterceptor.success, responseInterceptor.error);

class APIClient {
	private instance: typeof axios;

	constructor(instance: typeof axios) {
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
