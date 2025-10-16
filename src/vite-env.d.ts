// vite-env.d.ts - UPDATED VERSION
/// <reference types="vite/client" />

interface ImportMetaEnv {
	/** Default route path for the application */
	readonly VITE_APP_DEFAULT_ROUTE: string;
	/** Public path for static assets */
	readonly VITE_APP_PUBLIC_PATH: string;
	/** Base URL for API endpoints */
	readonly VITE_APP_API_BASE_URL: string;
	/** Routing mode: frontend routing or backend routing */
	readonly VITE_APP_ROUTER_MODE: "frontend" | "backend";
	/** Loyalty Engine Base URL */
	readonly VITE_APP_LOYALTY_ENGINE_URL: string;
	/** Loyalty Engine API Base URL */
	readonly VITE_APP_LOYALTY_API_BASE_URL: string;
}

interface ImportMeta {
	readonly env: ImportMetaEnv;
}
