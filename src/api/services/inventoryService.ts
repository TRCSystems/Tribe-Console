// src/api/services/inventoryService.ts - FINAL FIXED VERSION
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

export interface SaleItemRequest {
	inventoryId: number;
	quantity: number;
}

export interface SaleRequest {
	merchantId: string;
	customerPhone: string;
	items: SaleItemRequest[];
}

export interface ExpenseData {
	merchantId: string;
	amount: number;
	note: string;
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

export interface CloseDayResponse {
	success: boolean;
	closedDate: string;
	message?: string;
}

export interface ExpenseResponse {
	success?: boolean;
	message?: string;
	expenseId?: number;
	[key: string]: any;
}

// Helper function to get merchant ID from store
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
	/**
	 * Add stock to inventory
	 */
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

	/**
	 * Record an expense
	 */
	async recordExpense(data: Omit<ExpenseData, "merchantId">): Promise<ExpenseResponse> {
		const merchantId = getMerchantId();

		console.group("💰 Record Expense API Call");
		console.log("📦 Expense Request Data:", { merchantId, ...data });

		// Enhanced validation
		if (!data.amount || data.amount <= 0) {
			throw new Error("Valid amount is required");
		}

		if (!data.note || data.note.trim() === "") {
			throw new Error("Expense note/description is required");
		}

		try {
			console.log("🚀 Sending request to /inventory/expense...");

			const requestData: ExpenseData = {
				merchantId,
				amount: data.amount,
				note: data.note.trim(),
			};

			const response = await loyaltyApiClient.post({
				url: "/inventory/expense",
				data: requestData,
			});

			console.log("✅ Expense API Response:", response);
			console.groupEnd();

			// Handle different response formats
			if (typeof response === "object") {
				return {
					success: true,
					message: "Expense recorded successfully",
					...response,
				};
			}

			return {
				success: true,
				message: "Expense recorded successfully",
			};
		} catch (error: any) {
			console.error("❌ Expense API Error:", error);
			console.error("❌ Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();

			// Provide more specific error messages
			if (error.response?.data?.message) {
				throw new Error(error.response.data.message);
			} else if (error.response?.data?.error) {
				throw new Error(error.response.data.error);
			}
			throw error;
		}
	}

	/**
	 * Record deduction for an inventory item
	 */
	async recordDeduction(inventoryId: number, amount: number): Promise<InventoryItem> {
		return loyaltyApiClient.put({
			url: `/inventory/${inventoryId}/deduction`,
			params: { amount },
		});
	}

	/**
	 * Import inventory from file
	 */
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

	/**
	 * Get all inventory items for the current merchant
	 */
	async getAllItems(): Promise<InventoryItem[]> {
		const merchantId = getMerchantId();

		return loyaltyApiClient
			.get<any>({
				url: "/inventory/all",
				params: { merchantId },
			})
			.then((response) => {
				console.log("📦 Inventory API raw response:", response);

				// Handle different response formats
				if (Array.isArray(response)) {
					return response;
				} else if (response?.respObject && Array.isArray(response.respObject)) {
					return response.respObject;
				} else if (response?.data && Array.isArray(response.data)) {
					return response.data;
				} else if (response && typeof response === "object") {
					const possibleArrays = Object.values(response).filter((val) => Array.isArray(val));
					if (possibleArrays.length > 0) {
						return possibleArrays[0];
					}
				}

				console.warn("📦 Inventory API returned unexpected format, returning empty array:", response);
				return [];
			})
			.catch((error) => {
				console.error("📦 Inventory API error:", error);
				return [];
			});
	}

	// ALIAS for getAllItems for POS compatibility
	async listMenu(): Promise<InventoryItem[]> {
		return this.getAllItems();
	}

	/**
	 * Record a sale
	 */
	async recordSale(data: Omit<SaleRequest, "merchantId">): Promise<SaleResponse> {
		const merchantId = getMerchantId();

		console.group("🛒 Record Sale API Call");
		console.log("📦 Sale Request Data (Final):", JSON.stringify({ merchantId, ...data }, null, 2));

		// Enhanced validation
		if (!data.customerPhone || data.customerPhone.trim() === "") {
			throw new Error("Customer phone number is required");
		}

		// Validate phone number format (Kenyan format: 254XXXXXXXXX)
		const phoneRegex = /^254[17]\d{8}$/;
		const cleanedPhone = data.customerPhone.replace(/\s+/g, "");
		if (!phoneRegex.test(cleanedPhone)) {
			throw new Error("Please enter a valid Kenyan phone number (format: 254XXXXXXXXX)");
		}

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

			const requestData: SaleRequest = {
				merchantId,
				customerPhone: cleanedPhone,
				items: data.items.map((item) => ({
					inventoryId: item.inventoryId,
					quantity: item.quantity,
				})),
			};

			const response = await loyaltyApiClient.post({
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

			// Provide more specific error messages
			if (error.response?.data?.message) {
				throw new Error(error.response.data.message);
			} else if (error.response?.data?.error) {
				throw new Error(error.response.data.error);
			}
			throw error;
		}
	}

	// ALIAS for recordSale for POS compatibility
	async processSale(data: Omit<SaleRequest, "merchantId">): Promise<SaleResponse> {
		return this.recordSale(data);
	}

	/**
	 * Get daily sales summary for the current merchant
	 */
	async getDailySalesSummary(date?: string): Promise<DailySummaryResponse> {
		const merchantId = getMerchantId();

		return loyaltyApiClient
			.get<any>({
				url: `/inventory/daily-summary/${merchantId}`,
				params: { date },
			})
			.then((response) => {
				console.log("📊 Daily Sales API response:", response);

				// Handle different response structures
				if (response?.data) {
					return response.data;
				} else if (response?.respObject) {
					return response.respObject;
				}
				return response;
			});
	}

	/**
	 * Close day for the current merchant
	 */
	async closeDay(): Promise<CloseDayResponse> {
		const merchantId = getMerchantId();

		const requestData: CloseDayRequest = {
			merchantId,
		};

		return loyaltyApiClient.post({
			url: "/inventory/close-day",
			data: requestData,
		});
	}

	/**
	 * Get weekly analytics for the current merchant - FIXED PARAMETERS
	 */
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

	/**
	 * Get merchant report
	 */
	async getMerchantReport(): Promise<number> {
		const merchantId = getMerchantId();

		// Convert string merchantId to number if needed by the API
		const merchantIdNum = parseInt(merchantId.replace(/\D/g, "") || "0");

		return loyaltyApiClient.get({
			url: `/inventory/report/${merchantIdNum}`,
		});
	}

	/**
	 * Get current merchant ID (for components that need it)
	 */
	getCurrentMerchantId(): string {
		return getMerchantId();
	}
}

export default new InventoryService();
