// src/api/services/sokoReplyOrderService.ts - Public SokoReply order page (opened from a Facebook/Instagram
// comment reply, no login). One link per Reel, shared by every commenter.
import { loyaltyApiClient } from "@/api/apiClient";

export interface SokoReplyViewItem {
	itemCode: string;
	name: string;
	colour: string | null;
	size: string | null;
	price: number;
	stock: number | null; // null for services (no stock count)
}

export interface SokoReplyViewSet {
	id: number;
	name: string;
	price: number;
	items: string[];
	optionalItems: string[];
}

export interface SokoReplyViewZone {
	id: number;
	name: string;
	fee: number | null;
	days: string | null;
}

export interface SokoReplyOrderView {
	sellerName: string;
	location: string | null;
	landmark: string | null;
	tillVerified: boolean;
	tillNumber: string | null;
	tillName: string | null;
	items: SokoReplyViewItem[];
	sets: SokoReplyViewSet[];
	zones: SokoReplyViewZone[];
}

export interface SokoReplyPlacedOrder {
	orderCode: string;
	totalAmount: number;
	tillVerified: boolean;
	tillNumber: string | null;
	tillName: string | null;
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

const sokoReplyOrderService = {
	async view(token: string): Promise<SokoReplyOrderView> {
		return unwrap(await loyaltyApiClient.get({ url: `/smm/order/${encodeURIComponent(token)}` }));
	},
	async place(
		token: string,
		items: Array<{ itemCode: string; quantity: number }>,
		zoneId: number | undefined,
		phone: string,
		customerName: string | undefined,
		commentId: string | undefined,
	): Promise<SokoReplyPlacedOrder> {
		return unwrap(
			await loyaltyApiClient.post({
				url: `/smm/order/${encodeURIComponent(token)}/orders`,
				data: {
					items,
					...(zoneId ? { zoneId } : {}),
					phone,
					...(customerName ? { customerName } : {}),
					...(commentId ? { commentId } : {}),
				},
			}),
		);
	},
	async reportPaid(
		token: string,
		orderCode: string,
		mpesaCode?: string,
	): Promise<{ orderCode: string; reported: boolean }> {
		return unwrap(
			await loyaltyApiClient.post({
				url: `/smm/order/${encodeURIComponent(token)}/orders/${encodeURIComponent(orderCode)}/paid`,
				data: mpesaCode ? { mpesaCode } : {},
			}),
		);
	},
};

export default sokoReplyOrderService;
