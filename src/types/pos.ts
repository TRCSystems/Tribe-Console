export interface POSItem {
	id: string;
	name: string;
	price: number;
	quantity: number;
	category?: string;
}

export interface POSOrder {
	id: string;
	phoneNumber: string;
	items: POSItem[];
	totalAmount: number;
	paymentMethod: "mpesa" | "cash";
	status: "pending" | "completed" | "failed";
	transactionId?: string;
	createdAt: string;
	receiptNumber: string;
}

export interface CreateOrderItem {
	itemCode: string;
	itemName: string;
	quantity: number;
	wholesalePrice: number;
}

export interface CreateOrderRequest {
	distributorId: number;
	phoneNumber: string;
	amount: number;
	items: CreateOrderItem[];
}

// Updated to match your API schema
export interface MpesaPaymentRequest {
	phoneNumber: string;
	amount: number;
	accountReference: string;
	transactionDesc: string;
}

export interface MpesaPaymentResponse {
	success: boolean;
	transactionId?: string;
	message: string;
	checkoutRequestID?: string;
}

export interface MpesaPaymentStatusResponse {
	success: boolean;
	status?: "pending" | "completed" | "failed" | "error" | string;
	message: string;
	transactionId?: string;
	checkoutRequestID?: string;
}

export interface ConfirmPaymentRequest {
	checkoutRequestID: string;
}

export interface PaymentNotification {
	TransactionType: string;
	TransID: string;
	TransTime: string;
	TransAmount: number;
	BusinessShortCode: string;
	BillRefNumber: string;
	InvoiceNumber: string;
	OrgAccountBalance: string;
	ThirdPartyTransID: string;
	MSISDN: string;
	FirstName: string;
	MiddleName: string;
	LastName: string;
}

export interface ReceiptData {
	receiptNumber: string;
	date: string;
	items: POSItem[];
	subtotal: number;
	tax: number;
	total: number;
	paymentMethod: string;
	phoneNumber: string;
	transactionId?: string;
}
