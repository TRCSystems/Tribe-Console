// src/api/services/reportRecipientsService.ts - Extra phone numbers that receive stock count SMS
import { loyaltyApiClient } from "@/api/apiClient";

export interface ReportRecipient {
	id: number;
	name: string;
	phone: string;
	receiveSummary: boolean;
	receiveAlerts: boolean;
	createdAt: string;
}

export interface ReportRecipientList {
	/** The shop's registered phone — always receives everything, managed by support. */
	registeredPhone: string | null;
	maxExtra: number;
	recipients: ReportRecipient[];
}

export interface NewRecipient {
	name: string;
	phone: string;
	receiveSummary: boolean;
	receiveAlerts: boolean;
}

interface Envelope<T> {
	status: string;
	message: string;
	data: T;
}

const BASE = "/inventory/report-recipients";

const unwrap = <T>(response: unknown): T => {
	const body = response as Envelope<T>;
	if (!body || body.status === "FAILURE") {
		throw new Error(body?.message || "Request failed");
	}
	return body.data;
};

const reportRecipientsService = {
	async list(): Promise<ReportRecipientList> {
		return unwrap(await loyaltyApiClient.get({ url: BASE }));
	},

	async add(recipient: NewRecipient): Promise<ReportRecipient> {
		return unwrap(await loyaltyApiClient.post({ url: BASE, data: recipient }));
	},

	async update(
		id: number,
		changes: Partial<Pick<ReportRecipient, "name" | "receiveSummary" | "receiveAlerts">>,
	): Promise<ReportRecipient> {
		return unwrap(await loyaltyApiClient.put({ url: `${BASE}/${id}`, data: changes }));
	},

	async remove(id: number): Promise<void> {
		unwrap(await loyaltyApiClient.delete({ url: `${BASE}/${id}` }));
	},
};

export default reportRecipientsService;
