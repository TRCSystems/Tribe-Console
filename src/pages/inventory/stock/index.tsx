// src/pages/inventory/stock/index.tsx - UPDATED VERSION
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState, useEffect } from "react";
import inventoryService, { type InventoryItem, type StockItem } from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import userStore from "@/store/userStore";

export default function StockManagementPage() {
  const queryClient = useQueryClient();
  const [searchTerm, setSearchTerm] = useState("");
  const [stockToAdd, setStockToAdd] = useState<{ inventoryId: number; quantity: number } | null>(null);

  // Check authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    const token = userStore.getState().userToken?.accessToken;
    console.log("🔄 Stock Page - Auth Check:");
    console.log("   Token exists:", !!token);
    console.log("   Token preview:", token ? `${token.substring(0, 50)}...` : 'No token');
    setIsAuthenticated(!!token);
    
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
      return { id: 0, name: 'Unknown Item', price: 0, quantity: 0 };
    }

    return {
      id: item.id || 0,
      name: item.itemName || 'Unknown Item',
      price: item.unitPrice || 0,
      quantity: item.availableStock || 0,
      description: item.expenseNote || '',
      merchantId: item.merchantId,
      itemCode: item.itemCode,
      startingStock: item.startingStock,
      availableStock: item.availableStock,
      unitPrice: item.unitPrice,
      expenseNote: item.expenseNote
    };
  };

  // Enhanced add stock mutation with detailed logging
  const addStockMutation = useMutation({
    mutationFn: async (data: { merchantId: string; items: StockItem[] }) => {
      console.group("🔄 Add Stock Mutation Started");
      console.log("📦 Mutation data:", data);
      
      const token = userStore.getState().userToken?.accessToken;
      console.log("🔑 Token at mutation time:", token ? `${token.substring(0, 50)}...` : 'No token');
      
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

  const confirmAddStock = () => {
    if (stockToAdd) {
      console.log("🔄 Confirming add stock:", stockToAdd);
      addStockMutation.mutate({
        merchantId: "HTL001",
        items: [stockToAdd],
      });
    }
  };

  // Handle Import CSV functionality
  const handleImportCSV = () => {
    message.info("Import CSV feature is under development");
    // This will be implemented by another developer
    console.log("Import CSV button clicked - API integration pending");
  };

  // Calculate overview statistics
  const totalItems = processedInventory.length;
  const lowStockItems = processedInventory.filter(item => item.quantity < 10 && item.quantity > 0).length;
  const outOfStockItems = processedInventory.filter(item => item.quantity === 0).length;
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

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Stock Management</h1>
          <p className="text-muted-foreground">Manage and track your inventory stock levels</p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Auth Status Indicator */}
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${
            isAuthenticated ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
          }`}>
            {isAuthenticated ? '✅ Authenticated' : '❌ Not Authenticated'}
          </div>
          
          {/* Import CSV Button - Circular with text below */}
          <div className="flex flex-col items-center gap-1">
            <Button 
              onClick={handleImportCSV}
              className="w-12 h-12 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-md hover:shadow-lg transition-all duration-200 flex items-center justify-center"
              variant="default"
              title="Import CSV File"
            >
              <Icon icon="lucide:upload" className="h-5 w-5" />
            </Button>
            <span className="text-xs font-bold uppercase tracking-wide text-gray-700">IMPORT</span>
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

      {/* Inventory List */}
      <Card>
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>Manage your inventory stock levels and items</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mb-6">
            <Input
              placeholder="Search inventory..."
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

                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                            <div>
                              <p className="text-muted-foreground">Current Stock</p>
                              <p className="font-medium text-2xl">{item.quantity} units</p>
                            </div>
                            <div>
                              <p className="text-muted-foreground">Price</p>
                              <p className="font-medium">{formatCurrency(item.price)}</p>
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
                          <Button 
                            onClick={() => handleAddStock(item)} 
                            disabled={true} // DISABLED: Another developer is working on the API
                            title="Add Stock feature is temporarily disabled - API under development"
                          >
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
              <p className="text-sm">Try adjusting your search criteria</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}