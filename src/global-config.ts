// src/global-config.ts - FIXED VERSION
import packageJson from "../package.json";

/**
 * Global application configuration type definition
 */
export type GlobalConfig = {
	/** Application name */
	appName: string;
	/** Application version number */
	appVersion: string;
	/** Default route path for the application */
	defaultRoute: string;
	/** Public path for static assets */
	publicPath: string;
	/** Base URL for API endpoints */
	apiBaseUrl: string;
	/** Routing mode: frontend routing or backend routing */
	routerMode: "frontend" | "backend";
	/** Loyalty Engine Base URL */
	loyaltyEngineUrl: string;
	/** Loyalty Engine API Base URL */
	loyaltyApiBaseUrl: string;
};

/**
 * Global configuration constants
 * Reads configuration from environment variables and package.json
 *
 * @warning
 * Please don't use the import.meta.env to get the configuration, use the GLOBAL_CONFIG instead
 */
export const GLOBAL_CONFIG: GlobalConfig = {
	appName: "Loyalty Engine",
	appVersion: packageJson.version,
	defaultRoute: import.meta.env.VITE_APP_DEFAULT_ROUTE || "/workbench",
	publicPath: import.meta.env.VITE_APP_PUBLIC_PATH || "/",
	apiBaseUrl: import.meta.env.VITE_APP_API_BASE_URL || "/api", // Use proxy in development
	routerMode: import.meta.env.VITE_APP_ROUTER_MODE || "frontend",
	loyaltyEngineUrl: import.meta.env.VITE_APP_LOYALTY_ENGINE_URL || "http://38.242.155.236:8085",
	loyaltyApiBaseUrl: import.meta.env.VITE_APP_LOYALTY_API_BASE_URL || "/api", // FIXED: Use proxy in development
};
