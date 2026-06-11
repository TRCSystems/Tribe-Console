import { externalApiClient, loyaltyApiClient } from "@/api/apiClient";
import useUserStore from "@/store/userStore";
import type { CreateOrderRequest, POSOrder } from "@/types/pos";

const EXTERNAL_API_BASE = "https://tribessystems.co.ke";

const getAuthHeaders = () => {
	const token = useUserStore.getState().userToken?.accessToken;

	if (!token) {
		return {};
	}

	return {
		Authorization: `Bearer ${token}`,
	};
};

const parseJsonIfString = (value: any) => {
	if (typeof value !== "string") {
		return value;
	}

	const trimmed = value.trim();

	if (!trimmed) {
		return "";
	}

	try {
		return JSON.parse(trimmed);
	} catch {
		return trimmed;
	}
};

const firstString = (...values: any[]) => {
	for (const value of values) {
		if (value === null || value === undefined) {
			continue;
		}

		const text = String(value).trim();
		if (text.length > 0) {
			return text;
		}
	}

	return "";
};

const firstNumber = (...values: any[]) => {
	for (const value of values) {
		if (value === null || value === undefined || value === "") {
			continue;
		}

		if (typeof value === "number" && Number.isFinite(value)) {
			return value;
		}

		const numberText = String(value).match(/-?\d+(\.\d+)?/)?.[0];
		const parsedNumber = Number(numberText);

		if (Number.isFinite(parsedNumber)) {
			return parsedNumber;
		}
	}

	return 0;
};

const findFirstArray = (value: any): any[] => {
	const parsedValue = parseJsonIfString(value);

	if (Array.isArray(parsedValue)) {
		return parsedValue;
	}

	if (!parsedValue || typeof parsedValue !== "object") {
		return [];
	}

	// Try respObject first as it is common in Tribe's API
	if (Array.isArray(parsedValue?.respObject)) {
		return parsedValue.respObject;
	}

	const possibleArrayKeys = [
		"data",
		"products",
		"items",
		"productDefaults",
		"defaults",
		"content",
		"records",
		"result",
		"payload",
		"respObject",
	];

	for (const key of possibleArrayKeys) {
		if (Array.isArray(parsedValue?.[key])) {
			return parsedValue[key];
		}
	}

	for (const key of possibleArrayKeys) {
		const nestedValue = parsedValue?.[key];
		if (nestedValue && typeof nestedValue === "object") {
			const nestedArray = findFirstArray(nestedValue);
			if (nestedArray.length > 0) {
				return nestedArray;
			}
		}
	}

	return [];
};

const responseToArray = (value: any): any[] => {
	const arrayValue = findFirstArray(value);

	if (arrayValue.length > 0) {
		return arrayValue;
	}

	const parsedValue = parseJsonIfString(value);

	if (parsedValue && typeof parsedValue === "object" && !Array.isArray(parsedValue)) {
		return [parsedValue];
	}

	return [];
};

export interface ProductDefault {
	productName: string;
	productCode: string;
	volumeMl: number;
}

export interface LiquorDistributor {
	id: number;
	businessName: string;
	businessPhone?: string;
	location?: string;
	tillNumber?: string;
	businessType?: string;
}

const normalizeProductDefault = (item: any): ProductDefault | null => {
	const productName = firstString(
		item?.productName,
		item?.itemName,
		item?.name,
		item?.normalizedName,
		item?.description,
		item?.rawName,
	);
	const productCode = firstString(item?.productCode, item?.itemCode, item?.code, item?.sku, item?.productId, item?.id);
	const volumeMl = firstNumber(
		item?.volumeMl,
		item?.volumeML,
		item?.volume,
		item?.volume_ml,
		item?.sizeMl,
		item?.size_ml,
		item?.size,
	);

	if (productName.length === 0 || productCode.length === 0) {
		return null;
	}

	return {
		productName,
		productCode,
		volumeMl,
	};
};

const normalizeLiquorDistributor = (item: any): LiquorDistributor | null => {
	const id = firstNumber(item?.id, item?.distributorId, item?.merchantId, item?.wholesalerId);
	const businessName = firstString(
		item?.businessName,
		item?.distributorName,
		item?.merchantName,
		item?.name,
		item?.companyName,
	);

	if (!Number.isFinite(id) || id <= 0) {
		return null;
	}

	return {
		id,
		businessName: businessName || `Distributor #${id}`,
		businessPhone:
			firstString(item?.businessPhone, item?.phoneNumber, item?.phone, item?.mobileNumber, item?.contactPhone) ||
			undefined,
		location: firstString(item?.location, item?.address, item?.county, item?.city) || undefined,
		tillNumber: firstString(item?.tillNumber, item?.tillNo, item?.businessTill, item?.paybill) || undefined,
		businessType: firstString(item?.businessType, item?.type, item?.category) || undefined,
	};
};

const normalizeOrder = (item: any): any | null => {
	const orderCode = firstString(item?.orderCode, item?.order_code, item?.id, item?.orderId, item?.order_id);

	if (!orderCode) {
		return null;
	}

	const items = findFirstArray(item?.items || item?.orderItems || item?.order_items);
	const normalizedItems = items.map((i: any) => ({
		itemCode: firstString(i?.itemCode, i?.productCode, i?.code, i?.sku),
		itemName: firstString(i?.itemName, i?.productName, i?.name),
		quantity: firstNumber(i?.quantity, i?.qty, i?.amount),
		wholesalePrice: firstNumber(i?.wholesalePrice, i?.unitPrice, i?.price, i?.cost),
	}));

	return {
		orderCode,
		distributorId: firstNumber(item?.distributorId, item?.wholesalerId, item?.merchantId),
		phoneNumber: firstString(item?.phoneNumber, item?.phone, item?.customerPhone),
		items: normalizedItems,
		totalAmount: firstNumber(item?.totalAmount, item?.amount, item?.total),
		orderStatus: firstString(item?.orderStatus, item?.status, item?.paymentStatus) || "PENDING",
		isPaid: item?.isPaid === true || item?.paid === true || item?.status === "PAID",
		resultCode: firstString(item?.resultCode, item?.responseCode),
		resultDesc: firstString(item?.resultDesc, item?.message, item?.description),
		paidAt: firstString(item?.paidAt, item?.createdAt, item?.updatedAt, item?.date),
	};
};

export const posService = {
	createOrder: (orderData: CreateOrderRequest): Promise<any> => {
		const { amount, ...payload } = orderData as any;
		const merchantId = useUserStore.getState().merchantId;

		return loyaltyApiClient
			.post<any>({
				url: "/orders/create",
				data: {
					...payload,
					merchantId,
				},
			})
			.then((res) => {
				const body = parseJsonIfString(res);
				return body?.respObject?.value || body?.respObject || body?.data || body;
			});
	},

	getOrderPaymentStatus: (orderCode: string): Promise<any> => {
		return loyaltyApiClient.get<any>({
			url: `/orders/${encodeURIComponent(orderCode)}/payment-status`,
		});
	},

	getProductDefaults: async (): Promise<ProductDefault[]> => {
		try {
			const merchantId = useUserStore.getState().merchantId;
			console.group("📦 POS: Fetching Product Defaults");

			const attempts = [
				// Try 1: Redundant /api prefix (relative to /api baseURL)
				{ name: "Redundant /api", fn: () => loyaltyApiClient.get({ url: "/api/inventory/product-defaults" }) },
				// Try 2: Standard (relative to /api baseURL)
				{ name: "Standard GET", fn: () => loyaltyApiClient.get({ url: "/inventory/product-defaults" }) },
				// Try 3: POST (some Tribe endpoints require POST for getters)
				{
					name: "Standard POST",
					fn: () => loyaltyApiClient.post({ url: "/inventory/product-defaults", data: { merchantId } }),
				},
				// Try 4: Real items fallback
				{ name: "Inventory All", fn: () => loyaltyApiClient.get({ url: "/inventory/all", params: { merchantId } }) },
			];

			let res: any = "";
			for (const attempt of attempts) {
				console.log(`Probing: ${attempt.name}...`);
				try {
					const result = await attempt.fn();
					if (result && result !== "" && !(Array.isArray(result) && result.length === 0)) {
						console.log(`✅ Success with ${attempt.name}`);
						res = result;
						break;
					}
				} catch (e) {
					console.log(`❌ Failed ${attempt.name}`);
				}
			}

			console.log("Final Probe Response:", res);
			console.groupEnd();

			const body = findFirstArray(res);

			const products = body
				.map(normalizeProductDefault)
				.filter((product): product is ProductDefault => product !== null)
				.sort((a, b) => a.productName.localeCompare(b.productName));

			return products;
		} catch (error) {
			console.error("Error fetching product defaults:", error);
			console.groupEnd();
			throw error;
		}
	},

	getLiquorDistributors: async (): Promise<LiquorDistributor[]> => {
		try {
			const merchantId = useUserStore.getState().merchantId;
			console.group("🚚 POS: Fetching Liquor Distributors");

			const attempts = [
				// Try 1: Redundant /api prefix (as requested by user /api/orders/wholesalers/liquor)
				{ name: "Redundant /api", fn: () => loyaltyApiClient.get({ url: "/api/orders/wholesalers/liquor" }) },
				// Try 2: Standard GET
				{
					name: "Standard GET",
					fn: () => loyaltyApiClient.get({ url: "/orders/wholesalers/liquor", params: { merchantId } }),
				},
				// Try 3: Standard POST (mirroring credit score pattern)
				{
					name: "Standard POST",
					fn: () =>
						loyaltyApiClient.post({ url: "/orders/wholesalers/liquor", data: { merchantId, merchant_id: merchantId } }),
				},
				// Try 4: Absolute URL via External (no v1)
				{
					name: "Absolute URL",
					fn: () =>
						externalApiClient.get({
							url: "https://tribessystems.co.ke/api/orders/wholesalers/liquor",
							headers: getAuthHeaders(),
						}),
				},
				// Try 5: No /orders prefix
				{ name: "Short GET", fn: () => loyaltyApiClient.get({ url: "/wholesalers/liquor" }) },
			];

			let res: any = "";
			for (const attempt of attempts) {
				console.log(`Probing: ${attempt.name}...`);
				try {
					const result = await attempt.fn();
					if (result && result !== "" && !(Array.isArray(result) && result.length === 0)) {
						console.log(`✅ Success with ${attempt.name}`);
						res = result;
						break;
					}
				} catch (e) {
					console.log(`❌ Failed ${attempt.name}`);
				}
			}

			console.log("Final Probe Response:", res);
			console.groupEnd();

			const body = findFirstArray(res);

			const distributors = body
				.map(normalizeLiquorDistributor)
				.filter((distributor): distributor is LiquorDistributor => distributor !== null)
				.sort((a, b) => a.businessName.localeCompare(b.businessName));

			return distributors;
		} catch (error) {
			console.error("Error fetching liquor distributors:", error);
			console.groupEnd();
			throw error;
		}
	},

	getOrders: (): Promise<any[]> => {
		const merchantId = useUserStore.getState().merchantId;
		return loyaltyApiClient
			.get<any>({
				url: "/orders",
				params: { merchantId },
			})
			.then((res) => {
				const body = responseToArray(res);

				const orders = body
					.map(normalizeOrder)
					.filter((order): order is any => order !== null)
					.sort((a, b) => new Date(b.paidAt).getTime() - new Date(a.paidAt).getTime());

				console.log("Orders raw response:", res);
				console.log("Final orders list:", orders);
				return orders;
			})
			.catch((error) => {
				console.error("Error fetching orders:", error);
				throw error;
			});
	},
};
