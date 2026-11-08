// src/api/services/smmService.ts - SokoReply: connecting Facebook/Instagram, the shop's setup, comments and leads
import { loyaltyApiClient } from "@/api/apiClient";

interface Envelope<T> {
	status: string;
	message: string;
	data: T;
}

const unwrap = <T>(response: unknown): T => {
	const body = response as Envelope<T>;
	if (!body || body.status === "FAILURE") {
		throw new Error(body?.message || "Request failed");
	}
	return body.data;
};

/** Like unwrap, but keeps the server's message (e.g. "Some accounts could not be read"). */
const unwrapWithMessage = <T>(response: unknown): { data: T; message: string } => {
	const body = response as Envelope<T>;
	if (!body || body.status === "FAILURE") {
		throw new Error(body?.message || "Request failed");
	}
	return { data: body.data, message: body.message };
};

export type Platform = "FACEBOOK" | "INSTAGRAM" | "TIKTOK";

export interface SmmAccount {
	id: number;
	platform: Platform;
	pageId: string;
	name: string;
	status: "ACTIVE" | "TOKEN_EXPIRED" | "DISCONNECTED";
	lastWebhookAt: string | null;
	connectedAt: string;
}

export interface SellerProfile {
	id: number;
	merchantId: number;
	voiceSamples: string | null;
	noGoPhrases: string | null;
	tone: string | null;
	languages: string | null;
	openingHours: string | null;
	locationText: string | null;
	mapLat: number | null;
	mapLng: number | null;
	landmarkDirections: string | null;
	whatsappNumber: string | null;
	staffContacts: string | null;
	alertLanguage: "en" | "sw";
	agentsPaused: boolean;
	shadowMode: boolean;
}

export type DeliveryMethod = "PICKUP" | "RIDER" | "BUS_PARCEL" | "COURIER";

export interface DeliveryZone {
	id?: number;
	name: string;
	places: string | null;
	fee: number | null;
	days: string | null;
	method: DeliveryMethod;
}

export interface ProductSet {
	id?: number;
	name: string;
	itemCodes: string;
	setPrice: number;
	optionalItemCodes: string | null;
}

export interface CatalogueItem {
	id: number;
	itemCode: string;
	itemName: string;
	unitPrice: number | null;
	availableStock: number | null;
	itemType: "GOOD" | "SERVICE";
	colour: string | null;
	size: string | null;
	parentCode: string | null;
}

export interface NewCatalogueItem {
	itemName: string;
	unitPrice: number;
	availableStock: number;
	itemType: "GOOD" | "SERVICE";
	colour?: string | null;
	size?: string | null;
	parentCode?: string | null;
}

export interface SocialPost {
	postId: string;
	platform: Platform;
	account: string;
	caption: string | null;
	link: string | null;
	thumbnail: string | null;
	createdAt: string | null;
	tagged: string[];
	suggested: string[];
}

export interface SmmComment {
	id: number;
	platform: Platform;
	commentId: string;
	postId: string | null;
	commenterName: string | null;
	text: string | null;
	receivedAt: string;
	intent: string | null;
	buyer: boolean | null;
	wantsWhatsApp: boolean | null;
	negative: boolean | null;
	criticism: boolean | null;
	phoneFound: boolean | null;
	secondLook: boolean | null;
	backfilled: boolean | null;
	sellerAnswered: boolean | null;
	state: string;
	error: string | null;
}

export interface SmmAction {
	id: number;
	kind: "PUBLIC" | "PRIVATE" | "HIDE";
	text: string | null;
	status: "PENDING" | "SENT" | "LOGGED" | "FAILED";
	error: string | null;
	createdAt: string;
	buyerRepliedAt: string | null;
	buyerReplyText: string | null;
}

export interface SmmHandover {
	id: number;
	commentId: number;
	reason: string;
	urgent: boolean;
	alertedAt: string | null;
	answeredAt: string | null;
	outcome: string | null;
	createdAt: string;
}

export interface CommentRow {
	comment: SmmComment;
	actions: SmmAction[];
	handovers: SmmHandover[];
}

export interface Lead {
	id: number;
	senderName: string | null;
	platform: Platform;
	phoneNumber: string | null;
	temperature: "COLD" | "WARM" | "HOT" | null;
	latestMessage: string | null;
	messageCount: number | null;
	interestedItemCode: string | null;
	postId: string | null;
	lastContactAt: string;
}

export interface CommentFilters {
	postId?: string;
	intent?: string;
	show?: "buyers" | "not-buyers" | "harmful";
}

export interface LeadFilters {
	temperature?: "HOT" | "WARM" | "COLD";
	postId?: string;
}

export interface ReplyRate {
	sent: number;
	answered: number;
	ordered: number;
	answeredOrOrdered: number;
	rate: number | null;
}

export interface Paged<T> {
	total: number;
	page: number;
	rows: T[];
}

const smmService = {
	// Connecting
	async connectUrl(): Promise<string> {
		return unwrap<{ url: string }>(await loyaltyApiClient.get({ url: "/smm/connect/url" })).url;
	},
	async accounts(): Promise<SmmAccount[]> {
		return unwrap(await loyaltyApiClient.get({ url: "/smm/accounts" }));
	},
	async disconnect(id: number): Promise<void> {
		unwrap(await loyaltyApiClient.post({ url: `/smm/accounts/${id}/disconnect` }));
	},

	// Step 5: shop details, mode
	async profile(): Promise<SellerProfile> {
		return unwrap(await loyaltyApiClient.get({ url: "/smm/setup/profile" }));
	},
	async saveProfile(changes: Partial<SellerProfile>): Promise<SellerProfile> {
		return unwrap(await loyaltyApiClient.put({ url: "/smm/setup/profile", data: changes }));
	},
	async setMode(mode: { shadowMode?: boolean; agentsPaused?: boolean }): Promise<SellerProfile> {
		return unwrap(await loyaltyApiClient.put({ url: "/smm/setup/profile/mode", data: mode }));
	},

	// Step 6: delivery zones and sets
	async zones(): Promise<DeliveryZone[]> {
		return unwrap(await loyaltyApiClient.get({ url: "/smm/setup/zones" }));
	},
	async saveZone(zone: DeliveryZone): Promise<DeliveryZone> {
		return unwrap(await loyaltyApiClient.post({ url: "/smm/setup/zones", data: zone }));
	},
	async removeZone(id: number): Promise<void> {
		unwrap(await loyaltyApiClient.delete({ url: `/smm/setup/zones/${id}` }));
	},
	async sets(): Promise<ProductSet[]> {
		return unwrap(await loyaltyApiClient.get({ url: "/smm/setup/sets" }));
	},
	async saveSet(set: {
		id?: number;
		name: string;
		itemCodes: string[];
		setPrice: number;
		optionalItemCodes: string[];
	}): Promise<ProductSet> {
		return unwrap(await loyaltyApiClient.post({ url: "/smm/setup/sets", data: set }));
	},
	async removeSet(id: number): Promise<void> {
		unwrap(await loyaltyApiClient.delete({ url: `/smm/setup/sets/${id}` }));
	},

	// Step 7: catalogue check
	async catalogue(): Promise<CatalogueItem[]> {
		return unwrap(await loyaltyApiClient.get({ url: "/smm/setup/catalogue" }));
	},
	/** Name, price and stock can only be changed here on the SokoReply-only plan (others use Inventory). */
	async saveItem(id: number, changes: Partial<Omit<CatalogueItem, "id" | "itemCode">>): Promise<CatalogueItem> {
		return unwrap(await loyaltyApiClient.put({ url: `/smm/setup/catalogue/${id}`, data: changes }));
	},
	/** SokoReply-only plan: add a product (each colour/size is its own row). */
	async addItem(item: NewCatalogueItem): Promise<CatalogueItem> {
		return unwrap(await loyaltyApiClient.post({ url: "/smm/setup/catalogue", data: item }));
	},

	// Step 8: tag products on Reels
	async posts(): Promise<{ data: SocialPost[]; message: string }> {
		return unwrapWithMessage(await loyaltyApiClient.get({ url: "/smm/setup/posts" }));
	},
	async tagPost(postId: string, itemCodes: string[]): Promise<string[]> {
		return unwrap(
			await loyaltyApiClient.put({ url: `/smm/setup/posts/${encodeURIComponent(postId)}/items`, data: { itemCodes } }),
		);
	},

	// Step 9: voice
	async importVoice(): Promise<{ data: SellerProfile; message: string }> {
		return unwrapWithMessage(await loyaltyApiClient.post({ url: "/smm/setup/voice/import" }));
	},

	// Comments, handovers, leads
	async comments(page = 0, filters: CommentFilters = {}): Promise<Paged<CommentRow>> {
		return unwrap(await loyaltyApiClient.get({ url: "/smm/comments", params: { page, size: 50, ...filters } }));
	},
	async commentPosts(): Promise<{ postId: string; comments: number }[]> {
		return unwrap(await loyaltyApiClient.get({ url: "/smm/comments/posts" }));
	},
	async replyRate(days = 30): Promise<ReplyRate> {
		return unwrap(await loyaltyApiClient.get({ url: "/smm/reply-rate", params: { days } }));
	},
	async handovers(): Promise<{ handover: SmmHandover; comment: SmmComment | null }[]> {
		return unwrap(await loyaltyApiClient.get({ url: "/smm/handovers" }));
	},
	async handoverDone(id: number, outcome: string): Promise<void> {
		unwrap(await loyaltyApiClient.post({ url: `/smm/handovers/${id}/done`, data: { outcome } }));
	},
	async leads(page = 0, filters: LeadFilters = {}): Promise<Paged<Lead>> {
		return unwrap(await loyaltyApiClient.get({ url: "/smm/leads", params: { page, size: 50, ...filters } }));
	},
};

export default smmService;
