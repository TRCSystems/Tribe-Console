import { externalApiClient } from "@/api/apiClient";
import useUserStore from "@/store/userStore";
import type { CreateOrderRequest, POSOrder } from "@/types/pos";

const EXTERNAL_API_BASE = "http://38.242.155.236:8085";

const getAuthHeaders = () => {
	const token = useUserStore.getState().userToken?.accessToken;

	if (!token) {
		return {};
	}

	return {
		Authorization: `Bearer ${token}`,
	};
};

export const posService = {
	// Create a new order
	createOrder: (orderData: CreateOrderRequest): Promise<any> => {
		// Strip amount if present — backend calculates totals
		const { amount, ...payload } = orderData as any;
		return externalApiClient
			.request<any>({
				method: "post",
				url: `${EXTERNAL_API_BASE}/api/orders/create`,
				data: payload,
				headers: getAuthHeaders(),
			})
			.then((res) => {
				let body = res as any;

				if (typeof body === "string") {
					const trimmed = body.trim();
					if (trimmed) {
						try {
							body = JSON.parse(trimmed);
						} catch {
							const orderIdMatch = trimmed.match(/(?:orderCode|orderId|id)\s*[:=]\s*["']?([\w-]+)["']?/i);
							if (orderIdMatch) {
								body = { orderCode: orderIdMatch[1], raw: trimmed };
							} else {
								body = { message: trimmed, raw: trimmed };
							}
						}
					}
				}

				const created = body?.order || body?.data || body;
				return created;
			});
	},

	// Poll payment status by orderCode
	getOrderPaymentStatus: (orderCode: string): Promise<any> => {
		return externalApiClient.request<any>({
			method: "get",
			url: `${EXTERNAL_API_BASE}/api/orders/${encodeURIComponent(orderCode)}/payment-status`,
			headers: getAuthHeaders(),
		});
	},

	// Get order by ID (optional)
	getOrder: (orderId: string): Promise<POSOrder> => {
		// Keep a minimal stub to avoid breaking other callers — prefer implementing if needed
		return Promise.resolve({
			id: orderId,
			phoneNumber: "",
			items: [],
			totalAmount: 0,
			paymentMethod: "cash",
			status: "pending",
			createdAt: new Date().toISOString(),
			receiptNumber: `REC-${orderId}`,
		});
	},

	getOrders: (): Promise<any[]> => {
		return externalApiClient
			.request<any[]>({
				method: "get",
				url: `${EXTERNAL_API_BASE}/api/orders`,
				headers: getAuthHeaders(),
			})
			.then((res) => {
				return Array.isArray(res) ? res : res?.data || res || [];
			});
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
