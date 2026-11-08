// src/api/services/crmService.ts - Distributor CRM (shops, segments, reps, messages)
import { loyaltyApiClient } from "@/api/apiClient";

export type Segment = "PROSPECT" | "NEW" | "CHAMPION" | "DUE" | "ACTIVE" | "AT_RISK" | "LOST";

export const SEGMENTS: Record<Segment, { label: string; hint: string; tone: string }> = {
	CHAMPION: { label: "Champion", hint: "Orders often and spends well", tone: "bg-emerald-100 text-emerald-800" },
	ACTIVE: { label: "Active", hint: "Ordering normally", tone: "bg-sky-100 text-sky-800" },
	DUE: { label: "Due", hint: "Near its usual reorder day", tone: "bg-indigo-100 text-indigo-800" },
	NEW: { label: "New", hint: "First order in the last 30 days", tone: "bg-violet-100 text-violet-800" },
	AT_RISK: { label: "At risk", hint: "Overdue by 1.5x its usual gap", tone: "bg-amber-100 text-amber-900" },
	LOST: { label: "Lost", hint: "Overdue by 3x its usual gap", tone: "bg-red-100 text-red-800" },
	PROSPECT: { label: "Prospect", hint: "Linked but never ordered", tone: "bg-slate-100 text-slate-700" },
};

export interface PeriodStats {
	orders: number;
	activeShops: number;
	ordersPerActiveShop: number | null;
	revenueKes: number;
	avgBasketKes: number | null;
	avgLinesPerOrder: number | null;
	selfOrderSharePct: number | null;
}

export interface CrmDashboard {
	period: string;
	current: PeriodStats;
	previous: PeriodStats;
	medianDaysBetweenOrders: number | null;
	segments: Record<Segment, number>;
	shops: number;
	consignmentReady: number;
	computedAt: string | null;
}

export interface CrmShop {
	shopId: number;
	name: string;
	location: string | null;
	phone: string | null;
	orderCount: number;
	lastOrderDate: string | null;
	daysSinceLastOrder: number | null;
	totalOrderedKes: number;
	repUserId: number | null;
	repName: string | null;
	preferredChannel: "SMS" | "WHATSAPP";
	marketingOptOut: boolean;
	segment: Segment | null;
	previousSegment: Segment | null;
	usualGapDays: number | null;
	nextExpectedOrderDate: string | null;
	orders30d: number;
	avgBasketKes: number | null;
	basketTrendPct: number | null;
	selfOrderShare60d: number | null;
	consignmentReady: boolean;
}

export interface CrmShopProfile extends CrmShop {
	firstOrderAt?: string;
	ordersAllTime?: number;
	orders90d?: number;
	revenue30d?: number;
	revenue90d?: number;
	avgLinesPerOrder?: number | null;
	gapIsEstimated?: boolean;
	selfOrders60d?: number;
	cancellations60d?: number;
	segmentChangedAt?: string;
	topItems?: Array<{ itemCode: string; itemName: string; units: number; orders: number }>;
	crossSell?: Array<{ itemCode: string; itemName: string; shopShare: number }>;
	recentOrders: Array<{
		orderCode: string;
		orderDate: string;
		status: string;
		totalKes: number;
		source: "DISTRIBUTOR" | "REP" | "SHOP";
		items: string;
	}>;
}

export interface CrmMessage {
	id: number;
	template: string;
	campaignKey: string | null;
	marketing: boolean;
	channel: "SMS" | "WHATSAPP" | null;
	toNumber: string | null;
	body: string;
	status: "SENT" | "FAILED" | "SKIPPED";
	skipReason: string | null;
	createdAt: string;
}

export interface CrmTemplate {
	key: string;
	marketing: boolean;
	preview: string;
}

export interface FieldRep {
	userId: number;
	username: string;
	status: string;
	assignedShops: number;
}

interface Envelope<T> {
	status: string;
	message: string;
	data: T;
}

const unwrap = <T>(response: unknown): Envelope<T> => {
	const body = response as Envelope<T>;
	if (!body || body.status === "FAILURE") throw new Error(body?.message || "CRM request failed");
	return body;
};

const crmService = {
	async dashboard(): Promise<CrmDashboard> {
		return unwrap<CrmDashboard>(await loyaltyApiClient.get({ url: "/crm/dashboard" })).data;
	},
	async refreshStats(): Promise<number> {
		return unwrap<{ shops: number }>(await loyaltyApiClient.post({ url: "/crm/stats/refresh" })).data.shops;
	},
	async shops(): Promise<CrmShop[]> {
		return unwrap<CrmShop[]>(await loyaltyApiClient.get({ url: "/crm/shops" })).data ?? [];
	},
	async shop(shopId: number): Promise<CrmShopProfile> {
		return unwrap<CrmShopProfile>(await loyaltyApiClient.get({ url: `/crm/shops/${shopId}` })).data;
	},
	async shopMessages(shopId: number): Promise<CrmMessage[]> {
		return unwrap<CrmMessage[]>(await loyaltyApiClient.get({ url: `/crm/shops/${shopId}/messages` })).data ?? [];
	},
	async sendMessage(
		shopId: number,
		template: string,
		extra: { text?: string } = {},
	): Promise<{ message: string; result: CrmMessage }> {
		const body = unwrap<CrmMessage>(
			await loyaltyApiClient.post({ url: `/crm/shops/${shopId}/messages`, data: { template, ...extra } }),
		);
		return { message: body.message, result: body.data };
	},
	async updateContact(
		shopId: number,
		changes: {
			phone?: string;
			whatsappNumber?: string;
			preferredChannel?: "SMS" | "WHATSAPP";
			marketingOptOut?: boolean;
		},
	): Promise<void> {
		unwrap(await loyaltyApiClient.put({ url: `/crm/shops/${shopId}/contact`, data: changes }));
	},
	async assignRep(shopId: number, repUserId: number | null): Promise<void> {
		unwrap(await loyaltyApiClient.put({ url: `/crm/shops/${shopId}/rep`, data: { repUserId } }));
	},
	async templates(): Promise<CrmTemplate[]> {
		return unwrap<CrmTemplate[]>(await loyaltyApiClient.get({ url: "/crm/templates" })).data ?? [];
	},
	async reps(): Promise<FieldRep[]> {
		return unwrap<FieldRep[]>(await loyaltyApiClient.get({ url: "/crm/reps" })).data ?? [];
	},
	async createRep(username: string, password: string): Promise<void> {
		unwrap(await loyaltyApiClient.post({ url: "/crm/reps", data: { username, password } }));
	},
};

export default crmService;
