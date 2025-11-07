import { useMutation } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { posService } from "@/api/services/posService";
import { Receipt } from "@/components/pos/receipt";
import type { MpesaPaymentRequest, POSItem, POSOrder, ReceiptData } from "@/types/pos";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Text, Title } from "@/ui/typography";

export default function POSPage() {
	const [phoneNumber, setPhoneNumber] = useState("");
	const [cartItems, setCartItems] = useState<POSItem[]>([]);
	const [itemName, setItemName] = useState("");
	const [itemPrice, setItemPrice] = useState("");
	const [quantity, setQuantity] = useState(1);
	const [showReceipt, setShowReceipt] = useState(false);
	const [currentOrder, setCurrentOrder] = useState<POSOrder | null>(null);
	const [checkoutRequestID, setCheckoutRequestID] = useState<string | null>(null);

	// Calculate totals
	const subtotal = cartItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
	const tax = subtotal * 0.16; // 16% VAT
	const total = subtotal + tax;

	// Poll for payment confirmation
	useEffect(() => {
		if (!checkoutRequestID) return;

		const interval = setInterval(async () => {
			try {
				const confirmation = await posService.confirmPayment(checkoutRequestID);
				if (confirmation.success) {
					toast.success("M-Pesa payment confirmed!");
					clearInterval(interval);
					setCheckoutRequestID(null);
				}
			} catch (error) {
				console.log("Payment confirmation check:", error);
			}
		}, 5000);

		return () => clearInterval(interval);
	}, [checkoutRequestID]);

	// Mutations
	const mpesaMutation = useMutation({
		mutationFn: (paymentData: MpesaPaymentRequest) => posService.initiateMpesaPayment(paymentData),
		onSuccess: (data) => {
			if (data.checkoutRequestID) {
				toast.success("M-Pesa prompt sent to customer's phone!");
				setCheckoutRequestID(data.checkoutRequestID);

				createOrderMutation.mutate({
					phoneNumber,
					items: cartItems,
					totalAmount: total,
					paymentMethod: "mpesa" as const,
					status: "pending",
					transactionId: data.transactionId,
				});
			} else {
				toast.error(`Payment initiation failed: ${data.message}`);
			}
		},
		onError: (error: Error) => {
			toast.error(`Payment error: ${error.message}`);
		},
	});

	const createOrderMutation = useMutation({
		mutationFn: (orderData: Omit<POSOrder, "id" | "createdAt" | "receiptNumber">) => posService.createOrder(orderData),
		onSuccess: (order) => {
			setCurrentOrder(order);
			setShowReceipt(true);
			toast.success("Order completed successfully!");
			setCartItems([]);
			setPhoneNumber("");
			setItemName("");
			setItemPrice("");
			setQuantity(1);
		},
		onError: (error: Error) => {
			toast.error(`Order creation failed: ${error.message}`);
		},
	});

	const cashMutation = useMutation({
		mutationFn: (orderData: Omit<POSOrder, "id" | "createdAt" | "receiptNumber">) => posService.createOrder(orderData),
		onSuccess: (order) => {
			setCurrentOrder(order);
			setShowReceipt(true);
			toast.success("Cash payment completed!");
			setCartItems([]);
			setPhoneNumber("");
			setItemName("");
			setItemPrice("");
			setQuantity(1);
		},
	});

	// Handlers
	const addCustomItemToCart = () => {
		if (!itemName.trim()) {
			toast.error("Please enter item name");
			return;
		}

		if (!itemPrice || parseFloat(itemPrice) <= 0) {
			toast.error("Please enter a valid price");
			return;
		}

		const newItem: POSItem = {
			id: Math.random().toString(36).substr(2, 9),
			name: itemName.trim(),
			price: parseFloat(itemPrice),
			quantity: quantity,
		};

		setCartItems([...cartItems, newItem]);

		// Reset form
		setItemName("");
		setItemPrice("");
		setQuantity(1);
	};

	const removeItemFromCart = (itemId: string) => {
		setCartItems(cartItems.filter((item) => item.id !== itemId));
	};

	const updateItemQuantity = (itemId: string, newQuantity: number) => {
		if (newQuantity < 1) {
			removeItemFromCart(itemId);
			return;
		}

		setCartItems(cartItems.map((item) => (item.id === itemId ? { ...item, quantity: newQuantity } : item)));
	};

	const handleMpesaPayment = () => {
		if (!phoneNumber.trim()) {
			toast.error("Please enter customer's phone number");
			return;
		}

		if (cartItems.length === 0) {
			toast.error("Please add items to the cart");
			return;
		}

		// Format phone number for M-Pesa
		let formattedPhone = phoneNumber.trim();
		if (formattedPhone.startsWith("0")) {
			formattedPhone = "254" + formattedPhone.slice(1);
		} else if (formattedPhone.startsWith("+254")) {
			formattedPhone = formattedPhone.slice(1);
		} else if (!formattedPhone.startsWith("254")) {
			formattedPhone = "254" + formattedPhone;
		}

		const paymentData: MpesaPaymentRequest = {
			phoneNumber: formattedPhone,
			amount: Math.round(total),
			accountReference: "POS Purchase",
			transactionDesc: `Payment for ${cartItems.length} items`,
		};

		mpesaMutation.mutate(paymentData);
	};

	const handleCashPayment = () => {
		if (cartItems.length === 0) {
			toast.error("Please add items to the cart");
			return;
		}

		const orderData: Omit<POSOrder, "id" | "createdAt" | "receiptNumber"> = {
			phoneNumber: phoneNumber || "CASH_CUSTOMER",
			items: cartItems,
			totalAmount: total,
			paymentMethod: "cash",
			status: "completed",
		};

		cashMutation.mutate(orderData);
	};

	const startNewOrder = () => {
		setShowReceipt(false);
		setCurrentOrder(null);
		setCheckoutRequestID(null);
		setPhoneNumber("");
		setCartItems([]);
		setItemName("");
		setItemPrice("");
		setQuantity(1);
	};

	// Prepare receipt data
	const receiptData: ReceiptData | null = currentOrder
		? {
				receiptNumber: currentOrder.receiptNumber,
				date: new Date().toLocaleString("en-KE", {
					year: "numeric",
					month: "short",
					day: "numeric",
					hour: "2-digit",
					minute: "2-digit",
				}),
				items: currentOrder.items,
				subtotal: currentOrder.totalAmount / 1.16,
				tax: currentOrder.totalAmount * 0.16,
				total: currentOrder.totalAmount,
				paymentMethod: currentOrder.paymentMethod,
				phoneNumber: currentOrder.phoneNumber,
				transactionId: currentOrder.transactionId,
			}
		: null;

	if (showReceipt && receiptData) {
		return (
			<div className="container mx-auto px-4 py-8">
				<div className="flex justify-between items-center mb-8">
					<div>
						<Title as="h1" className="text-3xl font-bold">
							Payment Complete
						</Title>
						<Text variant="body2" className="text-muted-foreground text-lg">
							Order processed successfully
						</Text>
					</div>
					<Button onClick={startNewOrder} variant="outline" size="lg">
						New Sale
					</Button>
				</div>
				<div className="flex justify-center">
					<Receipt data={receiptData} />
				</div>
			</div>
		);
	}

	return (
		<div className="container mx-auto px-4 py-8">
			<div className="mb-8 text-center">
				<Title as="h1" className="text-4xl font-bold mb-2">
					Point of Sale
				</Title>
				<Text variant="body2" className="text-muted-foreground text-lg">
					Process customer payments quickly and efficiently
				</Text>
			</div>

			{/* Payment Status Indicator */}
			{checkoutRequestID && (
				<Card className="mb-8 border-blue-200 bg-blue-50">
					<CardContent className="p-6">
						<div className="flex items-center gap-4">
							<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
							<div>
								<Text variant="body2" className="font-semibold text-blue-800 text-lg">
									Waiting for M-Pesa Payment
								</Text>
								<Text variant="caption" className="text-blue-600 text-base">
									Please check customer's phone to complete payment
								</Text>
							</div>
						</div>
					</CardContent>
				</Card>
			)}

			<div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
				{/* Left Column - Customer Info & Item Input */}
				<div className="xl:col-span-1 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-xl">Customer Information</CardTitle>
							<CardDescription>Enter customer details</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<Label htmlFor="phone" className="text-base">
									Phone Number
								</Label>
								<Input
									id="phone"
									type="tel"
									placeholder="e.g., 0712656502"
									value={phoneNumber}
									onChange={(e) => setPhoneNumber(e.target.value)}
									disabled={!!checkoutRequestID}
									className="h-12 text-lg"
								/>
							</div>
						</CardContent>
					</Card>

					<Card>
						<CardHeader>
							<CardTitle className="text-xl">Add Items</CardTitle>
							<CardDescription>Enter item details manually</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div className="space-y-3">
								<Label htmlFor="itemName" className="text-base">
									Item Name
								</Label>
								<Input
									id="itemName"
									type="text"
									placeholder="Item casket"
									value={itemName}
									onChange={(e) => setItemName(e.target.value)}
									disabled={!!checkoutRequestID}
									className="h-12 text-lg"
								/>
							</div>

							<div className="grid grid-cols-2 gap-4">
								<div className="space-y-3">
									<Label htmlFor="price" className="text-base">
										Price (KES)
									</Label>
									<Input
										id="price"
										type="number"
										min="1"
										placeholder="0"
										value={itemPrice}
										onChange={(e) => setItemPrice(e.target.value)}
										disabled={!!checkoutRequestID}
										className="h-12 text-lg"
									/>
								</div>

								<div className="space-y-3">
									<Label htmlFor="quantity" className="text-base">
										Quantity
									</Label>
									<div className="flex gap-2 h-12">
										<Button
											variant="outline"
											size="sm"
											onClick={() => setQuantity(Math.max(1, quantity - 1))}
											disabled={!!checkoutRequestID}
											className="h-12 w-12 text-lg"
										>
											-
										</Button>
										<Input
											id="quantity"
											type="number"
											min="1"
											value={quantity}
											onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
											className="text-center h-12 text-lg"
											disabled={!!checkoutRequestID}
										/>
										<Button
											variant="outline"
											size="sm"
											onClick={() => setQuantity(quantity + 1)}
											disabled={!!checkoutRequestID}
											className="h-12 w-12 text-lg"
										>
											+
										</Button>
									</div>
								</div>
							</div>

							<Button onClick={addCustomItemToCart} className="w-full h-12 text-lg" disabled={!!checkoutRequestID}>
								Add to Cart
							</Button>
						</CardContent>
					</Card>
				</div>

				{/* Right Column - Cart & Payment Summary */}
				<div className="xl:col-span-2 space-y-6">
					<Card>
						<CardHeader>
							<CardTitle className="text-xl">Cart Items</CardTitle>
							<CardDescription className="text-lg">{cartItems.length} item(s) in cart</CardDescription>
						</CardHeader>
						<CardContent>
							{cartItems.length === 0 ? (
								<div className="text-center py-12">
									<Text variant="body2" className="text-muted-foreground text-lg">
										No items in cart. Add items to proceed.
									</Text>
								</div>
							) : (
								<div className="space-y-4">
									{cartItems.map((item) => (
										<div key={item.id} className="flex items-center justify-between p-4 border rounded-lg bg-gray-50">
											<div className="flex-1">
												<Text variant="body2" className="font-medium text-lg">
													{item.name}
												</Text>
												<Text variant="caption" className="text-muted-foreground text-base">
													KES {item.price.toLocaleString()} each
												</Text>
											</div>
											<div className="flex items-center gap-3">
												<Button
													variant="outline"
													size="sm"
													onClick={() => updateItemQuantity(item.id, item.quantity - 1)}
													disabled={!!checkoutRequestID}
													className="h-10 w-10 text-lg"
												>
													-
												</Button>
												<span className="w-12 text-center text-lg font-medium">{item.quantity}</span>
												<Button
													variant="outline"
													size="sm"
													onClick={() => updateItemQuantity(item.id, item.quantity + 1)}
													disabled={!!checkoutRequestID}
													className="h-10 w-10 text-lg"
												>
													+
												</Button>
												<Button
													variant="ghost"
													size="sm"
													onClick={() => removeItemFromCart(item.id)}
													className="text-red-500 hover:text-red-700 h-10 text-lg"
													disabled={!!checkoutRequestID}
												>
													Remove
												</Button>
											</div>
											<div className="text-right w-24">
												<Text variant="body2" className="font-semibold text-lg">
													KES {(item.price * item.quantity).toLocaleString()}
												</Text>
											</div>
										</div>
									))}
								</div>
							)}
						</CardContent>
					</Card>

					{/* Payment Summary */}
					<Card>
						<CardHeader>
							<CardTitle className="text-xl">Payment Summary</CardTitle>
						</CardHeader>
						<CardContent className="space-y-6">
							<div className="space-y-3">
								<div className="flex justify-between items-center py-2">
									<Text variant="body2" className="text-lg">
										Subtotal:
									</Text>
									<Text variant="body2" className="text-lg">
										KES {subtotal.toLocaleString()}
									</Text>
								</div>
								<div className="flex justify-between items-center py-2">
									<Text variant="body2" className="text-lg">
										VAT (16%):
									</Text>
									<Text variant="body2" className="text-lg">
										KES {tax.toLocaleString()}
									</Text>
								</div>
								<div className="flex justify-between items-center py-3 border-t border-gray-200">
									<Text variant="body2" className="font-semibold text-xl">
										Total:
									</Text>
									<Text variant="body2" className="font-bold text-2xl text-green-600">
										KES {total.toLocaleString()}
									</Text>
								</div>
							</div>

							<div className="flex gap-4">
								<Button
									onClick={handleMpesaPayment}
									disabled={mpesaMutation.isPending || cartItems.length === 0 || !!checkoutRequestID}
									className="flex-1 h-14 text-lg bg-green-600 hover:bg-green-700"
									size="lg"
								>
									{mpesaMutation.isPending ? "Sending..." : "Pay via M-Pesa"}
								</Button>
								<Button
									onClick={handleCashPayment}
									disabled={cashMutation.isPending || cartItems.length === 0 || !!checkoutRequestID}
									variant="outline"
									className="flex-1 h-14 text-lg"
									size="lg"
								>
									{cashMutation.isPending ? "Processing..." : "Pay via Cash"}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			</div>
		</div>
	);
}
