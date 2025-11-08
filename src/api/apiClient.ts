// src/api/apiClient.ts - ENHANCED VERSION
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

// Enhanced request interceptor with detailed auth debugging
const requestInterceptor = (config: AxiosRequestConfig) => {
  const token = userStore.getState().userToken?.accessToken;
  
  console.group(`🔐 AUTH DEBUG - ${config.method?.toUpperCase()} ${config.url}`);
  console.log("📦 Request Config:", config);
  console.log("🔑 Token exists:", !!token);
  console.log("🔑 Token preview:", token ? `${token.substring(0, 50)}...` : 'No token');
  console.log("🔑 Full token:", token);
  
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
    console.log("✅ Authorization header set");
  } else {
    console.log("❌ No token available - request will likely fail with 401");
    
    // Check if we're on a protected route that requires auth
    if (config.url?.includes('/inventory/') && !config.url?.includes('/all')) {
      console.warn("⚠️ Inventory mutation without token - this will fail!");
    }
  }
  
  console.log("📋 Final headers:", config.headers);
  console.groupEnd();
  
  console.log("🔗 API Request:", config.method?.toUpperCase(), config.baseURL + config.url);
  return config;
};

// Enhanced response interceptor
const responseInterceptor = {
  success: (res: AxiosResponse) => {
    console.log(`✅ API Success: ${res.status} ${res.config.method?.toUpperCase()} ${res.config.url}`);
    return res.data;
  },
  error: (error: AxiosError) => {
    const { response, config } = error || {};
    
    console.group(`❌ API Error: ${response?.status} ${config?.method?.toUpperCase()} ${config?.url}`);
    console.log("Status:", response?.status);
    console.log("Error message:", error.message);
    console.log("Response data:", response?.data);
    console.log("Request config:", config);
    console.groupEnd();

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

    // Special handling for 401
    if (response?.status === 401) {
      console.log("🔐 Authentication failed - clearing user data");
      errMsg = "Authentication failed. Please login again.";
      userStore.getState().actions.clearUserInfoAndToken();
      
      // Show login redirect message
      setTimeout(() => {
        toast.error("Session expired. Please login again.", { 
          position: "top-center",
          duration: 5000 
        });
      }, 1000);
    } else if (response?.status !== 401) {
      toast.error(errMsg, { position: "top-center" });
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