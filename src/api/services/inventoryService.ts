// src/api/services/inventoryService.ts - FINAL VERSION
import { loyaltyApiClient } from "@/api/apiClient";

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

export interface InventoryItem {
  id: number;
  name: string;
  quantity: number;
  price: number;
  category?: string;
  description?: string;
  
  // Actual API fields
  merchantId?: string;
  itemCode?: string;
  itemName?: string;
  startingStock?: number;
  addedStock?: number;
  soldStock?: number;
  availableStock?: number;
  closingStock?: number;
  unitCost?: number;
  unitPrice?: number;
  expenseNote?: string;
  recordDate?: string;
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

export interface ProcessSaleRequest {
  merchantId: string;
  items: SaleItem[];
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
  async addStock(merchantId: string, items: StockItem[]): Promise<StockResponse> {
    return loyaltyApiClient.post({
      url: "/inventory/add-stock",
      data: { merchantId, items },
    });
  }

  async addExpense(data: ExpenseData): Promise<{ success: boolean; expenseId: string }> {
    return loyaltyApiClient.post({
      url: "/inventory/expense",
      data,
    });
  }

  async importInventory(file: File, merchantId: string): Promise<{ success: boolean; imported: number }> {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("merchantId", merchantId);

    return loyaltyApiClient.post({
      url: "/inventory/import",
      data: formData,
    });
  }

  async listMenu(): Promise<InventoryItem[]> {
    return loyaltyApiClient.get({
      url: "/inventory/all",
    });
  }

  async processSale(data: ProcessSaleRequest): Promise<SaleResponse> {
    return loyaltyApiClient.post({
      url: "/inventory/sale",
      data,
    });
  }

  async getDailySalesSummary(merchantId: string, date: string): Promise<DailySummary> {
    return loyaltyApiClient.get({
      url: `/inventory/daily-summary/${merchantId}`,
      params: { date },
    });
  }

  async closeBooks(merchantId: string): Promise<{ success: boolean; closedDate: string }> {
    return loyaltyApiClient.post({
      url: "/inventory/close-day",
      data: { merchantId },
    });
  }

  async getWeeklyAnalytics(merchantId: string): Promise<WeeklyAnalytics> {
    return loyaltyApiClient.get({
      url: "/inventory/weekly",
      params: { merchantId },
    });
  }

  // ADDED: Close Day method for POS page
  async closeDay(data: CloseDayRequest): Promise<CloseDayResponse> {
    return loyaltyApiClient.post({
      url: "/inventory/close-day",
      data,
    });
  }
}

export default new InventoryService();