import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import inventoryService, {
	type InventoryItem,
	type InvoiceUploadResponse,
	type StockItem,
} from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { LockModal } from "@/components/lock-modal";
import { UserRoleIndicator } from "@/components/user-role-indicator";
import { useAuthCheck, useMerchantId, useUserToken } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { capturePhotoFromCamera, isMobileDevice } from "@/utils/camera-utils";
import { getMerchantNameFromToken } from "@/utils/jwt";

// CSV Template Content
const CSV_TEMPLATE_CONTENT = `ITEM,UNIT_PRICE,STARTING_STOCK
Product 1,2000,30
Product 2,1500,20
Product 3,1200,40
Product 4,30,200`;

// SIMPLIFIED Invoice Upload Modal - Shows only extracted items
const InvoiceUploadModal = ({
	open,
	setOpen,
	invoiceData,
	onApprove,
	isLoading = false,
}: {
	open: boolean;
	setOpen: (open: boolean) => void;
	invoiceData: InvoiceUploadResponse | null;
	onApprove: () => void;
	isLoading: boolean;
}) => {
	if (!open) return null;

	// Early return if no invoice data
	if (!invoiceData || !invoiceData.success) {
		return (
			<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="text-gray-900 dark:text-gray-100">Invoice Processing</CardTitle>
						<CardDescription className="text-gray-600 dark:text-gray-400">
							{invoiceData?.message || "Processing invoice..."}
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-center py-8">
							<Icon icon="lucide:file-x" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-600 dark:text-gray-400">
								{invoiceData?.message || "Unable to process invoice data"}
							</p>
						</div>
						<div className="flex justify-end">
							<Button variant="outline" onClick={() => setOpen(false)}>
								Close
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	// Extract items from data
	const items = Array.isArray(invoiceData.data?.items) ? invoiceData.data.items : [];
	const messageText = invoiceData.message || "Items extracted successfully";

	if (items.length === 0) {
		return (
			<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
				<Card className="w-full max-w-md">
					<CardHeader>
						<CardTitle className="text-gray-900 dark:text-gray-100">No Items Found</CardTitle>
						<CardDescription className="text-gray-600 dark:text-gray-400">{messageText}</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						<div className="text-center py-8">
							<Icon icon="lucide:package-x" className="h-12 w-12 text-gray-400 mx-auto mb-4" />
							<p className="text-gray-600 dark:text-gray-400">No items were extracted from this invoice.</p>
						</div>
						<div className="flex justify-end">
							<Button variant="outline" onClick={() => setOpen(false)}>
								Close
							</Button>
						</div>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<Card className="w-full max-w-4xl max-h-[90vh] overflow-hidden">
				<CardHeader className="bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20">
					<div className="flex items-center justify-between">
						<div>
							<CardTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
								<Icon icon="lucide:check-circle" className="h-5 w-5 text-green-600" />
								Invoice Items ({items.length} items)
							</CardTitle>
							<CardDescription className="text-gray-600 dark:text-gray-400">
								Review extracted items before adding to inventory
							</CardDescription>
						</div>
						<Button variant="ghost" size="sm" onClick={() => setOpen(false)} className="h-8 w-8 p-0">
							<Icon icon="lucide:x" className="h-4 w-4" />
						</Button>
					</div>
				</CardHeader>

				<CardContent className="overflow-y-auto p-6 space-y-6">
					{/* Items Table Only */}
					<div className="space-y-4">
						<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
							<Icon icon="lucide:package" className="h-5 w-5" />
							Extracted Items
						</h3>
						<div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
							<table className="w-full min-w-max">
								<thead className="bg-gray-50 dark:bg-gray-800">
									<tr>
										<th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">#</th>
										<th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Item Name</th>
										<th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Quantity</th>
										<th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Unit Cost</th>
										<th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Line Total</th>
									</tr>
								</thead>
								<tbody>
									{items.map((item, index) => (
										<tr
											key={index}
											className={`border-t border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50 ${
												index % 2 === 0 ? "bg-gray-50/50 dark:bg-gray-800/30" : ""
											}`}
										>
											<td className="p-4 text-center">
												<span className="inline-flex items-center justify-center w-6 h-6 rounded-full bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 text-xs font-semibold">
													{index + 1}
												</span>
											</td>
											<td className="p-4">
												<div>
													<p className="font-medium text-gray-900 dark:text-gray-100">
														{item.rawName || "Unnamed Item"}
													</p>
													{item.normalizedName && item.normalizedName !== item.rawName && (
														<p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
															Normalized: <span className="font-medium">{item.normalizedName}</span>
														</p>
													)}
												</div>
											</td>
											<td className="p-4">
												<div className="flex items-center gap-2">
													<span className="inline-flex items-center justify-center w-8 h-8 rounded bg-blue-50 dark:bg-blue-900/30 text-blue-600 dark:text-blue-300 font-semibold">
														{item.quantity || 0}
													</span>
													<span className="text-sm text-gray-600 dark:text-gray-400">units</span>
												</div>
											</td>
											<td className="p-4">
												<div className="flex items-center gap-2">
													<p className="font-medium text-gray-900 dark:text-gray-100">
														KShs{" "}
														{(item.unitCost || 0).toLocaleString(undefined, {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}
													</p>
												</div>
											</td>
											<td className="p-4">
												<div className="flex items-center gap-2">
													<p className="font-bold text-green-600 dark:text-green-400">
														KShs{" "}
														{(item.lineTotal || 0).toLocaleString(undefined, {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}
													</p>
												</div>
											</td>
										</tr>
									))}
								</tbody>
								<tfoot className="bg-gray-50 dark:bg-gray-800 border-t-2 border-gray-300 dark:border-gray-600">
									<tr>
										<td colSpan={4} className="p-4 text-right font-bold text-gray-900 dark:text-gray-100">
											TOTAL VALUE:
										</td>
										<td className="p-4">
											<div className="flex items-center justify-between">
												<Icon icon="lucide:calculator" className="h-5 w-5 text-green-600" />
												<p className="font-bold text-xl text-green-700 dark:text-green-300">
													KShs{" "}
													{items
														.reduce((sum, item) => sum + (item.lineTotal || 0), 0)
														.toLocaleString(undefined, {
															minimumFractionDigits: 2,
															maximumFractionDigits: 2,
														})}
												</p>
											</div>
										</td>
									</tr>
								</tfoot>
							</table>
						</div>
					</div>

					{/* Simple summary */}
					<div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
						<div className="flex flex-col sm:flex-row justify-between items-center gap-4">
							<div className="text-sm text-gray-600 dark:text-gray-400">
								<p>
									<span className="font-semibold">{items.length} items</span> extracted from invoice
								</p>
								<p className="text-xs mt-1">{messageText}</p>
							</div>
							<div className="text-right">
								<p className="text-lg font-bold text-green-700 dark:text-green-300">
									Total: KShs{" "}
									{items
										.reduce((sum, item) => sum + (item.lineTotal || 0), 0)
										.toLocaleString(undefined, {
											minimumFractionDigits: 2,
											maximumFractionDigits: 2,
										})}
								</p>
							</div>
						</div>
					</div>

					{/* Action Buttons */}
					<div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-6 border-t border-gray-200 dark:border-gray-700">
						<div className="text-sm text-gray-600 dark:text-gray-400">
							<h1>TRIBE</h1>
							<p>Powered by TRC Systems</p>
						</div>
						<div className="flex gap-4">
							<Button variant="outline" onClick={() => setOpen(false)} disabled={isLoading}>
								<Icon icon="lucide:x" className="mr-2 h-4 w-4" />
								Cancel
							</Button>
							<Button
								onClick={onApprove}
								disabled={isLoading}
								className="bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-lg hover:shadow-xl transition-all duration-200"
								size="lg"
							>
								{isLoading ? (
									<>
										<Icon icon="eos-icons:loading" className="mr-2 h-5 w-5" />
										Processing...
									</>
								) : (
									<>
										<Icon icon="lucide:check-circle" className="mr-2 h-5 w-5" />
										Approve & Add to Inventory
									</>
								)}
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

// Edit Modal Component (keep as is)
const EditInventoryModal = ({
	open,
	setOpen,
	item,
	onSave,
}: {
	open: boolean;
	setOpen: (open: boolean) => void;
	item: InventoryItem | null;
	onSave: (id: number, data: { itemName: string; quantity: number; unitPrice: number }) => void;
}) => {
	const [formData, setFormData] = useState({
		itemName: "",
		quantity: 0,
		unitPrice: 0,
	});

	useEffect(() => {
		if (item) {
			setFormData({
				itemName: item.itemName,
				quantity: item.availableStock,
				unitPrice: item.unitPrice,
			});
		}
	}, [item]);

	const handleSave = () => {
		if (item && formData.itemName && formData.quantity >= 0 && formData.unitPrice >= 0) {
			onSave(item.id, {
				itemName: formData.itemName,
				quantity: formData.quantity,
				unitPrice: formData.unitPrice,
			});
			setOpen(false);
		} else {
			message.error("Please fill in all fields correctly");
		}
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>{item ? "Edit Item" : "Add Item"}</CardTitle>
					<CardDescription>{item ? `Edit ${item.itemName}` : "Add new inventory item"}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<label className="text-sm font-medium text-gray-900 dark:text-gray-100">Item Name</label>
						<Input
							value={formData.itemName}
							onChange={(e) => setFormData({ ...formData, itemName: e.target.value })}
							placeholder="Enter item name"
							className="mt-1"
						/>
					</div>
					<div>
						<label className="text-sm font-medium text-gray-900 dark:text-gray-100">Quantity</label>
						<Input
							type="number"
							value={formData.quantity}
							onChange={(e) => {
								const value = parseInt(e.target.value);
								if (!isNaN(value) && value >= 0) {
									setFormData({ ...formData, quantity: value });
								} else if (e.target.value === "" || e.target.value === "-") {
									setFormData({ ...formData, quantity: 0 });
								}
							}}
							onBlur={(e) => {
								const value = parseInt(e.target.value);
								if (isNaN(value) || value < 0) {
									setFormData({ ...formData, quantity: 0 });
								}
							}}
							placeholder="Enter quantity (0 or more)"
							className="mt-1"
						/>
						{formData.quantity < 0 && (
							<p className="text-sm text-red-600 dark:text-red-400 mt-1">Quantity cannot be negative</p>
						)}
					</div>
					<div>
						<label className="text-sm font-medium text-gray-900 dark:text-gray-100">Price (KShs)</label>
						<Input
							type="number"
							step="0.01"
							value={formData.unitPrice}
							onChange={(e) => {
								const value = parseFloat(e.target.value);
								if (!isNaN(value) && value >= 0) {
									setFormData({ ...formData, unitPrice: value });
								} else if (e.target.value === "" || e.target.value === "-") {
									setFormData({ ...formData, unitPrice: 0 });
								}
							}}
							onBlur={(e) => {
								const value = parseFloat(e.target.value);
								if (isNaN(value) || value < 0) {
									setFormData({ ...formData, unitPrice: 0 });
								}
							}}
							placeholder="Enter price (0 or more)"
							className="mt-1"
						/>
						{formData.unitPrice < 0 && (
							<p className="text-sm text-red-600 dark:text-red-400 mt-1">Price cannot be negative</p>
						)}
					</div>
					<div className="flex gap-4 justify-end pt-4">
						<Button variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleSave} disabled={formData.quantity < 0 || formData.unitPrice < 0}>
							Save Changes
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

// Delete Confirmation Modal Component (keep as is)
const DeleteConfirmationModal = ({
	open,
	setOpen,
	item,
	onConfirm,
	isDeleting,
}: {
	open: boolean;
	setOpen: (open: boolean) => void;
	item: InventoryItem | null;
	onConfirm: () => void;
	isDeleting: boolean;
}) => {
	if (!open || !item) return null;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle className="text-gray-900 dark:text-gray-100 flex items-center gap-2">
						<Icon icon="lucide:alert-triangle" className="h-5 w-5 text-red-500" />
						Delete Item
					</CardTitle>
					<CardDescription className="text-gray-600 dark:text-gray-400">
						You are about to delete "{item.itemName}"
					</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div className="p-4 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-md">
						<div className="flex items-start gap-3">
							<Icon icon="lucide:alert-circle" className="h-5 w-5 text-red-600 dark:text-red-400 mt-0.5" />
							<div>
								<h4 className="font-semibold text-red-800 dark:text-red-300 mb-1">Important Warning</h4>
								<p className="text-sm text-red-700 dark:text-red-400">
									Are you absolutely sure you want to delete "{item.itemName}"?
									<br />
									<span className="font-bold">This action cannot be undone.</span>
									<br />
									Once deleted, this item and all its data will be permanently removed from the system and can never be
									recovered.
								</p>
							</div>
						</div>
					</div>

					<div className="flex gap-4 justify-end pt-4">
						<Button variant="outline" onClick={() => setOpen(false)} disabled={isDeleting}>
							Cancel
						</Button>
						<Button
							variant="destructive"
							onClick={onConfirm}
							disabled={isDeleting}
							className="bg-red-600 hover:bg-red-700"
						>
							{isDeleting ? (
								<>
									<Icon icon="eos-icons:loading" className="mr-2 h-4 w-4" />
									Deleting...
								</>
							) : (
								<>
									<Icon icon="lucide:trash-2" className="mr-2 h-4 w-4" />
									Yes, Delete Permanently
								</>
							)}
						</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

// Main Component
export default function StockManagementPage() {
	// ========== ALL HOOKS MUST BE HERE, BEFORE ANY CONDITIONAL RETURNS ==========

	// 1. All React hooks (useState, useRef, etc.)
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [searchTerm, setSearchTerm] = useState("");
	const [stockToAdd, setStockToAdd] = useState<{
		inventoryId: number;
		quantity: number;
		currentStock?: number;
	} | null>(null);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
	const [showTemplateNotification, setShowTemplateNotification] = useState(false);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);

	// Invoice upload states
	const [invoiceModalOpen, setInvoiceModalOpen] = useState(false);
	const [invoicePreviewData, setInvoicePreviewData] = useState<InvoiceUploadResponse | null>(null);

	const fileInputRef = useRef<HTMLInputElement>(null);
	const invoiceFileInputRef = useRef<HTMLInputElement>(null);

	// Security states
	const [isLocked, setIsLocked] = useState(true);
	const [incorrectAttempts, setIncorrectAttempts] = useState(0);

	// 2. All custom hooks from store
	const { isAuthenticated } = useAuthCheck();
	const merchantId = useMerchantId();
	const token = useUserToken();

	const merchantName = (() => {
		if (!token?.accessToken) return null;
		try {
			return getMerchantNameFromToken(token.accessToken);
		} catch (error) {
			console.error("Failed to get merchant name from token:", error);
			return null;
		}
	})();

	const canPerformActions = isAuthenticated && !!merchantId;

	// handleUnlock BEFORE return
	const handleUnlock = (password: string) => {
		const correctPassword = merchantName ? `${merchantName}@tribeadmin` : null;

		if (correctPassword && password === correctPassword) {
			setIsLocked(false);
			setIncorrectAttempts(0);

			const unlockData = {
				unlocked: true,
				timestamp: Date.now(),
				expiresIn: 8 * 60 * 60 * 1000,
				merchantName: merchantName,
			};
			localStorage.setItem("stock_page_unlocked", JSON.stringify(unlockData));

			message.success({
				content: "Access granted! Page unlocked for 8 hours.",
				duration: 3,
			});
		} else {
			const newAttempts = incorrectAttempts + 1;
			setIncorrectAttempts(newAttempts);

			if (newAttempts >= 3) {
				message.error({
					content: "Too many failed attempts. Redirecting to POS...",
					duration: 2,
				});
				navigate("/pos"); // ← IMMEDIATE REDIRECT
			} else {
				message.error({
					content: `Incorrect password. ${3 - newAttempts} attempts remaining.`,
					duration: 3,
				});
			}
		}
	};

	// 5. All useQuery hooks
	const {
		data: inventory = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["inventory", merchantId],
		queryFn: () => inventoryService.getAllItems(merchantId!),
		enabled: !!merchantId && isAuthenticated && !isLocked,
	});

	// 6. All useMutation hooks
	const addStockMutation = useMutation({
		mutationFn: async (data: { merchantId: string; items: StockItem[] }) => {
			if (!canPerformActions) {
				throw new Error("User not authenticated or missing merchant ID");
			}
			return inventoryService.addStock(data);
		},
		onSuccess: () => {
			message.success("Stock added successfully!");
			queryClient.invalidateQueries({ queryKey: ["inventory"] });
			setStockToAdd(null);
		},
		onError: (error: Error) => {
			if (error.message.includes("Authentication failed") || error.message.includes("401")) {
				message.error("Authentication failed. Please login again.");
			} else {
				message.error(`Failed to add stock: ${error.message}`);
			}
		},
	});

	const importCSVMutation = useMutation({
		mutationFn: async (file: File) => {
			if (!canPerformActions) {
				throw new Error("User not authenticated or missing merchant ID");
			}

			const fileContent = await readCSVFile(file);
			const validationResult = validateCSVData(fileContent);

			if (!validationResult.isValid) {
				throw new Error(`CSV validation failed: ${validationResult.error}`);
			}

			return inventoryService.importInventory(file);
		},
		onSuccess: (result) => {
			message.success(`Successfully imported ${result.imported} items!`);
			queryClient.invalidateQueries({ queryKey: ["inventory"] });
		},
		onError: (error: Error) => {
			message.error(`Import failed: ${error.message}`);
		},
	});

	const editItemMutation = useMutation({
		mutationFn: async ({
			id,
			data,
		}: {
			id: number;
			data: { itemName: string; quantity: number; unitPrice: number };
		}) => {
			if (!canPerformActions) {
				throw new Error("User not authenticated");
			}
			return inventoryService.updateItem(id, data);
		},
		onSuccess: (result) => {
			message.success(result.message || "Item updated successfully!");
			queryClient.invalidateQueries({ queryKey: ["inventory"] });
			setEditingItem(null);
		},
		onError: (error: Error) => {
			message.error(`Failed to update item: ${error.message}`);
		},
	});

	const deleteItemMutation = useMutation({
		mutationFn: async (id: number) => {
			if (!canPerformActions) {
				throw new Error("User not authenticated");
			}
			return inventoryService.deleteItem(id);
		},
		onSuccess: (result) => {
			message.success(result.message || "Item deleted successfully!");
			queryClient.invalidateQueries({ queryKey: ["inventory"] });
			setDeleteModalOpen(false);
			setItemToDelete(null);
		},
		onError: (error: Error) => {
			message.error(`Failed to delete item: ${error.message}`);
		},
	});

	// Invoice Upload Mutation - USING INVENTORY SERVICE
	const uploadInvoiceMutation = useMutation({
		mutationFn: async (file: File) => {
			if (!canPerformActions) {
				throw new Error("User not authenticated or missing merchant ID");
			}
			return inventoryService.uploadInvoice(file);
		},
		onSuccess: (response) => {
			if (response.success) {
				setInvoicePreviewData(response);
				setInvoiceModalOpen(true);
				message.success("Invoice uploaded successfully!");
			} else {
				message.error(`Invoice extraction failed: ${response.message}`);
			}
		},
		onError: (error: Error) => {
			message.error(`Invoice upload failed: ${error.message}`);
		},
	});

	// Approve Invoice Mutation - USING INVENTORY SERVICE
	const approveInvoiceMutation = useMutation({
		mutationFn: async () => {
			if (!invoicePreviewData?.invoiceSubmissionId || !invoicePreviewData.data?.items) {
				throw new Error("Missing required data for approval");
			}
			return inventoryService.approveInvoice(invoicePreviewData.invoiceSubmissionId!, invoicePreviewData.data.items);
		},
		onSuccess: (result) => {
			message.success(result.message);
			setInvoiceModalOpen(false);
			setInvoicePreviewData(null);
			queryClient.invalidateQueries({ queryKey: ["inventory"] });
			if (invoiceFileInputRef.current) {
				invoiceFileInputRef.current.value = "";
			}
		},
		onError: (error: Error) => {
			message.error(`Invoice approval failed: ${error.message}`);
		},
	});

	// 7. All useEffect hooks
	useEffect(() => {
		const unlockData = localStorage.getItem("stock_page_unlocked");
		if (unlockData) {
			try {
				const data = JSON.parse(unlockData);
				const isExpired = Date.now() > data.timestamp + (data.expiresIn || 8 * 60 * 60 * 1000);

				if (!isExpired && data.unlocked) {
					setIsLocked(false);
				} else {
					localStorage.removeItem("stock_page_unlocked");
				}
			} catch (error) {
				localStorage.removeItem("stock_page_unlocked");
			}
		}
	}, []);

	// ========== EARLY RETURN FOR LOCKED STATE ==========
	if (isLocked) {
		return (
			<LockModal
				isOpen={true}
				merchantName={merchantName || undefined}
				onUnlock={handleUnlock}
				onCancel={() => navigate("/pos")}
			/>
		);
	}

	// ========== HELPER FUNCTIONS (NO HOOKS) ==========

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

	const readCSVFile = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (event) => {
				resolve(event.target?.result as string);
			};
			reader.onerror = () => {
				reject(new Error("Failed to read CSV file"));
			};
			reader.readAsText(file);
		});
	};

	const validateCSVData = (csvContent: string): { isValid: boolean; error?: string } => {
		try {
			const lines = csvContent.split("\n").filter((line) => line.trim() !== "");
			for (let i = 1; i < lines.length; i++) {
				const columns = lines[i].split(",");
				if (columns.length < 3) {
					return {
						isValid: false,
						error: `Row ${i + 1}: Incorrect number of columns. Expected 3 columns.`,
					};
				}
				const itemName = columns[0].trim();
				const unitPrice = parseFloat(columns[1].trim());
				const startingStock = parseFloat(columns[2].trim());

				if (!itemName || itemName === "") {
					return {
						isValid: false,
						error: `Row ${i + 1}: Item name cannot be empty.`,
					};
				}
				if (isNaN(unitPrice) || unitPrice < 0) {
					return {
						isValid: false,
						error: `Row ${i + 1}: Unit price must be a non-negative number.`,
					};
				}
				if (isNaN(startingStock) || startingStock < 0) {
					return {
						isValid: false,
						error: `Row ${i + 1}: Starting stock must be a non-negative number.`,
					};
				}
			}
			return { isValid: true };
		} catch (error) {
			return {
				isValid: false,
				error: `Error parsing CSV file: ${error}`,
			};
		}
	};

	const formatCurrency = (amount: number) => {
		return `KShs ${amount?.toFixed(2) || "0.00"}`;
	};

	// Helper function to show upload options
	const showUploadOptions = (): Promise<"camera" | "file" | "cancel"> => {
		return new Promise((resolve) => {
			const modal = document.createElement("div");
			modal.className = "upload-options-modal";
			modal.innerHTML = `
        <style>
          .upload-options-modal {
            position: fixed;
            top: 0;
            left: 0;
            width: 100vw;
            height: 100vh;
            background: rgba(0,0,0,0.8);
            z-index: 99999;
            display: flex;
            align-items: center;
            justify-content: center;
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
          }
          
          .upload-options-content {
            background: white;
            border-radius: 16px;
            width: 90%;
            max-width: 400px;
            overflow: hidden;
            animation: slideUp 0.3s ease;
          }
          
          @keyframes slideUp {
            from { transform: translateY(50px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          
          .upload-options-header {
            padding: 24px 20px 16px;
            text-align: center;
            border-bottom: 1px solid #eee;
          }
          
          .upload-options-title {
            font-size: 20px;
            font-weight: 600;
            margin-bottom: 8px;
            color: #333;
          }
          
          .upload-options-subtitle {
            font-size: 14px;
            color: #666;
          }
          
          .upload-options-buttons {
            display: flex;
            flex-direction: column;
            padding: 20px;
            gap: 12px;
          }
          
          .upload-option-btn {
            padding: 16px;
            border-radius: 12px;
            border: 2px solid #007aff;
            background: white;
            color: #007aff;
            font-size: 16px;
            font-weight: 500;
            cursor: pointer;
            display: flex;
            align-items: center;
            justify-content: center;
            gap: 12px;
            transition: all 0.2s;
          }
          
          .upload-option-btn:hover {
            background: #007aff;
            color: white;
          }
          
          .upload-option-btn.cancel {
            border-color: #ddd;
            color: #666;
            margin-top: 8px;
          }
          
          .upload-option-btn.cancel:hover {
            background: #f5f5f5;
            color: #333;
          }
          
          .upload-icon {
            width: 24px;
            height: 24px;
          }
        </style>
        
        <div class="upload-options-content">
          <div class="upload-options-header">
            <div class="upload-options-title">Upload Invoice</div>
            <div class="upload-options-subtitle">Choose how you want to upload</div>
          </div>
          
          <div class="upload-options-buttons">
            <button class="upload-option-btn" data-choice="camera">
              <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                <circle cx="12" cy="13" r="4"/>
              </svg>
              Take Photo
            </button>
            
            <button class="upload-option-btn" data-choice="file">
              <svg class="upload-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="17 8 12 3 7 8"/>
                <line x1="12" y1="3" x2="12" y2="15"/>
              </svg>
              Choose File
            </button>
            
            <button class="upload-option-btn cancel" data-choice="cancel">
              Cancel
            </button>
          </div>
        </div>
      `;

			document.body.appendChild(modal);

			// Add event listeners
			modal.querySelectorAll(".upload-option-btn").forEach((btn) => {
				btn.addEventListener("click", (e) => {
					const choice = (e.currentTarget as HTMLButtonElement).dataset.choice as "camera" | "file" | "cancel";
					document.body.removeChild(modal);
					resolve(choice);
				});
			});

			// Close on backdrop click
			modal.addEventListener("click", (e) => {
				if (e.target === modal) {
					document.body.removeChild(modal);
					resolve("cancel");
				}
			});
		});
	};

	// Helper function to capture and upload
	const captureAndUpload = async () => {
		try {
			message.info({
				content: "Preparing camera...",
				duration: 2,
			});

			const capturedFile = await capturePhotoFromCamera({
				facingMode: "environment", // Use rear camera
				quality: 0.9,
				maxWidth: 1200,
			});

			if (capturedFile) {
				uploadInvoiceMutation.mutate(capturedFile);
			}
		} catch (error: any) {
			console.error("Camera capture error:", error);

			if (error.name === "NotAllowedError" || error.name === "PermissionDeniedError") {
				message.error({
					content: "Camera access denied. Please allow camera access or use file upload.",
					duration: 4,
				});
			} else if (error.name === "NotFoundError" || error.name === "DevicesNotFoundError") {
				message.error({
					content: "No camera found on this device. Please use file upload.",
					duration: 4,
				});
			} else if (error.message.includes("not supported")) {
				message.error({
					content: "Camera not supported. Please use file upload.",
					duration: 3,
				});
			} else {
				message.error({
					content: "Failed to access camera. Please try file upload instead.",
					duration: 3,
				});
			}

			// Fallback to file selection
			invoiceFileInputRef.current?.click();
		}
	};

	const handleUploadInvoice = async () => {
		if (!canPerformActions) {
			message.error("Please login to upload invoices");
			return;
		}

		// Check if device is mobile
		const isMobile = isMobileDevice();

		if (isMobile) {
			// Offer camera or file upload option
			const selection = await showUploadOptions();

			if (selection === "camera") {
				await captureAndUpload();
			} else if (selection === "file") {
				invoiceFileInputRef.current?.click();
			}
			// If 'cancel', do nothing
		} else {
			// Desktop - just use file upload
			invoiceFileInputRef.current?.click();
		}
	};

	const processedInventory = inventory.map(getItemData);
	const filteredInventory = processedInventory.filter((item: InventoryItem) => {
		return item.itemName.toLowerCase().includes(searchTerm.toLowerCase());
	});

	const getStockStatus = (quantity: number) => {
		if (quantity === 0) return { status: "out-of-stock", variant: "destructive" as const };
		if (quantity < 10) return { status: "low-stock", variant: "warning" as const };
		return { status: "in-stock", variant: "success" as const };
	};

	const downloadCSVTemplate = () => {
		try {
			const blob = new Blob([CSV_TEMPLATE_CONTENT], {
				type: "text/csv;charset=utf-8;",
			});
			const url = URL.createObjectURL(blob);
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", "inventory_template.csv");
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
			URL.revokeObjectURL(url);
			message.success("CSV template downloaded successfully!");
			setShowTemplateNotification(true);
			setTimeout(() => setShowTemplateNotification(false), 5000);
		} catch (error) {
			message.error("Failed to download template. Please try again.");
		}
	};

	const handleInvoiceFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		if (!file.type.includes("pdf") && !file.name.toLowerCase().endsWith(".pdf")) {
			message.error("Please select a valid PDF invoice file");
			return;
		}

		uploadInvoiceMutation.mutate(file);
	};

	const handleApproveInvoice = () => {
		if (!invoicePreviewData) return;
		approveInvoiceMutation.mutate();
	};

	const handleAddStock = (item: InventoryItem) => {
		if (!canPerformActions) {
			message.error("Please login to add stock");
			return;
		}
		const currentItem = processedInventory.find((inv) => inv.id === item.id);
		if (currentItem) {
			setStockToAdd({
				inventoryId: item.id,
				quantity: 0,
				currentStock: currentItem.availableStock,
			});
		}
	};

	const handleEditItem = (item: InventoryItem) => {
		if (!canPerformActions) {
			message.error("Please login to edit items");
			return;
		}
		setEditingItem(item);
		setEditModalOpen(true);
	};

	const handleDeleteItem = (item: InventoryItem) => {
		if (!canPerformActions) {
			message.error("Please login to delete items");
			return;
		}
		if (window.confirm(`Are you sure you want to delete "${item.itemName}"?`)) {
			setItemToDelete(item);
			setDeleteModalOpen(true);
		}
	};

	const handleConfirmDelete = () => {
		if (itemToDelete) {
			deleteItemMutation.mutate(itemToDelete.id);
		}
	};

	const handleSaveEdit = (id: number, data: { itemName: string; quantity: number; unitPrice: number }) => {
		editItemMutation.mutate({ id, data });
	};

	const confirmAddStock = () => {
		if (stockToAdd && merchantId) {
			if (stockToAdd.quantity < 0) {
				message.error("Cannot add negative stock quantity");
				return;
			}
			addStockMutation.mutate({
				merchantId: merchantId,
				items: [stockToAdd],
			});
		}
	};

	const handleImportCSV = () => {
		if (!canPerformActions) {
			message.error("Please login to import CSV");
			return;
		}
		fileInputRef.current?.click();
	};

	const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		const validTypes = [
			".csv",
			".xls",
			".xlsx",
			"application/vnd.ms-excel",
			"application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
			"text/csv",
		];
		const fileExtension = file.name.toLowerCase().split(".").pop();
		const fileType = file.type;

		if (!validTypes.includes(`.${fileExtension}`) && !validTypes.includes(fileType)) {
			message.error("Please select a valid CSV or Excel file");
			return;
		}

		importCSVMutation.mutate(file);
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	const totalItems = processedInventory.length;
	const lowStockItems = processedInventory.filter((item) => item.availableStock < 10 && item.availableStock > 0).length;
	const outOfStockItems = processedInventory.filter((item) => item.availableStock === 0).length;
	const totalValue = processedInventory.reduce((total, item) => total + item.unitPrice * item.availableStock, 0);

	const handleReLock = () => {
		localStorage.removeItem("stock_page_unlocked");
		setIsLocked(true);
		message.info("Page re-locked. Password required for next access.");
		navigate("/pos");
	};

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stock Management</h1>
						<p className="text-muted-foreground">Manage and track your inventory stock levels</p>
					</div>
				</div>
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 text-destructive mx-auto mb-4" />
						<h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-2">Failed to load inventory</h3>
						<p className="text-muted-foreground mb-4">{(error as Error).message}</p>
						<Button onClick={() => window.location.reload()}>Retry</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Add Stock Confirmation Modal */}
			{stockToAdd && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<Card className="w-full max-w-md">
						<CardHeader>
							<CardTitle className="text-gray-900 dark:text-gray-100">Add Stock</CardTitle>
							<CardDescription className="text-gray-600 dark:text-gray-400">
								How many units do you want to add to{" "}
								{processedInventory.find((item) => item.id === stockToAdd.inventoryId)?.itemName}?
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<Input
									type="number"
									value={stockToAdd.quantity}
									onChange={(e) => {
										const value = parseInt(e.target.value);
										if (!isNaN(value) && value >= 0) {
											setStockToAdd({ ...stockToAdd, quantity: value });
										} else if (e.target.value === "" || e.target.value === "-") {
											setStockToAdd({ ...stockToAdd, quantity: 0 });
										}
									}}
									placeholder="Enter quantity to add (0 or more)"
									className="w-full"
									min="0"
								/>
							</div>
							<div className="flex gap-4 justify-end">
								<Button variant="outline" onClick={() => setStockToAdd(null)} disabled={addStockMutation.isPending}>
									Cancel
								</Button>
								<Button
									onClick={confirmAddStock}
									disabled={addStockMutation.isPending || !canPerformActions || stockToAdd.quantity < 0}
								>
									{addStockMutation.isPending ? "Adding..." : "Add Stock"}
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Edit Item Modal */}
			<EditInventoryModal open={editModalOpen} setOpen={setEditModalOpen} item={editingItem} onSave={handleSaveEdit} />

			{/* Delete Confirmation Modal */}
			<DeleteConfirmationModal
				open={deleteModalOpen}
				setOpen={setDeleteModalOpen}
				item={itemToDelete}
				onConfirm={handleConfirmDelete}
				isDeleting={deleteItemMutation.isPending}
			/>

			{/* SIMPLIFIED Invoice Upload Modal */}
			<InvoiceUploadModal
				open={invoiceModalOpen}
				setOpen={setInvoiceModalOpen}
				invoiceData={invoicePreviewData}
				onApprove={handleApproveInvoice}
				isLoading={approveInvoiceMutation.isPending}
			/>

			{/* Template Download Notification */}
			{showTemplateNotification && (
				<div className="fixed top-4 right-4 z-50 animate-in slide-in-from-top duration-300">
					<Card className="shadow-lg border-green-200 dark:border-green-800 bg-green-50 dark:bg-green-900/20">
						<CardContent className="p-4">
							<div className="flex items-start gap-3">
								<Icon icon="lucide:download" className="h-5 w-5 text-green-600 dark:text-green-400 mt-0.5" />
								<div className="flex-1">
									<h4 className="font-semibold text-green-800 dark:text-green-300">
										Template Downloaded Successfully!
									</h4>
									<p className="text-sm text-green-700 dark:text-green-400 mt-1">
										Open the file in Excel and add your inventory items.
									</p>
								</div>
								<Button
									size="sm"
									variant="ghost"
									onClick={() => setShowTemplateNotification(false)}
									className="h-6 w-6 p-0"
								>
									<Icon icon="lucide:x" className="h-4 w-4" />
								</Button>
							</div>
						</CardContent>
					</Card>
				</div>
			)}

			{/* Hidden file inputs */}
			<input
				ref={fileInputRef}
				type="file"
				accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
				onChange={handleFileChange}
				className="hidden"
			/>

			<input
				ref={invoiceFileInputRef}
				type="file"
				accept=".pdf,application/pdf"
				onChange={handleInvoiceFileChange}
				className="hidden"
			/>

			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Stock Management</h1>
					<p className="text-muted-foreground">Manage and track your inventory stock levels</p>
				</div>

				<div className="flex items-center gap-3">
					<UserRoleIndicator />

					{/* Re-lock Button */}
					<Button
						variant="outline"
						size="sm"
						onClick={handleReLock}
						className="flex items-center gap-2 bg-gray-100 dark:bg-gray-800 hover:bg-gray-200 dark:hover:bg-gray-700"
						title="Re-lock page (requires password again)"
					>
						<Icon icon="lucide:lock" className="h-4 w-4" />
						<span className="text-xs font-bold">Re-lock</span>
					</Button>

					{/* CSV Template Download Button */}
					<div className="flex flex-col items-center gap-1">
						<Button
							onClick={downloadCSVTemplate}
							disabled={!canPerformActions}
							className="w-12 h-12 rounded-full bg-blue-500 hover:bg-blue-600 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
							variant="default"
							title="Download CSV Template"
						>
							<Icon icon="lucide:download" className="h-5 w-5" />
						</Button>
						<span className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">TEMPLATE</span>
					</div>

					{/* Import CSV Button */}
					<div className="flex flex-col items-center gap-1">
						<Button
							onClick={handleImportCSV}
							disabled={importCSVMutation.isPending || !canPerformActions}
							className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
							variant="default"
							title="Import CSV File"
						>
							{importCSVMutation.isPending ? (
								<Icon icon="eos-icons:loading" className="h-5 w-5" />
							) : (
								<Icon icon="lucide:upload" className="h-5 w-5" />
							)}
						</Button>
						<span className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
							{importCSVMutation.isPending ? "IMPORTING..." : "IMPORT"}
						</span>
					</div>

					{/* Upload Invoice Button with Camera Option */}
					<div className="flex flex-col items-center gap-1 relative group">
						<Button
							onClick={handleUploadInvoice}
							disabled={uploadInvoiceMutation.isPending || approveInvoiceMutation.isPending || !canPerformActions}
							className="w-12 h-12 rounded-full bg-gradient-to-r from-green-500 to-emerald-600 hover:from-green-600 hover:to-emerald-700 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
							variant="default"
							title="Upload Invoice PDF or Capture Photo"
						>
							{uploadInvoiceMutation.isPending || approveInvoiceMutation.isPending ? (
								<Icon icon="eos-icons:loading" className="h-5 w-5" />
							) : (
								<Icon icon="lucide:camera" className="h-5 w-5" />
							)}
						</Button>

						{/* Tooltip for desktop */}
						<div className="absolute bottom-full mb-2 hidden group-hover:block bg-gray-800 text-white text-xs rounded py-1 px-2 whitespace-nowrap z-50">
							Upload PDF or capture photo
							{isMobileDevice() && " (mobile: choose option)"}
						</div>

						<span className="text-xs font-bold uppercase tracking-wide text-gray-700 dark:text-gray-300">
							{uploadInvoiceMutation.isPending
								? "UPLOADING..."
								: approveInvoiceMutation.isPending
									? "APPROVING..."
									: "INVOICE"}
						</span>
					</div>
				</div>
			</div>

			{/* Inventory Overview Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Items</p>
								<p className="text-2xl font-bold text-gray-900 dark:text-gray-100">{totalItems}</p>
							</div>
							<Icon icon="lucide:package" className="h-8 w-8 text-blue-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Low Stock</p>
								<p className="text-2xl font-bold text-orange-600 dark:text-orange-500">{lowStockItems}</p>
							</div>
							<Icon icon="lucide:alert-triangle" className="h-8 w-8 text-orange-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Out of Stock</p>
								<p className="text-2xl font-bold text-red-600 dark:text-red-500">{outOfStockItems}</p>
							</div>
							<Icon icon="lucide:x-circle" className="h-8 w-8 text-red-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Value</p>
								<p className="text-2xl font-bold text-green-600 dark:text-green-500">{formatCurrency(totalValue)}</p>
							</div>
							<Icon icon="lucide:banknote" className="h-8 w-8 text-green-500 opacity-60" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Inventory Table */}
			<Card>
				<CardHeader>
					<CardTitle className="text-gray-900 dark:text-gray-100">Inventory Items</CardTitle>
					<CardDescription className="text-gray-600 dark:text-gray-400">
						Manage your inventory stock levels and items
					</CardDescription>
					<div className="mt-4">
						<Input
							placeholder="Search inventory..."
							value={searchTerm}
							onChange={(e) => setSearchTerm(e.target.value)}
							className="max-w-sm"
						/>
					</div>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="text-center py-12">
							<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
							<p className="text-muted-foreground">Loading inventory...</p>
						</div>
					) : (
						<div className="overflow-x-auto">
							<table className="w-full min-w-max table-auto">
								<thead>
									<tr className="border-b border-gray-200 dark:border-gray-700">
										<th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Item Name</th>
										<th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Stock Status</th>
										<th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Quantity</th>
										<th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Price</th>
										<th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Total Value</th>
										<th className="text-left p-4 font-semibold text-gray-900 dark:text-gray-100">Actions</th>
									</tr>
								</thead>
								<tbody>
									{filteredInventory.map((item: InventoryItem) => {
										const stockStatus = getStockStatus(item.availableStock);
										const totalValue = item.unitPrice * item.availableStock;

										return (
											<tr
												key={item.id}
												className="border-b border-gray-200 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-800/50"
											>
												<td className="p-4">
													<div>
														<p className="font-medium text-gray-900 dark:text-gray-100">{item.itemName}</p>
														{item.expenseNote && <p className="text-sm text-muted-foreground">{item.expenseNote}</p>}
													</div>
												</td>
												<td className="p-4">
													<Badge variant={stockStatus.variant}>
														{stockStatus.status === "out-of-stock"
															? "Out of Stock"
															: stockStatus.status === "low-stock"
																? "Low Stock"
																: "In Stock"}
													</Badge>
												</td>
												<td className="p-4">
													<p className="font-medium text-gray-900 dark:text-gray-100">{item.availableStock} units</p>
												</td>
												<td className="p-4">
													<p className="font-medium text-gray-900 dark:text-gray-100">
														{formatCurrency(item.unitPrice)}
													</p>
												</td>
												<td className="p-4">
													<p className="font-medium text-green-600 dark:text-green-500">{formatCurrency(totalValue)}</p>
												</td>
												<td className="p-4">
													<div className="flex gap-2">
														<Button
															size="sm"
															onClick={() => handleAddStock(item)}
															disabled={!canPerformActions || addStockMutation.isPending}
															title="Add Stock"
														>
															<Icon icon="lucide:plus" className="h-4 w-4" />
														</Button>
														<Button
															size="sm"
															variant="outline"
															onClick={() => handleEditItem(item)}
															disabled={!canPerformActions || editItemMutation.isPending}
															title="Edit Item"
														>
															<Icon icon="lucide:edit" className="h-4 w-4" />
														</Button>
														<Button
															size="sm"
															variant="destructive"
															onClick={() => handleDeleteItem(item)}
															disabled={!canPerformActions || deleteItemMutation.isPending}
															title="Delete Item"
														>
															<Icon icon="lucide:trash" className="h-4 w-4" />
														</Button>
													</div>
												</td>
											</tr>
										);
									})}
								</tbody>
							</table>

							{!isLoading && filteredInventory.length === 0 && (
								<div className="text-center py-12 text-muted-foreground">
									<Icon icon="lucide:package" className="h-16 w-16 mx-auto mb-4 opacity-50" />
									<p className="text-lg font-medium text-gray-900 dark:text-gray-100">No inventory items found</p>
									<p className="text-sm">Try adjusting your search criteria</p>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Footer */}
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
		</div>
	);
}
