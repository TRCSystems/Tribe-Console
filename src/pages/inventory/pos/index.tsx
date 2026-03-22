//original author : Marcellas D
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useEffect, useState } from "react";
import inventoryService, {
	type InventoryItem,
	type SaleItemRequest,
	type SaleRequest,
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

const SPECIAL_USER_IDS = ["25", "30"]; // Both user 25 and 30 get special pricing
const SPECIAL_PRICING_RULES: Record<string, { basePrice: number; extra: number }> = {
	pork: { basePrice: 120, extra: 10 },
	beef: { basePrice: 120, extra: 30 },
	matumbo: { basePrice: 100, extra: 20 },
};

const getSpecialPricingRule = (itemName: string, userId: string | null) => {
	if (!userId || !SPECIAL_USER_IDS.includes(userId)) return null;
	const itemLower = itemName.toLowerCase().trim();
	return SPECIAL_PRICING_RULES[itemLower] || null;
};

// FIXED: Calculate extra amount to send as positive discount
const calculateSpecialPriceInfo = (
	itemName: string,
	quantity: number,
	unitPriceFromDB: number,
	userId: string | null,
): {
	isSpecial: boolean;
	extraAmount: number; // POSITIVE extra to send as discount
	totalPrice: number; // Special price total
	displayPrice: number; // Price per unit for display
} => {
	const rule = getSpecialPricingRule(itemName, userId);

	if (!rule || quantity === 0) {
		return {
			isSpecial: false,
			extraAmount: 0,
			totalPrice: unitPriceFromDB * quantity,
			displayPrice: unitPriceFromDB,
		};
	}

	// Calculate special price according to rules
	let specialTotalPrice = 0;
	if (quantity === 1) {
		specialTotalPrice = rule.basePrice;
	} else {
		specialTotalPrice = rule.basePrice + (rule.basePrice + rule.extra) * (quantity - 1);
	}

	// Calculate what normal price would be
	const normalTotalPrice = unitPriceFromDB * quantity;

	// The EXTRA amount (positive) to send as discount
	// Example: Pork normal: 120×2=240, special: 250, extra=10
	const extraAmount = specialTotalPrice - normalTotalPrice;

	// Price per unit for display
	const displayPrice = specialTotalPrice / quantity;

	return {
		isSpecial: true,
		extraAmount: extraAmount, // POSITIVE (10, 20, 30)
		totalPrice: specialTotalPrice,
		displayPrice: displayPrice,
	};
};

interface OrderItem extends InventoryItem {
	orderQuantity: number;
	totalPrice?: number;
	isSpecialPrice?: boolean;
	extraAmount?: number; // POSITIVE extra to send as discount
	displayPrice?: number; // Price per unit to display
}

type PaymentMethod = "mpesa" | "cash" | null;

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
			}, 5000);
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

const ThermalPrintReceipt = ({
	isOpen,
	onClose,
	paymentMethod,
	totalAmount,
	customerContact,
	customerName,
	items,
	transactionId,
	merchantName,
	merchantPhone,
}: {
	isOpen: boolean;
	onClose: () => void;
	paymentMethod: PaymentMethod;
	totalAmount: number;
	customerContact: string;
	customerName: string;
	items: OrderItem[];
	transactionId: string;
	merchantName: string;
	merchantPhone: string;
}) => {
	if (!isOpen) return null;

	const formatCurrency = (amount: number) => {
		return `KSh ${amount?.toFixed(2) || "0.00"}`;
	};

	const formatPhoneForDisplay = (phone: string) => {
		if (!phone || phone.trim() === "") return "";
		const cleaned = phone.replace(/\D/g, "");
		if (cleaned.startsWith("254") && cleaned.length === 12) {
			return `0${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;
		}
		return phone;
	};

	const currentDate = new Date();
	const formattedDate = currentDate.toLocaleDateString("en-US", {
		year: "numeric",
		month: "short",
		day: "numeric",
	});
	const formattedTime = currentDate.toLocaleTimeString("en-US", {
		hour: "2-digit",
		minute: "2-digit",
		hour12: true,
	});

	const displayMerchantPhone = merchantPhone ? formatPhoneForDisplay(merchantPhone) : "";
	const displayCustomerContact = customerContact ? formatPhoneForDisplay(customerContact) : "";

	const handlePrint = () => {
		const printContent = `
<!DOCTYPE html>
<html>
<head>
    <title>Receipt</title>
    <meta charset="UTF-8">
    <style>
        body {
            font-family: 'Courier New', monospace;
            font-size: 12px;
            width: 80mm;
            max-width: 80mm;
            margin: 0 auto;
            padding: 5px;
            line-height: 1.2;
        }
        
        @media print {
            body {
                margin: 0 !important;
                padding: 0 !important;
                width: 80mm !important;
            }
            
            @page {
                margin: 0;
                size: 80mm auto;
            }
            
            * {
                color: black !important;
                background: transparent !important;
            }
        }
        
        .center { text-align: center; }
        .right { text-align: right; }
        .left { text-align: left; }
        .bold { font-weight: bold; }
        
        .line {
            border-top: 1px solid #000;
            margin: 3px 0;
        }
        
        .double-line {
            border-top: 3px double #000;
            margin: 5px 0;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
        }
        
        td {
            padding: 2px 0;
            vertical-align: top;
        }
        
        .item-name {
            max-width: 45mm;
            word-break: break-word;
        }
        
        .merchant-info {
            font-size: 10px;
            margin-bottom: 3px;
        }
    </style>
</head>
<body>
    <div class="center">
        <h2 class="bold">${merchantName.toUpperCase()}</h2>
        ${
					displayMerchantPhone
						? `
        <div class="merchant-info">
            Tel: ${displayMerchantPhone}
        </div>
        `
						: ""
				}
        <p>SALES RECEIPT</p>
        <p>${formattedDate} ${formattedTime}</p>
    </div>
    
    <div class="line"></div>
    
    <table>
        <tr>
            <td class="left bold">TXN ID:</td>
            <td class="right">${transactionId}</td>
        </tr>
        <tr>
            <td class="left bold">Payment:</td>
            <td class="right">${paymentMethod === "mpesa" ? "M-PESA" : "CASH"}</td>
        </tr>
        ${
					customerName
						? `
        <tr>
            <td class="left bold">Customer:</td>
            <td class="right">${customerName}</td>
        </tr>
        `
						: ""
				}
        ${
					displayCustomerContact
						? `
        <tr>
            <td class="left bold">Phone:</td>
            <td class="right">${displayCustomerContact}</td>
        </tr>
        `
						: ""
				}
    </table>
    
    <div class="double-line"></div>
    
    <table>
        <tr>
            <td class="left bold">ITEM</td>
            <td class="right bold">QTY</td>
            <td class="right bold">AMOUNT</td>
        </tr>
        ${items
					.map((item) => {
						const itemTotal = item.totalPrice !== undefined ? item.totalPrice : item.unitPrice * item.orderQuantity;

						return `
						<tr>
							<td class="left item-name">${item.itemName}</td>
							<td class="right">${item.orderQuantity}</td>
							<td class="right">${formatCurrency(itemTotal)}</td>
						</tr>
					`;
					})
					.join("")}
    </table>
    
    <div class="double-line"></div>
    
    <table>
        <tr>
            <td class="left bold">TOTAL:</td>
            <td class="right bold">${formatCurrency(totalAmount)}</td>
        </tr>
    </table>
    
    <div class="line"></div>
    
    <div class="center">
        <p>Thank you for your business!</p>
        <div style="display: flex; align-items: center; justify-content: center; margin-top: 5px;">
            <img src="/logo.png" alt="Logo" style="width: 30px; margin-right: 8px;" />
            <span style="font-size: 12px; font-weight: bold;">Tribe<br> powered by TRC Systems</span>
        </div>
    </div>

    <script>
        window.onload = function() {
            setTimeout(function() {
                window.print();
                setTimeout(function() {
                    window.close();
                }, 500);
            }, 100);
        };
    </script>
</body>
</html>`;

		const printWindow = window.open("", "_blank");
		if (printWindow) {
			printWindow.document.write(printContent);
			printWindow.document.close();

			setTimeout(() => {
				printWindow.focus();
				printWindow.print();

				setTimeout(() => {
					printWindow.close();
				}, 500);
			}, 250);
		} else {
			const iframe = document.createElement("iframe");
			iframe.style.position = "absolute";
			iframe.style.width = "0";
			iframe.style.height = "0";
			iframe.style.border = "none";
			document.body.appendChild(iframe);

			const iframeDoc = iframe.contentDocument || iframe.contentWindow?.document;
			if (iframeDoc) {
				iframeDoc.open();
				iframeDoc.write(printContent);
				iframeDoc.close();

				setTimeout(() => {
					iframe.contentWindow?.focus();
					iframe.contentWindow?.print();

					setTimeout(() => {
						document.body.removeChild(iframe);
					}, 500);
				}, 250);
			}
		}
	};

	return (
		<div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
			<Card className="w-full max-w-md">
				<CardHeader className="text-center">
					<CardTitle>Print Receipt</CardTitle>
					<CardDescription>Review before printing</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="border-2 border-gray-300 p-4 rounded-lg bg-white">
						<div className="text-center mb-3">
							<h3 className="font-bold text-lg">{merchantName.toUpperCase()}</h3>
							{displayMerchantPhone && <p className="text-sm text-gray-600">Tel: {displayMerchantPhone}</p>}
							<p>SALES RECEIPT</p>
							<p className="text-sm">
								{formattedDate} at {formattedTime}
							</p>
						</div>

						<div className="border-t border-dashed border-gray-400 my-2"></div>

						<div className="space-y-1 text-sm mb-3">
							<div className="flex justify-between">
								<span className="font-semibold">TXN ID:</span>
								<span>{transactionId}</span>
							</div>
							<div className="flex justify-between">
								<span className="font-semibold">Payment:</span>
								<span>{paymentMethod === "mpesa" ? "M-PESA" : "CASH"}</span>
							</div>
							{customerName && (
								<div className="flex justify-between">
									<span className="font-semibold">Customer:</span>
									<span>{customerName}</span>
								</div>
							)}
							{displayCustomerContact && (
								<div className="flex justify-between">
									<span className="font-semibold">Phone:</span>
									<span>{displayCustomerContact}</span>
								</div>
							)}
						</div>

						<div className="border-t border-double border-gray-400 my-3"></div>

						<div className="mb-3">
							<div className="flex justify-between font-semibold text-sm border-b pb-1 mb-1">
								<span>ITEM</span>
								<span>QTY</span>
								<span>AMOUNT</span>
							</div>
							{items.map((item) => {
								const itemTotal = item.totalPrice !== undefined ? item.totalPrice : item.unitPrice * item.orderQuantity;

								return (
									<div key={item.id} className="flex justify-between text-sm py-1">
										<span className="flex-1 truncate mr-2">{item.itemName}</span>
										<span className="w-12 text-right">{item.orderQuantity}</span>
										<span className="w-20 text-right">{formatCurrency(itemTotal)}</span>
									</div>
								);
							})}
						</div>

						<div className="border-t border-double border-gray-400 my-3"></div>

						<div className="flex justify-between font-bold text-lg">
							<span>TOTAL:</span>
							<span>{formatCurrency(totalAmount)}</span>
						</div>

						<div className="border-t border-dashed border-gray-400 my-3"></div>

						<div className="text-center text-sm">
							<p>Thank you for your business!</p>
						</div>
					</div>

					<div className="flex gap-3 pt-2">
						<Button variant="outline" className="flex-1" onClick={onClose}>
							Close
						</Button>
						<Button className="flex-1" onClick={handlePrint}>
							<Icon icon="lucide:printer" className="mr-2 h-4 w-4" />
							Print Receipt
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

const validateSaleData = (saleData: ProcessSaleRequest): string | null => {
	if (!saleData.merchantId || saleData.merchantId.trim() === "") {
		return "Merchant ID is required";
	}

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

	return null;
};

export default function PointOfSalePage() {
	const queryClient = useQueryClient();
	const [orderItems, setOrderItems] = useState<OrderItem[]>([]);
	const [searchTerm, setSearchTerm] = useState("");
	const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod>(null);
	const [customerContact, setCustomerContact] = useState("");
	const [customerName, setCustomerName] = useState("");
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
		customerName: string;
		items: OrderItem[];
		transactionId: string;
	} | null>(null);

	const [showOTPModal, setShowOTPModal] = useState(false);
	const [closeDayStep, setCloseDayStep] = useState<"idle" | "initiated" | "verifying">("idle");
	const [merchantPhone, setMerchantPhone] = useState<string>("");

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

	const { isAuthenticated } = useAuthCheck();
	const merchantId = useMerchantId();
	const userInfo = useUserInfo();
	const canPerformActions = isAuthenticated && !!merchantId;

	const merchantName = userInfo?.username || "My Business";

	// Merchant Details Query - FIXED: This will fetch merchant details including businessPhone
	const {
		data: merchantDetailsData,
		isLoading: _isLoadingMerchantDetails,
		error: merchantDetailsError,
	} = useQuery({
		queryKey: ["merchant-details", merchantId],
		queryFn: () => inventoryService.getMerchantDetails(),
		enabled: !!merchantId && isAuthenticated,
	});

	// Update merchant phone when merchant details are loaded - FIXED
	useEffect(() => {
		if (merchantDetailsData) {
			console.log("📱 Merchant details loaded:", merchantDetailsData);
			console.log("📱 Business phone:", merchantDetailsData.businessPhone);

			if (merchantDetailsData.businessPhone) {
				setMerchantPhone(merchantDetailsData.businessPhone);
				console.log("✅ Merchant phone set:", merchantDetailsData.businessPhone);
			} else {
				console.warn("⚠️ No business phone found in merchant details");
				// Fallback to getMerchantPhone if businessPhone is not in the response
				inventoryService.getMerchantPhone().then((phone) => {
					if (phone) {
						setMerchantPhone(phone);
						console.log("✅ Fallback merchant phone set:", phone);
					}
				});
			}
		}
	}, [merchantDetailsData]);

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

	const initiateCloseDayMutation = useMutation({
		mutationFn: () => inventoryService.initiateCloseDay(),
		onSuccess: (data) => {
			console.log("✅ OTP sent successfully:", data);
			setCloseDayStep("initiated");
			setShowOTPModal(true);

			const displayPhone = data.merchantPhone || merchantPhone;
			const phoneMessage = displayPhone
				? `OTP sent to ${displayPhone.slice(0, 4)}****${displayPhone.slice(-3)}`
				: "OTP sent to your registered phone";

			showCloseDayNotification("info", "OTP Sent Successfully", {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
				merchantName: merchantName,
			});

			message.success(data.message || phoneMessage);
		},
		onError: (error: Error) => {
			console.error("❌ Failed to initiate close day:", error);
			setCloseDayStep("idle");

			showCloseDayNotification("error", `Failed to initiate close day: ${error.message}`, {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
			});

			message.error(`Failed to send OTP: ${error.message}`);
		},
	});

	const resendOTPMutation = useMutation({
		mutationFn: () => inventoryService.initiateCloseDay(),
		onSuccess: (data) => {
			console.log("✅ OTP resent successfully:", data);

			const displayPhone = data.merchantPhone || merchantPhone;
			const phoneMessage = displayPhone
				? `OTP resent to ${displayPhone.slice(0, 4)}****${displayPhone.slice(-3)}`
				: "OTP resent to your registered phone";

			showCloseDayNotification("info", "OTP Resent Successfully", {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
				merchantName: merchantName,
			});

			message.success(data.message || phoneMessage);
		},
		onError: (error: Error) => {
			console.error("❌ Failed to resend OTP:", error);

			showCloseDayNotification("error", `Failed to resend OTP: ${error.message}`, {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
			});

			message.error(`Failed to resend OTP: ${error.message}`);
		},
	});

	const finalizeCloseDayMutation = useMutation({
		mutationFn: (otp: string) => inventoryService.finalizeCloseDay(otp),
		onSuccess: (data) => {
			console.log("✅ Day closed successfully:", data);

			showCloseDayNotification("success", data.message || "Business Day Closed Successfully!", {
				businessName: merchantName,
				closedDate: data.closedDate || new Date().toISOString(),
				merchantName: merchantName,
			});

			setShowOTPModal(false);
			setCloseDayStep("idle");
			message.success(data.message || "Business day closed successfully!");
			queryClient.invalidateQueries({ queryKey: ["inventory-pos"] });
		},
		onError: (error: Error) => {
			console.error("❌ Failed to finalize close day:", error);

			const errorMessage = error.message.toLowerCase();
			const isOTPError =
				errorMessage.includes("invalid") ||
				errorMessage.includes("wrong") ||
				errorMessage.includes("incorrect") ||
				errorMessage.includes("otp");

			let toastMessage = "";

			if (isOTPError) {
				toastMessage = "Invalid OTP. Please check and try again.";
				setCloseDayStep("initiated");
			} else {
				toastMessage = `Failed to close day: ${error.message}`;
				setCloseDayStep("idle");
			}

			showCloseDayNotification("error", toastMessage, {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
			});

			if (isOTPError) {
				message.error("Invalid OTP. Please check and try again.");
			} else {
				message.error(`Failed to close day: ${error.message}`);
			}
		},
	});

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

	const filteredInventory = inventory.filter((item: any) => {
		const itemData = getItemData(item);
		const name = itemData.itemName.toLowerCase();
		return name.includes(searchTerm.toLowerCase());
	});

	const generateTransactionId = () => {
		return `TXN-${Date.now().toString().slice(-8)}`;
	};

	const processSaleMutation = useMutation({
		mutationFn: (saleData: ProcessSaleRequest) => inventoryService.processSale(saleData),
		onSuccess: (data, _variables) => {
			console.log("✅ Sale processed successfully:", data);

			const transactionId = generateTransactionId();

			setLastTransaction({
				paymentMethod: selectedPaymentMethod,
				totalAmount: totalAmount,
				customerContact: customerContact || "",
				customerName: customerName || "",
				items: [...orderItems],
				transactionId: transactionId,
			});

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

			queryClient.invalidateQueries({ queryKey: ["inventory-pos"] });

			setOrderItems([]);
			setSelectedPaymentMethod(null);
			setCustomerContact("");
			setCustomerName("");
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

			setToastConfig({
				type: "error",
				message: errorMessage,
			});
			setShowToast(true);
		},
	});

	const handleInitiateCloseDay = () => {
		if (!merchantId) {
			showCloseDayNotification("error", "Merchant ID not found. Please login again.", {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
			});
			message.error("Merchant ID not found. Please login again.");
			return;
		}

		if (
			window.confirm(
				"Are you sure you want to close the business day? An OTP will be sent to your registered phone number.",
			)
		) {
			setCloseDayStep("idle");
			initiateCloseDayMutation.mutate();
		}
	};

	const handleResendOTP = () => {
		if (!merchantId) {
			showCloseDayNotification("error", "Merchant ID not found. Please login again.", {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
			});
			return;
		}

		setCloseDayStep("initiated");
		resendOTPMutation.mutate();
	};

	const handleVerifyOTP = (otp: string) => {
		setCloseDayStep("verifying");
		finalizeCloseDayMutation.mutate(otp);
	};

	const handleCloseOTPModal = () => {
		console.log("Closing OTP modal...");

		if (closeDayStep === "initiated" || closeDayStep === "verifying") {
			showCloseDayNotification("info", "Close day process cancelled", {
				businessName: merchantName,
				closedDate: new Date().toISOString(),
			});
			message.info("Close day process cancelled");
		}

		setShowOTPModal(false);
		setCloseDayStep("idle");
	};

	const handleCloseDayToastClose = () => {
		setShowCloseDayToast(false);
	};

	const handlePrintReceipt = () => {
		setShowPrintReceipt(true);
		setShowToast(false);
	};

	const handleCloseToast = () => {
		setShowToast(false);
	};

	// FIXED: Calculate and store extra amount as POSITIVE discount
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

				const newQuantity = existingItem.orderQuantity + 1;
				// Calculate special price info
				const { isSpecial, extraAmount, totalPrice, displayPrice } = calculateSpecialPriceInfo(
					itemData.itemName,
					newQuantity,
					itemData.unitPrice,
					merchantId,
				);

				return prevOrder.map((orderItem) =>
					orderItem.id === itemData.id
						? {
								...orderItem,
								orderQuantity: newQuantity,
								totalPrice: totalPrice,
								isSpecialPrice: isSpecial,
								extraAmount: extraAmount, // POSITIVE extra (10, 20, 30)
								displayPrice: displayPrice,
							}
						: orderItem,
				);
			} else {
				// Calculate special price info for new item
				const { isSpecial, extraAmount, totalPrice, displayPrice } = calculateSpecialPriceInfo(
					itemData.itemName,
					1,
					itemData.unitPrice,
					merchantId,
				);

				return [
					...prevOrder,
					{
						...itemData,
						orderQuantity: 1,
						totalPrice: totalPrice,
						isSpecialPrice: isSpecial,
						extraAmount: extraAmount, // POSITIVE extra (10, 20, 30)
						displayPrice: displayPrice,
					},
				];
			}
		});
	};

	// FIXED: Calculate and store extra amount as POSITIVE discount
	const updateOrderQuantity = (itemId: number, quantity: number) => {
		if (quantity === 0) {
			removeFromOrder(itemId);
		} else {
			const item = inventory.find((i: any) => getItemData(i).id === itemId);
			if (!item) return;

			const itemData = getItemData(item);

			if (quantity > itemData.availableStock) {
				message.warning("Not enough stock available");
				return;
			}

			// Calculate special price info
			const { isSpecial, extraAmount, totalPrice, displayPrice } = calculateSpecialPriceInfo(
				itemData.itemName,
				quantity,
				itemData.unitPrice,
				merchantId,
			);

			setOrderItems((prevOrder) =>
				prevOrder.map((orderItem) =>
					orderItem.id === itemId
						? {
								...orderItem,
								orderQuantity: quantity,
								totalPrice: totalPrice,
								isSpecialPrice: isSpecial,
								extraAmount: extraAmount, // POSITIVE extra (10, 20, 30)
								displayPrice: displayPrice,
							}
						: orderItem,
				),
			);
		}
	};

	const removeFromOrder = (itemId: number) => {
		setOrderItems((prevOrder) => prevOrder.filter((item) => item.id !== itemId));
	};

	// FIXED: Send POSITIVE extra amount as discount
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

		// Send extra amount as POSITIVE discount
		const saleItems: SaleItem[] = orderItems.map((item) => ({
			inventoryId: item.id,
			quantity: item.orderQuantity,
			discount: item.extraAmount || 0, // Send POSITIVE extra as discount
		}));

		console.log("🛒 Sale Request Data (Extra as Discount):", {
			merchantId: merchantId,
			customerPhone: customerContact || "Not provided (optional)",
			items: saleItems,
			totalExtra: orderItems.reduce((sum, item) => sum + (item.extraAmount || 0), 0),
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

	const _handleMpesaPayment = () => {
		processSale("mpesa");
	};

	const handleCashPayment = () => {
		processSale("cash");
	};

	const handleViewDailyAnalytics = () => {
		window.location.href = "/analytics/daily-sales";
	};

	const handleViewWeeklyAnalytics = () => {
		window.location.href = "/analytics/weekly";
	};

	// Calculate total amount (including extras)
	const totalAmount = orderItems.reduce((total, item) => {
		if (item.totalPrice !== undefined) {
			return total + item.totalPrice;
		}
		return total + item.unitPrice * item.orderQuantity;
	}, 0);

	// Calculate total extra amount (positive)
	const totalExtra = orderItems.reduce((total, item) => total + (item.extraAmount || 0), 0);

	const totalItems = orderItems.reduce((total, item) => total + item.orderQuantity, 0);

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
						{totalExtra > 0 && (
							<Badge variant="outline" className="text-lg text-green-600 border-green-500">
								Extra: +{formatCurrency(totalExtra)}
							</Badge>
						)}
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
									<Label htmlFor="customerName">Customer Name (Optional)</Label>
								</div>
								<div className="relative">
									<Input
										id="customerName"
										placeholder="Enter customer name"
										value={customerName}
										onChange={(e) => setCustomerName(e.target.value)}
										className="pr-10"
									/>
									{customerName && (
										<button
											type="button"
											onClick={() => setCustomerName("")}
											className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-500 transition-colors"
											title="Clear name"
										>
											<Icon icon="lucide:x" className="h-4 w-4" />
										</button>
									)}
								</div>
							</div>

							<div className="space-y-3">
								<div className="flex items-center justify-between">
									<Label htmlFor="customerContact">Customer Phone Number (Optional)</Label>
								</div>
								<div className="relative">
									<Input
										id="customerContact"
										placeholder="Enter phone number e.g., 254712656502"
										value={customerContact}
										onChange={(e) => {
											let value = e.target.value.replace(/\D/g, "");

											if (value.startsWith("0") && value.length === 10) {
												value = `254${value.substring(1)}`;
											} else if (value.startsWith("7") && value.length === 9) {
												value = `254${value}`;
											} else if (value.startsWith("1") && value.length === 9) {
												value = `254${value}`;
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
									<p>• Format: 2547********</p>
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
									{orderItems.map((item) => {
										const _itemTotal =
											item.totalPrice !== undefined ? item.totalPrice : item.unitPrice * item.orderQuantity;
										const itemExtra = item.extraAmount || 0;
										const displayPrice = item.displayPrice || item.unitPrice;

										return (
											<div
												key={item.id}
												className="flex items-center justify-between p-3 border-2 border-black rounded-xl"
											>
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<p className="font-bold text-gray-800 truncate">{item.itemName}</p>
														{item.isSpecialPrice && (
															<Badge variant="outline" className="text-xs border-green-500 text-green-600">
																Special Price
															</Badge>
														)}
														{itemExtra > 0 && (
															<Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
																+{formatCurrency(itemExtra)}
															</Badge>
														)}
													</div>
													<p className="text-sm text-muted-foreground">
														{formatCurrency(displayPrice)} each
														{itemExtra > 0 && (
															<span className="ml-2 text-xs text-gray-400">(Extra: +{formatCurrency(itemExtra)})</span>
														)}
													</p>
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
										);
									})}
								</div>
							)}

							<div className="border-t-2 border-black pt-4 space-y-3">
								<div className="flex justify-between text-sm">
									<span>Subtotal:</span>
									<span>{formatCurrency(totalAmount - totalExtra)}</span>
								</div>

								{totalExtra > 0 && (
									<div className="flex justify-between text-sm text-orange-600">
										<span>Extra Amount:</span>
										<span>+{formatCurrency(totalExtra)}</span>
									</div>
								)}

								<div className="flex justify-between text-lg font-bold">
									<span>Total Amount:</span>
									<span>{formatCurrency(totalAmount)}</span>
								</div>
							</div>

							<div className="space-y-4">
								<Button
									className="w-full h-14 text-lg font-bold shadow-xl hover:shadow-2xl transition-all duration-200 rounded-2xl border-2 border-black"
									onClick={handleCashPayment}
									disabled={processSaleMutation.isPending || orderItems.length === 0 || !canPerformActions}
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

							<div className="flex justify-between items-center pt-4">
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

			<SaleToastNotification
				isOpen={showToast}
				onClose={handleCloseToast}
				onPrint={handlePrintReceipt}
				type={toastConfig.type}
				message={toastConfig.message}
				details={toastConfig.details}
			/>

			<CloseDayToastNotification
				isOpen={showCloseDayToast}
				onClose={handleCloseDayToastClose}
				type={closeDayToastConfig.type}
				message={closeDayToastConfig.message}
				details={closeDayToastConfig.details}
			/>

			<OTPModal
				isOpen={showOTPModal}
				onClose={handleCloseOTPModal}
				onVerify={handleVerifyOTP}
				onResendOTP={handleResendOTP}
				isLoading={finalizeCloseDayMutation.isPending}
				isResending={resendOTPMutation.isPending}
				merchantPhone={merchantPhone}
				errorMessage={finalizeCloseDayMutation.error?.message}
			/>

			<ThermalPrintReceipt
				isOpen={showPrintReceipt}
				onClose={() => setShowPrintReceipt(false)}
				paymentMethod={lastTransaction?.paymentMethod || null}
				totalAmount={lastTransaction?.totalAmount || 0}
				customerContact={lastTransaction?.customerContact || ""}
				customerName={lastTransaction?.customerName || ""}
				items={lastTransaction?.items || []}
				transactionId={lastTransaction?.transactionId || generateTransactionId()}
				merchantName={merchantName}
				merchantPhone={merchantPhone}
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
