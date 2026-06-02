import { useState } from "react";
import { useNavigate } from "react-router";
import { posService } from "@/api/services/posService";
import { Icon } from "@/components/icon";
import type { CreateOrderItem, CreateOrderRequest } from "@/types/pos";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";
import { cn } from "@/utils";

type PaymentMethod = "mpesa";
type PaymentStatus = "ready" | "initiated" | "confirmed" | "error";

type AvailableOrderItem = {
	itemCode: string;
	itemName: string;
	wholesalePrice: number;
};

type PaidOrder = {
	orderCode: string;
	distributorId: number;
	phoneNumber: string;
	items: CreateOrderItem[];
	totalAmount: number;
	orderStatus: string;
	isPaid: boolean;
	resultCode: string;
	resultDesc: string;
	paidAt: string;
};

const LAST_PAID_ORDER_KEY = "lastPaidOrder";
const PAID_ORDERS_KEY = "paidOrders";
const ORDER_PAYMENT_RETURN_PATH_KEY = "orderPaymentReturnPath";

const savePaidOrderToStorage = (paidOrder: PaidOrder) => {
	localStorage.setItem(LAST_PAID_ORDER_KEY, JSON.stringify(paidOrder));

	const existingPaidOrdersRaw = localStorage.getItem(PAID_ORDERS_KEY);
	let existingPaidOrders: PaidOrder[] = [];

	if (existingPaidOrdersRaw) {
		try {
			const parsedOrders = JSON.parse(existingPaidOrdersRaw);
			existingPaidOrders = Array.isArray(parsedOrders) ? parsedOrders : [];
		} catch (error) {
			console.error("Failed to parse existing paid orders:", error);
			existingPaidOrders = [];
		}
	}

	const updatedPaidOrders = [
		paidOrder,
		...existingPaidOrders.filter((order) => order.orderCode !== paidOrder.orderCode),
	];

	localStorage.setItem(PAID_ORDERS_KEY, JSON.stringify(updatedPaidOrders));
};

const getFriendlyPaymentFailureMessage = (message?: string) => {
	const messageText = String(message ?? "").toLowerCase();

	if (messageText.includes("cancel")) {
		return "The payment was cancelled. Please try again when ready.";
	}

	if (messageText.includes("insufficient") || messageText.includes("balance")) {
		return "The payment could not be completed because the account may have insufficient funds.";
	}

	if (messageText.includes("timeout") || messageText.includes("timed out")) {
		return "Payment confirmation took longer than expected. Please check the payment status before trying again.";
	}

	if (messageText.includes("pin")) {
		return "The payment could not be completed. Please check the M-Pesa prompt and try again.";
	}

	return "The payment could not be completed. Please try again.";
};

export default function OrderPaymentPage() {
	const [distributorId, setDistributorId] = useState("");
	const [productName, setProductName] = useState("");
	const [comment, setComment] = useState("");
	const [phoneNumber, setPhoneNumber] = useState("");

	const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("mpesa");
	const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>("ready");
	const [_checkoutRequestID, setCheckoutRequestID] = useState<string | null>(null);
	const [paymentError, setPaymentError] = useState<string | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const navigate = useNavigate();

	// Populate this array from your real item source or API.
	const [availableItems] = useState<AvailableOrderItem[]>([]);

	const [selectedItemCode, setSelectedItemCode] = useState("");
	const [itemQuantity, setItemQuantity] = useState("1");
	const [orderItems, setOrderItems] = useState<CreateOrderItem[]>([]);
	const [addItemError, setAddItemError] = useState<string | null>(null);

	const distributorIdNumber = Number(distributorId);
	const selectedItem = availableItems.find((item) => item.itemCode === selectedItemCode) ?? null;

	const totalQuantity = orderItems.reduce((sum, item) => sum + item.quantity, 0);
	const totalAmount = orderItems.reduce((sum, item) => sum + item.quantity * item.wholesalePrice, 0);

	const canProceed =
		distributorId.trim().length > 0 &&
		Number.isFinite(distributorIdNumber) &&
		distributorIdNumber > 0 &&
		orderItems.length > 0 &&
		phoneNumber.trim().length > 0;

	const handleAddOrderItem = () => {
		const quantity = Number(itemQuantity);

		if (!selectedItem) {
			setAddItemError("Please select an item.");
			return;
		}

		if (!Number.isFinite(quantity) || quantity <= 0) {
			setAddItemError("Please select a valid quantity.");
			return;
		}

		setOrderItems((prevItems) => {
			const existingItem = prevItems.find((item) => item.itemCode === selectedItem.itemCode);

			if (existingItem) {
				return prevItems.map((item) =>
					item.itemCode === selectedItem.itemCode
						? {
								...item,
								quantity: item.quantity + quantity,
							}
						: item,
				);
			}

			return [
				...prevItems,
				{
					itemCode: selectedItem.itemCode,
					itemName: selectedItem.itemName,
					quantity,
					wholesalePrice: selectedItem.wholesalePrice,
				},
			];
		});

		setSelectedItemCode("");
		setItemQuantity("1");
		setAddItemError(null);
	};

	const handleRemoveOrderItem = (index: number) => {
		setOrderItems((prevItems) => prevItems.filter((_, itemIndex) => itemIndex !== index));
	};

	const pollPaymentStatus = async (orderCode: string) => {
		const maxAttempts = 20;
		const intervalMs = 5000;

		for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
			const statusResponse = await posService.getOrderPaymentStatus(orderCode);

			const payload = statusResponse?.data ?? {};
			const paymentResponse = payload?.paymentResponse ?? {};
			const mpesaData = paymentResponse?.data ?? {};

			const resultCodeRaw =
				mpesaData?.ResultCode ?? mpesaData?.resultCode ?? paymentResponse?.ResultCode ?? payload?.ResultCode ?? null;

			const resultCode = resultCodeRaw === null || resultCodeRaw === undefined ? null : String(resultCodeRaw).trim();

			const orderStatus = String(payload?.orderStatus ?? "")
				.trim()
				.toUpperCase();
			const isPaidFromApi = payload?.isPaid === true;

			const message =
				mpesaData?.ResultDesc || paymentResponse?.message || payload?.message || "Payment status received.";

			const messageText = String(message).trim().toLowerCase();

			const isStillProcessing =
				resultCode === null ||
				resultCode === "" ||
				resultCode === "4999" ||
				orderStatus === "PENDING" ||
				messageText.includes("still under processing") ||
				messageText.includes("under processing") ||
				messageText.includes("processing") ||
				messageText.includes("pending");

			console.log("Payment poll debug:", {
				orderCode,
				attempt: attempt + 1,
				apiStatus: statusResponse?.status,
				orderStatus,
				isPaidFromApi,
				resultCode,
				isStillProcessing,
				message,
			});

			if (resultCode === "0") {
				console.log("Payment confirmed.");

				return {
					confirmed: true,
					failed: false,
					pending: false,
					message,
					response: statusResponse,
				};
			}

			if (isStillProcessing) {
				console.log("Payment is still processing.");

				if (attempt < maxAttempts - 1) {
					await new Promise((resolve) => setTimeout(resolve, intervalMs));
					continue;
				}

				break;
			}

			if (resultCode !== null && resultCode !== "" && resultCode !== "0") {
				console.log("Payment failed with final result code.");

				return {
					confirmed: false,
					failed: true,
					pending: false,
					message,
					response: statusResponse,
				};
			}

			if (attempt < maxAttempts - 1) {
				await new Promise((resolve) => setTimeout(resolve, intervalMs));
			}
		}

		return {
			confirmed: false,
			failed: false,
			pending: true,
			message: "Payment confirmation is still pending.",
			response: { status: "PENDING", message: "timeout" },
		};
	};

	const handleProceedToPayment = async () => {
		if (!canProceed || isProcessing) return;

		const parsedDistributorId = Number(distributorId);

		setPaymentStatus("initiated");
		setPaymentError(null);
		setCheckoutRequestID(null);
		setIsProcessing(true);

		try {
			const orderPayload: CreateOrderRequest = {
				distributorId: parsedDistributorId,
				phoneNumber: phoneNumber.trim(),
				amount: 0,
				items: orderItems,
			};

			const createResponse = await posService.createOrder(orderPayload);

			const orderCode =
				createResponse?.orderCode ||
				createResponse?.data?.orderCode ||
				createResponse?.order?.orderCode ||
				createResponse?.orderId ||
				createResponse?.id ||
				createResponse?.order?.id ||
				createResponse?.data?.orderId ||
				createResponse?.data?.id ||
				null;

			if (!orderCode) {
				console.warn("Order created but no orderCode returned:", createResponse);
				setPaymentStatus("error");
				setPaymentError("We could not start this order. Please try again.");
				return;
			}

			setCheckoutRequestID(orderCode);

			const result = await pollPaymentStatus(orderCode);

			if (result.confirmed) {
				console.log("Payment confirmed, updating UI.");

				const paymentPayload = result.response?.data ?? {};
				const paymentResponse = paymentPayload?.paymentResponse ?? {};
				const mpesaData = paymentResponse?.data ?? {};

				const responseTotalAmount = Number(createResponse?.totalAmount ?? createResponse?.data?.totalAmount);

				const paidOrder: PaidOrder = {
					orderCode,
					distributorId: parsedDistributorId,
					phoneNumber: phoneNumber.trim(),
					items: orderItems,
					totalAmount: Number.isFinite(responseTotalAmount) ? responseTotalAmount : totalAmount,
					orderStatus: String(paymentPayload?.orderStatus ?? "PAID"),
					isPaid: true,
					resultCode: String(mpesaData?.ResultCode ?? "0"),
					resultDesc: String(mpesaData?.ResultDesc ?? result.message ?? "Payment completed successfully."),
					paidAt: new Date().toISOString(),
				};

				savePaidOrderToStorage(paidOrder);
				localStorage.setItem(ORDER_PAYMENT_RETURN_PATH_KEY, window.location.pathname);

				console.log("Saved paid order:", paidOrder);

				setPaymentStatus("confirmed");
				setPaymentError(null);

				await new Promise((resolve) => setTimeout(resolve, 3000));

				try {
					navigate("/orders", {
						state: {
							paidOrder,
						},
					});
				} catch {
					// Ignore navigation errors.
				}
			} else if (result.failed) {
				console.log("Payment failed:", result.message);
				setPaymentStatus("error");
				setPaymentError(getFriendlyPaymentFailureMessage(result.message));
			} else {
				console.log("Payment is still pending:", result.message);
				setPaymentStatus("initiated");
				setPaymentError("Payment is still being confirmed. Please check again shortly.");
			}
		} catch (error) {
			console.error(error);
			setPaymentStatus("error");
			setPaymentError("We could not process the payment right now. Please try again.");
		} finally {
			setIsProcessing(false);
		}
	};

	const handleClearForm = () => {
		setDistributorId("");
		setProductName("");
		setComment("");
		setPhoneNumber("");
		setPaymentMethod("mpesa");
		setPaymentStatus("ready");
		setCheckoutRequestID(null);
		setPaymentError(null);
		setSelectedItemCode("");
		setItemQuantity("1");
		setOrderItems([]);
		setAddItemError(null);
	};

	const statusLabel =
		paymentStatus === "ready"
			? "Ready to pay"
			: paymentStatus === "initiated"
				? "Payment in progress"
				: paymentStatus === "confirmed"
					? "Payment confirmed"
					: "Payment not completed";

	const paymentHint =
		paymentStatus === "ready"
			? "Fill in the order details and continue to payment."
			: paymentStatus === "initiated"
				? "An M-Pesa prompt has been sent to the customer phone number. Enter the M-Pesa PIN to complete payment."
				: paymentStatus === "confirmed"
					? "The payment was completed successfully."
					: "Please try again or confirm the customer phone number.";

	return (
		<div className="space-y-6 pb-10">
			<div className="space-y-3">
				<div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
					<div>
						<h1 className="text-3xl font-semibold tracking-tight text-slate-950">Order Payment</h1>
						<p className="mt-2 text-sm text-slate-600">Create an order and complete payment securely.</p>
					</div>
				</div>
			</div>

			<div className="grid gap-6 xl:grid-cols-[1.35fr_0.9fr]">
				<Card className="overflow-hidden">
					<CardHeader className="border-b border-slate-200 bg-slate-50 px-6 py-5">
						<div className="space-y-2">
							<CardTitle className="text-lg">Order Details</CardTitle>
							<CardDescription>Select the items for this order before continuing to payment.</CardDescription>
						</div>
					</CardHeader>

					<CardContent className="space-y-6 px-6 py-6">
						<div className="space-y-2">
							<Label htmlFor="distributorId" className="text-sm font-medium text-slate-800">
								Distributor ID
							</Label>
							<Input
								id="distributorId"
								type="number"
								min={1}
								value={distributorId}
								onChange={(event) => setDistributorId(event.target.value)}
								placeholder="Enter distributor ID"
							/>
						</div>

						<div className="space-y-4 rounded-2xl border border-slate-200 bg-slate-50 p-4">
							<div className="grid gap-4 sm:grid-cols-[1.4fr_0.6fr]">
								<div className="space-y-2">
									<Label htmlFor="selectedItemCode" className="text-sm font-medium text-slate-800">
										Select Item
									</Label>

									<select
										id="selectedItemCode"
										value={selectedItemCode}
										onChange={(event) => setSelectedItemCode(event.target.value)}
										className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									>
										<option value="">Choose an item</option>

										{availableItems.map((item) => (
											<option key={item.itemCode} value={item.itemCode}>
												{item.itemName} - {item.itemCode}
											</option>
										))}
									</select>

									{availableItems.length === 0 ? (
										<p className="text-xs text-slate-500">No items are available for selection yet.</p>
									) : null}
								</div>

								<div className="space-y-2">
									<Label htmlFor="itemQuantity" className="text-sm font-medium text-slate-800">
										Quantity
									</Label>

									<select
										id="itemQuantity"
										value={itemQuantity}
										onChange={(event) => setItemQuantity(event.target.value)}
										className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-900 shadow-sm outline-none transition focus:border-slate-400 focus:ring-2 focus:ring-slate-200"
									>
										{Array.from({ length: 50 }, (_, index) => index + 1).map((quantity) => (
											<option key={quantity} value={quantity}>
												{quantity}
											</option>
										))}
									</select>
								</div>
							</div>

							{selectedItem ? (
								<div className="rounded-xl border border-slate-200 bg-white p-4">
									<div className="grid gap-3 text-sm sm:grid-cols-3">
										<div>
											<p className="text-slate-500">Item Code</p>
											<p className="font-medium text-slate-950">{selectedItem.itemCode}</p>
										</div>

										<div>
											<p className="text-slate-500">Item Name</p>
											<p className="font-medium text-slate-950">{selectedItem.itemName}</p>
										</div>

										<div>
											<p className="text-slate-500">Wholesale Price</p>
											<p className="font-medium text-slate-950">KSh {Number(selectedItem.wholesalePrice).toFixed(2)}</p>
										</div>
									</div>
								</div>
							) : null}

							{addItemError ? (
								<div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-600">
									{addItemError}
								</div>
							) : null}

							<Button type="button" onClick={handleAddOrderItem} className="w-full">
								Add Selected Item
							</Button>
						</div>

						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label className="text-sm font-medium text-slate-800">Order Items</Label>
								<span className="text-sm text-slate-500">{orderItems.length} item(s)</span>
							</div>

							{orderItems.length === 0 ? (
								<p className="text-sm text-slate-500">No items added yet.</p>
							) : (
								<div className="space-y-3 rounded-2xl border border-slate-200 bg-white p-4">
									{orderItems.map((item, index) => (
										<div
											key={`${item.itemCode}-${index}`}
											className="flex flex-col gap-2 rounded-xl border border-slate-200 p-3 sm:flex-row sm:items-center sm:justify-between"
										>
											<div className="space-y-1">
												<p className="font-semibold text-slate-900">{item.itemName}</p>
												<p className="text-sm text-slate-500">{item.itemCode}</p>
												<p className="text-sm text-slate-600">
													Qty: {item.quantity} · KSh {item.wholesalePrice.toFixed(2)}
												</p>
											</div>

											<Button type="button" variant="outline" size="sm" onClick={() => handleRemoveOrderItem(index)}>
												Remove
											</Button>
										</div>
									))}
								</div>
							)}
						</div>

						<div className="space-y-2">
							<Label htmlFor="comment" className="text-sm font-medium text-slate-800">
								Comment
							</Label>
							<Textarea
								id="comment"
								value={comment}
								onChange={(event) => setComment(event.target.value)}
								placeholder="Add instructions or notes for this order"
								className="min-h-[120px]"
								maxLength={200}
							/>
							<div className="text-right text-xs text-slate-500">{comment.length} / 200</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="phoneNumber" className="text-sm font-medium text-slate-800">
								Customer Phone Number
							</Label>
							<Input
								id="phoneNumber"
								type="tel"
								value={phoneNumber}
								onChange={(event) => setPhoneNumber(event.target.value)}
								placeholder="e.g. 254708..."
							/>
							<p className="text-sm text-slate-500">The M-Pesa prompt will be sent to this number.</p>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row">
							<Button
								type="button"
								className="flex-1"
								onClick={handleProceedToPayment}
								disabled={!canProceed || isProcessing}
							>
								{isProcessing ? "Checking Payment..." : "Proceed to Payment"}
							</Button>

							<Button type="button" variant="ghost" className="flex-1" onClick={handleClearForm}>
								Clear Form
							</Button>
						</div>
					</CardContent>
				</Card>

				<div className="space-y-6">
					<Card>
						<CardHeader className="border-b border-slate-200 bg-slate-50 px-6 py-5">
							<div className="space-y-2">
								<CardTitle className="text-lg">Order Summary</CardTitle>
								<CardDescription>Review the order before payment.</CardDescription>
							</div>
						</CardHeader>

						<CardContent className="space-y-4 px-6 py-6">
							<div className="space-y-3">
								<div className="flex items-center justify-between text-sm text-slate-600">
									<span>Order Title</span>
									<span className="font-medium text-slate-900">{productName || "-"}</span>
								</div>

								<div className="flex items-center justify-between text-sm text-slate-600">
									<span>Distributor ID</span>
									<span className="font-medium text-slate-900">{distributorId || "-"}</span>
								</div>

								<div className="flex items-center justify-between text-sm text-slate-600">
									<span>Items</span>
									<span className="font-medium text-slate-900">{orderItems.length}</span>
								</div>

								<div className="flex items-center justify-between text-sm text-slate-600">
									<span>Total Quantity</span>
									<span className="font-medium text-slate-900">{totalQuantity}</span>
								</div>

								<div className="flex items-center justify-between text-sm text-slate-600">
									<span>Total Amount</span>
									<span className="font-medium text-slate-900">KSh {totalAmount.toFixed(2)}</span>
								</div>

								<div className="flex items-start justify-between text-sm text-slate-600">
									<span>Comment</span>
									<span className="ml-4 max-w-[10rem] whitespace-pre-wrap text-right font-medium text-slate-900">
										{comment || "-"}
									</span>
								</div>
							</div>
						</CardContent>
					</Card>

					<Card className="overflow-hidden">
						<CardHeader className="border-b border-slate-200 bg-slate-50 px-6 py-5">
							<div className="space-y-2">
								<CardTitle className="text-lg">Payment</CardTitle>
								<CardDescription>Select a payment method.</CardDescription>
							</div>
						</CardHeader>

						<CardContent className="space-y-5 px-6 py-6">
							<div className="grid gap-3">
								<button
									type="button"
									onClick={() => setPaymentMethod("mpesa")}
									className={cn(
										"rounded-2xl border p-4 text-left transition",
										paymentMethod === "mpesa"
											? "border-slate-900 bg-slate-950 text-white"
											: "border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50",
									)}
								>
									<div className="flex items-center gap-3">
										<div className="grid h-11 w-11 place-items-center rounded-2xl bg-slate-100 text-slate-900">
											<Icon icon="lucide:smartphone" className="h-5 w-5" />
										</div>

										<div>
											<p className="font-semibold">M-Pesa</p>
											<p className="text-sm text-slate-500">Pay using M-Pesa on the customer phone.</p>
										</div>
									</div>
								</button>
							</div>

							{paymentMethod === "mpesa" ? (
								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-700">
									The customer will receive an M-Pesa prompt. Enter the M-Pesa PIN to complete payment.
								</div>
							) : null}

							<div className="space-y-4">
								<Button
									type="button"
									className="w-full"
									onClick={handleProceedToPayment}
									disabled={!canProceed || isProcessing}
								>
									{isProcessing ? "Checking Payment..." : "Pay with M-Pesa"}
								</Button>
							</div>
						</CardContent>
					</Card>

					<Card className="border border-slate-200 bg-slate-50">
						<CardContent className="px-6 py-6">
							<div className="flex items-start justify-between gap-4">
								<div>
									<p className="text-sm font-semibold text-slate-900">Payment Status</p>
									<p className="mt-2 text-sm text-slate-600">{statusLabel}</p>
								</div>

								<Badge variant="outline" className="capitalize">
									{paymentStatus}
								</Badge>
							</div>

							{paymentError ? <p className="mt-4 text-sm font-medium text-red-600">{paymentError}</p> : null}

							<p className="mt-4 text-sm text-slate-500">{paymentHint}</p>

							<div className="mt-4 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-600">
								Payment is processed securely.
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
