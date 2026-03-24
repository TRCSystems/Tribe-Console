// src/api/services/inventoryService.ts - FINAL UPDATED VERSION WITH EXPENSE API FIXES
import { loyaltyApiClient } from "@/api/apiClient";
import useUserStore from "@/store/userStore";

export interface StockItemRequest {
	inventoryId: number;
	quantity: number;
}

export interface StockRequest {
	merchantId: string;
	items: StockItemRequest[];
}

// UPDATED: Added discount field to SaleItemRequest
export interface SaleItemRequest {
	inventoryId: number;
	quantity: number;
	discount?: number; // NEW: Extra amount to add (positive = price increase)
}

export interface SaleRequest {
	merchantId: string;
	customerPhone?: string;
	items: SaleItemRequest[];
}

export interface ExpenseData {
	merchantId: string;
	amount: string; // Changed from number to string to match API
	narration: string; // Changed from note to narration
}

export interface ExpenseRecord {
	id?: number;
	merchantId: string;
	amount: string;
	narration: string;
	createdAt?: string;
	updatedAt?: string;
	[key: string]: any;
}

export interface InventoryItem {
	id: number;
	merchantId: string;
	itemName: string;
	itemCode: string;
	startingStock: number;
	addedStock: number;
	soldStock: number;
	availableStock: number;
	closingStock: number;
	totalSales: number;
	grossSales: number;
	netlSales: number;
	deductions: number;
	unitCost: number;
	unitPrice: number;
	expenseNote: string;
	isActive: boolean;
	metaRetailerId?: string;
	metaSynced?: boolean;
	metaLastSyncAt?: string;
	productImageUrl?: string;
	productDescription?: string;
	productCategory?: string;
	productBrand?: string;
	recordDate: string;
}

export interface DailySummaryResponse {
	netSales: number;
	grossSales: number;
	deductions: number;
	[key: string]: any;
}

export interface WeeklyAnalyticsResponse {
	statusCode: number;
	status: string;
	data: {
		grossSales: number;
		dailyTrend: Array<{
			id: number;
			merchantId: string;
			recordDate: string;
			grossSales: number;
			deductions: number;
			netSales: number;
			createdAt: string;
			updatedAt: string | null;
		}>;
		deductions: number;
		netSales: number;
	};
	message: string;
	range: {
		start: string;
		end: string;
	};
}

export interface SaleResponse {
	success: boolean;
	totalAmount: number;
	itemsSold: number;
	transactionId?: string;
}

export interface StockResponse {
	success: boolean;
	message: string;
	updatedItems: number;
}

export interface CloseDayRequest {
	merchantId: string;
}

export interface InitiateCloseDayResponse {
	success: boolean;
	message: string;
	otpSent: boolean;
	merchantPhone?: string;
}

export interface FinalizeCloseDayRequest {
	merchantId: string;
	otp: string;
}

export interface CloseDayResponse {
	success: boolean;
	closedDate: string;
	message?: string;
}

export interface ExpenseResponse {
	status?: string;
	message?: string;
	respObject?: any;
	[key: string]: any;
}

export interface UpdateItemRequest {
	merchantId: string;
	itemName?: string;
	quantity?: number;
	unitPrice?: number;
}

export interface DeleteItemRequest {
	merchantId: string;
}

export interface UpdateItemResponse {
	success: boolean;
	message?: string;
	updatedItem?: InventoryItem;
}

export interface DeleteItemResponse {
	success: boolean;
	message?: string;
	deletedItemId?: number;
}

export interface SoldItem {
	itemName: string;
	customerPhone: string;
	quantity: number;
	totalPrice: number;
	itemCode: string;
	transactionRef: string;
}

export interface SummaryByItem {
	timesSold: number;
	totalAmount: number;
	itemName: string;
	totalQuantity: number;
	itemCode: string;
}

export interface SoldItemsResponse {
	totalItemsSold: number;
	status: string;
	items: SoldItem[];
	summaryByItem?: SummaryByItem[];
	totalSalesAmount: number;
	numberOfTransactions: number;
	merchantId: string;
	date: string;
}

// Product defaults (template) interfaces
export interface ProductDefault {
	productName: string;
	productCode: string;
	volumeMl: number;
}

export interface BatchAddDefaultsSelection {
	productName: string;
	productCode: string;
	volumeMl: number;
	startingStock: number;
	unitPrice: number;
}

export interface BatchAddDefaultsRequest {
	merchantId: string;
	selections: BatchAddDefaultsSelection[];
}

export interface BatchAddDefaultsResponse {
	status?: string;
	message?: string;
	respObject?: any;
	success?: boolean;
}

export interface MerchantDetails {
	id: number;
	businessPhone: string;
	businessName: string;
	location: string;
	tillNumber: string;
	businessType: string;
	createdAt: string;
	merchantOtp?: string;
	metaConnected?: boolean;
	facebookPageId?: string;
	facebookPageToken?: string;
	facebookUserToken?: string;
	instagramBusinessAccountId?: string;
	metaCatalogId?: string;
	metaCommerceMerchantSettingsId?: string;
	metaTokenExpiresAt?: string;
	metaSyncEnabled?: boolean;
	metaLastSyncAt?: string;
	metaSyncError?: string;
}

export interface InvoiceUploadResponse {
	data?: {
		items?: Array<{
			rawName?: string;
			normalizedName?: string;
			quantity?: number;
			unitCost?: number;
			lineTotal?: number;
		}>;
	};
	invoiceSubmissionId?: string;
	success?: boolean;
	confidence?: number;
	realMerchantId?: string;
	message?: string;
	status?: string;
}

export interface ApproveInvoiceRequest {
	invoiceSubmissionId: string;
	merchantId: string;
	items: Array<{
		rawName: string;
		quantity: number;
		unitCost: number;
		lineTotal: number;
	}>;
}

const getMerchantId = (): string => {
	const state = useUserStore.getState();
	const merchantId = state.merchantId;

	if (!merchantId) {
		console.error("❌ No merchant ID found in user store");
		throw new Error("Merchant ID not available. Please login again.");
	}

	return merchantId;
};

class InventoryService {
	async getMerchantPhone(): Promise<string> {
		const merchantId = getMerchantId();

		console.group("📱 Fetching Merchant Phone");
		console.log("Merchant ID:", merchantId);

		try {
			const merchantDetails = await loyaltyApiClient.get<MerchantDetails>({
				url: `/merchants/${merchantId}`,
			});

			console.log("✅ Merchant details:", merchantDetails);

			if (!merchantDetails?.businessPhone) {
				console.warn("⚠️ No business phone found in merchant details");
				console.groupEnd();
				return "";
			}

			const phone = merchantDetails.businessPhone;
			console.log("✅ Merchant phone found:", phone);
			console.groupEnd();

			return phone;
		} catch (error: any) {
			console.error("❌ Failed to fetch merchant phone:", error);
			console.error("Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();
			return "";
		}
	}

	/**
	 * Get merchant details including phone number - FIXED VERSION
	 */
	async getMerchantDetails(): Promise<MerchantDetails> {
		const merchantId = getMerchantId();

		console.group("🏪 Fetching Merchant Details");
		console.log("Merchant ID:", merchantId);

		try {
			const response = await loyaltyApiClient.get<any>({
				url: `/merchants/${merchantId}`,
			});

			console.log("✅ Merchant details API response:", response);

			// Handle different response formats
			let merchantDetails: MerchantDetails;

			if (response?.data) {
				merchantDetails = response.data;
			} else if (response?.respObject) {
				merchantDetails = response.respObject;
			} else if (response && typeof response === "object") {
				merchantDetails = response as MerchantDetails;
			} else {
				throw new Error("Invalid merchant details response format");
			}

			console.log("✅ Processed merchant details:", merchantDetails);
			console.groupEnd();

			return merchantDetails;
		} catch (error: any) {
			console.error("❌ Failed to fetch merchant details:", error);
			console.error("❌ Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();
			throw error;
		}
	}

	// Fetch product templates (defaults)
	async getProductDefaults(): Promise<ProductDefault[]> {
		console.group("📦 Get Product Defaults API Call");
		try {
			const response = await loyaltyApiClient.get<{ data?: ProductDefault[] } | ProductDefault[]>({
				url: "/inventory/product-defaults",
			});

			let defaults: ProductDefault[] = [];
			if (Array.isArray(response)) {
				defaults = response as ProductDefault[];
			} else if (response && Array.isArray((response as any).data)) {
				defaults = (response as any).data as ProductDefault[];
			}

			console.log("✅ Product defaults:", defaults.length);
			console.groupEnd();
			return defaults;
		} catch (error: any) {
			console.error("❌ Product defaults fetch failed:", error);
			console.error("Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();
			throw error;
		}
	}

	// Batch add selected defaults for a merchant
	async batchAddDefaults(data: Omit<BatchAddDefaultsRequest, "merchantId">): Promise<BatchAddDefaultsResponse> {
		const merchantId = getMerchantId();

		console.group("🛒 Batch Add Defaults API Call");
		console.log("Request selections:", data?.selections?.length || 0);

		if (!data?.selections || data.selections.length === 0) {
			throw new Error("Please select at least one product template");
		}

		const requestBody: BatchAddDefaultsRequest = {
			merchantId,
			selections: data.selections.map((item) => ({
				...item,
				startingStock: Number(item.startingStock),
				unitPrice: Number(item.unitPrice),
			})),
		};

		try {
			const response = await loyaltyApiClient.post<BatchAddDefaultsResponse>({
				url: "/inventory/batch-add-defaults",
				data: requestBody,
			});
			console.log("✅ Batch add defaults response:", response);
			console.groupEnd();
			return response;
		} catch (error: any) {
			console.error("❌ Batch add defaults error:", error);
			console.error("Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();

			if (error.response?.data?.message) {
				throw new Error(error.response.data.message);
			} else if (error.response?.data?.error) {
				throw new Error(error.response.data.error);
			}
			throw error;
		}
	}

	async addStock(data: Omit<StockRequest, "merchantId">): Promise<StockResponse> {
		const merchantId = getMerchantId();

		const requestData: StockRequest = {
			merchantId,
			items: data.items,
		};

		return loyaltyApiClient.post({
			url: "/inventory/add-stock",
			data: requestData,
		});
	}

	async recordExpense(data: Omit<ExpenseData, "merchantId">): Promise<ExpenseResponse> {
		const merchantId = getMerchantId();

		console.group("💰 Record Expense API Call");
		console.log("📦 Expense Request Data:", { merchantId, ...data });

		if (!data.amount || data.amount.trim() === "") {
			throw new Error("Valid amount is required");
		}

		if (!data.narration || data.narration.trim() === "") {
			throw new Error("Expense narration/description is required");
		}

		try {
			console.log("🚀 Sending request to /inventory/expense...");

			const requestData: ExpenseData = {
				merchantId,
				amount: data.amount.trim(), // Keep as string
				narration: data.narration.trim(),
			};

			const response = await loyaltyApiClient.post<ExpenseResponse>({
				url: "/inventory/expense",
				data: requestData,
			});

			console.log("✅ Expense API Response:", response);
			console.groupEnd();

			return response;
		} catch (error: any) {
			console.error("❌ Expense API Error:", error);
			console.error("❌ Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();

			if (error.response?.data?.message) {
				throw new Error(error.response.data.message);
			} else if (error.response?.data?.error) {
				throw new Error(error.response.data.error);
			}
			throw error;
		}
	}

	async getExpenses(date?: string): Promise<ExpenseRecord[]> {
		const merchantId = getMerchantId();

		console.group("💰 Get Expenses API Call");
		console.log("📦 Get Expenses Request:", { merchantId, date });

		if (!date) {
			// Default to today's date in YYYY-MM-DD format
			date = new Date().toISOString().split("T")[0];
		}

		try {
			console.log("🚀 Sending request to /inventory/expenses...");

			const response = await loyaltyApiClient.get<any>({
				url: "/inventory/expenses",
				params: {
					merchantId: merchantId,
					date: date,
				},
			});

			console.log("✅ Get Expenses API Response:", response);
			console.groupEnd();

			// Handle different response formats
			let expenses: ExpenseRecord[] = [];

			if (Array.isArray(response)) {
				expenses = response;
			} else if (response?.respObject && Array.isArray(response.respObject)) {
				expenses = response.respObject;
			} else if (response?.data && Array.isArray(response.data)) {
				expenses = response.data;
			} else if (response && typeof response === "object") {
				// Try to find array in response
				const possibleArrays = Object.values(response).filter((val) => Array.isArray(val));
				if (possibleArrays.length > 0) {
					expenses = possibleArrays[0];
				} else {
					// Maybe it's a single expense object
					expenses = [response];
				}
			}

			return expenses;
		} catch (error: any) {
			console.error("❌ Get Expenses API Error:", error);
			console.error("❌ Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();

			// Return empty array instead of throwing so UI doesn't break
			return [];
		}
	}

	async recordDeduction(inventoryId: number, amount: number): Promise<InventoryItem> {
		return loyaltyApiClient.put({
			url: `/inventory/${inventoryId}/deduction`,
			params: { amount },
		});
	}

	async importInventory(file: File): Promise<{ success: boolean; imported: number }> {
		const merchantId = getMerchantId();

		const formData = new FormData();
		formData.append("file", file);

		return loyaltyApiClient.post({
			url: "/inventory/import",
			params: { merchantId },
			data: formData,
			headers: { "Content-Type": "multipart/form-data" },
		});
	}

	// START TEMPORARY FIX: DUPLICATE ITEM FILTERING

	private filterDuplicateItems(items: InventoryItem[]): InventoryItem[] {
		if (!items || items.length === 0) return [];
		const itemsByKey = new Map<string, InventoryItem[]>();
		items.forEach((item) => {
			const key = (item.itemCode || item.itemName).toLowerCase().trim();
			if (!itemsByKey.has(key)) {
				itemsByKey.set(key, []);
			}
			itemsByKey.get(key)?.push(item);
		});

		const result: InventoryItem[] = [];
		itemsByKey.forEach((duplicateItems, _key) => {
			if (duplicateItems.length > 1) {
				duplicateItems.sort((a, b) => a.id - b.id);
				result.push(duplicateItems[0]);
			} else {
				result.push(duplicateItems[0]);
			}
		});

		return result;
	}

	async getAllItems(merchantId?: string): Promise<InventoryItem[]> {
		const currentMerchantId = merchantId || getMerchantId();

		return loyaltyApiClient
			.get<any>({
				url: "/inventory/all",
				params: { merchantId: currentMerchantId },
			})
			.then((response) => {
				console.log("📦 Inventory API raw response:", response);

				let items: InventoryItem[] = [];

				if (Array.isArray(response)) {
					items = response;
				} else if (response?.respObject && Array.isArray(response.respObject)) {
					items = response.respObject;
				} else if (response?.data && Array.isArray(response.data)) {
					items = response.data;
				} else if (response && typeof response === "object") {
					const possibleArrays = Object.values(response).filter((val) => Array.isArray(val));
					if (possibleArrays.length > 0) {
						items = possibleArrays[0];
					}
				}

				// Apply duplicate filtering
				const filteredItems = this.filterDuplicateItems(items);

				return filteredItems;
			})
			.catch((error) => {
				console.error("📦 Inventory API error:", error);
				return [];
			});
	}

	// END: DUPLICATE ITEM FILTERING

	async listMenu(): Promise<InventoryItem[]> {
		return this.getAllItems();
	}

	async recordSale(data: Omit<SaleRequest, "merchantId">): Promise<SaleResponse> {
		const merchantId = getMerchantId();

		console.group("🛒 Record Sale API Call");
		console.log("📦 Sale Request Data (Final):", JSON.stringify({ merchantId, ...data }, null, 2));

		if (!data.items || data.items.length === 0) {
			throw new Error("Sale items are required");
		}

		const invalidItems = data.items.filter(
			(item) => !item.inventoryId || item.inventoryId <= 0 || !item.quantity || item.quantity <= 0,
		);

		if (invalidItems.length > 0) {
			console.error("❌ Invalid sale items:", invalidItems);
			throw new Error(`Invalid items found: ${invalidItems.length} items have invalid data`);
		}

		try {
			console.log("🚀 Sending request to /inventory/sale...");

			let customerPhone = data.customerPhone;

			if (customerPhone && customerPhone.trim() !== "") {
				const cleanedPhone = customerPhone.replace(/\s+/g, "");
				const phoneRegex = /^254[17]\d{8}$/;

				if (!phoneRegex.test(cleanedPhone)) {
					throw new Error("Please enter a valid Kenyan phone number (format: 254XXXXXXXXX) or leave empty");
				}
				customerPhone = cleanedPhone;
			} else {
				customerPhone = "";
			}

			const requestData: SaleRequest = {
				merchantId,
				customerPhone: customerPhone,
				items: data.items.map((item) => ({
					inventoryId: item.inventoryId,
					quantity: item.quantity,
					discount: item.discount || 0, // Include discount field
				})),
			};

			console.log("📤 Final request data:", requestData);

			const response = await loyaltyApiClient.post<SaleResponse>({
				url: "/inventory/sale",
				data: requestData,
			});

			console.log("✅ Sale API Response:", response);
			console.groupEnd();
			return response;
		} catch (error: any) {
			console.error("❌ Sale API Error:", error);
			console.error("❌ Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();

			if (error.response?.data?.message) {
				throw new Error(error.response.data.message);
			} else if (error.response?.data?.error) {
				throw new Error(error.response.data.error);
			}
			throw error;
		}
	}

	async processSale(data: Omit<SaleRequest, "merchantId">): Promise<SaleResponse> {
		return this.recordSale(data);
	}

	async getDailySalesSummary(date?: string): Promise<DailySummaryResponse> {
		const merchantId = getMerchantId();

		return loyaltyApiClient
			.get<any>({
				url: `/inventory/daily-summary/${merchantId}`,
				params: { date },
			})
			.then((response) => {
				console.log("📊 Daily Sales API response:", response);

				if (response?.data) {
					return response.data;
				} else if (response?.respObject) {
					return response.respObject;
				}
				return response;
			});
	}

	async initiateCloseDay(): Promise<InitiateCloseDayResponse> {
		const merchantId = getMerchantId();

		console.group("📱 Initiate Close Day API Call");
		console.log("📦 Merchant ID:", merchantId);

		try {
			const merchantPhone = await this.getMerchantPhone();

			console.log("🚀 Sending request to /inventory/initiate-close-day...");

			const requestData = {
				merchantId: merchantId,
				action: "initiate_close_day",
				timestamp: new Date().toISOString(),
			};

			console.log("📤 Request data:", requestData);

			const response = await loyaltyApiClient.post({
				url: "/inventory/initiate-close-day",
				data: requestData,
			});

			console.log("✅ Initiate Close Day API Response:", response);
			console.groupEnd();

			const responseObj = response as Record<string, unknown>;
			if (responseObj && typeof responseObj === "object") {
				if (responseObj.error || responseObj.status === "FAILED") {
					if ((responseObj.message as string)?.toLowerCase().includes("no sales recorded today")) {
						console.warn("⚠️ No sales recorded today, but OTP was sent:", responseObj.message);

						return {
							success: true,
							message:
								(responseObj.message as string) ||
								`OTP sent to ${merchantPhone || "your registered phone"} (No sales today)`,
							otpSent: true,
							merchantPhone: merchantPhone,
							...responseObj,
						};
					}

					throw new Error((responseObj.message as string) || (responseObj.error as string) || "Failed to send OTP");
				}

				return {
					success: true,
					message: (responseObj.message as string) || `OTP sent to ${merchantPhone || "your registered phone"}`,
					otpSent: true,
					merchantPhone: merchantPhone,
					...responseObj,
				};
			}

			return {
				success: true,
				message: `OTP sent to ${merchantPhone || "your registered phone"}`,
				otpSent: true,
				merchantPhone: merchantPhone,
			};
		} catch (error: any) {
			console.error("❌ Initiate Close Day API Error:", error);
			console.error("❌ Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();

			if (error.response?.status === 400) {
				const errorData = error.response.data || {};

				if (errorData.message?.toLowerCase().includes("no sales recorded")) {
					const merchantPhone = await this.getMerchantPhone();
					return {
						success: true,
						message: `OTP sent to ${merchantPhone || "your registered phone"}. Note: No sales recorded today.`,
						otpSent: true,
						merchantPhone: merchantPhone,
					};
				}

				throw new Error(errorData.message || "Invalid request format. Please try again.");
			}

			if (error.response?.status === 404) {
				throw new Error("Merchant not found. Please check your account.");
			}

			if (error.response?.status === 500) {
				throw new Error("Server error. Please try again later.");
			}

			if (error.response?.data?.message) {
				throw new Error(error.response.data.message);
			} else if (error.response?.data?.error) {
				throw new Error(error.response.data.error);
			}
			throw error;
		}
	}

	async finalizeCloseDay(otp: string): Promise<CloseDayResponse> {
		const merchantId = getMerchantId();

		console.group("🔒 Finalize Close Day API Call");
		console.log("📦 Merchant ID:", merchantId);
		console.log("📦 OTP:", otp);

		if (!otp || otp.trim() === "") {
			throw new Error("OTP is required to close the day");
		}

		const cleanOtp = otp.trim();
		if (!/^\d{4}$/.test(cleanOtp)) {
			throw new Error("OTP must be exactly 4 digits (e.g., 1234)");
		}

		try {
			console.log("🚀 Sending request to /inventory/close-day...");

			const requestData = {
				merchantId: merchantId,
				otpCode: cleanOtp,
				otp: cleanOtp,
				code: cleanOtp,
				timestamp: new Date().toISOString(),
			};

			console.log("📤 Request data (with multiple OTP fields):", requestData);

			const response = await loyaltyApiClient.post({
				url: "/inventory/close-day",
				data: requestData,
			});

			console.log("✅ Finalize Close Day API Response:", response);
			console.groupEnd();

			const responseObj = response as Record<string, unknown>;
			if (responseObj && typeof responseObj === "object") {
				if (responseObj.error || responseObj.status === "FAILED" || responseObj.statusCode === 400) {
					const errorMsg = (responseObj.message as string) || (responseObj.error as string) || "Failed to close day";

					if (
						errorMsg.toLowerCase().includes("null otp code") ||
						errorMsg.toLowerCase().includes("invalid otp") ||
						errorMsg.toLowerCase().includes("wrong otp")
					) {
						throw new Error("Invalid OTP. Please check and try again.");
					}

					if (errorMsg.toLowerCase().includes("no sales recorded today")) {
						return {
							success: true,
							closedDate: new Date().toISOString(),
							message: "Business day closed successfully with zero sales.",
							...responseObj,
						};
					}

					if (errorMsg.toLowerCase().includes("expired")) {
						throw new Error("OTP has expired. Please request a new one.");
					}

					if (errorMsg.toLowerCase().includes("already closed")) {
						throw new Error("Business day is already closed.");
					}

					throw new Error(errorMsg);
				}

				return {
					success: true,
					closedDate: (responseObj.closedDate as string) || new Date().toISOString(),
					message: (responseObj.message as string) || "Business day closed successfully!",
					...responseObj,
				};
			}

			return {
				success: true,
				closedDate: new Date().toISOString(),
				message: "Business day closed successfully!",
			};
		} catch (error: any) {
			console.error("❌ Finalize Close Day API Error:", error);
			console.error("❌ Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();

			if (error.response?.status === 400) {
				const errorData = error.response.data || {};
				const errorMsg = errorData.message || errorData.error || error.message;

				if (errorMsg.toLowerCase().includes("null otp code")) {
					throw new Error("Invalid OTP format. Please enter a valid 4-digit OTP.");
				}

				if (errorMsg.toLowerCase().includes("no sales recorded today")) {
					return {
						success: true,
						closedDate: new Date().toISOString(),
						message: "Business day closed successfully with zero sales.",
					};
				}

				if (errorMsg.toLowerCase().includes("invalid") || errorMsg.toLowerCase().includes("wrong")) {
					throw new Error("Invalid OTP. Please check and try again.");
				}

				throw new Error(errorMsg || "Invalid request. Please try again.");
			}

			if (error.response?.status === 403) {
				throw new Error("You are not authorized to close the day.");
			}

			if (error.response?.status === 409) {
				throw new Error("Day already closed or another closing is in progress.");
			}

			if (error.response?.data?.message) {
				throw new Error(error.response.data.message);
			} else if (error.response?.data?.error) {
				throw new Error(error.response.data.error);
			}
			throw error;
		}
	}

	async getWeeklyAnalytics(start?: string, end?: string): Promise<WeeklyAnalyticsResponse> {
		const merchantId = getMerchantId();

		console.log("📈 Weekly Analytics Request:", { merchantId, start, end });

		return loyaltyApiClient
			.get<any>({
				url: "/inventory/weekly",
				params: {
					merchantId: merchantId,
					start: start,
					end: end,
				},
			})
			.then((response) => {
				console.log("📈 Weekly Analytics API response:", response);
				return response;
			})
			.catch((error) => {
				console.error("❌ Weekly Analytics API error:", error);
				throw error;
			});
	}

	async getMerchantReport(): Promise<number> {
		const merchantId = getMerchantId();

		const merchantIdNum = parseInt(merchantId.replace(/\D/g, "") || "0");

		return loyaltyApiClient.get({
			url: `/inventory/report/${merchantIdNum}`,
		});
	}

	getCurrentMerchantId(): string {
		return getMerchantId();
	}

	async updateItem(inventoryId: number, data: Omit<UpdateItemRequest, "merchantId">): Promise<UpdateItemResponse> {
		const merchantId = getMerchantId();

		console.group("✏️ Update Item API Call");
		console.log("📦 Update Item Request:", { inventoryId, merchantId, ...data });

		if (!inventoryId || inventoryId <= 0) {
			throw new Error("Valid inventory ID is required");
		}

		if (data.quantity !== undefined && data.quantity < 0) {
			throw new Error("Quantity cannot be negative");
		}

		if (data.unitPrice !== undefined && data.unitPrice < 0) {
			throw new Error("Unit price cannot be negative");
		}

		try {
			console.log(`🚀 Sending PUT request to /inventory/${inventoryId}/update...`);

			const requestData: UpdateItemRequest = {
				merchantId,
				...data,
			};

			const response = await loyaltyApiClient.put({
				url: `/inventory/${inventoryId}/update`,
				data: requestData,
			});

			console.log("✅ Update Item API Response:", response);
			console.groupEnd();

			const responseObj = response as unknown as InventoryItem;
			return {
				success: true,
				message: "Item updated successfully",
				updatedItem: responseObj,
			};
		} catch (error: any) {
			console.error("❌ Update Item API Error:", error);
			console.error("❌ Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();

			if (error.response?.data?.message) {
				throw new Error(error.response.data.message);
			} else if (error.response?.data?.error) {
				throw new Error(error.response.data.error);
			}
			throw error;
		}
	}

	async deleteItem(inventoryId: number): Promise<DeleteItemResponse> {
		const merchantId = getMerchantId();

		console.group("🗑️ Delete Item API Call");
		console.log("📦 Delete Item Request:", { inventoryId, merchantId });

		if (!inventoryId || inventoryId <= 0) {
			throw new Error("Valid inventory ID is required");
		}

		try {
			console.log(`🚀 Sending DELETE request to /inventory/${inventoryId}/hard...`);

			const requestData: DeleteItemRequest = {
				merchantId,
			};

			const response = await loyaltyApiClient.delete({
				url: `/inventory/${inventoryId}/hard`,
				data: requestData,
			});

			console.log("✅ Delete Item API Response:", response);
			console.groupEnd();

			return {
				success: true,
				message: "Item deleted successfully",
				deletedItemId: inventoryId,
			};
		} catch (error: any) {
			console.error("❌ Delete Item API Error:", error);
			console.error("❌ Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();

			if (error.response?.data?.message) {
				throw new Error(error.response.data.message);
			} else if (error.response?.data?.error) {
				throw new Error(error.response.data.error);
			}
			throw error;
		}
	}

	async getSoldItems(date?: string, merchantIdParam?: string): Promise<SoldItemsResponse> {
		const merchantId = merchantIdParam || getMerchantId();

		console.group("🛒 Get Sold Items API Call");
		console.log("📦 Sold Items Request:", { merchantId, date });

		if (!date) {
			date = new Date().toISOString().split("T")[0];
		}

		try {
			console.log(`🚀 Sending GET request to /inventory/sales/daily-items...`);

			const response = await loyaltyApiClient.get<SoldItemsResponse>({
				url: "/inventory/sales/daily-items",
				params: {
					merchantId: merchantId,
					date: date,
				},
			});

			console.log("✅ Sold Items API Response:", response);
			console.groupEnd();

			const processedResponse = {
				...response,
				summaryByItem: response.summaryByItem || [],
			};

			return processedResponse;
		} catch (error: any) {
			console.error("❌ Sold Items API Error:", error);
			console.error("❌ Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();

			return {
				totalItemsSold: 0,
				status: "ERROR",
				items: [],
				summaryByItem: [],
				totalSalesAmount: 0,
				numberOfTransactions: 0,
				merchantId: merchantId,
				date: date || new Date().toISOString().split("T")[0],
			};
		}
	}

	async uploadInvoice(file: File): Promise<InvoiceUploadResponse> {
		const merchantId = getMerchantId();

		console.group("📄 Invoice Upload API Call");
		console.log("📁 Invoice File:", file.name, file.size);

		if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
			throw new Error("Please select a valid PDF invoice file");
		}

		try {
			const formData = new FormData();
			formData.append("invoice_file", file);
			formData.append("merchant_id", merchantId);

			const response = await loyaltyApiClient.post<InvoiceUploadResponse>({
				url: "/invoices/upload",
				data: formData,
				headers: {
					"Content-Type": "multipart/form-data",
				},
			});

			console.log("✅ Invoice upload successful:", response);
			console.groupEnd();
			return response;
		} catch (error: any) {
			console.error("❌ Invoice upload failed:", error);
			console.error("❌ Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();

			if (error.response?.data?.message) {
				throw new Error(error.response.data.message);
			} else if (error.response?.data?.error) {
				throw new Error(error.response.data.error);
			}
			throw error;
		}
	}

	async approveInvoice(invoiceSubmissionId: string, items: any[]): Promise<{ success: boolean; message: string }> {
		const merchantId = getMerchantId();

		console.group("✅ Approve Invoice API Call");
		console.log("📦 Approve Invoice Request:", { invoiceSubmissionId, merchantId, items });

		// For now, simulate approval since API engineer will add this later
		// In production, replace with actual API call:
		// return loyaltyApiClient.post({
		//   url: "/invoices/approve",
		//   data: {
		//     invoiceSubmissionId,
		//     merchantId,
		//     items
		//   }
		// });

		return new Promise((resolve) => {
			setTimeout(() => {
				console.log("✅ Invoice approval simulated:", invoiceSubmissionId);
				console.groupEnd();
				resolve({
					success: true,
					message: "Invoice approved and items added to inventory",
				});
			}, 1500);
		});
	}
}

export default new InventoryService();
