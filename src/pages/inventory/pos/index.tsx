// src/pages/pos/index.tsx - FINAL VERSION WITH RESEND OTP AND OPTIONAL CUSTOMER CONTACT
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useEffect, useState } from "react";
import inventoryService, {
	type InventoryItem,
	type ProcessSaleRequest,
	type SaleItem,
} from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { OTPModal } from "@/components/otp-modal";
import { UserRoleIndicator } from "@/components/user-role-indicator";
import { useAuthCheck, useMerchantId, useUserInfo } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

interface OrderItem extends InventoryItem {
	orderQuantity: number;
}

type PaymentMethod = "mpesa" | "cash" | null;

// Toast Notification Component
const SaleToastNotification = ({
	isOpen,
	onClose,
	onPrint,
	type,
	message: toastMessage,
	details,
}: {
	isOpen: boolean;
	onClose: () => void;
	onPrint: () => void;
	type: "success" | "error";
	message: string;
	details?: {
		totalAmount: number;
		paymentMethod: string;
		itemsCount: number;
		transactionId: string;
	};
}) => {
	useEffect(() => {
		if (isOpen) {
			const timer = setTimeout(() => {
				onClose();
			}, 8000);

			return () => clearTimeout(timer);
		}
	}, [isOpen, onClose]);

	const formatCurrency = (amount: number) => {
		return `KShs ${amount?.toFixed(2) || "0.00"}`;
	};

	if (!isOpen) return null;

	return (
		<div className="fixed top-4 right-4 z-50 max-w-sm w-full">
			<div
				className={`p-4 rounded-lg shadow-lg border-2 ${
					type === "success" ? "bg-green-50 border-green-500 text-green-800" : "bg-red-50 border-red-500 text-red-800"
				}`}
			>
				<div className="flex items-start justify-between">
					<div className="flex items-center">
						{type === "success" ? (
							<Icon icon="lucide:check-circle" className="h-6 w-6 text-green-600 mr-3" />
						) : (
							<Icon icon="lucide:x-circle" className="h-6 w-6 text-red-600 mr-3" />
						)}
						<div className="flex-1">
							<h4 className="font-bold text-lg">{toastMessage}</h4>
							{details && type === "success" && (
								<div className="mt-2 text-sm space-y-1">
									<div className="flex justify-between">
										<span>Transaction ID:</span>
										<span className="font-semibold">{details.transactionId}</span>
									</div>
									<div className="flex justify-between">
										<span>Amount:</span>
										<span className="font-semibold">{formatCurrency(details.totalAmount)}</span>
									</div>
									<div className="flex justify-between">
										<span>Payment:</span>
										<span className="font-semibold">{details.paymentMethod}</span>
									</div>
									<div className="flex justify-between">
										<span>Items:</span>
										<span className="font-semibold">{details.itemsCount} items</span>
									</div>
								</div>
							)}
						</div>
					</div>
					<button onClick={onClose} className="ml-4 text-gray-500 hover:text-gray-700 flex-shrink-0">
						<Icon icon="lucide:x" className="h-4 w-4" />
					</button>
				</div>

				{type === "success" && (
					<div className="mt-3 flex justify-end">
						<Button size="sm" onClick={onPrint} className="bg-blue-600 hover:bg-blue-700 text-white">
							<Icon icon="lucide:printer" className="mr-2 h-4 w-4" />
							Print Receipt
						</Button>
					</div>
				)}
			</div>
		</div>
	);
};

// Close Day Toast Notification Component
const CloseDayToastNotification = ({
	isOpen,
	onClose,
	type,
	message: toastMessage,
	details,
}: {
	isOpen: boolean;
	onClose: () => void;
	type: "success" | "error" | "info";
	message: string;
	details?: {
		businessName: string;
		closedDate: string;
		totalSales?: number;
		merchantName?: string;
	};
}) => {
	useEffect(() => {
		if (isOpen) {
			const timer = setTimeout(() => {
				onClose();
			}, 5000); // 5 seconds as requested

			return () => clearTimeout(timer);
		}
	}, [isOpen, onClose]);

	const formatDate = (dateString: string) => {
		try {
			const date = new Date(dateString);
			return date.toLocaleDateString("en-US", {
				weekday: "short",
				year: "numeric",
				month: "short",
				day: "numeric",
				hour: "2-digit",
				minute: "2-digit",
			});
		} catch {
			return "Today";
		}
	};

	const formatCurrency = (amount: number) => {
		return `KShs ${amount?.toFixed(2) || "0.00"}`;
	};

	if (!isOpen) return null;

	const getBgColor = () => {
		switch (type) {
			case "success":
				return "bg-green-50 border-green-500 text-green-800";
			case "error":
				return "bg-red-50 border-red-500 text-red-800";
			case "info":
				return "bg-blue-50 border-blue-500 text-blue-800";
			default:
				return "bg-gray-50 border-gray-500 text-gray-800";
		}
	};

	const getIcon = () => {
		switch (type) {
			case "success":
				return "lucide:check-circle";
			case "error":
				return "lucide:x-circle";
			case "info":
				return "lucide:info";
			default:
				return "lucide:info";
		}
	};

	return (
		<div className="fixed top-20 right-4 z-50 max-w-sm w-full">
			<div className={`p-4 rounded-lg shadow-lg border-2 ${getBgColor()}`}>
				<div className="flex items-start justify-between">
					<div className="flex items-center">
						<Icon icon={getIcon()} className="h-6 w-6 mr-3" />
						<div className="flex-1">
							<h4 className="font-bold text-lg">{toastMessage}</h4>
							{details && (
								<div className="mt-2 text-sm space-y-1">
									<div className="flex justify-between">
										<span>Business:</span>
										<span className="font-semibold">{details.businessName}</span>
									</div>
									{details.totalSales !== undefined && (
										<div className="flex justify-between">
											<span>Total Sales:</span>
											<span className="font-semibold">{formatCurrency(details.totalSales)}</span>
										</div>
									)}
									<div className="flex justify-between">
										<span>Closed Date:</span>
										<span className="font-semibold">{formatDate(details.closedDate)}</span>
									</div>
								</div>
							)}
						</div>
					</div>
					<button onClick={onClose} className="ml-4 text-gray-500 hover:text-gray-700 flex-shrink-0">
						<Icon icon="lucide:x" className="h-4 w-4" />
					</button>
				</div>
			</div>
		</div>
	);
};

// Print Receipt Component
const PrintReceipt = ({
	isOpen,
	onClose,
	paymentMethod,
	totalAmount,
	customerContact,
	items,
	transactionId,
	merchantName,
}: {
	isOpen: boolean;
	onClose: () => void;
	paymentMethod: PaymentMethod;
	totalAmount: number;
	customerContact: string;
	items: OrderItem[];
	transactionId: string;
	merchantName: string;
}) => {
	if (!isOpen) return null;

	const formatCurrency = (amount: number) => {
		return `KShs ${amount?.toFixed(2) || "0.00"}`;
	};

	const currentDate = new Date();
	const formattedDate = currentDate.toLocaleDateString("en-US", {
		year: "numeric",
		month: "long",
		day: "numeric",
	});
	const formattedTime = currentDate.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
	});

	// Default merchant name if not provided
	const displayMerchantName = merchantName || "My Business";

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle>Print Receipt</CardTitle>
					<CardDescription>Review receipt before printing</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="space-y-3 border-2 border-gray-300 p-4 rounded-lg bg-white">
						{/* Receipt Header */}
						<div className="text-center border-b-2 border-dashed border-gray-400 pb-3 mb-3">
							<h3 className="font-bold text-xl text-gray-800">{displayMerchantName.toUpperCase()}</h3>
							<p className="text-sm text-gray-600 mt-1">Sales Receipt</p>
							<p className="text-xs text-gray-500 mt-1">
								{formattedDate} at {formattedTime}
							</p>
						</div>

						{/* Transaction Details */}
						<div className="space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-gray-600">Transaction ID:</span>
								<span className="font-medium text-gray-800">{transactionId}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-gray-600">Payment Method:</span>
								<span className="font-medium text-gray-800">{paymentMethod === "mpesa" ? "M-Pesa" : "Cash"}</span>
							</div>
							{customerContact && (
								<div className="flex justify-between text-sm">
									<span className="text-gray-600">Customer Phone:</span>
									<span className="font-medium text-gray-800">{customerContact}</span>
								</div>
							)}
						</div>

						{/* Items List */}
						<div className="border-t border-dashed border-gray-400 pt-3">
							<h4 className="font-semibold mb-2 text-sm text-gray-700">ITEMS PURCHASED:</h4>
							<div className="space-y-2 max-h-48 overflow-y-auto">
								{items.map((item) => (
									<div key={item.id} className="flex justify-between text-xs border-b border-gray-200 pb-2">
										<div className="flex-1">
											<p className="font-medium text-gray-800">{item.itemName}</p>
											<p className="text-gray-600">
												{formatCurrency(item.unitPrice)} × {item.orderQuantity}
											</p>
										</div>
										<span className="font-bold text-gray-800 ml-2">
											{formatCurrency(item.unitPrice * item.orderQuantity)}
										</span>
									</div>
								))}
							</div>
						</div>

						{/* Totals */}
						<div className="border-t-2 border-double border-gray-400 pt-3 space-y-2">
							<div className="flex justify-between text-sm">
								<span className="text-gray-600">Subtotal:</span>
								<span className="font-medium text-gray-800">{formatCurrency(totalAmount)}</span>
							</div>
							<div className="flex justify-between text-sm">
								<span className="text-gray-600">Tax (0%):</span>
								<span className="font-medium text-gray-800">{formatCurrency(0)}</span>
							</div>
							<div className="flex justify-between text-lg font-bold border-t border-gray-300 pt-2">
								<span className="text-gray-800">TOTAL:</span>
								<span className="text-gray-800">{formatCurrency(totalAmount)}</span>
							</div>
						</div>

						{/* Footer */}
						<div className="text-center border-t border-dashed border-gray-400 pt-3">
							<p className="text-xs text-gray-500 mb-1">Thank you for your business!</p>
							<p className="text-xs text-gray-500">
								For inquiries contact: @{displayMerchantName.toLowerCase().replace(/\s+/g, "")}
							</p>
							<p className="text-xs text-gray-500 mt-2">Powered by TRC Systems</p>
						</div>
					</div>

					<div className="flex gap-3 pt-2">
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

// Validation function - UPDATED: Phone number is now optional
const validateSaleData = (saleData: ProcessSaleRequest): string | null => {
	if (!saleData.merchantId || saleData.merchantId.trim() === "") {
		return "Merchant ID is required";
	}

	// Phone number is now optional, so remove the required check
	// Only validate phone number format if it's provided
	if (saleData.customerPhone && saleData.customerPhone.trim() !== "") {
		const phoneRegex = /^254[17]\d{8}$/;
		if (!phoneRegex.test(saleData.customerPhone.replace(/\s+/g, ""))) {
			return "Please enter a valid Kenyan phone number (format: 254XXXXXXXXX) or leave empty";
		}
	}

	if (!saleData.items || saleData.items.length === 0) {
		return "At least one item is required";
	}

	for (const item of saleData.items) {
		if (!item.inventoryId || item.inventoryId <= 0) {
			return `Invalid inventory ID: ${item.inventoryId}`;
		}

		if (!item.quantity || item.quantity <= 0) {
			return `Invalid quantity for item ${item.inventoryId}: ${item.quantity}`;
		}
	}

	return null; // No errors
};

export default function PointOfSalePage() {
	const queryClient = useQueryClient();
	const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(null);
	const [customerContact, setCustomerContact] = useState("");
	const [showToast, setShowToast] = useState(false);
	const [toastConfig, setToastConfig] = useState<{
		type: "success" | "error";
		message: string;
		details?: {
			totalAmount: number;
			paymentMethod: string;
			itemsCount: number;
			transactionId: string;
		};
	}>({ type: "success", message: "" });

	const [showPrintReceipt, setShowPrintReceipt] = useState(false);
	const [lastTransaction, setLastTransaction] = useState<{
		paymentMethod: PaymentMethod;
		totalAmount: number;
		customerContact: string;
		items: OrderItem[];
		transactionId: string;
	} | null>(null);

	// Close day states
	const [showOTPModal, setShowOTPModal] = useState(false);
	const [closeDayStep, setCloseDayStep] = useState<"idle" | "initiated" | "verifying">("idle");
	const [merchantPhone, setMerchantPhone] = useState<string>("");

	// NEW: Close day toast state
	const [showCloseDayToast, setShowCloseDayToast] = useState(false);
	const [closeDayToastConfig, setCloseDayToastConfig] = useState<{
		type: "success" | "error" | "info";
		message: string;
		details?: {
			businessName: string;
			closedDate: string;
			totalSales?: number;
			merchantName?: string;
		};
	}>({ type: "info", message: "" });

	// Authentication
	const { isAuthenticated } = useAuthCheck();
	const merchantId = useMerchantId();
	const userInfo = useUserInfo();
	const canPerformActions = isAuthenticated && !!merchantId;

	// Get merchant name from user data
	const merchantName = userInfo?.username || "My Business";

	// Inventory query
	const {
		data: inventory = [],
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["inventory-pos", merchantId],
		queryFn: () => inventoryService.listMenu(merchantId!),
		enabled: !!merchantId && isAuthenticated,
	});

	// Fetch merchant phone on mount
	useEffect(() => {
		const fetchMerchantPhone = async () => {
			if (merchantId) {
				try {
					console.log("📱 Fetching merchant phone for ID:", merchantId);
					const phone = await inventoryService.getMerchantPhone();
					if (phone) {
						setMerchantPhone(phone);
						console.log("✅ Merchant phone set:", phone);
					} else {
						console.warn("⚠️ No merchant phone found");
					}
				} catch (error) {
					console.error("❌ Failed to fetch merchant phone:", error);
				}
			}
		};

		if (merchantId && isAuthenticated) {
			fetchMerchantPhone();
		}
	}, [merchantId, isAuthenticated]);

	// NEW: Show close day toast
	const showCloseDayNotification = (
		type: "success" | "error" | "info",
		message: string,
		details?: {
			businessName: string;
			closedDate: string;
			totalSales?: number;
			merchantName?: string;
		},
	) => {
		setCloseDayToastConfig({
			type,
			message,
			details,
		});
		setShowCloseDayToast(true);
	};

	// Two-step close day mutations - FIXED
	const initiateCloseDayMutation = useMutation({
		mutationFn: () => inventoryService.initiateCloseDay(),
		onSuccess: (data) => {
			console.log("✅ OTP sent successfully:", data);
			setCloseDayStep("initiated");
			setShowOTPModal(true);

			// Use the merchant phone from response or state
			const displayPhone = data.merchantPhone || merchantPhone;
			const phoneMessage = displayPhone
				? `OTP sent to ${displayPhone.slice(0, 4)}****${displayPhone.slice(-3)}`
				: "OTP sent to your registered phone";

			// NEW: Show info toast for OTP sent
			showCloseDayNotification("info", "OTP Sent Successfully", {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
				merchantName: merchantName,
			});

			// Keep the existing antd message for backward compatibility
			message.success(data.message || phoneMessage);
		},
		onError: (error: Error) => {
			console.error("❌ Failed to initiate close day:", error);
			setCloseDayStep("idle");

			// NEW: Show error toast
			showCloseDayNotification("error", `Failed to initiate close day: ${error.message}`, {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
			});

			// Keep the existing antd message for backward compatibility
			message.error(`Failed to send OTP: ${error.message}`);
		},
	});

	// NEW: Resend OTP mutation
	const resendOTPMutation = useMutation({
		mutationFn: () => inventoryService.initiateCloseDay(),
		onSuccess: (data) => {
			console.log("✅ OTP resent successfully:", data);

			// Use the merchant phone from response or state
			const displayPhone = data.merchantPhone || merchantPhone;
			const phoneMessage = displayPhone
				? `OTP resent to ${displayPhone.slice(0, 4)}****${displayPhone.slice(-3)}`
				: "OTP resent to your registered phone";

			// Show info toast for OTP resent
			showCloseDayNotification("info", "OTP Resent Successfully", {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
				merchantName: merchantName,
			});

			// Keep the existing antd message for backward compatibility
			message.success(data.message || phoneMessage);
		},
		onError: (error: Error) => {
			console.error("❌ Failed to resend OTP:", error);

			// Show error toast
			showCloseDayNotification("error", `Failed to resend OTP: ${error.message}`, {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
			});

			// Keep the existing antd message for backward compatibility
			message.error(`Failed to resend OTP: ${error.message}`);
		},
	});

	const finalizeCloseDayMutation = useMutation({
		mutationFn: (otp: string) => inventoryService.finalizeCloseDay(otp),
		onSuccess: (data) => {
			console.log("✅ Day closed successfully:", data);

			// NEW: Show success toast with business name
			showCloseDayNotification("success", data.message || "Business Day Closed Successfully!", {
				businessName: merchantName,
				closedDate: data.closedDate || new Date().toISOString(),
				merchantName: merchantName,
			});

			// FIRST: Close the modal
			setShowOTPModal(false);

			// SECOND: Reset all close day states
			setCloseDayStep("idle");

			// THIRD: Show success message (kept for backward compatibility)
			message.success(data.message || "Business day closed successfully!");

			// FOURTH: Refresh inventory data
			queryClient.invalidateQueries({ queryKey: ["inventory-pos"] });
		},
		onError: (error: Error) => {
			console.error("❌ Failed to finalize close day:", error);

			// Check if it's an OTP error
			const errorMessage = error.message.toLowerCase();
			const isOTPError =
				errorMessage.includes("invalid") ||
				errorMessage.includes("wrong") ||
				errorMessage.includes("incorrect") ||
				errorMessage.includes("otp");

			let toastMessage = "";

			if (isOTPError) {
				toastMessage = "Invalid OTP. Please check and try again.";
				// Stay in initiated state to allow retry
				setCloseDayStep("initiated");
			} else {
				toastMessage = `Failed to close day: ${error.message}`;
				// Reset if it's a different error
				setCloseDayStep("idle");
			}

			// NEW: Show error toast
			showCloseDayNotification("error", toastMessage, {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
			});

			// Keep existing antd message for backward compatibility
			if (isOTPError) {
				message.error("Invalid OTP. Please check and try again.");
			} else {
				message.error(`Failed to close day: ${error.message}`);
			}
		},
	});

	// Item data mapping
	const getItemData = (item: any): InventoryItem => {
		if (!item) {
			return {
				id: 0,
				itemName: "Unknown Item",
				unitPrice: 0,
				availableStock: 0,
				merchantId: "",
				itemCode: "",
				startingStock: 0,
				addedStock: 0,
				soldStock: 0,
				closingStock: 0,
				totalSales: 0,
				grossSales: 0,
				netlSales: 0,
				deductions: 0,
				unitCost: 0,
				expenseNote: "",
				isActive: false,
				recordDate: "",
			};
		}

		return {
			id: item.id || 0,
			itemName: item.itemName || "Unknown Item",
			unitPrice: item.unitPrice || 0,
			availableStock: item.availableStock || 0,
			merchantId: item.merchantId,
			itemCode: item.itemCode,
			startingStock: item.startingStock,
			addedStock: item.addedStock,
			soldStock: item.soldStock,
			closingStock: item.closingStock,
			totalSales: item.totalSales,
			grossSales: item.grossSales,
			netlSales: item.netlSales,
			deductions: item.deductions,
			unitCost: item.unitCost,
			expenseNote: item.expenseNote,
			isActive: item.isActive,
			recordDate: item.recordDate,
			productImageUrl: item.productImageUrl,
			productDescription: item.productDescription,
			productCategory: item.productCategory,
			productBrand: item.productBrand,
		};
	};

	// Filter inventory based on search
	const filteredInventory = inventory.filter((item: any) => {
		const itemData = getItemData(item);
		const name = itemData.itemName.toLowerCase();
		return name.includes(searchTerm.toLowerCase());
	});

	// Generate transaction ID function
	const generateTransactionId = () => {
		return `TXN-${Date.now().toString().slice(-8)}`;
	};

	// Process sale mutation
	const processSaleMutation = useMutation({
		mutationFn: (saleData: ProcessSaleRequest) => inventoryService.processSale(saleData),
		onSuccess: (data, variables) => {
			console.log("✅ Sale processed successfully:", data);

			// Generate transaction ID
			const transactionId = generateTransactionId();

			// Store transaction details for receipt
			setLastTransaction({
				paymentMethod: selectedPaymentMethod,
				totalAmount: totalAmount,
				customerContact: customerContact || "",
				items: [...orderItems],
				transactionId: transactionId,
			});

			// Show success toast WITH TRANSACTION ID
			setToastConfig({
				type: "success",
				message: "Sale Completed Successfully!",
				details: {
					totalAmount: totalAmount,
					paymentMethod: selectedPaymentMethod === "mpesa" ? "M-Pesa" : "Cash",
					itemsCount: orderItems.reduce((total, item) => total + item.orderQuantity, 0),
					transactionId: transactionId,
				},
			});
			setShowToast(true);

			// Refresh inventory data
			queryClient.invalidateQueries({ queryKey: ["inventory-pos"] });

			// Clear order and form
			setOrderItems([]);
			setSelectedPaymentMethod(null);
			setCustomerContact("");
		},
		onError: (error: Error) => {
			console.error("❌ Sale processing failed:", error);

			let errorMessage = "Sale Failed!";

			if (error.message.includes("rollback-only")) {
				errorMessage = "Database error: Unable to complete sale.";
			} else if (error.message.includes("401")) {
				errorMessage = "Authentication failed. Please login.";
			} else if (error.message.includes("500")) {
				errorMessage = "Server error. Please try again.";
			} else if (error.message.includes("Invalid items")) {
				errorMessage = "Some items are invalid.";
			} else {
				errorMessage = `Sale failed: ${error.message}`;
			}

			// Show error toast
			setToastConfig({
				type: "error",
				message: errorMessage,
			});
			setShowToast(true);
		},
	});

	// Two-step close day handlers
	const handleInitiateCloseDay = () => {
		if (!merchantId) {
			// NEW: Show error toast
			showCloseDayNotification("error", "Merchant ID not found. Please login again.", {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
			});
			message.error("Merchant ID not found. Please login again.");
			return;
		}

		// Confirm before initiating close day
		if (
			window.confirm(
				"Are you sure you want to close the business day? An OTP will be sent to your registered phone number.",
			)
		) {
			setCloseDayStep("idle");
			initiateCloseDayMutation.mutate();
		}
	};

	// NEW: Handle resend OTP
	const handleResendOTP = () => {
		if (!merchantId) {
			showCloseDayNotification("error", "Merchant ID not found. Please login again.", {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
			});
			return;
		}

		// Show loading state in OTP modal
		setCloseDayStep("initiated");

		// Resend OTP
		resendOTPMutation.mutate();
	};

	const handleVerifyOTP = (otp: string) => {
		setCloseDayStep("verifying");
		finalizeCloseDayMutation.mutate(otp);
	};

	const handleCloseOTPModal = () => {
		console.log("Closing OTP modal...");

		// NEW: Show info toast if user cancels during initiated or verifying state
		if (closeDayStep === "initiated" || closeDayStep === "verifying") {
			showCloseDayNotification("info", "Close day process cancelled", {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
			});
			message.info("Close day process cancelled");
		}

		// Reset all OTP-related states
		setShowOTPModal(false);
		setCloseDayStep("idle");
	};

	// Close close day toast handler
	const handleCloseDayToastClose = () => {
		setShowCloseDayToast(false);
	};

	// Print receipt handler
	const handlePrintReceipt = () => {
		setShowPrintReceipt(true);
		setShowToast(false);
	};

	// Close toast handler
	const handleCloseToast = () => {
		setShowToast(false);
	};

	// Add to order function
	const addToOrder = (item: any) => {
		const itemData = getItemData(item);
		const availableQuantity = itemData.availableStock;

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

	// Update order quantity function
	const updateOrderQuantity = (itemId: number, quantity: number) => {
		if (quantity === 0) {
			removeFromOrder(itemId);
		} else {
			const item = inventory.find((i: any) => getItemData(i).id === itemId);
			if (item && quantity > getItemData(item).availableStock) {
				message.warning("Not enough stock available");
				return;
			}

			setOrderItems((prevOrder) =>
				prevOrder.map((item) => (item.id === itemId ? { ...item, orderQuantity: quantity } : item)),
			);
		}
	};

	// Remove from order function
	const removeFromOrder = (itemId: number) => {
		setOrderItems((prevOrder) => prevOrder.filter((item) => item.id !== itemId));
	};

	// Process sale function
	const processSale = async (paymentMethod: PaymentMethod) => {
		if (orderItems.length === 0) {
			message.warning("Order is empty");
			return;
		}

		if (!paymentMethod) {
			message.warning("Please select a payment method");
			return;
		}

		if (!merchantId) {
			message.error("Merchant ID not found. Please login again.");
			return;
		}

		// REMOVED: Phone number is now optional, no warning required
		// if (!customerContact || customerContact.trim() === "") {
		// 	message.warning("Please enter customer phone number for the sale");
		// 	return;
		// }

		const saleItems: SaleItem[] = orderItems.map((item) => ({
			inventoryId: item.id,
			quantity: item.orderQuantity,
		}));

		console.log("🛒 Sale Request Data (API Format):", {
			merchantId: merchantId,
			customerPhone: customerContact || "Not provided (optional)",
			items: saleItems,
		});

		const validationError = validateSaleData({
			merchantId: merchantId,
			customerPhone: customerContact,
			items: saleItems,
		});

		if (validationError) {
			message.error(validationError);
			return;
		}

		setSelectedPaymentMethod(paymentMethod);

		processSaleMutation.mutate({
			merchantId: merchantId,
			customerPhone: customerContact,
			items: saleItems,
		});
	};

	const handleMpesaPayment = () => {
		processSale("mpesa");
	};

	const handleCashPayment = () => {
		processSale("cash");
	};

	// Navigation handlers
	const handleViewDailyAnalytics = () => {
		window.location.href = "/analytics/daily-sales";
	};

	const handleViewWeeklyAnalytics = () => {
		window.location.href = "/analytics/weekly";
	};

	const totalAmount = orderItems.reduce((total, item) => total + item.unitPrice * item.orderQuantity, 0);
	const totalItems = orderItems.reduce((total, item) => total + item.orderQuantity, 0);

	// Format currency to KSH
	const formatCurrency = (amount: number) => {
		return `KShs ${amount?.toFixed(2) || "0.00"}`;
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
						<UserRoleIndicator />

						<Badge variant="secondary" className="text-lg">
							Total: {formatCurrency(totalAmount)}
						</Badge>
						<Badge variant="outline" className="text-lg">
							Items: {totalItems}
						</Badge>
						{merchantId && (
							<Badge variant="default" className="text-lg">
								{merchantName}
							</Badge>
						)}
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
                          ${itemData.availableStock === 0 ? "opacity-50 grayscale" : "hover:shadow-2xl"}
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
														{itemData.itemName}
													</h3>
												</div>

												<div className="text-center mb-2 z-10">
													<p className="text-md font-extrabold text-green-600">{formatCurrency(itemData.unitPrice)}</p>
												</div>

												<div className="text-center z-10">
													<Badge
														variant={
															itemData.availableStock === 0
																? "destructive"
																: itemData.availableStock < 5
																	? "warning"
																	: "secondary"
														}
														className="text-xs px-2 py-1 border border-black/20"
													>
														{itemData.availableStock === 0 ? "Sold Out" : `${itemData.availableStock} in stock`}
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
								<div className="flex items-center justify-between">
									<Label htmlFor="customerContact">Customer Contact Number</Label>
								</div>
								<div className="relative">
									<Input
										id="customerContact"
										placeholder="Enter phone number e.g., 254712656502 (optional)"
										value={customerContact}
										onChange={(e) => {
											// Auto-format to 254 format
											let value = e.target.value.replace(/\D/g, ""); // Remove non-digits

											// Convert 07... or 01... to 254...
											if (value.startsWith("0") && value.length === 10) {
												value = "254" + value.substring(1);
											} else if (value.startsWith("7") && value.length === 9) {
												value = "254" + value;
											} else if (value.startsWith("1") && value.length === 9) {
												value = "254" + value;
											}

											setCustomerContact(value);
										}}
										className="font-mono pr-10"
									/>
									{customerContact && (
										<button
											type="button"
											onClick={() => setCustomerContact("")}
											className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
											title="Clear contact"
										>
											<Icon icon="lucide:x" className="h-4 w-4" />
										</button>
									)}
								</div>
								<div className="text-xs text-muted-foreground space-y-1">
									<p>• Format: 2547******** </p>
									<p>• We'll automatically convert 071... to 25471...</p>
									<p
										className={`${customerContact && !/^254[17]\d{8}$/.test(customerContact) ? "text-red-500 font-medium" : "text-green-500"}`}
									>
										• Current format:{" "}
										{customerContact
											? /^254[17]\d{8}$/.test(customerContact)
												? "Valid ✅"
												: "Invalid ❌"
											: "Not provided"}
									</p>
								</div>
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
												<p className="font-bold text-gray-800 truncate">{item.itemName}</p>
												<p className="text-sm text-muted-foreground">{formatCurrency(item.unitPrice)} each</p>
												<p className="text-xs text-muted-foreground">Stock: {item.availableStock}</p>
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
													disabled={item.orderQuantity >= item.availableStock}
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
									onClick={handleCashPayment}
									disabled={
										processSaleMutation.isPending || orderItems.length === 0 || !canPerformActions
										// REMOVED: Customer contact is optional, so don't disable if empty
									}
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

							{!canPerformActions && (
								<div className="text-center text-sm text-destructive p-4 border-2 border-destructive rounded-2xl bg-destructive/10">
									<p>Authentication required. Please login to process sales.</p>
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

								{/* Close Day Button with Two-Step Process */}
								<button
									onClick={handleInitiateCloseDay}
									disabled={initiateCloseDayMutation.isPending || !merchantId}
									className={`
                    relative w-16 h-16 rounded-full flex flex-col items-center justify-center
                    transition-all duration-300 transform hover:scale-110
                    shadow-lg hover:shadow-xl border-2 border-red-600
                    ${
											initiateCloseDayMutation.isPending || !merchantId
												? "bg-red-400 cursor-not-allowed"
												: "bg-red-600 hover:bg-red-700 cursor-pointer"
										}
                  `}
								>
									{initiateCloseDayMutation.isPending ? (
										<Icon icon="eos-icons:loading" className="h-5 w-5 text-white mb-1" />
									) : (
										<Icon icon="lucide:lock" className="h-5 w-5 text-white mb-1" />
									)}
									<span className="text-white text-xs font-bold text-center leading-tight">
										{initiateCloseDayMutation.isPending ? "Sending OTP..." : "Close Day"}
									</span>
								</button>
							</div>

							{/* Close Day Status Indicator */}
							{closeDayStep === "initiated" && (
								<div className="text-center text-sm text-blue-600 p-3 border-2 border-blue-300 rounded-2xl bg-blue-50">
									<Icon icon="lucide:check-circle" className="inline h-4 w-4 mr-1" />
									OTP sent to your phone. Check your messages and enter the code above.
								</div>
							)}
						</CardContent>
					</Card>
				</div>
			</div>

			{/* Sale Toast Notification */}
			<SaleToastNotification
				isOpen={showToast}
				onClose={handleCloseToast}
				onPrint={handlePrintReceipt}
				type={toastConfig.type}
				message={toastConfig.message}
				details={toastConfig.details}
			/>

			{/* NEW: Close Day Toast Notification */}
			<CloseDayToastNotification
				isOpen={showCloseDayToast}
				onClose={handleCloseDayToastClose}
				type={closeDayToastConfig.type}
				message={closeDayToastConfig.message}
				details={closeDayToastConfig.details}
			/>

			{/* OTP Modal for Close Day Verification - FIXED */}
			<OTPModal
				isOpen={showOTPModal}
				onClose={handleCloseOTPModal}
				onVerify={handleVerifyOTP}
				onResendOTP={handleResendOTP} // NEW: Added resend OTP handler
				isLoading={finalizeCloseDayMutation.isPending}
				isResending={resendOTPMutation.isPending} // NEW: Added resending state
				merchantPhone={merchantPhone}
				errorMessage={finalizeCloseDayMutation.error?.message}
			/>

			{/* Print Receipt Modal */}
			<PrintReceipt
				isOpen={showPrintReceipt}
				onClose={() => setShowPrintReceipt(false)}
				paymentMethod={lastTransaction?.paymentMethod || null}
				totalAmount={lastTransaction?.totalAmount || 0}
				customerContact={lastTransaction?.customerContact || ""}
				items={lastTransaction?.items || []}
				transactionId={lastTransaction?.transactionId || generateTransactionId()}
				merchantName={merchantName}
			/>

			<footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
				<div className="flex flex-col items-center justify-center gap-2">
					<div className="flex items-center gap-2">
						<Icon icon="lucide:shield" className="h-4 w-4 text-gray-400" />
						<span className="text-sm text-gray-500 dark:text-gray-400">Secure • Reliable • Efficient</span>
					</div>
					<p className="text-xs text-gray-400 dark:text-gray-500">
						TRIBE powered by <span className="font-bold text-gray-600 dark:text-gray-300">TRC Systems</span>
					</p>
					<p className="text-xs text-gray-400 dark:text-gray-500">© {new Date().getFullYear()} All rights reserved</p>
				</div>
			</footer>
		</>
	);
}
