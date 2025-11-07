// src/pages/inventory/stock/index.tsx
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import inventoryService, { type InventoryItem, type StockItem } from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

export default function StockManagementPage() {
	const queryClient = useQueryClient();
	const [searchTerm, setSearchTerm] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [stockToAdd, setStockToAdd] = useState<{ inventoryId: number; quantity: number } | null>(null);

	const {
		data: inventory = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["inventory"],
		queryFn: inventoryService.listMenu,
	});

	const addStockMutation = useMutation({
		mutationFn: inventoryService.addStock,
		onSuccess: () => {
			message.success("Stock added successfully!");
			queryClient.invalidateQueries({ queryKey: ["inventory"] });
			setStockToAdd(null);
		},
		onError: (error: Error) => {
			message.error(`Failed to add stock: ${error.message}`);
		},
	});

	// Format currency to KShs
	const formatCurrency = (amount: number) => {
		return `KShs ${amount.toFixed(2)}`;
	};

	const filteredInventory = inventory.filter((item: InventoryItem) => {
		const matchesSearch = item.name.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesCategory = categoryFilter === "all" || item.category === categoryFilter;
		return matchesSearch && matchesCategory;
	});

	const categories = Array.from(new Set(inventory.map((item: InventoryItem) => item.category).filter(Boolean)));

	const getStockStatus = (quantity: number) => {
		if (quantity === 0) return { status: "out-of-stock", variant: "destructive" as const };
		if (quantity < 10) return { status: "low-stock", variant: "warning" as const };
		return { status: "in-stock", variant: "success" as const };
	};

	const handleAddStock = (item: InventoryItem) => {
		setStockToAdd({ inventoryId: item.id, quantity: 1 });
	};

	const confirmAddStock = () => {
		if (stockToAdd) {
			addStockMutation.mutate({
				merchantId: "HTL001",
				items: [stockToAdd],
			});
		}
	};

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
								{inventory.find((item) => item.id === stockToAdd.inventoryId)?.name}?
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
								<Button onClick={confirmAddStock} disabled={addStockMutation.isPending}>
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
						</CardContent>
					</Card>
				</div>
			)}

			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Stock Management</h1>
					<p className="text-muted-foreground">Manage and track your inventory stock levels</p>
				</div>
			</div>

			{/* Inventory Overview */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Items</p>
								<p className="text-2xl font-bold">{inventory.length}</p>
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
								<p className="text-2xl font-bold text-orange-600">
									{inventory.filter((item: InventoryItem) => item.quantity < 10).length}
								</p>
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
								<p className="text-2xl font-bold text-red-600">
									{inventory.filter((item: InventoryItem) => item.quantity === 0).length}
								</p>
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
								<p className="text-2xl font-bold text-green-600">
									{formatCurrency(
										inventory.reduce((total: number, item: InventoryItem) => total + item.price * item.quantity, 0)
									)}
								</p>
							</div>
							<Icon icon="lucide:banknote" className="h-8 w-8 text-green-500 opacity-60" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Inventory List */}
			<Card>
				<CardHeader>
					<CardTitle>Inventory Items</CardTitle>
					<CardDescription>Manage your inventory stock levels and items</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4 mb-6">
						<div className="flex-1">
							<Input
								placeholder="Search inventory..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="max-w-sm"
							/>
						</div>
						<Select value={categoryFilter} onValueChange={setCategoryFilter}>
							<SelectTrigger className="w-32">
								<SelectValue placeholder="Category" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Categories</SelectItem>
								{categories.map((category) => (
									<SelectItem key={category} value={category}>
										{category}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{isLoading ? (
						<div className="text-center py-12">
							<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
							<p className="text-muted-foreground">Loading inventory...</p>
						</div>
					) : (
						<div className="space-y-4">
							{filteredInventory.map((item: InventoryItem) => {
								const stockStatus = getStockStatus(item.quantity);

								return (
									<Card key={item.id} className="border-l-4 border-l-primary">
										<CardContent className="p-6">
											<div className="flex items-start justify-between">
												<div className="space-y-3 flex-1">
													<div className="flex items-center gap-3">
														<h3 className="font-semibold text-lg">{item.name}</h3>
														<Badge variant={stockStatus.variant}>
															{stockStatus.status === "out-of-stock"
																? "Out of Stock"
																: stockStatus.status === "low-stock"
																	? "Low Stock"
																	: "In Stock"}
														</Badge>
													</div>

													<div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
														<div>
															<p className="text-muted-foreground">Current Stock</p>
															<p className="font-medium text-2xl">{item.quantity} units</p>
														</div>
														<div>
															<p className="text-muted-foreground">Price</p>
															<p className="font-medium">{formatCurrency(item.price)}</p>
														</div>
														<div>
															<p className="text-muted-foreground">Category</p>
															<p className="font-medium">{item.category || "Uncategorized"}</p>
														</div>
													</div>

													{item.description && (
														<div>
															<p className="text-muted-foreground">Description</p>
															<p className="font-medium">{item.description}</p>
														</div>
													)}
												</div>

												<div className="flex gap-2 ml-4">
													<Button onClick={() => handleAddStock(item)} disabled={addStockMutation.isPending}>
														<Icon icon="lucide:plus" className="h-4 w-4 mr-2" />
														Add Stock
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}

					{!isLoading && filteredInventory.length === 0 && (
						<div className="text-center py-12 text-muted-foreground">
							<Icon icon="lucide:package" className="h-16 w-16 mx-auto mb-4 opacity-50" />
							<p className="text-lg font-medium">No inventory items found</p>
							<p className="text-sm">Try adjusting your search or filter criteria</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}