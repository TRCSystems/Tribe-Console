// src/utils/plan.ts - Which parts of Tribe the signed-in merchant bought
import { useMemo } from "react";
import { useUserToken } from "@/store/userStore";
import { decodeToken } from "@/utils/jwt";

/**
 * Modules a merchant can buy, chosen at onboarding by an admin and carried in the login token ("modules").
 * Older tokens only carry "plan": SOKOREPLY means SokoReply only, anything else (or nothing) means everything.
 * Admins have no modules and see everything. The backend enforces the same split.
 */
export const MODULES = ["POS", "ORDERS", "INVENTORY", "CUSTOMERS", "REPORTS", "FINANCE", "SOKOREPLY"] as const;
export type MerchantModule = (typeof MODULES)[number];

export const MODULE_LABELS: Record<MerchantModule, string> = {
	POS: "POS",
	ORDERS: "Orders",
	INVENTORY: "Inventory",
	CUSTOMERS: "Customers",
	REPORTS: "Reports",
	FINANCE: "Stock Finance",
	SOKOREPLY: "SokoReply",
};

/** Page path prefix to the module it belongs to; longest prefixes first. Pages not listed are shared. */
const PATH_MODULES: [string, MerchantModule][] = [
	["/order-payment", "POS"],
	["/pos", "POS"],
	["/orders", "ORDERS"],
	["/shop-order", "ORDERS"],
	["/inventory", "INVENTORY"],
	["/crm", "CUSTOMERS"],
	["/reports", "REPORTS"],
	["/analytics", "REPORTS"],
	["/finance", "FINANCE"],
	["/sokoreply", "SOKOREPLY"],
];

/** Where each module starts, in the order a merchant is sent to the first one they have. */
const HOMES: [MerchantModule, string][] = [
	["POS", "/pos"],
	["ORDERS", "/orders"],
	["INVENTORY", "/inventory/stock"],
	["CUSTOMERS", "/crm"],
	["REPORTS", "/analytics/daily-sales"],
	["FINANCE", "/finance"],
	["SOKOREPLY", "/sokoreply"],
];

const ALL = new Set<MerchantModule>(MODULES);

export const modulesFromToken = (token?: string | null): Set<MerchantModule> => {
	if (!token) return ALL;
	const claims = decodeToken(token) as { modules?: string[]; plan?: string } | null;
	if (Array.isArray(claims?.modules)) {
		return new Set(claims.modules.filter((m): m is MerchantModule => (MODULES as readonly string[]).includes(m)));
	}
	return claims?.plan === "SOKOREPLY" ? new Set<MerchantModule>(["SOKOREPLY"]) : ALL;
};

export const moduleForPath = (path: string): MerchantModule | null =>
	PATH_MODULES.find(([p]) => path === p || path.startsWith(`${p}/`))?.[1] ?? null;

export const hasAll = (modules: Set<MerchantModule>) => MODULES.every((m) => modules.has(m));

/** True when the page belongs to a bought module or to no module at all (profile, login...). */
export const isPathAllowed = (modules: Set<MerchantModule>, path: string): boolean => {
	const m = moduleForPath(path);
	return m === null || modules.has(m);
};

/** The welcome page shows the shop system; merchants without any shop module start in their first module. */
export const homeFor = (modules: Set<MerchantModule>, fallback: string): string => {
	if (hasAll(modules)) return fallback;
	return HOMES.find(([m]) => modules.has(m))?.[1] ?? fallback;
};

export const useModules = (): Set<MerchantModule> => {
	const token = useUserToken()?.accessToken;
	return useMemo(() => modulesFromToken(token), [token]);
};
