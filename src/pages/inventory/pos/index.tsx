// src/pages/inventory/pos/index.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import inventoryService, { type InventoryItem, type SaleItem } from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

interface CartItem extends InventoryItem {
	cartQuantity: number;
}

type PaymentMethod = "mpesa" | "cash" | null;

export default function PointOfSalePage() {
	const queryClient = useQueryClient();
	const [cart, setCart] = useState<CartItem[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(null);
	const [customerContact, setCustomerContact] = useState("");

	const {
		data: inventory = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["inventory-pos"],
		queryFn: inventoryService.listMenu,
	});

	const processSaleMutation = useMutation({
		mutationFn: inventoryService.processSale,
		onSuccess: () => {
			message.success("Sale processed successfully!");
			queryClient.invalidateQueries({ queryKey: ["inventory", "inventory-pos"] });
			setCart([]);
			setSelectedPaymentMethod(null);
			setCustomerContact("");
		},
		onError: (error: Error) => {
			message.error(`Failed to process sale: ${error.message}`);
		},
	});

	const filteredInventory = inventory.filter((item: InventoryItem) =>
		item.name.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	const addToCart = (item: InventoryItem) => {
		if (item.quantity === 0) {
			message.warning("This item is out of stock");
			return;
		}

		setCart((prevCart) => {
			const existingItem = prevCart.find((cartItem) => cartItem.id === item.id);
			if (existingItem) {
				if (existingItem.cartQuantity >= item.quantity) {
					message.warning("Not enough stock available");
					return prevCart;
				}
				return prevCart.map((cartItem) =>
					cartItem.id === item.id ? { ...cartItem, cartQuantity: cartItem.cartQuantity + 1 } : cartItem,
				);
			} else {
				return [...prevCart, { ...item, cartQuantity: 1 }];
			}
		});
	};

	const updateCartQuantity = (itemId: number, quantity: number) => {
		if (quantity === 0) {
			removeFromCart(itemId);
		} else {
			const item = inventory.find((i) => i.id === itemId);
			if (item && quantity > item.quantity) {
				message.warning("Not enough stock available");
				return;
			}

			setCart((prevCart) => prevCart.map((item) => (item.id === itemId ? { ...item, cartQuantity: quantity } : item)));
		}
	};

	const removeFromCart = (itemId: number) => {
		setCart((prevCart) => prevCart.filter((item) => item.id !== itemId));
	};

	const processSale = async (paymentMethod: PaymentMethod) => {
		if (cart.length === 0) {
			message.warning("Cart is empty");
			return;
		}

		if (!paymentMethod) {
			message.warning("Please select a payment method");
			return;
		}

		const saleItems: SaleItem[] = cart.map((item) => ({
			inventoryId: item.id,
			quantity: item.cartQuantity,
		}));

		processSaleMutation.mutate({
			merchantId: "HTL001",
			items: saleItems,
			paymentMethod: paymentMethod,
			customerContact: customerContact || undefined, // Include customer contact if provided
		});
	};

	const handleMpesaPayment = () => {
		setSelectedPaymentMethod("mpesa");
		processSale("mpesa");
	};

	const handleCashPayment = () => {
		setSelectedPaymentMethod("cash");
		processSale("cash");
	};

	const totalAmount = cart.reduce((total, item) => total + item.price * item.cartQuantity, 0);
	const totalItems = cart.reduce((total, item) => total + item.cartQuantity, 0);

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
						<p className="text-muted-foreground">Process sales and manage transactions</p>
					</div>
				</div>
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 text-destructive mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Failed to load inventory</h3>
						<p className="text-muted-foreground mb-4">{(error as Error).message}</p>
						<Button onClick={() => window.location.reload()}>Retry</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Point Of Sale</h1>
					<p className="text-muted-foreground">Process sales and manage transactions</p>
				</div>
				<div className="flex items-center gap-4">
					<Badge variant="secondary" className="text-lg">
						Total: {formatCurrency(totalAmount)}
					</Badge>
					<Badge variant="outline" className="text-lg">
						Items: {totalItems}
					</Badge>
				</div>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				{/* Available Items */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Available Menu</CardTitle>
						<CardDescription>Click to add to your menu... </CardDescription>
					</CardHeader>
					<CardContent>
						<div className="mb-6">
							<Input
								placeholder="Search items..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="max-w-sm"
							/>
						</div>

						{isLoading ? (
							<div className="text-center py-12">
								<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
								<p className="text-muted-foreground">Loading inventory...</p>
							</div>
						) : (
							<div className="grid grid-cols-1 md:grid-cols-2 gap-4">
								{filteredInventory.map((item: InventoryItem) => (
									<Card
										key={item.id}
										className={`cursor-pointer transition-all hover:shadow-md ${
											item.quantity === 0 ? "opacity-50" : ""
										}`}
										onClick={() => addToCart(item)}
									>
										<CardContent className="p-4">
											<div className="flex items-start justify-between">
												<div className="space-y-2 flex-1">
													<div className="flex items-center gap-2">
														<h3 className="font-semibold">{item.name}</h3>
														<Badge
															variant={item.quantity === 0 ? "destructive" : item.quantity < 10 ? "warning" : "outline"}
														>
															{item.quantity === 0 ? "Out of Stock" : `${item.quantity} in stock`}
														</Badge>
													</div>
													<p className="text-sm text-muted-foreground">{item.category}</p>
													<p className="text-lg font-bold text-green-600">{formatCurrency(item.price)}</p>
												</div>
												<Button
													size="sm"
													disabled={item.quantity === 0}
													onClick={(e) => {
														e.stopPropagation();
														addToCart(item);
													}}
												>
													<Icon icon="lucide:plus" className="h-4 w-4" />
												</Button>
											</div>
										</CardContent>
									</Card>
								))}
							</div>
						)}

						{!isLoading && filteredInventory.length === 0 && (
							<div className="text-center py-12 text-muted-foreground">
								<Icon icon="lucide:package" className="h-16 w-16 mx-auto mb-4 opacity-50" />
								<p className="text-lg font-medium">No items found</p>
								<p className="text-sm">Try adjusting your search criteria</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Shopping Cart & Payment Section */}
				<Card>
					<CardHeader>
						<CardTitle className="flex items-center gap-2">
							<Icon icon="lucide:shopping-cart" className="h-5 w-5" />
							Your Menu
						</CardTitle>
						<CardDescription>Current transaction items</CardDescription>
					</CardHeader>
					<CardContent className="space-y-6">
						{/* Customer Contact Information */}
						<div className="space-y-3">
							<Label htmlFor="customerContact">Customer Contact Number </Label>
							<Input
								id="customerContact"
								placeholder="Enter phone number e.g., 0712656502"
								value={customerContact}
								onChange={(e) => setCustomerContact(e.target.value)}
							/>
							<p className="text-xs text-muted-foreground">
								Provide customer phone number for M-Pesa payments 
							</p>
						</div>

						
						{cart.length === 0 ? (
							<div className="text-center py-8 text-muted-foreground border rounded-lg">
								<Icon icon="lucide:shopping-cart" className="h-12 w-12 mx-auto mb-3 opacity-50" />
								<p className="font-medium">Cart is empty</p>
								<p className="text-sm">Add items from the left....</p>
							</div>
						) : (
							<div className="space-y-3 max-h-96 overflow-y-auto">
								{cart.map((item) => (
									<div key={item.id} className="flex items-center justify-between p-3 border rounded-lg">
										<div className="flex-1 min-w-0">
											<p className="font-medium truncate">{item.name}</p>
											<p className="text-sm text-muted-foreground">{formatCurrency(item.price)} each</p>
										</div>
										<div className="flex items-center gap-2">
											<Button
												size="sm"
												variant="outline"
												onClick={() => updateCartQuantity(item.id, item.cartQuantity - 1)}
											>
												<Icon icon="lucide:minus" className="h-3 w-3" />
											</Button>
											<span className="w-8 text-center font-medium">{item.cartQuantity}</span>
											<Button
												size="sm"
												variant="outline"
												onClick={() => updateCartQuantity(item.id, item.cartQuantity + 1)}
												disabled={item.cartQuantity >= item.quantity}
											>
												<Icon icon="lucide:plus" className="h-3 w-3" />
											</Button>
											<Button
												size="sm"
												variant="ghost"
												onClick={() => removeFromCart(item.id)}
												className="text-red-500 hover:text-red-700"
											>
												<Icon icon="lucide:trash" className="h-3 w-3" />
											</Button>
										</div>
									</div>
								))}
							</div>
						)}

						
						<div className="border-t pt-4 space-y-3">
							<div className="flex justify-between text-sm">
								<span>Subtotal:</span>
								<span>{formatCurrency(totalAmount)}</span>
							</div>
							<div className="flex justify-between text-lg font-bold">
								<span>Total Amount:</span>
								<span>{formatCurrency(totalAmount)}</span>
							</div>
						</div>

						
						<div className="space-y-3">
							<Button
								className="w-full"
								size="lg"
								onClick={handleMpesaPayment}
								disabled={processSaleMutation.isPending || cart.length === 0}
								variant={selectedPaymentMethod === "mpesa" ? "default" : "outline"}
							>
								{processSaleMutation.isPending && selectedPaymentMethod === "mpesa" ? (
									<>
										<Icon icon="eos-icons:loading" className="mr-2" />
										Processing M-Pesa...
									</>
								) : (
									<>
										<Icon icon="lucide:smartphone" className="mr-2" />
										Pay via M-Pesa
									</>
								)}
							</Button>

							<Button
								className="w-full"
								size="lg"
								onClick={handleCashPayment}
								disabled={processSaleMutation.isPending || cart.length === 0}
								variant={selectedPaymentMethod === "cash" ? "default" : "outline"}
							>
								{processSaleMutation.isPending && selectedPaymentMethod === "cash" ? (
									<>
										<Icon icon="eos-icons:loading" className="mr-2" />
										Processing Cash...
									</>
								) : (
									<>
										<Icon icon="lucide:banknote" className="mr-2" />
										Pay via Cash
									</>
								)}
							</Button>
						</div>

						
						{cart.length === 0 && (
							<div className="text-center text-sm text-muted-foreground">
								<p>Add items to cart to enable payment options</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}