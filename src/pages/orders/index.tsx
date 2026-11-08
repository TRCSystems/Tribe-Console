import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { posService } from "@/api/services/posService";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Textarea } from "@/ui/textarea";

type OrderItem = {
	id: number;
	itemCode: string;
	itemName: string;
	quantity: number;
	wholesalePrice: number;
	lineTotal: number;
	/** Distributor's unit cost (inventory) and margin on this line. */
	unitCost?: number | null;
	lineMargin?: number | null;
};

/** A line the distributor can't ship in full, as returned by POST /orders/{code}/fulfill. */
type StockShortage = {
	itemCode: string;
	itemName: string;
	quantity: number;
	availableStock: number;
	shortBy?: number;
	reason?: string;
};

/**
 * WhatsApp delivery addresses are typed text, or "Place name · https://maps.google.com/?q=lat,lng" for a shared
 * location. Older orders saved only the link.
 */
const splitDeliveryAddress = (address: string): { place: string; mapUrl: string | null } => {
	const at = address.indexOf("https://maps.google.com");
	if (at < 0) return { place: address, mapUrl: null };
	const place = address
		.slice(0, at)
		.replace(/\s*·\s*$/, "")
		.trim();
	return { place: place || "Shared location (no place name)", mapUrl: address.slice(at).trim() };
};

const shortByOf = (s: StockShortage) =>
	s.shortBy ?? Math.max((s.quantity ?? 0) - Math.max(s.availableStock ?? 0, 0), 0);

type DistributorInfo = {
	id: number;
	businessName: string;
	businessType: string;
	location: string;
	tillNumber: string;
	businessPhone: string;
};

type Order = {
	id: number;
	orderCode: string;
	orderDate: string;
	paymentDate: string;
	status: string;
	totalAmount: number;
	phoneNumber: string;
	checkoutRequestId: string;
	paymentReference: string;
	merchant: DistributorInfo;
	distributor: DistributorInfo;
	items: OrderItem[];
	/** What the distributor made: order total minus (quantity x unit cost). Null when a cost is missing. */
	costKes?: number | null;
	marginKes?: number | null;
	marginPct?: number | null;
	marginComplete?: boolean | null;
	/** DISTRIBUTOR, REP or SHOP (placed by the shop itself from a message link). */
	orderSource?: string | null;
	/** Items the shop asked for that aren't in the catalogue. */
	shopNote?: string | null;
	/** WhatsApp customer orders (orderSource CUSTOMER): who ordered and where to deliver. */
	customerName?: string | null;
	deliveryAddress?: string | null;
	/** Why the order was cancelled, and when. */
	cancelReason?: string | null;
	cancelledAt?: string | null;
};

const PAGE_SIZE = 10;

/** Orders that haven't been paid or dispatched can still be cancelled. */
const CANCELLABLE_STATUSES = ["PENDING", "PENDING_PAYMENT", "PAYMENT_FAILED", "OVERDUE"];
const QUICK_CANCEL_REASONS = [
	"Shop asked to cancel",
	"Items out of stock",
	"Duplicate order",
	"Shop not reachable",
	"Wrong items or quantities",
];

const formatCurrency = (amount: number) => `KSh ${amount.toFixed(2)}`;

/** Margin amount with % — or a dash when some item has no unit cost in inventory. */
const MarginValue = ({ amount, pct }: { amount?: number | null; pct?: number | null }) => {
	if (amount === null || amount === undefined) {
		return (
			<span className="text-slate-400" title="An item in this order has no unit cost in inventory">
				—
			</span>
		);
	}
	return (
		<span className={amount < 0 ? "text-red-600" : "text-emerald-700"}>
			{formatCurrency(amount)}
			{pct !== null && pct !== undefined && <span className="ml-1 text-xs text-slate-500">({pct}%)</span>}
		</span>
	);
};

const formatDate = (date?: string) => {
	if (!date) return "-";

	const parsedDate = new Date(date);

	if (Number.isNaN(parsedDate.getTime())) {
		return "-";
	}

	return parsedDate.toLocaleDateString();
};

const formatDateTime = (date?: string) => {
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
		case "FULFILLED":
			return "bg-indigo-100 text-indigo-800 hover:bg-indigo-100";
		default:
			return "bg-slate-100 text-slate-800 hover:bg-slate-100";
	}
};

export default function OrdersPage() {
	const navigate = useNavigate();

	const [status, setStatus] = useState("PENDING");
	const [paymentMode, setPaymentMode] = useState("PAY_ON_DELIVERY");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [page, setPage] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [ordersResponse, setOrdersResponse] = useState<{
		role: string;
		status: string;
		count: number;
		totalPages: number;
		currentPage: number;
		filterPaymentMode?: string;
		filterStatus?: string;
		data: Order[];
	}>({
		role: "",
		status: "",
		count: 0,
		totalPages: 1,
		currentPage: 0,
		data: [],
	});
	const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);
	const [isFulfilling, setIsFulfilling] = useState(false);
	const [fulfillError, setFulfillError] = useState<string | null>(null);

	/** Items short of stock on the last fulfil attempt; `shipped` = the order went out without them. */
	const [shortages, setShortages] = useState<{ items: StockShortage[]; shipped: boolean } | null>(null);

	const handleFulfillOrder = async (allowPartial = false) => {
		if (!selectedOrder || isFulfilling) return;

		setIsFulfilling(true);
		setFulfillError(null);

		try {
			const res = await posService.fulfillOrder(selectedOrder.orderCode, allowPartial);
			const short: StockShortage[] = Array.isArray(res?.insufficientItems) ? res.insufficientItems : [];

			if (res?.status === "FAILURE") {
				// Not enough stock: nothing was shipped; show which items are short and by how many
				setShortages(short.length ? { items: short, shipped: false } : null);
				setFulfillError(
					short.length
						? `Not enough stock for ${short.length} item(s). Nothing was shipped.`
						: res?.message || "We could not fulfill this order. Please try again.",
				);
				return;
			}
			setShortages(short.length ? { items: short, shipped: true } : null);

			const fulfilledOrder: Order = { ...selectedOrder, status: "FULFILLED" };

			setSelectedOrder(fulfilledOrder);
			setOrdersResponse((prev) => ({
				...prev,
				data: prev.data.map((order) => (order.id === fulfilledOrder.id ? fulfilledOrder : order)),
			}));
		} catch (err) {
			console.error("Failed to fulfill order:", err);
			setFulfillError((err as Error)?.message || "We could not fulfill this order. Please try again.");
		} finally {
			setIsFulfilling(false);
		}
	};

	const [isStepping, setIsStepping] = useState(false);

	const handleCustomerStep = async (step: "DISPATCHED" | "DELIVERED") => {
		if (!selectedOrder || isStepping) return;
		setIsStepping(true);
		setFulfillError(null);
		try {
			await posService.customerOrderStep(selectedOrder.orderCode, step);
			const updated: Order = { ...selectedOrder, status: step === "DISPATCHED" ? "FULFILLED" : "RECEIVED" };
			setSelectedOrder(updated);
			setOrdersResponse((prev) => ({
				...prev,
				data: prev.data.map((order) => (order.id === updated.id ? updated : order)),
			}));
		} catch (err) {
			setFulfillError((err as Error)?.message || "We could not update this order. Please try again.");
		} finally {
			setIsStepping(false);
		}
	};

	const [isCancelOpen, setIsCancelOpen] = useState(false);
	const [cancelReason, setCancelReason] = useState("");
	const [isCancelling, setIsCancelling] = useState(false);

	const handleCancelOrder = async () => {
		if (!selectedOrder || isCancelling) return;
		const reason = cancelReason.trim();
		if (reason.length < 3) {
			setFulfillError("Write a reason for cancelling this order.");
			return;
		}

		setIsCancelling(true);
		setFulfillError(null);

		try {
			await posService.cancelOrder(selectedOrder.orderCode, reason);

			const cancelledOrder: Order = {
				...selectedOrder,
				status: "CANCELLED",
				cancelReason: reason,
				cancelledAt: new Date().toISOString(),
			};

			setSelectedOrder(cancelledOrder);
			setOrdersResponse((prev) => ({
				...prev,
				data: prev.data.map((order) => (order.id === cancelledOrder.id ? cancelledOrder : order)),
			}));
			setIsCancelOpen(false);
			setCancelReason("");
		} catch (err) {
			console.error("Failed to cancel order:", err);
			setFulfillError((err as Error)?.message || "We could not cancel this order. Please try again.");
		} finally {
			setIsCancelling(false);
		}
	};

	const handleRowClick = (order: Order) => {
		setSelectedOrder(order);
		setIsCancelOpen(false);
		setCancelReason("");
		setFulfillError(null);
		setShortages(null);
		setIsModalOpen(true);
	};

	const clearFilters = () => {
		setStartDate("");
		setEndDate("");
		setPage(0);
	};

	useEffect(() => {
		let isMounted = true;

		const loadOrders = async () => {
			try {
				const response = await posService.getDistributorOrders({
					status,
					paymentMode,
					startDate: startDate || undefined,
					endDate: endDate || undefined,
					page,
					size: PAGE_SIZE,
					sort: "orderDate,desc",
				});

				if (!isMounted) return;
				setOrdersResponse(response);
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

		loadOrders();

		return () => {
			isMounted = false;
		};
	}, [status, paymentMode, startDate, endDate, page]);

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
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">Orders</h1>
					<p className="mt-1 text-sm text-muted-foreground">View distributor orders and their details.</p>
					{ordersResponse.role ? (
						<p className="mt-1 text-xs text-muted-foreground">
							{ordersResponse.count} {ordersResponse.count === 1 ? "order" : "orders"}
							{ordersResponse.filterStatus ? ` · ${ordersResponse.filterStatus.toLowerCase().replace(/_/g, " ")}` : ""}
							{ordersResponse.filterPaymentMode
								? ` · ${ordersResponse.filterPaymentMode.toLowerCase().replace(/_/g, " ")}`
								: ""}
						</p>
					) : null}
				</div>

				<div className="flex flex-col gap-3 sm:flex-row">
					<Select
						value={paymentMode}
						onValueChange={(newPaymentMode) => {
							setPaymentMode(newPaymentMode);
							setPage(0);
						}}
					>
						<SelectTrigger className="w-[200px]">
							<SelectValue placeholder="Select payment mode" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="PREPAID">Prepaid</SelectItem>
							<SelectItem value="PAY_ON_DELIVERY">Pay On Delivery</SelectItem>
						</SelectContent>
					</Select>

					<Select
						value={status}
						onValueChange={(newStatus) => {
							setStatus(newStatus);
							setPage(0);
						}}
					>
						<SelectTrigger className="w-[180px]">
							<SelectValue placeholder="Select status" />
						</SelectTrigger>
						<SelectContent>
							<SelectItem value="PAID">Paid Orders</SelectItem>
							<SelectItem value="PENDING">Pending Orders</SelectItem>
							<SelectItem value="CANCELLED">Cancelled Orders</SelectItem>
							<SelectItem value="RECEIVED">Received Orders</SelectItem>
							<SelectItem value="FULFILLED">Fulfilled Orders</SelectItem>
						</SelectContent>
					</Select>

					<Button type="button" onClick={() => navigate("/order-payment")}>
						Create Order
					</Button>

					<Button type="button" variant="outline" onClick={() => navigate("/pos")}>
						Back To POS
					</Button>
				</div>
			</div>

			<Card className="gap-0 overflow-hidden py-0">
				<CardHeader className="border-b border-border bg-muted/40 px-6 py-4">
					<div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
						<div>
							<CardTitle className="text-lg">Orders</CardTitle>
							<CardDescription>
								Page {ordersResponse.currentPage + 1} of {ordersResponse.totalPages}
							</CardDescription>
						</div>

						<div className="flex flex-col gap-3 sm:flex-row sm:items-center">
							<div className="flex items-end gap-2">
								<div className="space-y-1">
									<Label htmlFor="startDate" className="text-xs font-medium text-slate-700">
										From
									</Label>
									<Input
										id="startDate"
										type="date"
										value={startDate}
										onChange={(event) => {
											setStartDate(event.target.value);
											setPage(0);
										}}
										className="h-9 w-[160px]"
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="endDate" className="text-xs font-medium text-slate-700">
										To
									</Label>
									<Input
										id="endDate"
										type="date"
										value={endDate}
										onChange={(event) => {
											setEndDate(event.target.value);
											setPage(0);
										}}
										className="h-9 w-[160px]"
									/>
								</div>
								<Button type="button" variant="outline" size="sm" onClick={clearFilters}>
									Clear
								</Button>
							</div>
						</div>
					</div>
				</CardHeader>

				<div className="w-full overflow-auto">
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Order</TableHead>
								<TableHead>Date</TableHead>
								<TableHead>Distributor</TableHead>
								<TableHead>Merchant</TableHead>
								<TableHead>Status</TableHead>
								<TableHead className="text-center">Items</TableHead>
								<TableHead className="text-right">Total</TableHead>
								<TableHead className="text-right">Margin</TableHead>
								<TableHead>Phone</TableHead>
								<TableHead className="text-center">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{ordersResponse.data.length === 0 ? (
								<TableRow>
									<TableCell colSpan={10} className="h-24 text-center text-slate-500">
										No orders match your filters.
									</TableCell>
								</TableRow>
							) : (
								ordersResponse.data.map((order) => (
									<TableRow key={order.id}>
										<TableCell className="font-medium">
											{order.orderCode}
											{order.orderSource === "CUSTOMER" && (
												<Badge className="ml-2 bg-emerald-100 text-emerald-800">WhatsApp customer</Badge>
											)}
											{order.orderSource === "SHOP" && (
												<Badge className="ml-2 bg-violet-100 text-violet-800">By shop</Badge>
											)}
										</TableCell>
										<TableCell>{formatDate(order.orderDate)}</TableCell>
										<TableCell>{order.distributor?.businessName ?? "-"}</TableCell>
										<TableCell>{order.merchant?.businessName ?? "-"}</TableCell>
										<TableCell>
											<Badge className={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
										</TableCell>
										<TableCell className="text-center">{order.items.length}</TableCell>
										<TableCell className="text-right font-medium">{formatCurrency(order.totalAmount)}</TableCell>
										<TableCell className="text-right font-medium">
											<MarginValue amount={order.marginKes} pct={order.marginPct} />
										</TableCell>
										<TableCell>{order.phoneNumber}</TableCell>
										<TableCell className="text-center">
											<Button type="button" variant="ghost" size="sm" onClick={() => handleRowClick(order)}>
												View
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</div>

				<div className="flex items-center justify-between border-t border-slate-200 px-6 py-4">
					<p className="text-sm text-slate-500">
						Page {ordersResponse.currentPage + 1} of {ordersResponse.totalPages}
					</p>
					<div className="flex items-center gap-2">
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={ordersResponse.currentPage === 0}
							onClick={() => setPage(ordersResponse.currentPage - 1)}
						>
							Previous
						</Button>
						<Button
							type="button"
							variant="outline"
							size="sm"
							disabled={ordersResponse.currentPage + 1 >= ordersResponse.totalPages}
							onClick={() => setPage(ordersResponse.currentPage + 1)}
						>
							Next
						</Button>
					</div>
				</div>
			</Card>

			{/*Order Details dialog modal*/}

			<Dialog open={isModalOpen} onOpenChange={setIsModalOpen}>
				<DialogContent className="max-h-[90vh] max-w-6xl sm:max-w-6xl overflow-y-auto">
					<DialogHeader>
						<DialogTitle>Order Details</DialogTitle>
						<DialogDescription>{selectedOrder ? selectedOrder.orderCode : ""}</DialogDescription>
					</DialogHeader>

					{selectedOrder && (
						<div className="space-y-6">
							<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
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
											<p className="font-semibold text-slate-950">{formatCurrency(selectedOrder.totalAmount)}</p>
										</div>
									</div>
								</div>

								<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
									<div className="flex items-center gap-3">
										<Icon icon="lucide:trending-up" className="h-5 w-5 text-emerald-600" />
										<div>
											<p className="text-xs font-medium uppercase text-slate-500">Margin</p>
											<p className="font-semibold">
												<MarginValue amount={selectedOrder.marginKes} pct={selectedOrder.marginPct} />
											</p>
											{selectedOrder.costKes !== null && selectedOrder.costKes !== undefined && (
												<p className="text-xs text-slate-500">Cost {formatCurrency(selectedOrder.costKes)}</p>
											)}
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
											<p className="text-xs font-medium uppercase text-slate-500">Order Date</p>
											<p className="font-semibold text-slate-950">{formatDateTime(selectedOrder.orderDate)}</p>
										</div>
									</div>
								</div>

								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<div className="flex items-center gap-3">
										<Icon icon="lucide:check-circle" className="h-5 w-5 text-slate-500" />
										<div>
											<p className="text-xs font-medium uppercase text-slate-500">Payment Date</p>
											<p className="font-semibold text-slate-950">{formatDateTime(selectedOrder.paymentDate)}</p>
										</div>
									</div>
								</div>

								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<div className="flex items-center gap-3">
										<Icon icon="lucide:tag" className="h-5 w-5 text-slate-500" />
										<div>
											<p className="text-xs font-medium uppercase text-slate-500">Status</p>
											<p className="font-semibold text-slate-950">{selectedOrder.status}</p>
										</div>
									</div>
								</div>

								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<div className="flex items-center gap-3">
										<Icon icon="lucide:user-round" className="h-5 w-5 text-slate-500" />
										<div>
											<p className="text-xs font-medium uppercase text-slate-500">Distributor</p>
											<p className="font-semibold text-slate-950">{selectedOrder.distributor?.businessName ?? "-"}</p>
										</div>
									</div>
								</div>

								<div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
									<div className="flex items-center gap-3">
										<Icon icon="lucide:store" className="h-5 w-5 text-slate-500" />
										<div>
											<p className="text-xs font-medium uppercase text-slate-500">Merchant</p>
											<p className="font-semibold text-slate-950">{selectedOrder.merchant?.businessName ?? "-"}</p>
										</div>
									</div>
								</div>
							</div>

							{selectedOrder.status === "CANCELLED" && (
								<div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
									<p className="font-semibold text-red-900">
										Cancelled
										{selectedOrder.cancelledAt ? ` on ${new Date(selectedOrder.cancelledAt).toLocaleString()}` : ""}
									</p>
									<p className="mt-1 text-red-900">
										{selectedOrder.cancelReason ? `Reason: ${selectedOrder.cancelReason}` : "No reason recorded"}
									</p>
								</div>
							)}

							{isCancelOpen && (
								<div className="rounded-2xl border border-red-200 bg-white p-4 text-sm">
									<Label htmlFor="cancel-reason" className="font-semibold text-slate-950">
										Why are you cancelling this order?
									</Label>
									<div className="mt-3 flex flex-wrap gap-2">
										{QUICK_CANCEL_REASONS.map((r) => (
											<Button key={r} type="button" size="sm" variant="outline" onClick={() => setCancelReason(r)}>
												{r}
											</Button>
										))}
									</div>
									<Textarea
										id="cancel-reason"
										className="mt-3"
										rows={3}
										maxLength={500}
										placeholder="Write the reason — it is saved with the order"
										value={cancelReason}
										onChange={(e) => setCancelReason(e.target.value)}
									/>
									<div className="mt-3 flex flex-wrap justify-end gap-2">
										<Button
											type="button"
											variant="outline"
											onClick={() => {
												setIsCancelOpen(false);
												setCancelReason("");
											}}
											disabled={isCancelling}
										>
											Keep order
										</Button>
										<Button
											type="button"
											variant="destructive"
											onClick={handleCancelOrder}
											disabled={isCancelling || cancelReason.trim().length < 3}
										>
											{isCancelling ? "Cancelling..." : "Confirm cancel"}
										</Button>
									</div>
								</div>
							)}

							{selectedOrder.orderSource === "CUSTOMER" && (
								<div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-950 dark:border-emerald-900 dark:bg-emerald-950/30 dark:text-emerald-100">
									<p className="font-semibold">Ordered on WhatsApp — deliver to the customer</p>
									<p className="mt-1">
										{selectedOrder.customerName || "Customer"} · {selectedOrder.phoneNumber}
									</p>
									{selectedOrder.deliveryAddress &&
										(() => {
											const { place, mapUrl } = splitDeliveryAddress(selectedOrder.deliveryAddress);
											return (
												<div className="mt-1 break-words">
													<p>
														Deliver to: <span className="font-medium">{place}</span>
													</p>
													{mapUrl && (
														<a className="text-xs underline" href={mapUrl} target="_blank" rel="noreferrer">
															Open in Google Maps
														</a>
													)}
												</div>
											);
										})()}
									<p className="mt-1 text-xs opacity-80">
										{selectedOrder.status === "PENDING"
											? "Waiting for M-Pesa payment."
											: selectedOrder.status === "PAID"
												? "Paid. Pack it, then mark it dispatched."
												: selectedOrder.status === "FULFILLED"
													? "On the way. Mark it delivered when it arrives."
													: ""}
									</p>
								</div>
							)}

							{selectedOrder.orderSource === "SHOP" && (
								<div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-900">
									<p className="font-semibold">
										{selectedOrder.shopNote?.startsWith("Ordered on WhatsApp")
											? "Ordered by the shop on WhatsApp"
											: "Placed by the shop itself (from a message link)"}
									</p>
									{(selectedOrder.customerName || selectedOrder.phoneNumber) && (
										<p className="mt-1">
											Contact: {selectedOrder.customerName || "—"}
											{selectedOrder.phoneNumber ? ` · ${selectedOrder.phoneNumber}` : ""}
										</p>
									)}
									{selectedOrder.deliveryAddress &&
										(() => {
											const { place, mapUrl } = splitDeliveryAddress(selectedOrder.deliveryAddress);
											return (
												<div className="mt-1 break-words">
													<p>
														Deliver to: <span className="font-medium">{place}</span>
													</p>
													{mapUrl && (
														<a className="text-xs underline" href={mapUrl} target="_blank" rel="noreferrer">
															Open in Google Maps
														</a>
													)}
												</div>
											);
										})()}
									{selectedOrder.shopNote && <p className="mt-1 opacity-80">{selectedOrder.shopNote}</p>}
								</div>
							)}

							<div className="rounded-2xl border border-slate-200">
								<div className="flex items-center justify-between border-b border-slate-200 bg-slate-50 px-4 py-3">
									<h2 className="font-semibold text-slate-950">Items</h2>
									<span className="text-sm text-slate-500">{selectedOrder.items.length} item(s)</span>
								</div>
								<div className="divide-y divide-slate-200">
									{selectedOrder.items.map((item) => (
										<div
											key={item.id}
											className="grid gap-4 px-4 py-4 sm:grid-cols-[1.4fr_0.5fr_0.8fr_0.8fr_0.8fr_0.8fr]"
										>
											<div>
												<p className="font-semibold text-slate-950">{item.itemName}</p>
												<p className="text-sm text-slate-500">{item.itemCode}</p>
												{(() => {
													const s = shortages?.items.find((x) => x.itemCode === item.itemCode);
													return s ? (
														<p className="mt-1 text-xs font-semibold text-red-600">
															Short by {shortByOf(s)} · {Math.max(s.availableStock ?? 0, 0)} in stock
														</p>
													) : null;
												})()}
											</div>
											<div>
												<p className="text-xs text-slate-500">Qty</p>
												<p className="font-medium text-slate-900">{item.quantity}</p>
											</div>
											<div>
												<p className="text-xs text-slate-500">Unit Price</p>
												<p className="font-medium text-slate-900">{formatCurrency(item.wholesalePrice)}</p>
											</div>
											<div>
												<p className="text-xs text-slate-500">Subtotal</p>
												<p className="font-medium text-slate-900">{formatCurrency(item.lineTotal)}</p>
											</div>
											<div>
												<p className="text-xs text-slate-500">Unit Cost</p>
												<p className="font-medium text-slate-900">
													{item.unitCost === null || item.unitCost === undefined ? "—" : formatCurrency(item.unitCost)}
												</p>
											</div>
											<div>
												<p className="text-xs text-slate-500">Margin</p>
												<p className="font-medium">
													<MarginValue amount={item.lineMargin} />
												</p>
											</div>
										</div>
									))}
								</div>
							</div>

							{shortages && shortages.items.length > 0 && (
								<div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-sm">
									<p className="font-semibold text-red-900">
										{shortages.shipped
											? "Fulfilled without these items (not enough stock):"
											: "Not enough stock to fulfil these items:"}
									</p>
									<Table className="mt-2">
										<TableHeader>
											<TableRow>
												<TableHead>Item</TableHead>
												<TableHead className="text-right">Ordered</TableHead>
												<TableHead className="text-right">In stock</TableHead>
												<TableHead className="text-right">Short by</TableHead>
											</TableRow>
										</TableHeader>
										<TableBody>
											{shortages.items.map((s) => (
												<TableRow key={s.itemCode}>
													<TableCell>
														<p className="font-medium text-slate-950">{s.itemName}</p>
														<p className="text-xs text-slate-500">
															{s.itemCode}
															{s.reason === "Item not found in distributor stock" ? " · not in your stock list" : ""}
														</p>
													</TableCell>
													<TableCell className="text-right">{s.quantity}</TableCell>
													<TableCell className="text-right">{Math.max(s.availableStock ?? 0, 0)}</TableCell>
													<TableCell className="text-right font-semibold text-red-700">{shortByOf(s)}</TableCell>
												</TableRow>
											))}
										</TableBody>
									</Table>
									{!shortages.shipped && (
										<p className="mt-2 text-xs text-red-900">
											{shortages.items.some((s) => (s.availableStock ?? 0) > 0) ||
											shortages.items.length < (selectedOrder.items?.length ?? 0)
												? "Restock and try again, or fulfil what's in stock now and ship the rest later."
												: "Nothing on this order is in stock. Restock and try again."}
										</p>
									)}
								</div>
							)}
						</div>
					)}

					<DialogFooter className="flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
						{fulfillError ? <p className="text-sm font-medium text-red-600">{fulfillError}</p> : null}

						<div className="flex flex-col gap-3 sm:flex-row">
							{selectedOrder?.orderSource === "CUSTOMER" && selectedOrder.status === "PAID" ? (
								<Button type="button" onClick={() => handleCustomerStep("DISPATCHED")} disabled={isStepping}>
									{isStepping ? "Saving..." : "Mark dispatched"}
								</Button>
							) : null}
							{selectedOrder?.orderSource === "CUSTOMER" && selectedOrder.status === "FULFILLED" ? (
								<Button type="button" onClick={() => handleCustomerStep("DELIVERED")} disabled={isStepping}>
									{isStepping ? "Saving..." : "Mark delivered"}
								</Button>
							) : null}

							{selectedOrder &&
							(selectedOrder.status === "PENDING" || selectedOrder.status === "PAID") &&
							selectedOrder.orderSource !== "CUSTOMER" ? (
								<>
									{shortages &&
									!shortages.shipped &&
									(shortages.items.some((s) => (s.availableStock ?? 0) > 0) ||
										shortages.items.length < (selectedOrder.items?.length ?? 0)) ? (
										<Button
											type="button"
											variant="outline"
											onClick={() => handleFulfillOrder(true)}
											disabled={isFulfilling}
										>
											{isFulfilling ? "Fulfilling..." : "Fulfil what's in stock"}
										</Button>
									) : null}
									<Button type="button" onClick={() => handleFulfillOrder(false)} disabled={isFulfilling}>
										{isFulfilling ? "Fulfilling..." : shortages && !shortages.shipped ? "Try again" : "Fulfill Order"}
									</Button>
								</>
							) : null}

							{selectedOrder && CANCELLABLE_STATUSES.includes(selectedOrder.status) && !isCancelOpen ? (
								<Button
									type="button"
									variant="outline"
									className="border-red-300 text-red-700 hover:bg-red-50"
									onClick={() => {
										setFulfillError(null);
										setIsCancelOpen(true);
									}}
									disabled={isFulfilling}
								>
									Cancel Order
								</Button>
							) : null}

							<Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
								Close
							</Button>
						</div>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
