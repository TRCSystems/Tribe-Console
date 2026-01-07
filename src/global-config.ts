// src/global-config.ts
import packageJson from "../package.json";

const isElectron = () => {
	// Check for electron context in browser
	if (typeof window !== "undefined") {
		return (
			(window as any).electronAPI !== undefined ||
			(window as any).process?.versions?.electron !== undefined ||
			(window as any).require?.("electron") !== undefined ||
			process.env.ELECTRON === "true"
		);
	}
	// In Node.js context (main process)
	return process.env.ELECTRON === "true" || process.versions.electron !== undefined;
};

export type GlobalConfig = {
	appName: string;
	appVersion: string;
	defaultRoute: string;
	publicPath: string;
	apiBaseUrl: string;
	routerMode: "frontend" | "backend";
	loyaltyEngineUrl: string;
	loyaltyApiBaseUrl: string;

	isDesktop: boolean;
	features: {
		offlineMode: boolean;
		fileSystemAccess: boolean;
		desktopNotifications: boolean;
		autoUpdate: boolean;
		systemTray: boolean;
		printing: boolean;
	};
};

const getApiBaseUrl = () => {
	if (isElectron()) {
		return "http://38.242.155.236:8080/api/v1";
	}
	return import.meta.env.VITE_APP_API_BASE_URL || "http://38.242.155.236:8080/api/v1";
};

const getLoyaltyApiBaseUrl = () => {
	if (isElectron()) {
		return "http://38.242.155.236:8085/api/v1";
	}
	return import.meta.env.VITE_APP_LOYALTY_API_BASE_URL || "http://38.242.155.236:8085/api/v1";
};

const getLoyaltyEngineUrl = () => {
	if (isElectron()) {
		return "http://38.242.155.236:8085";
	}
	return import.meta.env.VITE_APP_LOYALTY_ENGINE_URL || "http://38.242.155.236:8085";
};

export const GLOBAL_CONFIG: GlobalConfig = {
	appName: "TRIBE",
	appVersion: packageJson.version,
	defaultRoute: import.meta.env.VITE_APP_DEFAULT_ROUTE || "/welcome",
	publicPath: import.meta.env.VITE_APP_PUBLIC_PATH || "/",
	apiBaseUrl: getApiBaseUrl(),
	routerMode: import.meta.env.VITE_APP_ROUTER_MODE || "frontend",
	loyaltyEngineUrl: getLoyaltyEngineUrl(),
	loyaltyApiBaseUrl: getLoyaltyApiBaseUrl(),

	isDesktop: isElectron(),

	features: {
		offlineMode: isElectron(),
		fileSystemAccess: isElectron(),
		desktopNotifications: isElectron(),
		autoUpdate: isElectron(),
		systemTray: isElectron(),
		printing: isElectron(),
	},
};
