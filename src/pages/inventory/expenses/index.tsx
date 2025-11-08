// src/pages/inventory/expenses/index.tsx - ENHANCED VERSION
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import inventoryService, { type ExpenseData } from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

// Local storage utilities
const storageUtils = {
  getExpenses: (): any[] => {
    if (typeof window === 'undefined') return [];
    try {
      const stored = localStorage.getItem('expenses_HTL001');
      return stored ? JSON.parse(stored) : [];
    } catch {
      return [];
    }
  },
  
  addExpense: (expense: any) => {
    const expenses = storageUtils.getExpenses();
    const newExpense = {
      id: `exp_${Date.now()}`,
      ...expense,
      createdAt: new Date().toISOString(),
    };
    expenses.unshift(newExpense);
    localStorage.setItem('expenses_HTL001', JSON.stringify(expenses));
    return newExpense;
  },
  
  clearExpenses: () => {
    localStorage.removeItem('expenses_HTL001');
  }
};

export default function ExpenseTrackingPage() {
  const queryClient = useQueryClient();
  const [formData, setFormData] = useState({
    amount: "",
    note: "",
  });

  // Get expenses from local storage
  const { data: expenses = [], refetch: refetchExpenses } = useQuery({
    queryKey: ["expenses"],
    queryFn: () => storageUtils.getExpenses(),
  });

  const addExpenseMutation = useMutation({
    mutationFn: async (expenseData: ExpenseData) => {
      // First, call the actual API
      const apiResponse = await inventoryService.addExpense(expenseData);
      
      // Then, store locally for history
      const localExpense = storageUtils.addExpense({
        ...expenseData,
        // Include any additional fields from API response if needed
        apiId: apiResponse.expenseId || apiResponse.id
      });
      
      return { apiResponse, localExpense };
    },
    onSuccess: (data) => {
      message.success("Expense added successfully!");
      // Refresh the local expenses list
      refetchExpenses();
      // Clear the form
      setFormData({ amount: "", note: "" });
    },
    onError: (error: Error) => {
      message.error(`Failed to add expense: ${error.message}`);
    },
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.amount || !formData.note) {
      message.warning("Please fill in all fields");
      return;
    }

    const amount = parseFloat(formData.amount);
    if (isNaN(amount) || amount <= 0) {
      message.warning("Please enter a valid amount");
      return;
    }

    const expenseData: ExpenseData = {
      merchantId: "HTL001",
      amount: amount,
      note: formData.note,
    };

    addExpenseMutation.mutate(expenseData);
  };

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }));
  };

  const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Expense Tracking</h1>
          <p className="text-muted-foreground">Record and track business expenses</p>
        </div>
        <div className="text-right">
          <p className="text-sm text-muted-foreground">Total Expenses</p>
          <p className="text-2xl font-bold text-red-600">KShs {totalExpenses.toFixed(2)}</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Expense Form */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Add New Expense</CardTitle>
            <CardDescription>Record a new business expense</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="amount">Amount (KShs)</Label>
                <div className="relative">
                  <Icon icon="lucide:banknote" className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="0.00"
                    className="pl-10"
                    value={formData.amount}
                    onChange={(e) => handleInputChange("amount", e.target.value)}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="note">Description</Label>
                <Input
                  id="note"
                  placeholder="Enter expense description..."
                  value={formData.note}
                  onChange={(e) => handleInputChange("note", e.target.value)}
                />
              </div>

              <Button type="submit" className="w-full" disabled={addExpenseMutation.isPending}>
                {addExpenseMutation.isPending ? (
                  <>
                    <Icon icon="eos-icons:loading" className="mr-2" />
                    Adding Expense...
                  </>
                ) : (
                  <>
                    <Icon icon="lucide:plus" className="mr-2" />
                    Add Expense
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Expense Guidelines */}
        <Card>
          <CardHeader>
            <CardTitle>Expense Guidelines</CardTitle>
            <CardDescription>Best practices for expense tracking</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-start gap-3">
              <Icon icon="lucide:check-circle" className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Be Specific</p>
                <p className="text-sm text-muted-foreground">Include details about what the expense was for</p>
              </div>
            </div>

            <div className="flex items-start gap-3">
              <Icon icon="lucide:check-circle" className="h-5 w-5 text-green-500 mt-0.5" />
              <div>
                <p className="font-medium">Track Regularly</p>
                <p className="text-sm text-muted-foreground">Record expenses as they occur</p>
              </div>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">Merchant ID</p>
              <p className="font-mono text-sm">HTL001</p>
            </div>

            <div className="pt-4 border-t">
              <p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
              <p className="font-bold text-lg text-red-600">KShs {totalExpenses.toFixed(2)}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Expense History */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Expense History</CardTitle>
            <CardDescription>Recently recorded expenses</CardDescription>
          </div>
          {expenses.length > 0 && (
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                if (confirm("Clear all local expense history?")) {
                  storageUtils.clearExpenses();
                  refetchExpenses();
                  message.success("Expense history cleared");
                }
              }}
            >
              <Icon icon="lucide:trash" className="mr-2 h-4 w-4" />
              Clear History
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {expenses.length > 0 ? (
            <div className="space-y-3">
              {expenses.map((expense) => (
                <div key={expense.id} className="flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50">
                  <div className="flex-1">
                    <p className="font-semibold">{expense.note}</p>
                    <p className="text-sm text-muted-foreground">
                      {new Date(expense.createdAt).toLocaleDateString('en-US', {
                        year: 'numeric',
                        month: 'short',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-red-600 text-lg">KShs {expense.amount.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Merchant: {expense.merchantId}</p>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-12 text-muted-foreground">
              <Icon icon="lucide:file-text" className="h-16 w-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg font-medium">No expenses recorded yet</p>
              <p className="text-sm">Start by adding your first expense above</p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}