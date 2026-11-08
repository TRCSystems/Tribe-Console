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
import { useAuthCheck, useMerchantId, useUserInfo, useUserToken } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { getBusinessPhoneFromToken, getLocationFromToken, getTillNumberFromToken } from "@/utils/jwt";
import { isStockHidden, sellableQuantity } from "@/utils/stock-visibility";

type PricingMode = "retail" | "wholesale";

interface PosInventoryItem extends InventoryItem {
	wholesaleUnitPrice: number | null;
	activeUnitPrice: number | null;
	hasWholesalePrice: boolean;
}

const SPECIAL_USER_IDS = ["25", "30"]; // Both user 25 and 30 get special pricing
const SPECIAL_PRICING_RULES: Record<string, { extra: number }> = {
	pork: { extra: 10 },
	beef: { extra: 30 },
	matumbo: { extra: 20 },
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
	// First item at basePrice (from DB), additional items at basePrice + extra
	let specialTotalPrice = 0;
	if (quantity === 1) {
		specialTotalPrice = unitPriceFromDB;
	} else {
		specialTotalPrice = unitPriceFromDB + (unitPriceFromDB + rule.extra) * (quantity - 1);
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

const WHOLESALE_PRICE_PATHS = [
	["wholesalePrice"],
	["wholeSalePrice"],
	["wholesaleUnitPrice"],
	["wholeSaleUnitPrice"],
	["unitWholesalePrice"],
	["priceWholesale"],
	["prices", "wholesale"],
	["pricing", "wholesale"],
	["pricing", "wholesalePrice"],
	["productPricing", "wholesale"],
];

const readNumberAtPath = (source: unknown, path: string[]): number | null => {
	let current: any = source;

	for (const key of path) {
		if (!current || typeof current !== "object" || !(key in current)) {
			return null;
		}
		current = current[key];
	}

	if (typeof current === "number" && Number.isFinite(current)) {
		return current;
	}

	if (typeof current === "string") {
		const parsed = Number(current);
		return Number.isFinite(parsed) ? parsed : null;
	}

	return null;
};

const getWholesaleUnitPrice = (item: unknown): number | null => {
	for (const path of WHOLESALE_PRICE_PATHS) {
		const price = readNumberAtPath(item, path);
		if (price !== null) {
			return price;
		}
	}

	return null;
};

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
					<button type="button" onClick={onClose} className="ml-4 text-gray-500 hover:text-gray-700 flex-shrink-0">
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
					<button type="button" onClick={onClose} className="ml-4 text-gray-500 hover:text-gray-700 flex-shrink-0">
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
	tillNumber,
	location,
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
	tillNumber?: string;
	location?: string;
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
            Business Phone: ${displayMerchantPhone}
        </div>
        `
						: ""
				}
        ${
					tillNumber
						? `
        <div class="merchant-info">
            Business Till: ${tillNumber}
        </div>
        `
						: ""
				}
        ${
					location
						? `
        <div class="merchant-info">
            Location: ${location}
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
            <span style="font-size: 12px; font-weight: bold;">Tribe<br> by ASANO GROUP LIMITED</span>
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
							{displayMerchantPhone && <p className="text-sm text-gray-600">Business Phone: {displayMerchantPhone}</p>}
							{tillNumber && <p className="text-sm text-gray-600">Business Till: {tillNumber}</p>}
							{location && <p className="text-sm text-gray-600">Location: {location}</p>}
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

const validateSaleData = (saleData: SaleRequest): string | null => {
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
	const [pricingMode, setPricingMode] = useState<PricingMode>(() => {
		if (typeof window === "undefined") {
			return "retail";
		}

		const savedMode = window.localStorage.getItem("pos_pricing_mode");
		return savedMode === "wholesale" ? "wholesale" : "retail";
	});
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
	const [tillNumber, setTillNumber] = useState<string>("");
	const [location, setLocation] = useState<string>("");

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
	const { data: merchantDetailsData, isLoading: _isLoadingMerchantDetails } = useQuery({
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

	// Extract till number, location, and business phone from token
	const { accessToken } = useUserToken();
	useEffect(() => {
		if (accessToken) {
			try {
				const till = getTillNumberFromToken(accessToken);
				const loc = getLocationFromToken(accessToken);
				const phone = getBusinessPhoneFromToken(accessToken);
				if (till) setTillNumber(till);
				if (loc) setLocation(loc);
				if (phone && !merchantPhone) setMerchantPhone(phone);
			} catch (error) {
				console.warn("Could not extract till/location from token");
			}
		}
	}, [accessToken, merchantPhone]);

	// ADDED: Check if user has wholesale access and reset mode if they don't
	useEffect(() => {
		if (!userInfo?.isWholesaler && pricingMode === "wholesale") {
			console.log("🔒 User does not have wholesale access. Resetting to retail mode.");
			setPricingMode("retail");
			window.localStorage.setItem("pos_pricing_mode", "retail");
		}
	}, [userInfo?.isWholesaler, pricingMode]);

	useEffect(() => {
		if (typeof window !== "undefined") {
			window.localStorage.setItem("pos_pricing_mode", pricingMode);
		}
	}, [pricingMode]);

	const {
		data: inventory = [],
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["inventory-pos", merchantId],
		queryFn: () => inventoryService.listMenu(),
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

	// Handler for switching to wholesale mode
	const handleWholesaleModeClick = () => {
		console.log("🔍 Wholesale button clicked, checking userInfo:", {
			hasUserInfo: !!userInfo,
			isWholesaler: userInfo?.isWholesaler,
			type: typeof userInfo?.isWholesaler,
			fullUserInfo: userInfo,
		});
		if (!userInfo?.isWholesaler) {
			message.error(
				"Sorry your business type is not allowed for this mode...Contact the TRIBE_Admin for the privileges",
			);
			return;
		}
		setPricingMode("wholesale");
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
			// Attendants get no quantity (blind counting) — only in/out of stock
			availableStock: sellableQuantity(item),
			stockHidden: isStockHidden(item),
			stockStatus: item.stockStatus,
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

	const getPosInventoryItem = (item: any): PosInventoryItem => {
		const itemData = getItemData(item);
		const wholesaleUnitPrice = getWholesaleUnitPrice(item);
		const activeUnitPrice = pricingMode === "wholesale" ? wholesaleUnitPrice : itemData.unitPrice;

		return {
			...itemData,
			wholesaleUnitPrice,
			activeUnitPrice,
			hasWholesalePrice: wholesaleUnitPrice !== null,
		};
	};

	const buildOrderItem = (item: PosInventoryItem, quantity: number): OrderItem => {
		const activeUnitPrice = item.activeUnitPrice ?? item.unitPrice;

		if (pricingMode === "wholesale") {
			return {
				...item,
				unitPrice: activeUnitPrice,
				orderQuantity: quantity,
				totalPrice: activeUnitPrice * quantity,
				isSpecialPrice: false,
				extraAmount: 0,
				displayPrice: activeUnitPrice,
			};
		}

		const { isSpecial, extraAmount, totalPrice, displayPrice } = calculateSpecialPriceInfo(
			item.itemName,
			quantity,
			item.unitPrice,
			merchantId,
		);

		return {
			...item,
			unitPrice: item.unitPrice,
			orderQuantity: quantity,
			totalPrice,
			isSpecialPrice: isSpecial,
			extraAmount,
			displayPrice,
		};
	};

	const posInventory = inventory.map((item: any) => getPosInventoryItem(item));

	const filteredInventory = posInventory.filter((itemData) => {
		const name = itemData.itemName.toLowerCase();
		return name.includes(searchTerm.toLowerCase());
	});

	const missingWholesalePriceCount = posInventory.filter((item) => !item.hasWholesalePrice).length;

	useEffect(() => {
		if (orderItems.length === 0) {
			return;
		}

		let removedItemsCount = 0;

		setOrderItems((prevOrderItems) =>
			prevOrderItems.flatMap((orderItem) => {
				const latestItem = posInventory.find((inventoryItem) => inventoryItem.id === orderItem.id);

				if (!latestItem) {
					return [];
				}

				if (pricingMode === "wholesale" && latestItem.activeUnitPrice === null) {
					removedItemsCount += 1;
					return [];
				}

				return [buildOrderItem(latestItem, orderItem.orderQuantity)];
			}),
		);

		if (removedItemsCount > 0) {
			message.warning(`${removedItemsCount} item(s) were removed because wholesale prices are missing.`);
		}
	}, [
		pricingMode,
		posInventory,
		orderItems.length,
		// biome-ignore lint/correctness/useExhaustiveDependencies: kept as it was; buildOrderItem is rebuilt each render
		buildOrderItem,
	]);

	const generateTransactionId = () => {
		return `TXN-${Date.now().toString().slice(-8)}`;
	};

	const processSaleMutation = useMutation({
		mutationFn: (saleData: Omit<SaleRequest, "merchantId">) => inventoryService.processSale(saleData),
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
		const itemData = getPosInventoryItem(item);
		const availableQuantity = itemData.availableStock;
		const activeUnitPrice = itemData.activeUnitPrice;

		if (pricingMode === "wholesale" && activeUnitPrice === null) {
			message.warning("This item does not have a wholesale price from the backend yet");
			return;
		}

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
				return prevOrder.map((orderItem) =>
					orderItem.id === itemData.id ? buildOrderItem(itemData, newQuantity) : orderItem,
				);
			} else {
				return [...prevOrder, buildOrderItem(itemData, 1)];
			}
		});
	};

	// FIXED: Calculate and store extra amount as POSITIVE discount
	const updateOrderQuantity = (itemId: number, quantity: number) => {
		if (quantity === 0) {
			removeFromOrder(itemId);
		} else {
			const item = posInventory.find((inventoryItem) => inventoryItem.id === itemId);
			if (!item) return;
			const itemData = item;

			if (quantity > itemData.availableStock) {
				message.warning("Not enough stock available");
				return;
			}

			if (pricingMode === "wholesale" && itemData.activeUnitPrice === null) {
				message.warning("This item does not have a wholesale price from the backend yet");
				return;
			}

			setOrderItems((prevOrder) =>
				prevOrder.map((orderItem) => (orderItem.id === itemId ? buildOrderItem(itemData, quantity) : orderItem)),
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

		const saleItems: SaleItemRequest[] = orderItems.map((item) => ({
			inventoryId: item.id,
			quantity: item.orderQuantity,
			discount: item.extraAmount || 0,
		}));

		console.log("🛒 Sale Request Data:", {
			merchantId: merchantId,
			customerPhone: customerContact || "Not provided (optional)",
			orderType: pricingMode === "wholesale" ? "WHOLESALE" : "RETAIL",
			items: saleItems,
			totalExtra: orderItems.reduce((sum, item) => sum + (item.extraAmount || 0), 0),
		});

		const validationError = validateSaleData({
			merchantId: merchantId,
			customerPhone: customerContact,
			orderType: pricingMode === "wholesale" ? "WHOLESALE" : "RETAIL",
			items: saleItems,
		});

		if (validationError) {
			message.error(validationError);
			return;
		}

		setSelectedPaymentMethod(paymentMethod);

		processSaleMutation.mutate({
			customerPhone: customerContact,
			orderType: pricingMode === "wholesale" ? "WHOLESALE" : "RETAIL",
			items: saleItems,
		});
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
						<h1 className="text-2xl font-semibold tracking-tight text-foreground">Point of Sale</h1>
						<p className="mt-1 text-sm text-muted-foreground">Process orders and manage transactions</p>
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
				<div className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
					<div>
						<h1 className="text-2xl font-semibold tracking-tight text-foreground">Point of sale</h1>
						<p className="mt-1 text-sm text-muted-foreground">
							{merchantId && merchantName ? `${merchantName} · ` : ""}
							{pricingMode === "retail" ? "Retail" : "Wholesale"} prices
						</p>
					</div>
					<div className="flex flex-wrap items-center gap-3">
						<UserRoleIndicator />
						<div className="inline-flex rounded-lg border border-border bg-muted/40 p-0.5">
							<button
								type="button"
								onClick={() => setPricingMode("retail")}
								className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
									pricingMode === "retail"
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								<Icon icon="lucide:store" className="h-3.5 w-3.5" />
								Retail
							</button>
							<button
								type="button"
								onClick={handleWholesaleModeClick}
								className={`inline-flex h-8 items-center gap-1.5 rounded-md px-3 text-xs font-medium transition-colors ${
									pricingMode === "wholesale"
										? "bg-background text-foreground shadow-sm"
										: "text-muted-foreground hover:text-foreground"
								}`}
							>
								<Icon icon="lucide:warehouse" className="h-3.5 w-3.5" />
								Wholesale
							</button>
						</div>
						<div className="flex items-center divide-x divide-border rounded-lg border border-border text-sm">
							<span className="px-3 py-1.5 text-muted-foreground">
								Items <span className="font-semibold text-foreground">{totalItems}</span>
							</span>
							<span className="px-3 py-1.5 text-muted-foreground">
								Total <span className="font-semibold text-foreground">{formatCurrency(totalAmount)}</span>
							</span>
							{totalExtra > 0 && (
								<span className="px-3 py-1.5 text-muted-foreground">
									Extra <span className="font-semibold text-orange-600">+{formatCurrency(totalExtra)}</span>
								</span>
							)}
						</div>
					</div>
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<Card className="gap-0 overflow-hidden py-0 lg:col-span-2">
						<div className="flex flex-col gap-3 border-b border-border px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
							<div>
								<h2 className="text-base font-semibold text-foreground">
									{pricingMode === "retail" ? "Products" : "Wholesale catalogue"}
								</h2>
								<p className="text-xs text-muted-foreground">Tap an item to add it to the order</p>
							</div>
							<div className="relative w-full sm:max-w-xs">
								<Icon
									icon="lucide:search"
									className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
								/>
								<Input
									placeholder={`Search ${pricingMode === "retail" ? "products" : "wholesale items"}`}
									value={searchTerm}
									onChange={(e) => setSearchTerm(e.target.value)}
									className="pl-9"
								/>
							</div>
						</div>
						<CardContent className="p-4 sm:p-6">
							{pricingMode === "wholesale" && missingWholesalePriceCount > 0 && (
								<div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-800 dark:border-amber-900 dark:bg-amber-950/40 dark:text-amber-300">
									<Icon icon="lucide:info" className="h-4 w-4 shrink-0" />
									{missingWholesalePriceCount} item(s) have no wholesale price yet and can't be sold in this mode.
								</div>
							)}

							{isLoading ? (
								<div className="text-center py-12">
									<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
									<p className="text-muted-foreground">Loading menu...</p>
								</div>
							) : (
								<div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
									{filteredInventory.map((itemData) => {
										const isWholesaleUnavailable = pricingMode === "wholesale" && itemData.activeUnitPrice === null;
										const isDisabled = itemData.availableStock === 0 || isWholesaleUnavailable;

										return (
											<button
												type="button"
												key={itemData.id}
												disabled={isDisabled}
												className={`flex min-h-[132px] w-full flex-col justify-between gap-3 rounded-xl border border-border bg-background p-3 text-left transition-colors ${
													isDisabled
														? "cursor-not-allowed opacity-55"
														: "cursor-pointer hover:border-primary/50 hover:bg-primary/5 active:bg-primary/10"
												}`}
												onClick={() => {
													if (!isDisabled) {
														addToOrder(itemData);
													}
												}}
											>
												<h3 className="line-clamp-2 text-sm font-semibold leading-snug text-foreground">
													{itemData.itemName}
												</h3>

												<div>
													<p
														className={`text-base font-semibold ${
															isWholesaleUnavailable ? "text-amber-700" : "text-foreground"
														}`}
													>
														{itemData.activeUnitPrice !== null
															? formatCurrency(itemData.activeUnitPrice)
															: "No wholesale price"}
													</p>
													<p className="text-xs text-muted-foreground">
														BP{" "}
														{itemData.unitCost !== null && itemData.unitCost !== undefined
															? formatCurrency(itemData.unitCost)
															: "—"}
													</p>
												</div>

												<div>
													<Badge
														variant={
															isWholesaleUnavailable
																? "warning"
																: itemData.availableStock === 0
																	? "destructive"
																	: !itemData.stockHidden && itemData.availableStock < 5
																		? "warning"
																		: "secondary"
														}
														className="px-2 py-0.5 text-[11px] font-medium"
													>
														{isWholesaleUnavailable
															? "Missing price"
															: itemData.availableStock === 0
																? "Sold Out"
																: itemData.stockHidden
																	? "In Stock"
																	: itemData.availableStock < 5
																		? "Low Stock"
																		: "Sufficient"}
													</Badge>
												</div>
											</button>
										);
									})}
								</div>
							)}

							{!isLoading && filteredInventory.length === 0 && (
								<div className="rounded-xl border border-dashed border-border py-12 text-center text-muted-foreground">
									<Icon icon="lucide:package-search" className="mx-auto mb-3 h-10 w-10 opacity-50" />
									<p className="font-medium text-foreground">No items found</p>
									<p className="text-sm">Try adjusting your search criteria</p>
								</div>
							)}
						</CardContent>
					</Card>

					<Card className="gap-0 self-start overflow-hidden py-0 lg:sticky lg:top-[calc(var(--layout-header-height)+1rem)]">
						<div className="flex items-center justify-between border-b border-border px-4 py-3 sm:px-6">
							<div>
								<h2 className="text-base font-semibold text-foreground">Current order</h2>
								<p className="text-xs text-muted-foreground">
									{totalItems} item{totalItems === 1 ? "" : "s"} · {pricingMode} prices
								</p>
							</div>
							<Icon icon="lucide:receipt" className="h-5 w-5 text-muted-foreground" />
						</div>
						<CardContent className="space-y-5 p-4 sm:p-6">
							<div className="space-y-1.5">
								<Label htmlFor="customerName" className="text-xs font-medium">
									Customer name <span className="font-normal text-muted-foreground">(optional)</span>
								</Label>
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

							<div className="space-y-1.5">
								<Label htmlFor="customerContact" className="text-xs font-medium">
									Customer phone <span className="font-normal text-muted-foreground">(optional)</span>
								</Label>
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
								<p
									className={`flex items-center gap-1 text-xs ${
										customerContact && !/^254[17]\d{8}$/.test(customerContact)
											? "font-medium text-destructive"
											: customerContact
												? "text-emerald-600"
												: "text-muted-foreground"
									}`}
								>
									{customerContact ? (
										/^254[17]\d{8}$/.test(customerContact) ? (
											<>
												<Icon icon="lucide:check" className="h-3.5 w-3.5" />
												Valid number
											</>
										) : (
											<>
												<Icon icon="lucide:alert-circle" className="h-3.5 w-3.5" />
												Use 2547XXXXXXXX or 07XXXXXXXX
											</>
										)
									) : (
										"07… numbers are converted to 2547… automatically"
									)}
								</p>
							</div>

							{orderItems.length === 0 ? (
								<div className="rounded-xl border border-dashed border-border py-8 text-center text-muted-foreground">
									<Icon icon="lucide:shopping-cart" className="mx-auto mb-2 h-8 w-8 opacity-50" />
									<p className="text-sm font-medium text-foreground">No items yet</p>
									<p className="text-xs">Tap a product to add it</p>
								</div>
							) : (
								<div className="max-h-96 divide-y divide-border overflow-y-auto rounded-xl border border-border">
									{orderItems.map((item) => {
										const itemExtra = item.extraAmount || 0;
										const displayPrice = item.displayPrice || item.unitPrice;

										return (
											<div key={item.id} className="flex items-center justify-between gap-2 p-3">
												<div className="flex-1 min-w-0">
													<div className="flex items-center gap-2">
														<p className="truncate text-sm font-medium text-foreground">{item.itemName}</p>
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
													{!item.stockHidden && (
														<p className="text-xs text-muted-foreground">Stock: {item.availableStock}</p>
													)}
												</div>
												<div className="flex items-center gap-1">
													<Button
														size="icon"
														variant="outline"
														className="h-7 w-7"
														onClick={() => updateOrderQuantity(item.id, item.orderQuantity - 1)}
													>
														<Icon icon="lucide:minus" className="h-3 w-3" />
													</Button>
													<span className="w-8 text-center text-sm font-semibold tabular-nums">
														{item.orderQuantity}
													</span>
													<Button
														size="icon"
														variant="outline"
														className="h-7 w-7"
														onClick={() => updateOrderQuantity(item.id, item.orderQuantity + 1)}
														disabled={item.orderQuantity >= item.availableStock}
													>
														<Icon icon="lucide:plus" className="h-3 w-3" />
													</Button>
													<Button
														size="icon"
														variant="ghost"
														onClick={() => removeFromOrder(item.id)}
														className="h-7 w-7 text-muted-foreground hover:text-destructive"
														title="Remove"
													>
														<Icon icon="lucide:trash" className="h-3 w-3" />
													</Button>
												</div>
											</div>
										);
									})}
								</div>
							)}

							<div className="space-y-2 border-t border-border pt-4">
								<div className="flex justify-between text-sm text-muted-foreground">
									<span>Subtotal</span>
									<span className="tabular-nums">{formatCurrency(totalAmount - totalExtra)}</span>
								</div>

								{totalExtra > 0 && (
									<div className="flex justify-between text-sm text-orange-600">
										<span>Extra</span>
										<span className="tabular-nums">+{formatCurrency(totalExtra)}</span>
									</div>
								)}

								<div className="flex items-baseline justify-between">
									<span className="text-sm font-medium text-foreground">Total</span>
									<span className="text-2xl font-semibold tracking-tight tabular-nums text-foreground">
										{formatCurrency(totalAmount)}
									</span>
								</div>
							</div>

							<Button
								size="lg"
								className="h-12 w-full gap-2 text-base"
								onClick={handleCashPayment}
								disabled={processSaleMutation.isPending || orderItems.length === 0 || !canPerformActions}
							>
								{processSaleMutation.isPending && selectedPaymentMethod === "cash" ? (
									<>
										<Icon icon="eos-icons:loading" className="h-5 w-5" />
										Processing…
									</>
								) : (
									<>
										<Icon icon="lucide:banknote" className="h-5 w-5" />
										Take cash payment
									</>
								)}
							</Button>

							{!canPerformActions && (
								<div className="rounded-lg border border-destructive/30 bg-destructive/10 px-3 py-2 text-center text-sm text-destructive">
									Sign in again to process sales.
								</div>
							)}

							<div className="grid grid-cols-3 gap-2 border-t border-border pt-4">
								<Button variant="outline" size="sm" className="gap-1.5" onClick={handleViewDailyAnalytics}>
									<Icon icon="lucide:calendar" className="h-4 w-4" />
									Daily
								</Button>
								<Button variant="outline" size="sm" className="gap-1.5" onClick={handleViewWeeklyAnalytics}>
									<Icon icon="lucide:bar-chart-3" className="h-4 w-4" />
									Weekly
								</Button>
								<Button
									variant="outline"
									size="sm"
									className="gap-1.5 border-destructive/40 text-destructive hover:bg-destructive/10 hover:text-destructive"
									onClick={handleInitiateCloseDay}
									disabled={initiateCloseDayMutation.isPending || !merchantId}
								>
									{initiateCloseDayMutation.isPending ? (
										<Icon icon="eos-icons:loading" className="h-4 w-4" />
									) : (
										<Icon icon="lucide:lock" className="h-4 w-4" />
									)}
									{initiateCloseDayMutation.isPending ? "Sending…" : "Close day"}
								</Button>
							</div>

							{closeDayStep === "initiated" && (
								<div className="rounded-lg border border-primary/30 bg-primary/5 px-3 py-2 text-center text-sm text-primary">
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
				tillNumber={tillNumber}
				location={location}
			/>

			<footer className="mt-8 border-t border-border pt-4 text-center text-xs text-muted-foreground">
				Tribe by <span className="font-medium text-foreground">ASANO GROUP LIMITED</span> · © {new Date().getFullYear()}
			</footer>
		</>
	);
}
