// src/api/services/stockCountService.ts - End-of-day blind stock count
import { loyaltyApiClient } from "@/api/apiClient";

/** Status a counter (SALES_PERSON) sees — never includes system quantities. */
export type BlindLineStatus = "TO_COUNT" | "RECOUNT" | "DONE" | "NOT_COUNTED";

export type CountLineStatus =
	| "PENDING"
	| "RECOUNT_REQUESTED"
	| "COUNTED"
	| "RECONCILED"
	| "VARIANCE_OPEN"
	| "CLASSIFIED"
	| "ESCALATED"
	| "NOT_COUNTED";

export type CloseDayStatus =
	| "OPEN"
	| "RECONCILIATION_REQUIRED"
	| "COUNTING"
	| "INVESTIGATION"
	| "READY_TO_CLOSE"
	| "CLOSED"
	| "CLOSED_WITH_EXCEPTION";

export const VARIANCE_REASONS = [
	{ value: "COUNT_ERROR", label: "Count error" },
	{ value: "UNRECORDED_SALE", label: "Sale not recorded" },
	{ value: "UNRECORDED_RECEIPT", label: "Delivery not recorded" },
	{ value: "UNRECORDED_RETURN", label: "Return not recorded" },
	{ value: "UNRECORDED_CONSIGNMENT", label: "Consignment not recorded" },
	{ value: "TRANSFER_NOT_RECORDED", label: "Transfer not recorded" },
	{ value: "SUPPLIER_SHORT", label: "Supplier delivered short" },
	{ value: "DAMAGE", label: "Damaged / broken" },
	{ value: "LOSS", label: "Loss / theft" },
	{ value: "OVERAGE_INVESTIGATE", label: "Surplus — investigate" },
	{ value: "OTHER", label: "Other" },
] as const;

export type VarianceReason = (typeof VARIANCE_REASONS)[number]["value"];

export interface BlindCountLine {
	lineId: number;
	rank: number;
	itemName: string;
	itemCode: string;
	status: BlindLineStatus;
	/** Why it is on tonight's list (no quantities): sold or received since the last count, or not moved (every item is listed). */
	movement?: Movement;
}

export type Movement = "SOLD" | "RECEIVED" | "SPOT_CHECK";

export interface MovedItem {
	itemName: string;
	itemCode: string;
	movement: Exclude<Movement, "SPOT_CHECK">;
}

export interface FullCountLine {
	lineId: number;
	rank: number;
	itemName: string;
	itemCode: string;
	trigger: "MOVEMENT_BASED" | "RISK_SAMPLED" | "REALTIME_ALERT" | "MANUAL_ADD";
	queueReason: string | null;
	unitsSoldToday: number | null;
	expectedQuantity: number | null;
	firstCount: number | null;
	/** First blind count didn't match, so the item was counted a second time. */
	countedTwice?: boolean;
	/** Always present, even when quantities are hidden. */
	outcome?: "MISSING" | "EXTRA" | "MATCH" | "NOT_COUNTED" | "PENDING";
	countedQuantity: number | null;
	varianceQuantity: number | null;
	unitCost: number | null;
	varianceValue: number | null;
	materialVariance: boolean | null;
	status: CountLineStatus;
	countedBy: string | null;
	countedAt: string | null;
	varianceReason: VarianceReason | null;
	varianceNote: string | null;
	classifiedBy: string | null;
	stockAdjusted: boolean;
	result?: "ACCEPTED" | "RECOUNT";
}

export interface CountSummary {
	closeDayId: number;
	tradingDate: string;
	status: CloseDayStatus;
	itemsMoved: number | null;
	itemsQueued: number | null;
	itemsCounted: number | null;
	itemsNotCounted: number | null;
	variances: number | null;
	openVariances: number | null;
	shortageValue: number | null;
	overageValue: number | null;
	netVarianceValue: number | null;
	startedBy: string | null;
	closedAt: string | null;
	closedBy: string | null;
	note: string | null;
}

/** Session as returned to a counter. */
export interface BlindSession {
	closeDayId: number;
	tradingDate: string;
	status: CloseDayStatus;
	itemsToCount: number;
	itemsRemaining: number;
	lines: BlindCountLine[];
}

/** Session as returned to an owner/admin. */
export type FullSession = CountSummary & { lines: FullCountLine[] };

export type CountSession = BlindSession | FullSession;

export interface RepeatShortage {
	itemCode: string;
	itemName: string;
	daysShort: number;
	unitsMissing: number;
	valueMissing: number;
	countedBy: string[];
}

export interface DiscrepancyReport {
	summary: CountSummary;
	discrepancies: FullCountLine[];
	repeatShortages: RepeatShortage[];
	/** True for anyone who hasn't unlocked with the owner's code — quantity fields are omitted. */
	quantitiesHidden?: boolean;
	allLines: FullCountLine[];
}

export interface CountSubmitResult {
	line: BlindCountLine | FullCountLine;
	result: "ACCEPTED" | "RECOUNT";
	message: string;
}

interface Envelope<T> {
	status: string;
	statusCode: number;
	message: string;
	data: T;
}

export const isFullSession = (session: CountSession): session is FullSession =>
	"lines" in session && !("itemsToCount" in session);

const BASE = "/inventory/stock-count";

const unwrap = <T>(response: unknown): Envelope<T> => {
	const body = response as Envelope<T>;
	if (!body || body.status === "FAILURE") {
		throw new Error(body?.message || "Stock count request failed");
	}
	return body;
};

const stockCountService = {
	/** Starts today's count, or returns it if already started. */
	async start(): Promise<CountSession> {
		const res = await loyaltyApiClient.post({ url: `${BASE}/start` });
		return unwrap<CountSession>(res).data;
	},

	/** Today's session, or null if no count has been started. */
	/** Items sold or received today — shown before the count starts. */
	async movedToday(): Promise<{ count: number; items: MovedItem[] }> {
		const res = await loyaltyApiClient.get({ url: `${BASE}/moved-today` });
		return unwrap<{ count: number; items: MovedItem[] }>(res).data;
	},

	async current(): Promise<CountSession | null> {
		try {
			const res = await loyaltyApiClient.get({ url: `${BASE}/current` });
			return unwrap<CountSession>(res).data;
		} catch (error: any) {
			// apiClient turns 404 into a generic "not found" error
			if (/not found|no stock count/i.test(error?.message ?? "")) return null;
			throw error;
		}
	},

	async submitCount(lineId: number, quantity: number): Promise<CountSubmitResult> {
		const res = await loyaltyApiClient.post({ url: `${BASE}/lines/${lineId}/count`, data: { quantity } });
		const body = unwrap<(BlindCountLine | FullCountLine) & { result: "ACCEPTED" | "RECOUNT" }>(res);
		return { line: body.data, result: body.data.result, message: body.message };
	},

	/** Owner: send tonight's "time to count" SMS to every number on the shop's list right now. */
	async remindNow(): Promise<{ message: string; itemsToCount: number }> {
		const res = await loyaltyApiClient.post({ url: `${BASE}/remind-now` });
		const body = unwrap<{ itemsToCount: number }>(res);
		return { message: body.message, itemsToCount: body.data.itemsToCount };
	},

	async finalize(note?: string): Promise<Partial<CountSummary>> {
		const res = await loyaltyApiClient.post({ url: `${BASE}/finalize`, data: { note } });
		return unwrap<Partial<CountSummary>>(res).data;
	},

	/** Owner/admin only. Returns null when there is no count for that date. */
	async report(date?: string): Promise<DiscrepancyReport | null> {
		try {
			const res = await loyaltyApiClient.get({ url: `${BASE}/report`, params: date ? { date } : undefined });
			return unwrap<DiscrepancyReport>(res).data;
		} catch (error: any) {
			if (/not found|no stock count/i.test(error?.message ?? "")) return null;
			throw error;
		}
	},

	async history(from?: string, to?: string): Promise<CountSummary[]> {
		const res = await loyaltyApiClient.get({ url: `${BASE}/history`, params: { from, to } });
		return unwrap<CountSummary[]>(res).data ?? [];
	},

	async classify(lineId: number, reason: VarianceReason, note: string, adjustStock: boolean): Promise<FullCountLine> {
		const res = await loyaltyApiClient.post({
			url: `${BASE}/lines/${lineId}/classify`,
			data: { reason, note, adjustStock },
		});
		return unwrap<FullCountLine>(res).data;
	},
};

export default stockCountService;
