// src/utils/stock-visibility.ts - Blind stock helpers
import { useCallback, useEffect, useState } from "react";
import { useUserRole } from "@/store/userStore";

/**
 * Nobody at the shop sees stock quantities by default — the backend sends availableStock = null
 * and only a stockStatus of "INSTOCK" | "OUTSTOCK". That keeps end-of-day counts honest even if an
 * attendant uses the owner's login. Owners see real quantities only in the owner reports
 * (Stock Levels, Stock Discrepancies), after entering a code SMS'd to the registered phone.
 */
export const useIsBlindCounter = (): boolean => (useUserRole() as string | null) === "SALES_PERSON";

/** Roles that may open the owner reports (they still need the SMS code unless ADMIN). */
export const useCanViewStockCountResults = (): boolean => {
	const role = useUserRole() as string | null;
	return role !== null && role !== "SALES_PERSON";
};

/** True when the backend withheld the quantity for this item. */
export const isStockHidden = (item: { availableStock?: number | null } | null | undefined): boolean =>
	item?.availableStock === null || item?.availableStock === undefined;

/**
 * Quantity to use for selling decisions. When the quantity is hidden we only know
 * in/out of stock, so in-stock items are not capped here — the backend still rejects
 * a sale larger than what is on hand.
 */
export const sellableQuantity = (item: { availableStock?: number | null; stockStatus?: string | null }): number => {
	if (!isStockHidden(item)) return item.availableStock || 0;
	return item.stockStatus === "OUTSTOCK" ? 0 : Number.MAX_SAFE_INTEGER;
};

// ───────────────────────────── owner unlock token ─────────────────────────────

/** Must match StockVisibility.LOCKED_MESSAGE on the backend (HTTP 423). */
export const STOCK_VIEW_LOCKED_MESSAGE = "Owner verification required to view stock quantities";

const STORAGE_KEY = "stockViewGrant";

interface StockViewGrant {
	token: string;
	expiresAt: number;
}

/**
 * The token lives in sessionStorage: it dies when the tab closes and is never shared with other tabs.
 * It is only attached to owner-report requests (see apiClient), so even while unlocked the POS and
 * Stock pages keep receiving no quantities.
 */
export const OWNER_REPORT_URL_PATTERNS = [
	/\/inventory\/stock-levels(\/|$|\?)/,
	/\/inventory\/stock-count\/(report|history|lines\/\d+\/classify)/,
	/\/inventory\/report-recipients(\/|$|\?)/,
	// Owner actions on the Stock and Prices pages: prices, costs and deleting items
	/\/inventory\/prices(\/|$|\?)/,
	/\/inventory\/audit-trail(\/|$|\?)/,
	/\/inventory\/\d+\/(update|hard)(\/|$|\?)/,
];

export const getStockViewToken = (): string | null => {
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const grant = JSON.parse(raw) as StockViewGrant;
		if (!grant.token || Date.now() >= grant.expiresAt) {
			sessionStorage.removeItem(STORAGE_KEY);
			return null;
		}
		return grant.token;
	} catch {
		return null;
	}
};

export const getStockViewExpiry = (): Date | null => {
	try {
		const raw = sessionStorage.getItem(STORAGE_KEY);
		if (!raw) return null;
		const grant = JSON.parse(raw) as StockViewGrant;
		return Date.now() < grant.expiresAt ? new Date(grant.expiresAt) : null;
	} catch {
		return null;
	}
};

export const setStockViewGrant = (token: string, validMinutes: number) => {
	try {
		// Expire slightly before the server does so the UI never shows a stale "unlocked" state
		const expiresAt = Date.now() + validMinutes * 60_000 - 30_000;
		sessionStorage.setItem(STORAGE_KEY, JSON.stringify({ token, expiresAt } satisfies StockViewGrant));
	} catch {
		// sessionStorage unavailable — the owner will simply be asked for a code again
	}
};

export const clearStockViewGrant = () => {
	try {
		sessionStorage.removeItem(STORAGE_KEY);
	} catch {
		// ignore
	}
};

export const isStockViewLockedError = (error: unknown): boolean =>
	error instanceof Error && error.message.includes(STOCK_VIEW_LOCKED_MESSAGE);

/**
 * Lock state for an owner-only page (Stock, Prices): unlocked while this tab holds a valid SMS-code
 * grant, re-locks by itself when the grant runs out. ADMIN logins are never locked.
 */
export const useOwnerUnlock = () => {
	const role = useUserRole() as string | null;
	const isAdmin = role === "ADMIN";
	const [unlocked, setUnlocked] = useState<boolean>(() => isAdmin || getStockViewToken() !== null);

	useEffect(() => {
		if (isAdmin) {
			setUnlocked(true);
			return;
		}
		const timer = window.setInterval(() => {
			if (getStockViewToken() === null) setUnlocked(false);
		}, 15_000);
		return () => window.clearInterval(timer);
	}, [isAdmin]);

	const relock = useCallback(() => {
		clearStockViewGrant();
		setUnlocked(isAdmin);
	}, [isAdmin]);

	return { unlocked, markUnlocked: () => setUnlocked(true), relock, isAdmin };
};
