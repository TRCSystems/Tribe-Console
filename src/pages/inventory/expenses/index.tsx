// src/pages/inventory/expenses/index.tsx
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import inventoryService, { type ExpenseData } from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

export default function ExpenseTrackingPage() {
	const queryClient = useQueryClient();
	const [loading, setLoading] = useState(false);
	const [formData, setFormData] = useState({
		amount: "",
		note: "",
	});

	const addExpenseMutation = useMutation({
		mutationFn: inventoryService.addExpense,
		onSuccess: () => {
			message.success("Expense added successfully!");
			queryClient.invalidateQueries({ queryKey: ["expenses"] });
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

		const expenseData: ExpenseData = {
			merchantId: "HTL001",
			amount: parseFloat(formData.amount),
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

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Expense Tracking</h1>
					<p className="text-muted-foreground">Record and track business expenses</p>
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
								<p className="font-medium">Categorize Properly</p>
								<p className="text-sm text-muted-foreground">Use clear descriptions for better reporting</p>
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
					</CardContent>
				</Card>
			</div>

			
			<Card>
				<CardHeader>
					<CardTitle>Recent Expenses</CardTitle>
					<CardDescription>Your most recent expense records</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="text-center py-12 text-muted-foreground">
						<Icon icon="lucide:file-text" className="h-16 w-16 mx-auto mb-4 opacity-50" />
						<p className="text-lg font-medium">No expenses recorded yet</p>
						<p className="text-sm">Start by adding your first expense above</p>
					</div>
				</CardContent>
			</Card>
		</div>
	);
}