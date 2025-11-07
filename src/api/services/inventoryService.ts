// src/api/services/inventoryService.ts
import { loyaltyApiClient } from "@/api/apiClient";

export interface InventoryItem {
	id: number;
	name: string;
	quantity: number;
	price: number;
	category?: string;
	description?: string;
	createdAt?: string;
	updatedAt?: string;
}

export interface StockItem {
	inventoryId: number;
	quantity: number;
}

export interface SaleItem {
	inventoryId: number;
	quantity: number;
}

export interface ExpenseData {
	merchantId: string;
	amount: number;
	note: string;
}

export interface DailySummary {
	date: string;
	totalSales: number;
	totalExpenses: number;
	netProfit: number;
	itemsSold: number;
	revenue: number;
}

export interface WeeklyAnalytics {
	week: string;
	totalRevenue: number;
	totalExpenses: number;
	profit: number;
	topSellingItems: Array<{
		name: string;
		quantity: number;
		revenue: number;
	}>;
}

class InventoryService {
	// Add Stock
	async addStock(data: { merchantId: string; items: StockItem[] }) {
		return loyaltyApiClient.post({
			url: "/inventory/add-stock",
			data,
		});
	}

	// Add Expense
	async addExpense(data: ExpenseData) {
		return loyaltyApiClient.post({
			url: "/inventory/expense",
			data,
		});
	}

	// Import Inventory (file upload)
	async importInventory(formData: FormData) {
		return loyaltyApiClient.post({
			url: "/inventory/import",
			data: formData,
			headers: { "Content-Type": "multipart/form-data" },
		});
	}

	// List Menu/Inventory
	async listMenu() {
		return loyaltyApiClient.get({
			url: "/inventory/all",
		});
	}

	// Process Sale
	async processSale(data: { merchantId: string; items: SaleItem[] }) {
		return loyaltyApiClient.post({
			url: "/inventory/sale",
			data,
		});
	}

	// Get Daily Sales Summary
	async getDailySalesSummary(merchantId: string, date: string) {
		return loyaltyApiClient.get({
			url: `/inventory/daily-summary/${merchantId}?date=${date}`,
		});
	}

	// Close Books
	async closeBooks(merchantId: string) {
		return loyaltyApiClient.post({
			url: "/inventory/close-day",
			data: { merchantId },
		});
	}

	// Get Weekly Analytics
	async getWeeklyAnalytics(merchantId: string) {
		return loyaltyApiClient.get({
			url: `/inventory/weekly?merchantId=${merchantId}`,
		});
	}
}

export default new InventoryService();
