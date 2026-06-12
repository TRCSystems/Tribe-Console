import { loyaltyApiClient } from "@/api/apiClient";
import useUserStore from "@/store/userStore";
import type { CreateOrderRequest } from "@/types/pos";

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

	fulfillOrder: (orderCode: string): Promise<any> => {
		return loyaltyApiClient.post<any>({
			url: `/orders/${encodeURIComponent(orderCode)}/fulfill`,
		});
	},

	getMerchantOrders: (status: string): Promise<any[]> => {
		return loyaltyApiClient
			.get<any>({
				url: `/orders/merchant/status/${encodeURIComponent(status)}`,
			})
			.then((res) => responseToArray(res));
	},

	getDistributorOrders: (status: string): Promise<any[]> => {
		return loyaltyApiClient
			.get<any>({
				url: `/orders/distributor/status/${encodeURIComponent(status)}`,
			})
			.then((res) => responseToArray(res));
	},

	getProductDefaults: async (): Promise<ProductDefault[]> => {
		try {
			console.group("📦 POS: Fetching Product Defaults");

			const response = await loyaltyApiClient.get<any>({
				url: "/inventory/product-defaults",
			});

			console.log("Product defaults response:", response);
			console.groupEnd();

			const body = findFirstArray(response);

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
			console.group("🚚 POS: Fetching Liquor Distributors");

			const response = await loyaltyApiClient.get<any>({
				url: "/orders/wholesalers/liquor",
			});

			console.log("Liquor distributors response:", response);
			console.groupEnd();

			const body = findFirstArray(response);

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
