// src/api/services/stockAuditService.ts - Stock audit trail report (owner only, SMS-code unlock)
import { loyaltyApiClient } from "@/api/apiClient";

export type MovementKind = "ADDED" | "SOLD" | "DISPATCHED" | "COUNT_CORRECTION" | "CORRECTION" | "PRICE";

export interface AuditSummaryRow {
	itemCode: string;
	itemName: string;
	category: string | null;
	/** Units in (+) or out (−) during the period. */
	added: number;
	sold: number;
	dispatched: number;
	countCorrections: number;
	otherCorrections: number;
	netChange: number;
	movements: number;
	currentStock: number | null;
	lastMovementAt: string | null;
}

export interface AuditSummary {
	from: string;
	to: string;
	items: AuditSummaryRow[];
}

export interface AuditEvent {
	at: string;
	kind: MovementKind;
	kindLabel: string;
	description: string;
	/** Units in (+) or out (−); null for price changes. */
	change: number | null;
	stockBefore: number | null;
	stockAfter: number | null;
	reference: string | null;
	notes: string | null;
	by: string;
}

export interface ItemTrail {
	itemCode: string;
	itemName: string;
	currentStock: number | null;
	from: string;
	to: string;
	events: AuditEvent[];
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

const stockAuditService = {
	async summary(from: string, to: string): Promise<AuditSummary> {
		return unwrap(await loyaltyApiClient.get({ url: "/inventory/audit-trail", params: { from, to } }));
	},
	async item(itemCode: string, from: string, to: string): Promise<ItemTrail> {
		return unwrap(await loyaltyApiClient.get({ url: "/inventory/audit-trail/item", params: { itemCode, from, to } }));
	},
};

export default stockAuditService;
