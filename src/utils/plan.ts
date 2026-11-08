// src/utils/plan.ts - Which parts of Tribe the signed-in merchant bought
import { useMemo } from "react";
import { useUserToken } from "@/store/userStore";
import { decodeToken } from "@/utils/jwt";

/**
 * FULL: the shop system (POS, orders, inventory, customers, reports, finance) plus SokoReply.
 * SOKOREPLY: online sellers who bought SokoReply only. Set per merchant by an admin; carried in the login token.
 * Tokens from before plans existed have no plan and count as FULL. The backend enforces the same split.
 */
export type MerchantPlan = "FULL" | "SOKOREPLY";

/** Where SokoReply-only merchants land after login and when they open a page outside their plan. */
export const SOKOREPLY_HOME = "/sokoreply";

/** Pages a SokoReply-only merchant may open: SokoReply and their own profile. */
const SOKOREPLY_PATHS = [SOKOREPLY_HOME, "/management/user/profile", "/management/user/account"];

export const planFromToken = (token?: string | null): MerchantPlan => {
	if (!token) return "FULL";
	const plan = (decodeToken(token) as { plan?: string } | null)?.plan;
	return plan === "SOKOREPLY" ? "SOKOREPLY" : "FULL";
};

export const isAllowedForSokoReply = (path: string): boolean =>
	SOKOREPLY_PATHS.some((p) => path === p || path.startsWith(`${p}/`));

export const useIsSokoReplyOnly = (): boolean => {
	const token = useUserToken()?.accessToken;
	return useMemo(() => planFromToken(token) === "SOKOREPLY", [token]);
};
