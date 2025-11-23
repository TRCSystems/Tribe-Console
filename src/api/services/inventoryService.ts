// src/api/services/inventoryService.ts - CRITICAL FIXES
import { loyaltyApiClient } from "@/api/apiClient";

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

class InventoryService {
	async addStock(data: StockRequest): Promise<StockResponse> {
		return loyaltyApiClient.post({
			url: "/inventory/add-stock",
			data,
		});
	}

	async recordExpense(data: ExpenseData): Promise<{ success: boolean }> {
		return loyaltyApiClient.post({
			url: "/inventory/expense",
			data,
		});
	}

	async recordDeduction(inventoryId: number, amount: number): Promise<InventoryItem> {
		return loyaltyApiClient.put({
			url: `/inventory/${inventoryId}/deduction`,
			params: { amount },
		});
	}

	async importInventory(file: File, merchantId: string): Promise<{ success: boolean; imported: number }> {
		const formData = new FormData();
		formData.append("file", file);

		return loyaltyApiClient.post({
			url: "/inventory/import",
			params: { merchantId },
			data: formData,
			headers: { "Content-Type": "multipart/form-data" },
		});
	}

	async getAllItems(merchantId: string): Promise<InventoryItem[]> {
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
	async listMenu(merchantId: string): Promise<InventoryItem[]> {
		return this.getAllItems(merchantId);
	}

	// FIXED: Enhanced recordSale method with proper API alignment
	async recordSale(data: SaleRequest): Promise<SaleResponse> {
		console.group("🛒 Record Sale API Call");
		console.log("📦 Sale Request Data (Final):", JSON.stringify(data, null, 2));

		// FIXED: Enhanced validation
		if (!data.merchantId || data.merchantId.trim() === "") {
			throw new Error("Merchant ID is required");
		}

		if (!data.customerPhone || data.customerPhone.trim() === "") {
			throw new Error("Customer phone number is required");
		}

		// Validate phone number format (Kenyan format: 254XXXXXXXXX)
		const phoneRegex = /^254[17]\d{8}$/;
		if (!phoneRegex.test(data.customerPhone.replace(/\s+/g, ""))) {
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

			const response = await loyaltyApiClient.post({
				url: "/inventory/sale",
				data: {
					merchantId: data.merchantId,
					customerPhone: data.customerPhone,
					items: data.items.map((item) => ({
						inventoryId: item.inventoryId,
						quantity: item.quantity,
					})),
				},
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
	async processSale(data: SaleRequest): Promise<SaleResponse> {
		return this.recordSale(data);
	}

	async getDailySalesSummary(merchantId: string, date?: string): Promise<DailySummaryResponse> {
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

	async closeDay(data: CloseDayRequest): Promise<CloseDayResponse> {
		return loyaltyApiClient.post({
			url: "/inventory/close-day",
			data,
		});
	}

	async getWeeklyAnalytics(merchantId: string, start?: string, end?: string): Promise<WeeklyAnalyticsResponse> {
		return loyaltyApiClient
			.get<any>({
				url: "/inventory/weekly",
				params: { merchantId, start, end },
			})
			.then((response) => {
				console.log("📈 Weekly Analytics API response:", response);
				return response;
			});
	}

	async getMerchantReport(merchantId: number): Promise<number> {
		return loyaltyApiClient.get({
			url: `/inventory/report/${merchantId}`,
		});
	}
}

export default new InventoryService();
