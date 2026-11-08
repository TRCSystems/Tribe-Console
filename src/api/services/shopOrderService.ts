// src/api/services/shopOrderService.ts - Public shop order page (opened from an SMS/WhatsApp link, no login)
import { loyaltyApiClient } from "@/api/apiClient";

export interface ShopCatalogItem {
	itemCode: string;
	itemName: string;
	price: number;
	inStock: boolean;
	category: string | null;
	imageUrl: string | null;
}

export interface ShopOrderSummary {
	orderCode: string;
	status: string;
	totalKes: number;
	items: Array<{ itemName: string; quantity: number; lineTotal: number }>;
	shopNote: string | null;
	orderDate: string;
}

export interface ShopOrderView {
	shopName: string;
	distributorName: string;
	expiresAt: string;
	status: "OPEN" | "USED";
	catalog?: ShopCatalogItem[];
	usual?: Array<{ itemCode: string; quantity: number }>;
	phone?: string | null;
	order?: ShopOrderSummary | null;
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

const shopOrderService = {
	async view(token: string): Promise<ShopOrderView> {
		return unwrap(await loyaltyApiClient.get({ url: `/shop-order/${encodeURIComponent(token)}` }));
	},
	async place(
		token: string,
		items: Array<{ itemCode: string; quantity: number }>,
		extras: Array<{ name: string; quantity: number }>,
		phone?: string,
	): Promise<ShopOrderSummary> {
		return unwrap(
			await loyaltyApiClient.post({
				url: `/shop-order/${encodeURIComponent(token)}/orders`,
				data: { items, extras, ...(phone ? { phone } : {}) },
			}),
		);
	},
	async pay(token: string, phone?: string): Promise<{ orderCode: string; message: string }> {
		return unwrap(
			await loyaltyApiClient.post({
				url: `/shop-order/${encodeURIComponent(token)}/pay`,
				data: phone ? { phone } : {},
			}),
		);
	},
};

export default shopOrderService;
