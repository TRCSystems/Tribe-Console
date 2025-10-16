// src/api/apiClient.ts - UPDATED VERSION
import axios, { type AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";
import { toast } from "sonner";
import type { Result } from "#/api";
import { ResultStatus } from "#/enum";
import { GLOBAL_CONFIG } from "@/global-config";
import { t } from "@/locales/i18n";
import userStore from "@/store/userStore";

// Create separate instances for different base URLs
const mainApiInstance = axios.create({
	baseURL: GLOBAL_CONFIG.apiBaseUrl,
	timeout: 50000,
	headers: { "Content-Type": "application/json;charset=utf-8" },
});

const loyaltyApiInstance = axios.create({
	baseURL: GLOBAL_CONFIG.loyaltyApiBaseUrl,
	timeout: 50000,
	headers: { "Content-Type": "application/json;charset=utf-8" },
});

// Common request interceptor for both instances
const requestInterceptor = (config: AxiosRequestConfig) => {
	const token = userStore.getState().userToken?.accessToken;
	if (token) {
		config.headers = config.headers || {};
		config.headers.Authorization = `Bearer ${token}`;
	}
	return config;
};

// Common response interceptor for both instances
const responseInterceptor = {
	success: (res: AxiosResponse) => {
		// Handle different response formats
		if (res.data?.status === ResultStatus.SUCCESS) {
			return res.data.data;
		}
		// If no specific format, return the data directly
		return res.data;
	},
	error: (error: AxiosError) => {
		const { response, message } = error || {};
		let errMsg = message || t("sys.api.errorMessage");

		// Handle different error formats
		if (response?.data) {
			if (typeof response.data === "string") {
				errMsg = response.data;
			} else if (response.data.message) {
				errMsg = response.data.message;
			} else if (response.data.error) {
				errMsg = response.data.error;
			}
		}

		toast.error(errMsg, { position: "top-center" });

		if (response?.status === 401) {
			userStore.getState().actions.clearUserInfoAndToken();
		}

		return Promise.reject(new Error(errMsg));
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
