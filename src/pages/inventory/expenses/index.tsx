// src/pages/inventory/expenses/index.tsx - FINAL UPDATED VERSION
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useEffect, useState } from "react";
import inventoryService, { type ExpenseData } from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";

// Local storage utilities for offline tracking
const storageUtils = {
	getExpenses: (merchantId: string): any[] => {
		if (typeof window === "undefined") return [];
		try {
			const stored = localStorage.getItem(`expenses_${merchantId}`);
			return stored ? JSON.parse(stored) : [];
		} catch {
			return [];
		}
	},

	addExpense: (merchantId: string, expense: any) => {
		const expenses = storageUtils.getExpenses(merchantId);
		const newExpense = {
			id: `exp_${Date.now()}`,
			...expense,
			createdAt: new Date().toISOString(),
			synced: false, // Track sync status
		};
		expenses.unshift(newExpense);
		localStorage.setItem(`expenses_${merchantId}`, JSON.stringify(expenses));
		return newExpense;
	},

	markExpenseAsSynced: (merchantId: string, expenseId: string, apiData: any) => {
		const expenses = storageUtils.getExpenses(merchantId);
		const updatedExpenses = expenses.map((expense) =>
			expense.id === expenseId ? { ...expense, synced: true, apiId: apiData.expenseId, ...apiData } : expense,
		);
		localStorage.setItem(`expenses_${merchantId}`, JSON.stringify(updatedExpenses));
	},

	clearExpenses: (merchantId: string) => {
		localStorage.removeItem(`expenses_${merchantId}`);
	},

	getPendingExpenses: (merchantId: string): any[] => {
		const expenses = storageUtils.getExpenses(merchantId);
		return expenses.filter((expense) => !expense.synced);
	},
};

export default function ExpenseTrackingPage() {
	const queryClient = useQueryClient();
	const [formData, setFormData] = useState({
		amount: "",
		note: "",
	});
	const [merchantId, setMerchantId] = useState<string>("");

	// Get merchant ID on component mount
	useEffect(() => {
		try {
			const currentMerchantId = inventoryService.getCurrentMerchantId();
			setMerchantId(currentMerchantId);
		} catch (error) {
			console.error("Failed to get merchant ID:", error);
			message.error("Failed to load merchant information. Please login again.");
		}
	}, []);

	// Get expenses from local storage
	const { data: expenses = [], refetch: refetchExpenses } = useQuery({
		queryKey: ["expenses", merchantId],
		queryFn: () => (merchantId ? storageUtils.getExpenses(merchantId) : []),
		enabled: !!merchantId,
	});

	const addExpenseMutation = useMutation({
		mutationFn: async (expenseData: Omit<ExpenseData, "merchantId">) => {
			if (!merchantId) {
				throw new Error("Merchant ID not available");
			}

			// First, store locally for immediate feedback
			const localExpense = storageUtils.addExpense(merchantId, {
				...expenseData,
				merchantId, // Include merchantId in local storage
			});

			try {
				// Then, call the actual API
				const apiResponse = await inventoryService.recordExpense(expenseData);

				// Mark as synced if successful
				storageUtils.markExpenseAsSynced(merchantId, localExpense.id, apiResponse);

				return { apiResponse, localExpense, success: true };
			} catch (error) {
				// API call failed, but we keep the local record
				console.error("Failed to sync expense with API:", error);
				return {
					apiResponse: null,
					localExpense,
					success: false,
					error,
				};
			}
		},
		onSuccess: (data) => {
			if (data.success) {
				message.success("Expense recorded successfully!");
			} else {
				message.warning("Expense saved locally but failed to sync with server. Will retry later.");
			}

			// Refresh the local expenses list
			refetchExpenses();
			// Clear the form
			setFormData({ amount: "", note: "" });

			// Invalidate any related queries
			queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
			queryClient.invalidateQueries({ queryKey: ["weekly-analytics"] });
		},
		onError: (error: Error) => {
			message.error(`Failed to record expense: ${error.message}`);
		},
	});

	// Sync pending expenses
	const syncPendingExpensesMutation = useMutation({
		mutationFn: async () => {
			if (!merchantId) {
				throw new Error("Merchant ID not available");
			}

			const pendingExpenses = storageUtils.getPendingExpenses(merchantId);
			const results = [];

			for (const expense of pendingExpenses) {
				try {
					const apiResponse = await inventoryService.recordExpense({
						amount: expense.amount,
						note: expense.note,
					});

					storageUtils.markExpenseAsSynced(merchantId, expense.id, apiResponse);
					results.push({ success: true, expenseId: expense.id });
				} catch (error) {
					results.push({ success: false, expenseId: expense.id, error });
				}
			}

			return results;
		},
		onSuccess: (results) => {
			const successful = results.filter((r) => r.success).length;
			const failed = results.filter((r) => !r.success).length;

			if (successful > 0) {
				message.success(`Synced ${successful} expenses successfully`);
			}
			if (failed > 0) {
				message.warning(`${failed} expenses failed to sync`);
			}

			refetchExpenses();
		},
		onError: (error: Error) => {
			message.error(`Failed to sync expenses: ${error.message}`);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!merchantId) {
			message.error("Merchant information not available. Please login again.");
			return;
		}

		if (!formData.amount || !formData.note.trim()) {
			message.warning("Please fill in all fields");
			return;
		}

		const amount = parseFloat(formData.amount);
		if (isNaN(amount) || amount <= 0) {
			message.warning("Please enter a valid amount");
			return;
		}

		if (formData.note.trim().length < 3) {
			message.warning("Please provide a meaningful description (at least 3 characters)");
			return;
		}

		const expenseData: Omit<ExpenseData, "merchantId"> = {
			amount: amount,
			note: formData.note.trim(),
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
	const pendingSyncCount = expenses.filter((expense) => !expense.synced).length;

	const formatCurrency = (amount: number) => {
		return `KSh ${amount?.toFixed(2) || "0.00"}`;
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			year: "numeric",
			month: "short",
			day: "numeric",
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	if (!merchantId) {
		return (
			<div className="flex items-center justify-center min-h-96">
				<div className="text-center">
					<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
					<p className="text-muted-foreground">Loading merchant information...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Expense Tracking</h1>
					<p className="text-muted-foreground">Record and track business expenses</p>
				</div>
				<div className="text-right">
					<p className="text-sm text-muted-foreground">Total Expenses</p>
					<p className="text-2xl font-bold text-red-600">{formatCurrency(totalExpenses)}</p>
					{pendingSyncCount > 0 && <p className="text-xs text-amber-600 mt-1">{pendingSyncCount} pending sync</p>}
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
								<Label htmlFor="amount">Amount (KSh)</Label>
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
										disabled={addExpenseMutation.isPending}
									/>
								</div>
							</div>

							<div className="space-y-2">
								<Label htmlFor="note">Description</Label>
								<Textarea
									id="note"
									placeholder="Enter expense description (e.g., Office supplies, Transport, Utilities...)"
									value={formData.note}
									onChange={(e) => handleInputChange("note", e.target.value)}
									disabled={addExpenseMutation.isPending}
									rows={3}
								/>
							</div>

							<div className="flex gap-3">
								<Button type="submit" className="flex-1" disabled={addExpenseMutation.isPending || !merchantId}>
									{addExpenseMutation.isPending ? (
										<>
											<Icon icon="eos-icons:loading" className="mr-2" />
											Recording...
										</>
									) : (
										<>
											<Icon icon="lucide:plus" className="mr-2" />
											Record Expense
										</>
									)}
								</Button>

								{pendingSyncCount > 0 && (
									<Button
										type="button"
										variant="outline"
										onClick={() => syncPendingExpensesMutation.mutate()}
										disabled={syncPendingExpensesMutation.isPending || !merchantId}
									>
										<Icon
											icon={syncPendingExpensesMutation.isPending ? "eos-icons:loading" : "lucide:refresh-cw"}
											className="mr-2 h-4 w-4"
										/>
										Sync
									</Button>
								)}
							</div>
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

						<div className="flex items-start gap-3">
							<Icon icon="lucide:check-circle" className="h-5 w-5 text-green-500 mt-0.5" />
							<div>
								<p className="font-medium">Categorize</p>
								<p className="text-sm text-muted-foreground">Group similar expenses for better reporting</p>
							</div>
						</div>

						<div className="pt-4 border-t">
							<p className="text-sm font-medium text-muted-foreground">Merchant ID</p>
							<p className="font-mono text-sm">{merchantId}</p>
						</div>

						<div className="pt-4 border-t">
							<p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
							<p className="font-bold text-lg text-red-600">{formatCurrency(totalExpenses)}</p>
						</div>

						{pendingSyncCount > 0 && (
							<div className="pt-4 border-t">
								<p className="text-sm font-medium text-amber-600">Pending Sync</p>
								<p className="font-bold text-lg text-amber-600">{pendingSyncCount} expenses</p>
								<p className="text-xs text-muted-foreground">
									Some expenses are saved locally and waiting to sync with server
								</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Expense History */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Expense History</CardTitle>
						<CardDescription>
							Recently recorded expenses
							{pendingSyncCount > 0 && <span className="ml-2 text-amber-600">({pendingSyncCount} pending sync)</span>}
						</CardDescription>
					</div>
					<div className="flex gap-2">
						{pendingSyncCount > 0 && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => syncPendingExpensesMutation.mutate()}
								disabled={syncPendingExpensesMutation.isPending || !merchantId}
							>
								<Icon
									icon={syncPendingExpensesMutation.isPending ? "eos-icons:loading" : "lucide:refresh-cw"}
									className="mr-2 h-4 w-4"
								/>
								Sync All
							</Button>
						)}
						{expenses.length > 0 && (
							<Button
								variant="outline"
								size="sm"
								onClick={() => {
									if (confirm("Clear all local expense history? This cannot be undone.")) {
										storageUtils.clearExpenses(merchantId);
										refetchExpenses();
										message.success("Expense history cleared");
									}
								}}
								disabled={!merchantId}
							>
								<Icon icon="lucide:trash" className="mr-2 h-4 w-4" />
								Clear History
							</Button>
						)}
					</div>
				</CardHeader>
				<CardContent>
					{expenses.length > 0 ? (
						<div className="space-y-3">
							{expenses.map((expense) => (
								<div
									key={expense.id}
									className={`flex justify-between items-center p-4 border rounded-lg hover:bg-gray-50 ${
										!expense.synced ? "border-amber-200 bg-amber-50" : ""
									}`}
								>
									<div className="flex-1">
										<div className="flex items-center gap-2">
											<p className="font-semibold">{expense.note}</p>
											{!expense.synced && (
												<span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
													<Icon icon="lucide:clock" className="mr-1 h-3 w-3" />
													Pending
												</span>
											)}
										</div>
										<p className="text-sm text-muted-foreground">{formatDate(expense.createdAt)}</p>
									</div>
									<div className="text-right">
										<p className="font-bold text-red-600 text-lg">{formatCurrency(expense.amount)}</p>
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
