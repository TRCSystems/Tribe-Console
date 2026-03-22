//original author : Marcellas
// src/pages/inventory/expenses/index.tsx - UPDATED VERSION USING API
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { DatePicker, message } from "antd";
import dayjs from "dayjs";
import { useEffect, useState } from "react";
import inventoryService, { type ExpenseData } from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Textarea } from "@/ui/textarea";

// Security utility to hide sensitive data from dev tools
const secureData = {
	// Store merchant ID in a closure to prevent direct access
	_merchantId: "",
	getMerchantId: function () {
		if (typeof window !== "undefined" && window.location.hostname === "localhost") {
			return this._merchantId;
		}
		// In production, only return first and last few characters
		if (this._merchantId && this._merchantId.length > 8) {
			return `${this._merchantId.substring(0, 4)}...${this._merchantId.substring(this._merchantId.length - 4)}`;
		}
		return this._merchantId;
	},
	setMerchantId: function (id: string) {
		this._merchantId = id;
		// Make it non-enumerable in dev tools
		if (typeof Object.defineProperty === "function") {
			Object.defineProperty(this, "_merchantId", {
				value: id,
				writable: true,
				enumerable: false,
				configurable: true,
			});
		}
	},
	// Utility to mask sensitive data in console
	maskSensitiveData: (data: any): any => {
		if (!data || typeof data !== "object") return data;

		const masked = { ...data };
		const sensitiveFields = ["merchantId", "id", "password", "token", "secret", "key"];

		sensitiveFields.forEach((field) => {
			if (masked[field] && typeof masked[field] === "string" && masked[field].length > 4) {
				masked[field] = `${masked[field].substring(0, 2)}***${masked[field].substring(masked[field].length - 2)}`;
			}
		});

		return masked;
	},
};

export default function ExpenseTrackingPage() {
	const queryClient = useQueryClient();
	const [formData, setFormData] = useState({
		amount: "",
		narration: "", // Changed from note to narration
	});
	const [selectedDate, setSelectedDate] = useState<string>(dayjs().format("YYYY-MM-DD"));
	const [merchantId, setMerchantId] = useState<string>("");

	// Get merchant ID on component mount
	useEffect(() => {
		try {
			const currentMerchantId = inventoryService.getCurrentMerchantId();
			secureData.setMerchantId(currentMerchantId);
			setMerchantId(currentMerchantId);

			// Log minimal info in production
			if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
				console.log("%c🔒 Expense Tracking Initialized", "color: green; font-weight: bold;");
				console.log("%cSensitive data is protected from display", "color: gray;");
			}
		} catch (error) {
			console.error("Failed to get merchant ID:", error);
			message.error("Failed to load merchant information. Please login again.");
		}
	}, []);

	// Get expenses from API
	const {
		data: expenses = [],
		isLoading: isLoadingExpenses,
		refetch: refetchExpenses,
	} = useQuery({
		queryKey: ["expenses", merchantId, selectedDate],
		queryFn: () => inventoryService.getExpenses(selectedDate),
		enabled: !!merchantId,
	});

	const addExpenseMutation = useMutation({
		mutationFn: async (expenseData: Omit<ExpenseData, "merchantId">) => {
			if (!merchantId) {
				throw new Error("Merchant ID not available");
			}

			// Call the API
			const apiResponse = await inventoryService.recordExpense(expenseData);
			return apiResponse;
		},
		onSuccess: (data) => {
			if (data.status === "OK" || data.status === "SUCCESS") {
				message.success(data.message || "Expense recorded successfully!");
			} else if (data.message) {
				message.success(data.message);
			} else {
				message.success("Expense recorded successfully!");
			}

			// Refresh the expenses list
			refetchExpenses();
			// Clear the form
			setFormData({ amount: "", narration: "" });

			// Invalidate any related queries
			queryClient.invalidateQueries({ queryKey: ["expenses"] });
			queryClient.invalidateQueries({ queryKey: ["daily-summary"] });
			queryClient.invalidateQueries({ queryKey: ["weekly-analytics"] });

			// Log success without sensitive data
			if (typeof window !== "undefined" && window.location.hostname !== "localhost") {
				console.log("%c✅ Expense recorded successfully", "color: green;");
			}
		},
		onError: (error: Error) => {
			message.error(`Failed to record expense: ${error.message}`);
			// Log error without sensitive details
			console.error("Expense recording error:", error.message);
		},
	});

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();

		if (!merchantId) {
			message.error("Merchant information not available. Please login again.");
			return;
		}

		if (!formData.amount || !formData.narration.trim()) {
			message.warning("Please fill in all fields");
			return;
		}

		// Validate amount (accept decimal numbers)
		const amountValue = formData.amount.trim();
		if (Number.isNaN(parseFloat(amountValue)) || parseFloat(amountValue) <= 0) {
			message.warning("Please enter a valid amount");
			return;
		}

		if (formData.narration.trim().length < 3) {
			message.warning("Please provide a meaningful description (at least 3 characters)");
			return;
		}

		const expenseData: Omit<ExpenseData, "merchantId"> = {
			amount: amountValue, // Keep as string
			narration: formData.narration.trim(),
		};

		addExpenseMutation.mutate(expenseData);
	};

	const handleInputChange = (field: string, value: string) => {
		setFormData((prev) => ({
			...prev,
			[field]: value,
		}));
	};

	const handleDateChange = (date: dayjs.Dayjs | null, _dateString: string | string[]) => {
		if (date) {
			const formattedDate = date.format("YYYY-MM-DD");
			setSelectedDate(formattedDate);
		}
	};

	const totalExpenses = expenses.reduce((sum, expense) => sum + parseFloat(expense.amount || "0"), 0);

	const formatCurrency = (amount: number) => {
		return `KSh ${amount?.toFixed(2) || "0.00"}`;
	};

	const _formatDate = (dateString: string) => {
		return dayjs(dateString).format("MMM D, YYYY h:mm A");
	};

	const formatTableDate = (dateString: string) => {
		return dayjs(dateString).format("MMM D, h:mm A");
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
					<div className="mt-2">
						<DatePicker
							value={dayjs(selectedDate)}
							onChange={handleDateChange}
							format="YYYY-MM-DD"
							size="small"
							className="w-40"
							allowClear={false}
						/>
					</div>
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
										type="text"
										inputMode="decimal"
										placeholder="0.00"
										className="pl-10"
										value={formData.amount}
										onChange={(e) => handleInputChange("amount", e.target.value)}
										disabled={addExpenseMutation.isPending}
									/>
								</div>
								<p className="text-xs text-muted-foreground">Enter amount (e.g., 15000 or 15000.50)</p>
							</div>

							<div className="space-y-2">
								<Label htmlFor="narration">Narration</Label>
								<Textarea
									id="narration"
									placeholder="Enter expense narration (e.g., Rent payment for shop - January 2026)"
									value={formData.narration}
									onChange={(e) => handleInputChange("narration", e.target.value)}
									disabled={addExpenseMutation.isPending}
									rows={3}
								/>
								<p className="text-xs text-muted-foreground">Describe what this expense was for</p>
							</div>

							<Button type="submit" className="w-full" disabled={addExpenseMutation.isPending || !merchantId}>
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
							<p className="text-sm font-medium text-muted-foreground">Date Selected</p>
							<p className="font-medium">{dayjs(selectedDate).format("MMMM D, YYYY")}</p>
						</div>

						<div className="pt-4 border-t">
							<p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
							<p className="font-bold text-lg text-red-600">{formatCurrency(totalExpenses)}</p>
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Expense History - UPDATED with table with visible lines */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Expense History</CardTitle>
						<CardDescription>
							Expenses for {dayjs(selectedDate).format("MMMM D, YYYY")}
							{expenses.length > 0 && <span className="ml-2">({expenses.length} records)</span>}
						</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<span className="text-sm text-muted-foreground">View expenses for:</span>
						<DatePicker
							value={dayjs(selectedDate)}
							onChange={handleDateChange}
							format="YYYY-MM-DD"
							size="small"
							className="w-32"
							allowClear={false}
						/>
					</div>
				</CardHeader>
				<CardContent>
					{isLoadingExpenses ? (
						<div className="text-center py-12">
							<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
							<p className="text-muted-foreground">Loading expenses...</p>
						</div>
					) : expenses.length > 0 ? (
						<div className="overflow-x-auto border border-gray-200 dark:border-gray-700 rounded-lg">
							<table className="w-full border-collapse">
								<thead>
									<tr className="bg-gray-50 dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
										<th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
											Date & Time
										</th>
										<th className="text-left py-3 px-4 font-semibold text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
											Narration
										</th>
										<th className="text-right py-3 px-4 font-semibold text-gray-700 dark:text-gray-300">Amount</th>
									</tr>
								</thead>
								<tbody>
									{expenses.map((expense, index) => (
										<tr
											key={expense.id || `expense-${index}`}
											className={`border-b border-gray-200 dark:border-gray-700 ${
												index % 2 === 0 ? "bg-white dark:bg-gray-900" : "bg-gray-50 dark:bg-gray-800"
											} hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
										>
											<td className="py-3 px-4 border-r border-gray-200 dark:border-gray-700">
												<div className="flex flex-col">
													<span className="font-medium text-gray-900 dark:text-gray-100">
														{formatTableDate(expense.createdAt || selectedDate)}
													</span>
												</div>
											</td>
											<td className="py-3 px-4 border-r border-gray-200 dark:border-gray-700">
												<div className="max-w-md">
													<p className="font-semibold text-gray-900 dark:text-gray-100">{expense.narration}</p>
												</div>
											</td>
											<td className="py-3 px-4 text-right">
												<div className="flex flex-col items-end">
													<span className="font-bold text-lg text-red-600 dark:text-red-500">
														{formatCurrency(parseFloat(expense.amount || "0"))}
													</span>
												</div>
											</td>
										</tr>
									))}
								</tbody>
								<tfoot>
									<tr className="bg-gray-100 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-700 font-bold">
										<td className="py-3 px-4 text-gray-700 dark:text-gray-300 border-r border-gray-200 dark:border-gray-700">
											Total
										</td>
										<td className="py-3 px-4 border-r border-gray-200 dark:border-gray-700"></td>
										<td className="py-3 px-4 text-right text-red-600 dark:text-red-500">
											{formatCurrency(totalExpenses)}
										</td>
									</tr>
								</tfoot>
							</table>
						</div>
					) : (
						<div className="text-center py-12 text-muted-foreground">
							<Icon icon="lucide:file-text" className="h-16 w-16 mx-auto mb-4 opacity-50" />
							<p className="text-lg font-medium">No expenses recorded for this date</p>
							<p className="text-sm">Add your first expense using the form above</p>
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
