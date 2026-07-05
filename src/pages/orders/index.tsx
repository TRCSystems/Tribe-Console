import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { posService } from "@/api/services/posService";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

type OrderItem = {
	id: number;
	itemCode: string;
	itemName: string;
	quantity: number;
	wholesalePrice: number;
	lineTotal: number;
};

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
};

const PAGE_SIZE = 10;

const formatCurrency = (amount: number) => `KSh ${amount.toFixed(2)}`;

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
		default:
			return "bg-slate-100 text-slate-800 hover:bg-slate-100";
	}
};

export default function OrdersPage() {
	const navigate = useNavigate();

	const [status, setStatus] = useState("PAID");
	const [startDate, setStartDate] = useState("");
	const [endDate, setEndDate] = useState("");
	const [page, setPage] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [error, setError] = useState<string | null>(null);
	const [ordersResponse, setOrdersResponse] = useState<{
		count: number;
		totalPages: number;
		currentPage: number;
		data: Order[];
	}>({
		count: 0,
		totalPages: 1,
		currentPage: 0,
		data: [],
	});
	const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
	const [isModalOpen, setIsModalOpen] = useState(false);

	const fetchOrders = async () => {
		setIsLoading(true);
		setError(null);

		try {
			const response = await posService.getMerchantOrders({
				status,
				startDate: startDate || undefined,
				endDate: endDate || undefined,
				page,
				size: PAGE_SIZE,
				sort: "orderDate,desc",
			});

			setOrdersResponse(response);
		} catch (err) {
			console.error("Failed to fetch orders:", err);
			setError("Failed to load orders. Please try again later.");
		} finally {
			setIsLoading(false);
		}
	};

	const handleRowClick = (order: Order) => {
		setSelectedOrder(order);
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
				const response = await posService.getMerchantOrders({
					status,
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
	}, [status, startDate, endDate, page]);

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
						</SelectContent>
					</Select>

					<Button type="button" onClick={() => navigate("/inventory/order-payment")}>
						Create Order
					</Button>

					<Button type="button" variant="outline" onClick={() => navigate("/pos")}>
						Back To POS
					</Button>
				</div>
			</div>

			<Card>
				<CardHeader className="border-b border-slate-200 bg-slate-50 px-6 py-5">
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
								<TableHead>Status</TableHead>
								<TableHead className="text-center">Items</TableHead>
								<TableHead className="text-right">Total</TableHead>
								<TableHead>Phone</TableHead>
								<TableHead className="text-center">Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{ordersResponse.data.length === 0 ? (
								<TableRow>
									<TableCell colSpan={8} className="h-24 text-center text-slate-500">
										No orders match your filters.
									</TableCell>
								</TableRow>
							) : (
								ordersResponse.data.map((order) => (
									<TableRow key={order.id}>
										<TableCell className="font-medium">{order.orderCode}</TableCell>
										<TableCell>{formatDate(order.orderDate)}</TableCell>
										<TableCell>{order.distributor.businessName}</TableCell>
										<TableCell>
											<Badge className={getStatusBadgeVariant(order.status)}>{order.status}</Badge>
										</TableCell>
										<TableCell className="text-center">{order.items.length}</TableCell>
										<TableCell className="text-right font-medium">{formatCurrency(order.totalAmount)}</TableCell>
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
										<Icon icon="lucide:user-round" className="h-5 w-5 text-slate-500" />
										<div>
											<p className="text-xs font-medium uppercase text-slate-500">Distributor</p>
											<p className="font-semibold text-slate-950">{selectedOrder.distributor.businessName}</p>
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
									{selectedOrder.items.map((item) => (
										<div key={item.id} className="grid gap-4 px-4 py-4 sm:grid-cols-[1.4fr_0.6fr_0.8fr_0.8fr]">
											<div>
												<p className="font-semibold text-slate-950">{item.itemName}</p>
												<p className="text-sm text-slate-500">{item.itemCode}</p>
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
										</div>
									))}
								</div>
							</div>
						</div>
					)}

					<DialogFooter>
						<Button type="button" variant="outline" onClick={() => setIsModalOpen(false)}>
							Close
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}
