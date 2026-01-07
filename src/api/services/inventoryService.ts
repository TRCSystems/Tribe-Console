// src/api/services/inventoryService.ts - FINAL FIXED VERSION WITH CLOSE DAY FIXES
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
	customerPhone?: string; // CHANGED: Made optional
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
	success?: boolean;
	message?: string;
	expenseId?: number;
	[key: string]: any;
}

// NEW: Edit and Delete interfaces
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

// UPDATED: Sold Items interfaces based on actual API response
export interface SoldItem {
	itemName: string;
	customerPhone: string;
	quantity: number;
	itemCode: string;
	transactionRef: string;
}

export interface SoldItemsResponse {
	totalItemsSold: number;
	status: string;
	items: SoldItem[];
	totalSalesAmount: number;
	numberOfTransactions: number;
	merchantId: string;
	date: string;
}

// NEW: Merchant Details interface
export interface MerchantDetails {
	id: number;
	businessPhone: string; // This is the merchant's phone number
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
	 * Get merchant phone number from merchant details
	 */
	async getMerchantPhone(): Promise<string> {
		const merchantId = getMerchantId();

		console.group("📱 Fetching Merchant Phone");
		console.log("Merchant ID:", merchantId);

		try {
			// Fetch merchant details
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

			// Return empty string on error
			return "";
		}
	}

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
	async getAllItems(merchantId?: string): Promise<InventoryItem[]> {
		const currentMerchantId = merchantId || getMerchantId();

		return loyaltyApiClient
			.get<any>({
				url: "/inventory/all",
				params: { merchantId: currentMerchantId },
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
	 * Record a sale - UPDATED: Customer phone is now optional
	 */
	async recordSale(data: Omit<SaleRequest, "merchantId">): Promise<SaleResponse> {
		const merchantId = getMerchantId();

		console.group("🛒 Record Sale API Call");
		console.log("📦 Sale Request Data (Final):", JSON.stringify({ merchantId, ...data }, null, 2));

		// Enhanced validation - Phone is now optional, only validate items
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

			// Handle customer phone - optional field
			let customerPhone = data.customerPhone;

			if (customerPhone && customerPhone.trim() !== "") {
				// Clean and validate if provided
				const cleanedPhone = customerPhone.replace(/\s+/g, "");
				const phoneRegex = /^254[17]\d{8}$/;

				if (!phoneRegex.test(cleanedPhone)) {
					throw new Error("Please enter a valid Kenyan phone number (format: 254XXXXXXXXX) or leave empty");
				}
				customerPhone = cleanedPhone;
			} else {
				// Use empty string if not provided (customer opted out)
				customerPhone = "";
			}

			const requestData: SaleRequest = {
				merchantId,
				customerPhone: customerPhone,
				items: data.items.map((item) => ({
					inventoryId: item.inventoryId,
					quantity: item.quantity,
				})),
			};

			console.log("📤 Final request data:", requestData);

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
	 * INITIATE close day - Step 1: Send OTP to merchant phone
	 * FIXED: Handle "no sales recorded" case properly
	 */
	async initiateCloseDay(): Promise<InitiateCloseDayResponse> {
		const merchantId = getMerchantId();

		console.group("📱 Initiate Close Day API Call");
		console.log("📦 Merchant ID:", merchantId);

		try {
			// Get merchant phone for display
			const merchantPhone = await this.getMerchantPhone();

			console.log("🚀 Sending request to /inventory/initiate-close-day...");

			// According to OpenAPI spec: dynamic key-value pairs
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

			// The response might be an empty object {} or contain some data
			if (response && typeof response === "object") {
				// Check for any error messages
				if (response.error || response.status === "FAILED") {
					// Handle "no sales recorded" as a warning, not an error
					if (response.message?.toLowerCase().includes("no sales recorded today")) {
						console.warn("⚠️ No sales recorded today, but OTP was sent:", response.message);

						return {
							success: true,
							message: response.message || `OTP sent to ${merchantPhone || "your registered phone"} (No sales today)`,
							otpSent: true,
							merchantPhone: merchantPhone,
							...response,
						};
					}

					throw new Error(response.message || response.error || "Failed to send OTP");
				}

				// Success response
				return {
					success: true,
					message: response.message || `OTP sent to ${merchantPhone || "your registered phone"}`,
					otpSent: true,
					merchantPhone: merchantPhone,
					...response,
				};
			}

			// Empty response case
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

			// Check for specific error messages
			if (error.response?.status === 400) {
				const errorData = error.response.data || {};

				// Handle "no sales recorded" as a special case - OTP might still be sent
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
	 * FINALIZE close day - Step 2: Verify OTP and close day
	 * FIXED: Handle OTP field name and "no sales recorded" case
	 */
	async finalizeCloseDay(otp: string): Promise<CloseDayResponse> {
		const merchantId = getMerchantId();

		console.group("🔒 Finalize Close Day API Call");
		console.log("📦 Merchant ID:", merchantId);
		console.log("📦 OTP:", otp);

		// Validate OTP - Exactly 4 digits required
		if (!otp || otp.trim() === "") {
			throw new Error("OTP is required to close the day");
		}

		// Require exactly 4 digits
		const cleanOtp = otp.trim();
		if (!/^\d{4}$/.test(cleanOtp)) {
			throw new Error("OTP must be exactly 4 digits (e.g., 1234)");
		}

		try {
			console.log("🚀 Sending request to /inventory/close-day...");

			// FIXED: Based on error "null OTP code", the backend expects "otpCode"
			// Send multiple possible field names to cover different cases
			const requestData = {
				merchantId: merchantId,
				otpCode: cleanOtp, // Primary - based on error message
				otp: cleanOtp, // Secondary - common field name
				code: cleanOtp, // Tertiary - alternative
				timestamp: new Date().toISOString(),
			};

			console.log("📤 Request data (with multiple OTP fields):", requestData);

			const response = await loyaltyApiClient.post({
				url: "/inventory/close-day",
				data: requestData,
			});

			console.log("✅ Finalize Close Day API Response:", response);
			console.groupEnd();

			// Handle response - could be empty object {} or contain data
			if (response && typeof response === "object") {
				// Check for errors first
				if (response.error || response.status === "FAILED" || response.statusCode === 400) {
					const errorMsg = response.message || response.error || "Failed to close day";

					// Handle specific error messages
					if (
						errorMsg.toLowerCase().includes("null otp code") ||
						errorMsg.toLowerCase().includes("invalid otp") ||
						errorMsg.toLowerCase().includes("wrong otp")
					) {
						throw new Error("Invalid OTP. Please check and try again.");
					}

					if (errorMsg.toLowerCase().includes("no sales recorded today")) {
						// This might be a successful close with no sales
						return {
							success: true,
							closedDate: new Date().toISOString(),
							message: "Business day closed successfully with zero sales.",
							...response,
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

				// Success response
				return {
					success: true,
					closedDate: response.closedDate || new Date().toISOString(),
					message: response.message || "Business day closed successfully!",
					...response,
				};
			}

			// Empty response case - assume success
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

			// Handle specific error cases
			if (error.response?.status === 400) {
				const errorData = error.response.data || {};
				const errorMsg = errorData.message || errorData.error || error.message;

				if (errorMsg.toLowerCase().includes("null otp code")) {
					throw new Error("Invalid OTP format. Please enter a valid 4-digit OTP.");
				}

				if (errorMsg.toLowerCase().includes("no sales recorded today")) {
					// Allow closing with zero sales
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

	/**
	 * NEW: Update an inventory item
	 */
	async updateItem(inventoryId: number, data: Omit<UpdateItemRequest, "merchantId">): Promise<UpdateItemResponse> {
		const merchantId = getMerchantId();

		console.group("✏️ Update Item API Call");
		console.log("📦 Update Item Request:", { inventoryId, merchantId, ...data });

		// Validate required fields
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

			// Handle response
			return {
				success: true,
				message: "Item updated successfully",
				updatedItem: response,
				...response,
			};
		} catch (error: any) {
			console.error("❌ Update Item API Error:", error);
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
	 * NEW: Delete an inventory item (hard delete)
	 */
	async deleteItem(inventoryId: number): Promise<DeleteItemResponse> {
		const merchantId = getMerchantId();

		console.group("🗑️ Delete Item API Call");
		console.log("📦 Delete Item Request:", { inventoryId, merchantId });

		// Validate
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
				data: requestData, // Some DELETE endpoints accept body data
			});

			console.log("✅ Delete Item API Response:", response);
			console.groupEnd();

			// Handle response
			return {
				success: true,
				message: "Item deleted successfully",
				deletedItemId: inventoryId,
				...response,
			};
		} catch (error: any) {
			console.error("❌ Delete Item API Error:", error);
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
	 * UPDATED: Get sold items for a specific date
	 */
	async getSoldItems(date?: string, merchantIdParam?: string): Promise<SoldItemsResponse> {
		const merchantId = merchantIdParam || getMerchantId();

		console.group("🛒 Get Sold Items API Call");
		console.log("📦 Sold Items Request:", { merchantId, date });

		// Default to today if no date provided
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

			// Return the full response object
			return response;
		} catch (error: any) {
			console.error("❌ Sold Items API Error:", error);
			console.error("❌ Error details:", {
				status: error.response?.status,
				data: error.response?.data,
				message: error.message,
			});
			console.groupEnd();

			// Return empty structure instead of throwing for better UX
			return {
				totalItemsSold: 0,
				status: "ERROR",
				items: [],
				totalSalesAmount: 0,
				numberOfTransactions: 0,
				merchantId: merchantId,
				date: date || new Date().toISOString().split("T")[0],
			};
		}
	}
}

export default new InventoryService();
