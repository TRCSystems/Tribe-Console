import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import inventoryService, {
	type InventoryItem,
	type ProcessSaleRequest,
	type SaleItem,
} from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

interface OrderItem extends InventoryItem {
	orderQuantity: number;
}

type PaymentMethod = "mpesa" | "cash" | null;

// Success Modal Component
const SuccessModal = ({
	isOpen,
	onClose,
	paymentMethod,
	totalAmount,
	customerContact,
	items,
}: {
	isOpen: boolean;
	onClose: () => void;
	paymentMethod: PaymentMethod;
	totalAmount: number;
	customerContact: string;
	items: OrderItem[];
}) => {
	if (!isOpen) return null;

	const formatCurrency = (amount: number) => {
		return `KShs ${amount.toFixed(2)}`;
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<div className="mx-auto w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
						<Icon icon="lucide:check" className="h-8 w-8 text-green-600" />
					</div>
					<CardTitle className="text-green-600">Payment Successful!</CardTitle>
					<CardDescription>Your transaction has been processed successfully</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3">
						<div className="flex justify-between">
							<span className="text-sm text-muted-foreground">Payment Method:</span>
							<span className="font-medium">{paymentMethod === "mpesa" ? "M-Pesa" : "Cash"}</span>
						</div>
						<div className="flex justify-between">
							<span className="text-sm text-muted-foreground">Total Amount:</span>
							<span className="font-bold text-lg">{formatCurrency(totalAmount)}</span>
						</div>
						{customerContact && (
							<div className="flex justify-between">
								<span className="text-sm text-muted-foreground">Customer Contact:</span>
								<span className="font-medium">{customerContact}</span>
							</div>
						)}
						<div className="flex justify-between">
							<span className="text-sm text-muted-foreground">Transaction ID:</span>
							<span className="font-medium">TXN-{Date.now().toString().slice(-6)}</span>
						</div>
					</div>

					<div className="border-t pt-3">
						<h4 className="font-semibold mb-2">Items Purchased:</h4>
						<div className="space-y-2 max-h-32 overflow-y-auto">
							{items.map((item) => (
								<div key={item.id} className="flex justify-between text-sm">
									<span>
										{item.name} x {item.orderQuantity}
									</span>
									<span>{formatCurrency(item.price * item.orderQuantity)}</span>
								</div>
							))}
						</div>
					</div>

					<div className="flex gap-3 pt-4">
						<Button variant="outline" className="flex-1" onClick={onClose}>
							Close
						</Button>
						<Button
							className="flex-1"
							onClick={() => {
								window.print();
								onClose();
							}}
						>
							<Icon icon="lucide:printer" className="mr-2 h-4 w-4" />
							Print Receipt
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default function PointOfSalePage() {
	const queryClient = useQueryClient();
	const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(null);
	const [customerContact, setCustomerContact] = useState("");
	const [showSuccessModal, setShowSuccessModal] = useState(false);
	const [lastTransaction, setLastTransaction] = useState<{
		paymentMethod: PaymentMethod;
		totalAmount: number;
		customerContact: string;
		items: OrderItem[];
	} | null>(null);

	// Fetch inventory data
	const {
		data: inventory = [],
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["inventory-pos"],
		queryFn: inventoryService.listMenu,
	});

	// CORRECT: Field mapping based on actual API response
	const getItemData = (item: any): InventoryItem => {
		if (!item) {
			return { id: 0, name: "Unknown Item", price: 0, quantity: 0 };
		}

		return {
			id: item.id || 0,
			name: item.itemName || "Unknown Item", // ✅ API uses itemName
			price: item.unitPrice || 0, // ✅ API uses unitPrice
			quantity: item.availableStock || 0, // ✅ API uses availableStock
			category: item.category || "",
			description: item.expenseNote || "",
			// Include API fields
			merchantId: item.merchantId,
			itemCode: item.itemCode,
			itemName: item.itemName,
			startingStock: item.startingStock,
			availableStock: item.availableStock,
			unitPrice: item.unitPrice,
			expenseNote: item.expenseNote,
		};
	};

	// Filter inventory based on search
	const filteredInventory = inventory.filter((item: any) => {
		const itemData = getItemData(item);
		const name = itemData.name.toLowerCase();
		return name.includes(searchTerm.toLowerCase());
	});

	// Process sale mutation
	const processSaleMutation = useMutation({
		mutationFn: (saleData: ProcessSaleRequest) => inventoryService.processSale(saleData),
		onSuccess: (data, variables) => {
			// Store transaction details for success modal
			setLastTransaction({
				paymentMethod: selectedPaymentMethod,
				totalAmount: totalAmount,
				customerContact: customerContact || "",
				items: [...orderItems],
			});

			// Show success modal
			setShowSuccessModal(true);

			// Refresh inventory data
			queryClient.invalidateQueries({ queryKey: ["inventory-pos"] });

			// Clear order and form
			setOrderItems([]);
			setSelectedPaymentMethod(null);
			setCustomerContact("");

			message.success("Sale processed successfully!");
		},
		onError: (error: Error) => {
			message.error(`Failed to process sale: ${error.message}`);
		},
	});

	// Close day mutation
	const closeDayMutation = useMutation({
		mutationFn: () => inventoryService.closeDay({ merchantId: "HTL001" }),
		onSuccess: () => {
			message.success("Day closed successfully!");
			// Refresh inventory data to reflect changes
			queryClient.invalidateQueries({ queryKey: ["inventory-pos"] });
		},
		onError: (error: Error) => {
			message.error(`Failed to close day: ${error.message}`);
		},
	});

	const addToOrder = (item: any) => {
		const itemData = getItemData(item);
		const availableQuantity = itemData.quantity;

		if (availableQuantity === 0) {
			message.warning("This item is out of stock");
			return;
		}

		setOrderItems((prevOrder) => {
			const existingItem = prevOrder.find((orderItem) => orderItem.id === itemData.id);
			if (existingItem) {
				if (existingItem.orderQuantity >= availableQuantity) {
					message.warning("Not enough stock available");
					return prevOrder;
				}
				return prevOrder.map((orderItem) =>
					orderItem.id === itemData.id ? { ...orderItem, orderQuantity: orderItem.orderQuantity + 1 } : orderItem,
				);
			} else {
				return [
					...prevOrder,
					{
						...itemData,
						orderQuantity: 1,
					},
				];
			}
		});
	};

	const updateOrderQuantity = (itemId: number, quantity: number) => {
		if (quantity === 0) {
			removeFromOrder(itemId);
		} else {
			const item = inventory.find((i: any) => getItemData(i).id === itemId);
			if (item && quantity > getItemData(item).quantity) {
				message.warning("Not enough stock available");
				return;
			}

			setOrderItems((prevOrder) =>
				prevOrder.map((item) => (item.id === itemId ? { ...item, orderQuantity: quantity } : item)),
			);
		}
	};

	const removeFromOrder = (itemId: number) => {
		setOrderItems((prevOrder) => prevOrder.filter((item) => item.id !== itemId));
	};

	// Process sale
	const processSale = async (paymentMethod: PaymentMethod) => {
		if (orderItems.length === 0) {
			message.warning("Order is empty");
			return;
		}

		if (!paymentMethod) {
			message.warning("Please select a payment method");
			return;
		}

		const saleItems: SaleItem[] = orderItems.map((item) => ({
			inventoryId: item.id,
			quantity: item.orderQuantity,
		}));

		setSelectedPaymentMethod(paymentMethod);

		processSaleMutation.mutate({
			merchantId: "HTL001",
			items: saleItems,
		});
	};

	const handleMpesaPayment = () => {
		processSale("mpesa");
	};

	const handleCashPayment = () => {
		processSale("cash");
	};

	const handleCloseDay = () => {
		// Confirm before closing the day
		if (window.confirm("Are you sure you want to close the day? This action cannot be undone.")) {
			closeDayMutation.mutate();
		}
	};

	// ADDED: Navigation handlers using window location
	const handleViewDailyAnalytics = () => {
		window.location.href = "/analytics/daily-sales";
	};

	const handleViewWeeklyAnalytics = () => {
		window.location.href = "/analytics/weekly";
	};

	const totalAmount = orderItems.reduce((total, item) => total + item.price * item.orderQuantity, 0);
	const totalItems = orderItems.reduce((total, item) => total + item.orderQuantity, 0);

	// Format currency to KSH
	const formatCurrency = (amount: number) => {
		return `KShs ${amount.toFixed(2)}`;
	};

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">Point of Sale</h1>
						<p className="text-muted-foreground">Process orders and manage transactions</p>
					</div>
				</div>
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 text-destructive mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Failed to load menu</h3>
						<p className="text-muted-foreground mb-4">{(error as Error).message}</p>
						<Button onClick={() => refetch()}>Retry</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<>
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">Point Of Sale</h1>
						<p className="text-muted-foreground">Process orders and manage transactions</p>
					</div>
					<div className="flex items-center gap-4">
						<Badge variant="secondary" className="text-lg">
							Total: {formatCurrency(totalAmount)}
						</Badge>
						<Badge variant="outline" className="text-lg">
							Items: {totalItems}
						</Badge>
						<Button variant="outline" onClick={() => refetch()} disabled={isLoading}>
							<Icon icon="lucide:refresh-cw" className="mr-2 h-4 w-4" />
							Refresh
						</Button>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					{/* Available Items */}
					<Card className="lg:col-span-2">
						<CardHeader>
							<CardTitle>Menu Items</CardTitle>
							<CardDescription>Click on any item to add to order</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="mb-6">
								<Input
									placeholder="Search menu items..."
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="max-w-sm"
								/>
							</div>

							{isLoading ? (
								<div className="text-center py-12">
									<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
									<p className="text-muted-foreground">Loading menu...</p>
								</div>
							) : (
								<div className="grid grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
									{filteredInventory.map((item: any) => {
										const itemData = getItemData(item);
										return (
											<div
												key={itemData.id}
												className={`
                          cursor-pointer transition-all duration-300 transform hover:scale-110
                          ${itemData.quantity === 0 ? "opacity-50 grayscale" : "hover:shadow-2xl"}
                          flex flex-col items-center justify-center
                          rounded-3xl border-2 border-black shadow-lg
                          bg-gradient-to-br from-white to-gray-50
                          hover:shadow-2xl p-4 min-h-[140px] w-full
                          hover:border-green-500 hover:from-green-50 hover:to-white
                          relative overflow-hidden
                        `}
												onClick={() => addToOrder(item)}
											>
												<div className="absolute inset-0 rounded-3xl border border-white/50 shadow-inner"></div>

												<div className="text-center mb-2 z-10">
													<h3 className="font-black text-lg leading-tight text-gray-800 line-clamp-2">
														{itemData.name}
													</h3>
												</div>

												<div className="text-center mb-2 z-10">
													<p className="text-md font-extrabold text-green-600">{formatCurrency(itemData.price)}</p>
												</div>

												<div className="text-center z-10">
													<Badge
														variant={
															itemData.quantity === 0 ? "destructive" : itemData.quantity < 5 ? "warning" : "secondary"
														}
														className="text-xs px-2 py-1 border border-black/20"
													>
														{itemData.quantity === 0 ? "Sold Out" : `${itemData.quantity} in stock`}
													</Badge>
												</div>

												<div className="absolute inset-0 rounded-3xl bg-green-500/0 hover:bg-green-500/10 transition-colors duration-300"></div>
											</div>
										);
									})}
								</div>
							)}

							{!isLoading && filteredInventory.length === 0 && (
								<div className="text-center py-12 text-muted-foreground border-2 border-black rounded-2xl">
									<Icon icon="lucide:utensils" className="h-16 w-16 mx-auto mb-4 opacity-50" />
									<p className="text-lg font-medium">No items found</p>
									<p className="text-sm">Try adjusting your search criteria</p>
								</div>
							)}
						</CardContent>
					</Card>

					{/* Order & Payment Section */}
					<Card>
						<CardHeader>
							<CardTitle className="flex items-center gap-2">
								<Icon icon="lucide:clipboard-list" className="h-5 w-5" />
								Current Order
							</CardTitle>
							<CardDescription>Items selected for this transaction</CardDescription>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="space-y-3">
								<Label htmlFor="customerContact">Customer Contact Number</Label>
								<Input
									id="customerContact"
									placeholder="Enter phone number e.g., 0712656502"
									value={customerContact}
									onChange={(e) => setCustomerContact(e.target.value)}
								/>
								<p className="text-xs text-muted-foreground">Provide customer phone number for M-Pesa payments</p>
							</div>

							{orderItems.length === 0 ? (
								<div className="text-center py-8 text-muted-foreground border-2 border-black rounded-2xl">
									<Icon icon="lucide:clipboard-list" className="h-12 w-12 mx-auto mb-3 opacity-50" />
									<p className="font-medium">Order is empty</p>
									<p className="text-sm">Select items from the menu...</p>
								</div>
							) : (
								<div className="space-y-3 max-h-96 overflow-y-auto">
									{orderItems.map((item) => (
										<div
											key={item.id}
											className="flex items-center justify-between p-3 border-2 border-black rounded-xl"
										>
											<div className="flex-1 min-w-0">
												<p className="font-bold text-gray-800 truncate">{item.name}</p>
												<p className="text-sm text-muted-foreground">{formatCurrency(item.price)} each</p>
												<p className="text-xs text-muted-foreground">Stock: {item.quantity}</p>
											</div>
											<div className="flex items-center gap-2">
												<Button
													size="sm"
													variant="outline"
													className="border border-black"
													onClick={() => updateOrderQuantity(item.id, item.orderQuantity - 1)}
												>
													<Icon icon="lucide:minus" className="h-3 w-3" />
												</Button>
												<span className="w-8 text-center font-bold text-lg">{item.orderQuantity}</span>
												<Button
													size="sm"
													variant="outline"
													className="border border-black"
													onClick={() => updateOrderQuantity(item.id, item.orderQuantity + 1)}
													disabled={item.orderQuantity >= item.quantity}
												>
													<Icon icon="lucide:plus" className="h-3 w-3" />
												</Button>
												<Button
													size="sm"
													variant="ghost"
													onClick={() => removeFromOrder(item.id)}
													className="text-red-500 hover:text-red-700 border border-black/20"
												>
													<Icon icon="lucide:trash" className="h-3 w-3" />
												</Button>
											</div>
										</div>
									))}
								</div>
							)}

							<div className="border-t-2 border-black pt-4 space-y-3">
								<div className="flex justify-between text-sm">
									<span>Subtotal:</span>
									<span>{formatCurrency(totalAmount)}</span>
								</div>
								<div className="flex justify-between text-lg font-bold">
									<span>Total Amount:</span>
									<span>{formatCurrency(totalAmount)}</span>
								</div>
							</div>

							<div className="space-y-4">
								<Button
									className="w-full h-14 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-200 rounded-2xl border-2 border-black"
									onClick={handleMpesaPayment}
									disabled={processSaleMutation.isPending || orderItems.length === 0}
									style={{
										background: "linear-gradient(135deg, #00B300 0%, #008000 100%)",
										color: "white",
									}}
								>
									{processSaleMutation.isPending && selectedPaymentMethod === "mpesa" ? (
										<>
											<Icon icon="eos-icons:loading" className="mr-3 h-5 w-5" />
											Processing M-Pesa...
										</>
									) : (
										<>
											<Icon icon="lucide:smartphone" className="mr-3 h-5 w-5" />
											Pay Via M-Pesa
										</>
									)}
								</Button>

								<Button
									className="w-full h-14 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-200 rounded-2xl border-2 border-black"
									onClick={handleCashPayment}
									disabled={processSaleMutation.isPending || orderItems.length === 0}
									style={{
										background: "linear-gradient(135deg, #3B82F6 0%, #1D4ED8 100%)",
										color: "white",
									}}
								>
									{processSaleMutation.isPending && selectedPaymentMethod === "cash" ? (
										<>
											<Icon icon="eos-icons:loading" className="mr-3 h-5 w-5" />
											Processing Cash...
										</>
									) : (
										<>
											<Icon icon="lucide:banknote" className="mr-3 h-5 w-5" />
											Pay Via Cash
										</>
									)}
								</Button>
							</div>

							{orderItems.length === 0 && (
								<div className="text-center text-sm text-muted-foreground p-4 border-2 border-black rounded-2xl bg-muted/20">
									<p>Add items to your order to enable payment options</p>
								</div>
							)}

							{/* Analytics & Close Day Buttons */}
							<div className="flex justify-between items-center pt-4">
								{/* Daily Analytics Button */}
								<button
									onClick={handleViewDailyAnalytics}
									className={`
                    relative w-16 h-16 rounded-full flex flex-col items-center justify-center
                    transition-all duration-300 transform hover:scale-110
                    shadow-lg hover:shadow-xl border-2 border-purple-600
                    bg-blue-600 hover:bg-blue-700 cursor-pointer
                  `}
								>
									<Icon icon="lucide:calendar" className="h-5 w-5 text-white mb-1" />
									<span className="text-white text-xs font-bold text-center leading-tight">Daily</span>
								</button>

								{/* Weekly Analytics Button */}
								<button
									onClick={handleViewWeeklyAnalytics}
									className={`
                    relative w-16 h-16 rounded-full flex flex-col items-center justify-center
                    transition-all duration-300 transform hover:scale-110
                    shadow-lg hover:shadow-xl border-2 border-purple-600
                    bg-blue-600 hover:bg-blue-700 cursor-pointer
                  `}
								>
									<Icon icon="lucide:bar-chart-3" className="h-5 w-5 text-white mb-1" />
									<span className="text-white text-xs font-bold text-center leading-tight">Weekly</span>
								</button>

								{/* Close Day Button */}
								<button
									onClick={handleCloseDay}
									disabled={closeDayMutation.isPending}
									className={`
                    relative w-16 h-16 rounded-full flex flex-col items-center justify-center
                    transition-all duration-300 transform hover:scale-110
                    shadow-lg hover:shadow-xl border-2 border-red-600
                    ${
											closeDayMutation.isPending
												? "bg-red-400 cursor-not-allowed"
												: "bg-red-600 hover:bg-red-700 cursor-pointer"
										}
                  `}
								>
									{closeDayMutation.isPending ? (
										<Icon icon="eos-icons:loading" className="h-5 w-5 text-white mb-1" />
									) : (
										<Icon icon="lucide:lock" className="h-5 w-5 text-white mb-1" />
									)}
									<span className="text-white text-xs font-bold text-center leading-tight">
										{closeDayMutation.isPending ? "Closing..." : "Close Day"}
									</span>
								</button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>

			<SuccessModal
				isOpen={showSuccessModal}
				onClose={() => setShowSuccessModal(false)}
				paymentMethod={lastTransaction?.paymentMethod || null}
				totalAmount={lastTransaction?.totalAmount || 0}
				customerContact={lastTransaction?.customerContact || ""}
				items={lastTransaction?.items || []}
			/>
		</>
	);
}
