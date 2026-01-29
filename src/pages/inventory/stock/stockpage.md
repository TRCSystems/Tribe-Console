import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import inventoryService, { type InventoryItem, type StockItem } from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { LockModal } from "@/components/lock-modal";
import { UserRoleIndicator } from "@/components/user-role-indicator";
import { useAuthCheck, useMerchantId, useUserToken } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { getMerchantNameFromToken } from "@/utils/jwt";

// CSV Template Content
const CSV_TEMPLATE_CONTENT = `ITEM,UNIT_PRICE,STARTING_STOCK
Product 1,2000,30
Product 2,1500,20
Product 3,1200,40
Product 4,30,200`;

// Edit Modal Component
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

// Delete Confirmation Modal Component
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
	const [stockToAdd, setStockToAdd] = useState<{ inventoryId: number; quantity: number; currentStock?: number } | null>(
		null,
	);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
	const [showTemplateNotification, setShowTemplateNotification] = useState(false);
	const [deleteModalOpen, setDeleteModalOpen] = useState(false);
	const [itemToDelete, setItemToDelete] = useState<InventoryItem | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

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

	//  handleUnlock BEFORE return
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

	// 6. All useMutation hooks (NOW they can use canPerformActions)
	const addStockMutation = useMutation({
		mutationFn: async (data: { merchantId: string; items: StockItem[] }) => {
			console.log("🔄 Add Stock Mutation Started:", data);

			if (!canPerformActions) {
				throw new Error("User not authenticated or missing merchant ID");
			}

			try {
				const result = await inventoryService.addStock(data);
				console.log("✅ Add stock successful:", result);
				return result;
			} catch (error) {
				console.error("❌ Add stock failed:", error);
				throw error;
			}
		},
		onSuccess: () => {
			message.success("Stock added successfully!");
			queryClient.invalidateQueries({ queryKey: ["inventory"] });
			setStockToAdd(null);
		},
		onError: (error: Error) => {
			console.error("❌ Mutation onError:", error);
			if (error.message.includes("Authentication failed") || error.message.includes("401")) {
				message.error("Authentication failed. Please login again.");
			} else {
				message.error(`Failed to add stock: ${error.message}`);
			}
		},
	});

	const importCSVMutation = useMutation({
		mutationFn: async (file: File) => {
			console.group("🔄 CSV Import Started");
			console.log("📁 File:", file.name, file.size);

			if (!canPerformActions) {
				throw new Error("User not authenticated or missing merchant ID");
			}

			try {
				// Read and validate CSV file before sending to server
				const fileContent = await readCSVFile(file);
				const validationResult = validateCSVData(fileContent);

				if (!validationResult.isValid) {
					throw new Error(`CSV validation failed: ${validationResult.error}`);
				}

				const result = await inventoryService.importInventory(file, merchantId!);
				console.log("✅ Import successful:", result);
				return result;
			} catch (error) {
				console.error("❌ Import failed:", error);
				throw error;
			} finally {
				console.groupEnd();
			}
		},
		onSuccess: (result) => {
			message.success(`Successfully imported ${result.imported} items!`);
			queryClient.invalidateQueries({ queryKey: ["inventory"] });
		},
		onError: (error: Error) => {
			console.error("❌ Import onError:", error);
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

			console.log("✏️ Edit Item Mutation Started:", { id, data });

			try {
				const result = await inventoryService.updateItem(id, {
					itemName: data.itemName,
					quantity: data.quantity,
					unitPrice: data.unitPrice,
				});
				console.log("✅ Edit item successful:", result);
				return result;
			} catch (error) {
				console.error("❌ Edit item failed:", error);
				throw error;
			}
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

			console.log("🗑️ Delete Item Mutation Started:", { id });

			try {
				const result = await inventoryService.deleteItem(id);
				console.log("✅ Delete item successful:", result);
				return result;
			} catch (error) {
				console.error("❌ Delete item failed:", error);
				throw error;
			}
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

	// 7. All useEffect hooks
	useEffect(() => {
		console.log("🔄 Stock Management - Auth Status:", {
			isAuthenticated,
			merchantId,
			canPerformActions,
			isLocked,
		});
	}, [isAuthenticated, merchantId, canPerformActions, isLocked]);

	useEffect(() => {
		const unlockData = localStorage.getItem("stock_page_unlocked");
		if (unlockData) {
			try {
				const data = JSON.parse(unlockData);
				const isExpired = Date.now() > data.timestamp + (data.expiresIn || 8 * 60 * 60 * 1000);

				if (!isExpired && data.unlocked) {
					setIsLocked(false);
					console.log(
						"🔓 Page already unlocked (valid until:",
						new Date(data.timestamp + data.expiresIn).toLocaleTimeString(),
						")",
					);
				} else {
					// Clear expired data
					localStorage.removeItem("stock_page_unlocked");
					console.log("🔐 Clearing expired unlock data");
				}
			} catch (error) {
				// Invalid data, clear it
				localStorage.removeItem("stock_page_unlocked");
				console.log("🔐 Clearing invalid unlock data");
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

	// CORRECT: Field mapping based on actual API response
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

	// Helper function to read CSV file
	const readCSVFile = (file: File): Promise<string> => {
		return new Promise((resolve, reject) => {
			const reader = new FileReader();
			reader.onload = (event) => {
				resolve(event.target?.result as string);
			};
			reader.onerror = (error) => {
				reject(new Error("Failed to read CSV file"));
			};
			reader.readAsText(file);
		});
	};

	// Helper function to validate CSV data
	const validateCSVData = (csvContent: string): { isValid: boolean; error?: string } => {
		try {
			const lines = csvContent.split("\n").filter((line) => line.trim() !== "");

			// Skip header row
			for (let i = 1; i < lines.length; i++) {
				const columns = lines[i].split(",");

				// Check if there are enough columns
				if (columns.length < 3) {
					return {
						isValid: false,
						error: `Row ${i + 1}: Incorrect number of columns. Expected 3 columns.`,
					};
				}

				const itemName = columns[0].trim();
				const unitPrice = parseFloat(columns[1].trim());
				const startingStock = parseFloat(columns[2].trim());

				// Validate item name
				if (!itemName || itemName === "") {
					return { isValid: false, error: `Row ${i + 1}: Item name cannot be empty.` };
				}

				// Validate unit price (must be non-negative)
				if (isNaN(unitPrice) || unitPrice < 0) {
					return {
						isValid: false,
						error: `Row ${i + 1}: Unit price must be a non-negative number.`,
					};
				}

				// Validate starting stock (must be non-negative)
				if (isNaN(startingStock) || startingStock < 0) {
					return {
						isValid: false,
						error: `Row ${i + 1}: Starting stock must be a non-negative number.`,
					};
				}

				// Check for negative values
				if (startingStock < 0) {
					return {
						isValid: false,
						error: `Row ${i + 1}: Starting stock cannot be negative. Please use 0 or a positive number.`,
					};
				}

				if (unitPrice < 0) {
					return {
						isValid: false,
						error: `Row ${i + 1}: Unit price cannot be negative. Please use 0 or a positive number.`,
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

	// Format currency to KShs
	const formatCurrency = (amount: number) => {
		return `KShs ${amount?.toFixed(2) || "0.00"}`;
	};

	// Process inventory data with correct field mapping
	const processedInventory = inventory.map(getItemData);

	const filteredInventory = processedInventory.filter((item: InventoryItem) => {
		return item.itemName.toLowerCase().includes(searchTerm.toLowerCase());
	});

	const getStockStatus = (quantity: number) => {
		if (quantity === 0) return { status: "out-of-stock", variant: "destructive" as const };
		if (quantity < 10) return { status: "low-stock", variant: "warning" as const };
		return { status: "in-stock", variant: "success" as const };
	};

	// Function to download CSV template
	const downloadCSVTemplate = () => {
		try {
			// Create a Blob with CSV content
			const blob = new Blob([CSV_TEMPLATE_CONTENT], { type: "text/csv;charset=utf-8;" });

			// Create a temporary URL for the Blob
			const url = URL.createObjectURL(blob);

			// Create a temporary anchor element
			const link = document.createElement("a");
			link.href = url;
			link.setAttribute("download", "inventory_template.csv");

			// Append to body, click, and remove
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// Clean up the URL object
			URL.revokeObjectURL(url);

			// Show success message
			message.success("CSV template downloaded successfully!");

			// Show notification for editing
			setShowTemplateNotification(true);

			// Auto-hide notification after 5 seconds
			setTimeout(() => setShowTemplateNotification(false), 5000);
		} catch (error) {
			console.error("Error downloading CSV template:", error);
			message.error("Failed to download template. Please try again.");
		}
	};

	const handleAddStock = (item: InventoryItem) => {
		if (!canPerformActions) {
			message.error("Please login to add stock");
			return;
		}

		// Initialize with current quantity from database
		const currentItem = processedInventory.find((inv) => inv.id === item.id);
		if (currentItem) {
			setStockToAdd({
				inventoryId: item.id,
				quantity: 0, // Start with 0 for user to add to
				currentStock: currentItem.availableStock, // Store current stock for display
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

		// First confirmation
		if (window.confirm(`Are you sure you want to delete "${item.itemName}"?`)) {
			// Set item to delete and open detailed confirmation modal
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
			console.log("🔄 Confirming add stock:", stockToAdd);

			// Quantity should already be validated, but double-check
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

	// Handle Import CSV functionality
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

		// Check if it's a CSV or Excel file
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

		console.log("📁 Selected file:", file.name, file.size);
		importCSVMutation.mutate(file);

		// Reset file input
		if (fileInputRef.current) {
			fileInputRef.current.value = "";
		}
	};

	// Calculate overview statistics
	const totalItems = processedInventory.length;
	const lowStockItems = processedInventory.filter((item) => item.availableStock < 10 && item.availableStock > 0).length;
	const outOfStockItems = processedInventory.filter((item) => item.availableStock === 0).length;
	const totalValue = processedInventory.reduce((total, item) => total + item.unitPrice * item.availableStock, 0);

	// Function to manually re-lock the page
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
								<br />
								<span className="text-sm font-medium mt-1 block">
									Current stock: {stockToAdd.currentStock || 0} units
								</span>
								<span className="text-sm text-green-600 dark:text-green-400">
									New total after adding: {stockToAdd.currentStock + stockToAdd.quantity} units
								</span>
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<div>
								<label className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-2 block">
									Quantity to Add
								</label>
								<Input
									type="number"
									value={stockToAdd.quantity}
									onChange={(e) => {
										const value = parseInt(e.target.value);
										// Only update if it's a valid positive number or empty (allowing user to clear the field)
										if (!isNaN(value) && value >= 0) {
											setStockToAdd({ ...stockToAdd, quantity: value });
										} else if (e.target.value === "" || e.target.value === "-") {
											// Allow empty or just minus sign (will be caught by validation)
											setStockToAdd({ ...stockToAdd, quantity: 0 });
										}
									}}
									onBlur={(e) => {
										// On blur, if the value is less than 0, set it to 0
										const value = parseInt(e.target.value);
										if (isNaN(value) || value < 0) {
											setStockToAdd({ ...stockToAdd, quantity: 0 });
										}
									}}
									placeholder="Enter quantity to add (0 or more)"
									className="w-full"
									min="0"
								/>
								{stockToAdd.quantity < 0 && (
									<p className="text-sm text-red-600 dark:text-red-400 mt-1">
										Quantity cannot be negative. Please enter 0 or more.
									</p>
								)}
							</div>
							<div className="flex gap-4 justify-end">
								<Button variant="outline" onClick={() => setStockToAdd(null)} disabled={addStockMutation.isPending}>
									Cancel
								</Button>
								<Button
									onClick={confirmAddStock}
									disabled={addStockMutation.isPending || !canPerformActions || stockToAdd.quantity < 0}
								>
									{addStockMutation.isPending ? (
										<>
											<Icon icon="eos-icons:loading" className="mr-2" />
											Adding...
										</>
									) : (
										"Add Stock"
									)}
								</Button>
							</div>

							{!canPerformActions && (
								<div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-md">
									<p className="text-sm text-yellow-800 dark:text-yellow-300">
										<Icon icon="lucide:alert-triangle" className="inline h-4 w-4 mr-1" />
										You need to be logged in to add stock
									</p>
								</div>
							)}
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
										<strong>Download and Edit to your specifications!</strong>
										<br />
										Open the file in Excel or any spreadsheet editor and add your inventory items.
										<br />
										<strong>Required columns:</strong> ITEM, UNIT_PRICE, STARTING_STOCK
										<br />
										<strong>Important:</strong> Do not use negative numbers for quantities or prices!
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

			{/* Hidden file input for CSV import */}
			<input
				ref={fileInputRef}
				type="file"
				accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,text/csv"
				onChange={handleFileChange}
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

					{/* Auth Status Indicator */}
					<div
						className={`px-3 py-1 rounded-full text-sm font-medium ${
							canPerformActions
								? "bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-300"
								: "bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-300"
						}`}
					>
						{canPerformActions ? "✅ Authenticated" : "❌ Not Authenticated"}
					</div>

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

					{/* Import CSV Button - Circular with text below */}
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
															title={canPerformActions ? "Add Stock" : "Please login to add stock"}
														>
															{addStockMutation.isPending && editingItem?.id === item.id ? (
																<Icon icon="eos-icons:loading" className="h-4 w-4" />
															) : (
																<Icon icon="lucide:plus" className="h-4 w-4" />
															)}
														</Button>
														<Button
															size="sm"
															variant="outline"
															onClick={() => handleEditItem(item)}
															disabled={!canPerformActions || editItemMutation.isPending}
															title={canPerformActions ? "Edit Item" : "Please login to edit items"}
														>
															{editItemMutation.isPending && editingItem?.id === item.id ? (
																<Icon icon="eos-icons:loading" className="h-4 w-4" />
															) : (
																<Icon icon="lucide:edit" className="h-4 w-4" />
															)}
														</Button>
														<Button
															size="sm"
															variant="destructive"
															onClick={() => handleDeleteItem(item)}
															disabled={!canPerformActions || deleteItemMutation.isPending}
															title={canPerformActions ? "Delete Item" : "Please login to delete items"}
														>
															{deleteItemMutation.isPending && itemToDelete?.id === item.id ? (
																<Icon icon="eos-icons:loading" className="h-4 w-4" />
															) : (
																<Icon icon="lucide:trash" className="h-4 w-4" />
															)}
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
