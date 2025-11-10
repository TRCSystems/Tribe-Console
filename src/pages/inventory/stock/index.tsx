import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useEffect, useRef, useState } from "react";
import inventoryService, { type InventoryItem, type StockItem } from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import userStore from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";

// Edit Modal Component (from the other developer's files, adapted)
const EditInventoryModal = ({
	open,
	setOpen,
	item,
	onSave,
}: {
	open: boolean;
	setOpen: (open: boolean) => void;
	item: InventoryItem | null;
	onSave: (item: InventoryItem) => void;
}) => {
	const [formData, setFormData] = useState({
		name: "",
		quantity: 0,
		price: 0,
	});

	useEffect(() => {
		if (item) {
			setFormData({
				name: item.name,
				quantity: item.quantity,
				price: item.price,
			});
		}
	}, [item]);

	const handleSave = () => {
		if (item && formData.name && formData.quantity >= 0 && formData.price >= 0) {
			onSave({
				...item,
				name: formData.name,
				quantity: formData.quantity,
				price: formData.price,
			});
			setOpen(false);
		}
	};

	if (!open) return null;

	return (
		<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
			<Card className="w-full max-w-md">
				<CardHeader>
					<CardTitle>{item ? "Edit Item" : "Add Item"}</CardTitle>
					<CardDescription>{item ? `Edit ${item.name}` : "Add new inventory item"}</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<div>
						<label className="text-sm font-medium">Item Name</label>
						<Input
							value={formData.name}
							onChange={(e) => setFormData({ ...formData, name: e.target.value })}
							placeholder="Enter item name"
						/>
					</div>
					<div>
						<label className="text-sm font-medium">Quantity</label>
						<Input
							type="number"
							min="0"
							value={formData.quantity}
							onChange={(e) => setFormData({ ...formData, quantity: parseInt(e.target.value) || 0 })}
							placeholder="Enter quantity"
						/>
					</div>
					<div>
						<label className="text-sm font-medium">Price (KShs)</label>
						<Input
							type="number"
							min="0"
							step="0.01"
							value={formData.price}
							onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
							placeholder="Enter price"
						/>
					</div>
					<div className="flex gap-4 justify-end">
						<Button variant="outline" onClick={() => setOpen(false)}>
							Cancel
						</Button>
						<Button onClick={handleSave}>Save Changes</Button>
					</div>
				</CardContent>
			</Card>
		</div>
	);
};

export default function StockManagementPage() {
	const queryClient = useQueryClient();
	const [searchTerm, setSearchTerm] = useState("");
	const [stockToAdd, setStockToAdd] = useState<{ inventoryId: number; quantity: number } | null>(null);
	const [isImporting, setIsImporting] = useState(false);
	const [editModalOpen, setEditModalOpen] = useState(false);
	const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
	const fileInputRef = useRef<HTMLInputElement>(null);

	// Check authentication state
	const [isAuthenticated, setIsAuthenticated] = useState(false);
	const [merchantId, setMerchantId] = useState<string>("");

	useEffect(() => {
		const token = userStore.getState().userToken?.accessToken;
		const userMerchantId = userStore.getState().user?.merchantId || "HTL001";

		console.log("🔄 Stock Page - Auth Check:");
		console.log("   Token exists:", !!token);
		console.log("   Merchant ID:", userMerchantId);

		setIsAuthenticated(!!token);
		setMerchantId(userMerchantId);

		if (!token) {
			console.warn("⚠️ User not authenticated - stock mutations will fail");
			message.warning("Please login to manage stock");
		}
	}, []);

	const {
		data: inventory = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["inventory"],
		queryFn: inventoryService.listMenu,
	});

	// CORRECT: Field mapping based on actual API response
	const getItemData = (item: any): InventoryItem => {
		if (!item) {
			return { id: 0, name: "Unknown Item", price: 0, quantity: 0 };
		}

		return {
			id: item.id || 0,
			name: item.itemName || "Unknown Item",
			price: item.unitPrice || 0,
			quantity: item.availableStock || 0,
			description: item.expenseNote || "",
			merchantId: item.merchantId,
			itemCode: item.itemCode,
			startingStock: item.startingStock,
			availableStock: item.availableStock,
			unitPrice: item.unitPrice,
			expenseNote: item.expenseNote,
		};
	};

	// Enhanced add stock mutation with detailed logging
	const addStockMutation = useMutation({
		mutationFn: async (data: { merchantId: string; items: StockItem[] }) => {
			console.group("🔄 Add Stock Mutation Started");
			console.log("📦 Mutation data:", data);

			const token = userStore.getState().userToken?.accessToken;
			console.log("🔑 Token at mutation time:", token ? `${token.substring(0, 50)}...` : "No token");

			try {
				const result = await inventoryService.addStock(data);
				console.log("✅ Add stock successful:", result);
				return result;
			} catch (error) {
				console.error("❌ Add stock failed:", error);
				throw error;
			} finally {
				console.groupEnd();
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

	// CSV Import mutation
	const importCSVMutation = useMutation({
		mutationFn: async (file: File) => {
			console.group("🔄 CSV Import Started");
			console.log("📁 File:", file.name, file.size);

			try {
				const result = await inventoryService.importInventory(file, merchantId);
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

	// Edit item mutation
	const editItemMutation = useMutation({
		mutationFn: async (item: InventoryItem) => {
			// Since we don't have a direct update endpoint, we'll use addStock to update quantity
			// For name and price updates, we might need a different approach
			message.info("Edit functionality requires additional API endpoints");
			return Promise.resolve();
		},
		onSuccess: () => {
			message.success("Item updated successfully!");
			queryClient.invalidateQueries({ queryKey: ["inventory"] });
		},
	});

	// Delete item mutation
	const deleteItemMutation = useMutation({
		mutationFn: async (itemId: number) => {
			message.info("Delete functionality requires additional API endpoints");
			return Promise.resolve();
		},
		onSuccess: () => {
			message.success("Item deleted successfully!");
			queryClient.invalidateQueries({ queryKey: ["inventory"] });
		},
	});

	// Format currency to KShs
	const formatCurrency = (amount: number) => {
		return `KShs ${amount.toFixed(2)}`;
	};

	// Process inventory data with correct field mapping
	const processedInventory = inventory.map(getItemData);

	const filteredInventory = processedInventory.filter((item: InventoryItem) => {
		return item.name.toLowerCase().includes(searchTerm.toLowerCase());
	});

	const getStockStatus = (quantity: number) => {
		if (quantity === 0) return { status: "out-of-stock", variant: "destructive" as const };
		if (quantity < 10) return { status: "low-stock", variant: "warning" as const };
		return { status: "in-stock", variant: "success" as const };
	};

	const handleAddStock = (item: InventoryItem) => {
		if (!isAuthenticated) {
			message.error("Please login to add stock");
			return;
		}
		setStockToAdd({ inventoryId: item.id, quantity: 1 });
	};

	const handleEditItem = (item: InventoryItem) => {
		if (!isAuthenticated) {
			message.error("Please login to edit items");
			return;
		}
		setEditingItem(item);
		setEditModalOpen(true);
	};

	const handleDeleteItem = (item: InventoryItem) => {
		if (!isAuthenticated) {
			message.error("Please login to delete items");
			return;
		}

		if (window.confirm(`Are you sure you want to delete "${item.name}"?`)) {
			deleteItemMutation.mutate(item.id);
		}
	};

	const handleSaveEdit = (updatedItem: InventoryItem) => {
		editItemMutation.mutate(updatedItem);
	};

	const confirmAddStock = () => {
		if (stockToAdd && merchantId) {
			console.log("🔄 Confirming add stock:", stockToAdd);
			addStockMutation.mutate({
				merchantId: merchantId,
				items: [stockToAdd],
			});
		}
	};

	// Handle Import CSV functionality
	const handleImportCSV = () => {
		if (!isAuthenticated) {
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
	const lowStockItems = processedInventory.filter((item) => item.quantity < 10 && item.quantity > 0).length;
	const outOfStockItems = processedInventory.filter((item) => item.quantity === 0).length;
	const totalValue = processedInventory.reduce((total, item) => total + item.price * item.quantity, 0);

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">Stock Management</h1>
						<p className="text-muted-foreground">Manage and track your inventory stock levels</p>
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
			{/* Add Stock Confirmation Modal */}
			{stockToAdd && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<Card className="w-full max-w-md">
						<CardHeader>
							<CardTitle>Add Stock</CardTitle>
							<CardDescription>
								How many units do you want to add to{" "}
								{processedInventory.find((item) => item.id === stockToAdd.inventoryId)?.name}?
							</CardDescription>
						</CardHeader>
						<CardContent className="space-y-4">
							<Input
								type="number"
								min="1"
								value={stockToAdd.quantity}
								onChange={(e) => setStockToAdd({ ...stockToAdd, quantity: parseInt(e.target.value) || 1 })}
								placeholder="Enter quantity"
							/>
							<div className="flex gap-4 justify-end">
								<Button variant="outline" onClick={() => setStockToAdd(null)} disabled={addStockMutation.isPending}>
									Cancel
								</Button>
								<Button onClick={confirmAddStock} disabled={addStockMutation.isPending || !isAuthenticated}>
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

							{!isAuthenticated && (
								<div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
									<p className="text-sm text-yellow-800">
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

			{/* Hidden file input for CSV import */}
			<input
				ref={fileInputRef}
				type="file"
				accept=".csv,.xls,.xlsx,application/vnd.ms-excel,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
				onChange={handleFileChange}
				className="hidden"
			/>

			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Stock Management</h1>
					<p className="text-muted-foreground">Manage and track your inventory stock levels</p>
				</div>

				<div className="flex items-center gap-3">
					{/* Auth Status Indicator */}
					<div
						className={`px-3 py-1 rounded-full text-sm font-medium ${
							isAuthenticated ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
						}`}
					>
						{isAuthenticated ? "✅ Authenticated" : "❌ Not Authenticated"}
					</div>

					{/* Import CSV Button - Circular with text below */}
					<div className="flex flex-col items-center gap-1">
						<Button
							onClick={handleImportCSV}
							disabled={importCSVMutation.isPending || !isAuthenticated}
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
						<span className="text-xs font-bold uppercase tracking-wide text-gray-700">
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
								<p className="text-2xl font-bold">{totalItems}</p>
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
								<p className="text-2xl font-bold text-orange-600">{lowStockItems}</p>
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
								<p className="text-2xl font-bold text-red-600">{outOfStockItems}</p>
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
								<p className="text-2xl font-bold text-green-600">{formatCurrency(totalValue)}</p>
							</div>
							<Icon icon="lucide:banknote" className="h-8 w-8 text-green-500 opacity-60" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Inventory Table */}
			<Card>
				<CardHeader>
					<CardTitle>Inventory Items</CardTitle>
					<CardDescription>Manage your inventory stock levels and items</CardDescription>
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
									<tr className="border-b">
										<th className="text-left p-4 font-semibold">Item Name</th>
										<th className="text-left p-4 font-semibold">Stock Status</th>
										<th className="text-left p-4 font-semibold">Quantity</th>
										<th className="text-left p-4 font-semibold">Price</th>
										<th className="text-left p-4 font-semibold">Total Value</th>
										<th className="text-left p-4 font-semibold">Actions</th>
									</tr>
								</thead>
								<tbody>
									{filteredInventory.map((item: InventoryItem) => {
										const stockStatus = getStockStatus(item.quantity);
										const totalValue = item.price * item.quantity;

										return (
											<tr key={item.id} className="border-b hover:bg-gray-50">
												<td className="p-4">
													<div>
														<p className="font-medium">{item.name}</p>
														{item.description && <p className="text-sm text-muted-foreground">{item.description}</p>}
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
													<p className="font-medium">{item.quantity} units</p>
												</td>
												<td className="p-4">
													<p className="font-medium">{formatCurrency(item.price)}</p>
												</td>
												<td className="p-4">
													<p className="font-medium text-green-600">{formatCurrency(totalValue)}</p>
												</td>
												<td className="p-4">
													<div className="flex gap-2">
														<Button
															size="sm"
															onClick={() => handleAddStock(item)}
															disabled={!isAuthenticated}
															title="Add Stock"
														>
															<Icon icon="lucide:plus" className="h-4 w-4" />
														</Button>
														<Button
															size="sm"
															variant="outline"
															onClick={() => handleEditItem(item)}
															disabled={!isAuthenticated}
															title="Edit Item"
														>
															<Icon icon="lucide:edit" className="h-4 w-4" />
														</Button>
														<Button
															size="sm"
															variant="destructive"
															onClick={() => handleDeleteItem(item)}
															disabled={!isAuthenticated}
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
									<p className="text-lg font-medium">No inventory items found</p>
									<p className="text-sm">Try adjusting your search criteria</p>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
