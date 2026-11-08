// src/api/services/pricesService.ts - Unit cost, selling price and wholesale price per item (owner only)
import { loyaltyApiClient } from "@/api/apiClient";

export interface PriceRow {
	id: number;
	itemCode: string;
	itemName: string;
	category: string | null;
	unitCost: number | null;
	/** Selling (retail) price at the till. */
	unitPrice: number | null;
	/** Price shops pay when ordering; null = not offered for ordering. */
	wholesalePrice: number | null;
	wholesaleSince: string | null;
	retailMarginPct: number | null;
	wholesaleMarginPct: number | null;
}

export interface PriceUpdate {
	id: number;
	unitCost?: number;
	unitPrice?: number;
	wholesalePrice?: number;
	clearWholesalePrice?: boolean;
}

export interface PriceChangeEntry {
	field: "UNIT_COST" | "UNIT_PRICE" | "WHOLESALE_PRICE";
	oldValue: number | null;
	newValue: number | null;
	changedByUserId: number | null;
	changedAt: string;
}

interface Envelope<T> {
	status: string;
	message?: string;
	data: T;
}

const unwrap = <T>(res: unknown): T => {
	const body = res as Envelope<T>;
	if (!body || body.status === "FAILURE") throw new Error(body?.message || "Something went wrong");
	return body.data;
};

const pricesService = {
	async list(): Promise<PriceRow[]> {
		return unwrap(await loyaltyApiClient.get({ url: "/inventory/prices" }));
	},
	async update(updates: PriceUpdate[]): Promise<{ message: string; rows: PriceRow[] }> {
		const res = (await loyaltyApiClient.put({ url: "/inventory/prices", data: { updates } })) as Envelope<PriceRow[]>;
		return { message: res?.message ?? "Prices updated", rows: unwrap(res) };
	},
	async history(inventoryId: number): Promise<PriceChangeEntry[]> {
		return unwrap(await loyaltyApiClient.get({ url: `/inventory/prices/${inventoryId}/history` }));
	},
};

export default pricesService;
