// src/api/services/stockLevelsService.ts - Owner-verified stock quantities
import { loyaltyApiClient } from "@/api/apiClient";
import { clearStockViewGrant, setStockViewGrant } from "@/utils/stock-visibility";

export interface StockViewStatus {
	unlocked: boolean;
	canUnlock?: boolean;
	expiresAt?: string;
	reason?: "ADMIN";
}

export interface StockLevelItem {
	id: number;
	itemName: string;
	itemCode: string;
	availableStock: number;
	startingStock: number | null;
	addedStock: number | null;
	soldStock: number | null;
	reorderLevel: number;
	unitCost: number;
	unitPrice: number;
	/** Current wholesale price, or null when none is set. */
	wholesalePrice?: number | null;
	stockValueAtCost: number;
	status: "OUT_OF_STOCK" | "REORDER" | "OK";
	lastUpdated: string | null;
}

export interface StockLevels {
	items: StockLevelItem[];
	itemCount: number;
	outOfStock: number;
	belowReorderLevel: number;
	totalValueAtCost: number;
	totalValueAtRetail: number;
	/** Stock × wholesale price, for items that have one. */
	totalValueAtWholesale?: number;
	/** In-stock items left out of the wholesale total because they have no wholesale price. */
	inStockWithoutWholesalePrice?: number;
	access: StockViewStatus;
}

interface Envelope<T> {
	status: string;
	message: string;
	data: T;
}

const BASE = "/inventory/stock-levels";

const unwrap = <T>(response: unknown): T => {
	const body = response as Envelope<T>;
	if (!body || body.status === "FAILURE") {
		throw new Error(body?.message || "Request failed");
	}
	return body.data;
};

const stockLevelsService = {
	async status(): Promise<StockViewStatus> {
		return unwrap<StockViewStatus>(await loyaltyApiClient.get({ url: `${BASE}/status` }));
	},

	/** Sends a 6-digit code to the shop's registered phone. */
	async requestCode(): Promise<{ sentTo: string; expiresInMinutes: number }> {
		return unwrap(await loyaltyApiClient.post({ url: `${BASE}/request-otp` }));
	},

	/** Verifies the code and stores the short-lived token for this tab only. */
	async verifyCode(otp: string): Promise<void> {
		const data = unwrap<{ token: string; validMinutes: number }>(
			await loyaltyApiClient.post({ url: `${BASE}/verify`, data: { otp } }),
		);
		setStockViewGrant(data.token, data.validMinutes);
	},

	lock() {
		clearStockViewGrant();
	},

	async levels(): Promise<StockLevels> {
		return unwrap<StockLevels>(await loyaltyApiClient.get({ url: BASE }));
	},
};

export default stockLevelsService;
