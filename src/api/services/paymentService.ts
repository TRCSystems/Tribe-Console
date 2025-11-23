// src/api/services/paymentService.ts - NEW FILE
import { mainApiClient } from "../apiClient";

export interface InitiatePaymentRequest {
	PhoneNumber: string;
	Amount: string;
	Username: string;
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

export interface PaymentResponse {
	success: boolean;
	message: string;
	transactionId?: string;
	checkoutRequestID?: string;
}

const initiatePayment = (data: InitiatePaymentRequest) =>
	mainApiClient.post<PaymentResponse>({
		url: "/payments/intiate-payment",
		data,
	});

const confirmPayment = (data: ConfirmPaymentRequest) =>
	mainApiClient.post<PaymentResponse>({
		url: "/payments/confirm-payment",
		data,
	});

const handlePaymentCallback = (data: PaymentNotification) =>
	mainApiClient.post<any>({
		url: "/payments/callback",
		data,
	});

export default {
	initiatePayment,
	confirmPayment,
	handlePaymentCallback,
};
