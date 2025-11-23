import packageJson from "../package.json";

export type GlobalConfig = {
	appName: string;
	appVersion: string;
	defaultRoute: string;
	publicPath: string;
	apiBaseUrl: string;
	routerMode: "frontend" | "backend";
	loyaltyEngineUrl: string;
	loyaltyApiBaseUrl: string;
};

export const GLOBAL_CONFIG: GlobalConfig = {
	appName: "Tribe",
	appVersion: packageJson.version,
	defaultRoute: import.meta.env.VITE_APP_DEFAULT_ROUTE || "/workbench",
	publicPath: import.meta.env.VITE_APP_PUBLIC_PATH || "/",
	apiBaseUrl: import.meta.env.VITE_APP_API_BASE_URL || "http://38.242.155.236:8080/api/v1",
	routerMode: import.meta.env.VITE_APP_ROUTER_MODE || "frontend",
	loyaltyEngineUrl: import.meta.env.VITE_APP_LOYALTY_ENGINE_URL || "http://38.242.155.236:8085",
	loyaltyApiBaseUrl: import.meta.env.VITE_APP_LOYALTY_API_BASE_URL || "http://38.242.155.236:8085/api/v1",
};
