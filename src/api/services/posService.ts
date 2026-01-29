import { mainApiClient } from "@/api/apiClient";
import type { MpesaPaymentRequest, MpesaPaymentResponse, POSOrder } from "@/types/pos";

export const posService = {
	// Initiate M-Pesa STK Push - USING YOUR ACTUAL ENDPOINT
	initiateMpesaPayment: (paymentData: MpesaPaymentRequest): Promise<MpesaPaymentResponse> => {
		return mainApiClient.post<MpesaPaymentResponse>("/payments/intiate-payment", {
			PhoneNumber: paymentData.phoneNumber,
			Amount: paymentData.amount.toString(),
			Username: "pos_system", // You might want to make this dynamic or from user context
		});
	},

	// Confirm payment status - USING YOUR ACTUAL ENDPOINT
	confirmPayment: (checkoutRequestID: string): Promise<any> => {
		return mainApiClient.post("/payments/confirm-payment", {
			checkoutRequestID,
		});
	},

	// Create a new order (you might need to create this endpoint)
	createOrder: (orderData: Omit<POSOrder, "id" | "createdAt" | "receiptNumber">): Promise<POSOrder> => {
		// For now, we'll create a mock order since this endpoint isn't in your API
		// You can create this endpoint in your backend later
		const mockOrder: POSOrder = {
			id: Math.random().toString(36).substr(2, 9),
			...orderData,
			createdAt: new Date().toISOString(),
			receiptNumber: `REC-${Date.now()}`,
		};

		return Promise.resolve(mockOrder);
	},

	// Get order by ID
	getOrder: (orderId: string): Promise<POSOrder> => {
		// Mock implementation - you can create this endpoint later
		return Promise.resolve({
			id: orderId,
			phoneNumber: "254712656502",
			items: [],
			totalAmount: 0,
			paymentMethod: "cash",
			status: "completed",
			createdAt: new Date().toISOString(),
			receiptNumber: `REC-${orderId}`,
		});
	},

	// Get all orders (for merchant view)
	getOrders: (): Promise<POSOrder[]> => {
		// Mock implementation
		return Promise.resolve([]);
	},
};

// Mock items data
export const mockItems = [
	{ id: "1", name: "Sugar 1kg", price: 120, quantity: 1, category: "Groceries" },
	{ id: "2", name: "Rice 2kg", price: 280, quantity: 1, category: "Groceries" },
	{ id: "3", name: "Cooking Oil 1L", price: 350, quantity: 1, category: "Groceries" },
	{ id: "4", name: "Bread", price: 65, quantity: 1, category: "Bakery" },
	{ id: "5", name: "Milk 500ml", price: 55, quantity: 1, category: "Dairy" },
	{ id: "6", name: "Tea Leaves 200g", price: 180, quantity: 1, category: "Beverages" },
	{ id: "7", name: "Soap Bar", price: 45, quantity: 1, category: "Personal Care" },
	{ id: "8", name: "Toothpaste", price: 120, quantity: 1, category: "Personal Care" },
];
