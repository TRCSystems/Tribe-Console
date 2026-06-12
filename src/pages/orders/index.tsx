import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { posService } from "@/api/services/posService";
import { Icon } from "@/components/icon";
import useUserStore from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

type PaidOrderItem = {
	itemCode: string;
	itemName: string;
	quantity: number;
	wholesalePrice: number;
};

type PaidOrder = {
	orderCode: string;
	distributorId: number;
	phoneNumber: string;
	items: PaidOrderItem[];
	totalAmount: number;
	orderStatus: string;
	isPaid: boolean;
	resultCode?: string;
	resultDesc?: string;
	paidAt: string;
};

const ORDER_PAYMENT_RETURN_PATH_KEY = "orderPaymentReturnPath";

const getOrderTotal = (order: PaidOrder) => {
	const total = Number(order.totalAmount);

	if (Number.isFinite(total)) {
		return total;
	}

	return order.items.reduce((sum, item) => {
		return sum + item.quantity * item.wholesalePrice;
	}, 0);
};

const formatAmount = (amount: number) => {
	return `KSh ${amount.toFixed(2)}`;
};

const formatDate = (date?: string) => {
	if (!date) return "-";

	const parsedDate = new Date(date);

	if (Number.isNaN(parsedDate.getTime())) {
		return "-";
	}

	return parsedDate.toLocaleString();
};

const getStatusBadgeVariant = (statusValue: string) => {
	switch (statusValue) {
		case "PAID":
			return "bg-green-100 text-green-800 hover:bg-green-100";
		case "PENDING":
			return "bg-yellow-100 text-yellow-800 hover:bg-yellow-100";
		case "CANCELLED":
			return "bg-red-100 text-red-800 hover:bg-red-100";
		case "RECEIVED":
			return "bg-blue-100 text-blue-800 hover:bg-blue-100";
		default:
			return "bg-slate-100 text-slate-800 hover:bg-slate-100";
	}
};

const formatStatusLabel = (statusValue: string) => {
	switch (statusValue) {
		case "PAID":
			return "Paid Orders";
		case "PENDING":
			return "Pending Orders";
		case "CANCELLED":
			return "Cancelled Orders";
		case "RECEIVED":
			return "Received Orders";
		default:
			return "Orders";
	}
};

export default function OrdersPage() {
	const navigate = useNavigate();
	const location = useLocation();

	const routeState = location.state as { paidOrder?: PaidOrder } | null;

	const [status, setStatus] = useState("PAID");
	const [paidOrders, setPaidOrders] = useState<PaidOrder[]>([]);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [selectedOrderCode, setSelectedOrderCode] = useState<string | null>(null);

	useEffect(() => {
		let isMounted = true;

		const fetchOrders = async () => {
			setIsLoading(true);
			setError(null);

			try {
				const orders = await posService.getMerchantOrders(status);

				if (!isMounted) return;

				const formattedOrders: PaidOrder[] = orders.map((order: any) => ({
					...order,
					items: order.items || [],
				}));

				setPaidOrders(formattedOrders);

				if (routeState?.paidOrder) {
					setSelectedOrderCode(routeState.paidOrder.orderCode);
				} else if (formattedOrders.length > 0) {
					setSelectedOrderCode(formattedOrders[0].orderCode);
				}
			} catch (err) {
				console.error("Failed to fetch orders:", err);
				if (!isMounted) return;
				setError("Failed to load orders. Please try again later.");
			} finally {
				if (isMounted) {
					setIsLoading(false);
				}
			}
		};

		fetchOrders();

		return () => {
			isMounted = false;
		};
	}, [routeState?.paidOrder, status]);

	const selectedOrder = useMemo(() => {
		if (!selectedOrderCode) return paidOrders[0] ?? null;

		return paidOrders.find((order) => order.orderCode === selectedOrderCode) ?? paidOrders[0] ?? null;
	}, [paidOrders, selectedOrderCode]);

	const paidOrdersTotal = useMemo(() => {
		return paidOrders.reduce((sum, order) => sum + getOrderTotal(order), 0);
	}, [paidOrders]);

	const selectedOrderTotal = selectedOrder ? getOrderTotal(selectedOrder) : 0;
	const selectedOrderPaidAt = formatDate(selectedOrder?.paidAt);

	const handleCreateAnotherOrder = () => {
		const returnPath = localStorage.getItem(ORDER_PAYMENT_RETURN_PATH_KEY);

		if (returnPath) {
			navigate(returnPath);
			return;
		}

		navigate("/inventory/order-payment");
	};

	const handleStatusChange = (newStatus: string) => {
		setStatus(newStatus);
		setSelectedOrderCode(null);
	};

	if (isLoading) {
		return (
			<div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
				<div className="h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-slate-900" />
				<p className="text-sm text-slate-600">Loading your orders...</p>
			</div>
		);
	}

	if (error) {
		return (
			<div className="flex min-h-[400px] flex-col items-center justify-center space-y-4">
				<div className="grid h-14 w-14 place-items-center rounded-2xl bg-red-50 text-red-600">
					<Icon icon="lucide:alert-circle" className="h-6 w-6" />
				</div>
				<h2 className="text-lg font-semibold text-slate-950">Something went wrong</h2>
				<p className="max-w-md text-center text-sm text-slate-600">{error}</p>
				<Button onClick={() => window.location.reload()}>Retry</Button>
			</div>
		);
	}

	return (
		<div className="space-y-6 pb-10">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight text-slate-950">Orders</h1>
					<p className="mt-2 text-sm text-slate-600">View order payments and their details.</p>
				</div>

				<div className="flex flex-col gap-3 sm:flex-row">
					<Select value={status} onValueChange={handleStatusChange}>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Select status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="PAID">Paid Orders</SelectItem>
							<SelectItem value="PENDING">Pending Orders</SelectItem>
							<SelectItem value="CANCELLED">Cancelled Orders</SelectItem>
							<SelectItem value="RECEIVED">Received Orders</SelectItem>
						</SelectContent>
					</Select>

					<Button type="button" onClick={handleCreateAnotherOrder}>
						Create Order
					</Button>

					<Button type="button" variant="outline" onClick={() => navigate("/pos")}>
						Back To POS
					</Button>
				</div>
			</div>

			<div className="grid gap-4 md:grid-cols-3">
				<Card>
					<CardContent className="flex items-center gap-4 p-5">
						<div className="grid h-11 w-11 place-items-center rounded-2xl bg-green-50 text-green-700">
							<Icon icon="lucide:shopping-bag" className="h-5 w-5" />
						</div>

						<div>
							<p className="text-sm text-slate-500">{formatStatusLabel(status)}</p>
							<p className="text-2xl font-semibold text-slate-950">{paidOrders.length}</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="flex items-center gap-4 p-5">
						<div className="grid h-11 w-11 place-items-center rounded-2xl bg-green-50 text-green-700">
							<Icon icon="lucide:wallet" className="h-5 w-5" />
						</div>

						<div>
							<p className="text-sm text-slate-500">Total Paid</p>
							<p className="text-2xl font-semibold text-slate-950">{formatAmount(paidOrdersTotal)}</p>
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="flex items-center gap-4 p-5">
						<div className="grid h-11 w-11 place-items-center rounded-2xl bg-green-50 text-green-700">
							<Icon icon="lucide:receipt-text" className="h-5 w-5" />
						</div>

						<div>
							<p className="text-sm text-slate-500">Latest Order</p>
							<p className="text-2xl font-semibold text-slate-950">{paidOrders[0]?.orderCode ?? "-"}</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{paidOrders.length > 0 ? (
				<div className="grid gap-6 xl:grid-cols-[0.85fr_1.35fr]">
					<Card>
						<CardHeader>
							<div className="flex items-start justify-between gap-4">
								<div>
									<CardTitle>Orders</CardTitle>
									<CardDescription>Select an order to view its details.</CardDescription>
								</div>
							</div>
						</CardHeader>

						<CardContent className="space-y-3">
							{paidOrders.map((order) => {
								const isSelected = selectedOrder?.orderCode === order.orderCode;
								const orderTotal = getOrderTotal(order);

								return (
									<button
										key={order.orderCode}
										type="button"
										onClick={() => setSelectedOrderCode(order.orderCode)}
										className={`w-full rounded-2xl border p-4 text-left transition ${isSelected ? "border-green-300 bg-green-50" : "border-slate-200 bg-white hover:border-slate-300 hover:bg-slate-50"}`}
									>
										<div className="flex items-start justify-between gap-3">
											<div>
												<p className="font-semibold text-slate-950">Order #{order.orderCode}</p>
												<p className="mt-1 text-sm text-slate-500">{order.items.length} item(s)</p>
											</div>

											<Badge className={getStatusBadgeVariant(order.orderStatus || status)}>
												{order.orderStatus || status}
											</Badge>
										</div>

										<div className="mt-4 flex items-center justify-between text-sm">
											<span className="text-slate-500">{formatDate(order.paidAt)}</span>
											<span className="font-semibold text-slate-950">{formatAmount(orderTotal)}</span>
										</div>
									</button>
								);
							})}
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
								<div>
									<CardTitle>Order Details</CardTitle>
									<CardDescription>
										{selectedOrder ? `Order #${selectedOrder.orderCode}` : "Select an order"}
									</CardDescription>
								</div>

								{selectedOrder ? (
									<Badge className={`w-fit ${getStatusBadgeVariant(selectedOrder.orderStatus || status)}`}>
										{(selectedOrder.orderStatus || status) === "PAID"
											? "Payment Confirmed"
											: selectedOrder.orderStatus || status}
									</Badge>
								) : null}
							</div>
						</CardHeader>

						<CardContent className="space-y-6">
							{selectedOrder ? (
								<>
									<div className="grid gap-4 md:grid-cols-2">
										<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
											<div className="flex items-center gap-3">
												<Icon icon="lucide:hash" className="h-5 w-5 text-slate-500" />
												<div>
													<p className="text-xs font-medium uppercase text-slate-500">Order Code</p>
													<p className="font-semibold text-slate-950">{selectedOrder.orderCode}</p>
												</div>
											</div>
										</div>

										<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
											<div className="flex items-center gap-3">
												<Icon icon="lucide:wallet" className="h-5 w-5 text-slate-500" />
												<div>
													<p className="text-xs font-medium uppercase text-slate-500">Total Amount</p>
													<p className="font-semibold text-slate-950">{formatAmount(selectedOrderTotal)}</p>
												</div>
											</div>
										</div>

										<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
											<div className="flex items-center gap-3">
												<Icon icon="lucide:phone" className="h-5 w-5 text-slate-500" />
												<div>
													<p className="text-xs font-medium uppercase text-slate-500">Phone Number</p>
													<p className="font-semibold text-slate-950">{selectedOrder.phoneNumber}</p>
												</div>
											</div>
										</div>

										<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
											<div className="flex items-center gap-3">
												<Icon icon="lucide:calendar" className="h-5 w-5 text-slate-500" />
												<div>
													<p className="text-xs font-medium uppercase text-slate-500">Paid At</p>
													<p className="font-semibold text-slate-950">{selectedOrderPaidAt}</p>
												</div>
											</div>
										</div>

										<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 md:col-span-2">
											<div className="flex items-center gap-3">
												<Icon icon="lucide:user-round" className="h-5 w-5 text-slate-500" />
												<div>
													<p className="text-xs font-medium uppercase text-slate-500">Distributor ID</p>
													<p className="font-semibold text-slate-950">{selectedOrder.distributorId}</p>
												</div>
											</div>
										</div>
									</div>

									<div className="rounded-2xl border border-slate-200">
										<div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
											<h2 className="font-semibold text-slate-950">Items</h2>
											<span className="text-sm text-slate-500">{selectedOrder.items.length} item(s)</span>
										</div>

										<div className="divide-y divide-slate-200">
											{selectedOrder.items.length > 0 ? (
												selectedOrder.items.map((item, index) => (
													<div
														key={`${item.itemCode}-${index}`}
														className="grid gap-4 px-4 py-4 md:grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr]"
													>
														<div>
															<p className="font-semibold text-slate-950">{item.itemName}</p>
															<p className="text-sm text-slate-500">{item.itemCode}</p>
														</div>

														<div>
															<p className="text-xs text-slate-500">Quantity</p>
															<p className="font-medium text-slate-900">{item.quantity}</p>
														</div>

														<div>
															<p className="text-xs text-slate-500">Unit Price</p>
															<p className="font-medium text-slate-900">{formatAmount(Number(item.wholesalePrice))}</p>
														</div>

														<div>
															<p className="text-xs text-slate-500">Subtotal</p>
															<p className="font-medium text-slate-900">
																{formatAmount(item.quantity * item.wholesalePrice)}
															</p>
														</div>
													</div>
												))
											) : (
												<div className="px-4 py-6 text-sm text-slate-500">No items were found for this order.</div>
											)}
										</div>
									</div>

									{status === "PAID" && (
										<div className="rounded-2xl border border-green-200 bg-green-50 p-4">
											<div className="flex items-start gap-3">
												<Icon icon="lucide:check-circle-2" className="mt-0.5 h-5 w-5 text-green-700" />
												<div>
													<p className="font-semibold text-green-900">Payment Confirmed</p>
													<p className="mt-1 text-sm text-green-800">
														This order has been paid successfully and is ready for processing.
													</p>
												</div>
											</div>
										</div>
									)}
								</>
							) : (
								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-6 text-center">
									<p className="font-medium text-slate-900">No order selected</p>
									<p className="mt-1 text-sm text-slate-500">Select an order to view its details.</p>
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			) : (
				<Card>
					<CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
						<div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-600">
							<Icon icon="lucide:receipt-text" className="h-6 w-6" />
						</div>

						<h2 className="mt-4 text-lg font-semibold text-slate-950">No orders yet</h2>
						<p className="mt-2 max-w-md text-sm text-slate-600">
							Once an order payment is confirmed, it will appear here with its payment and item details.
						</p>

						<Button type="button" onClick={handleCreateAnotherOrder} className="mt-5">
							Create Order
						</Button>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
