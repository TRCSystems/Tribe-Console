// src/pages/analytics/daily-sales/index.tsx
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import inventoryService, { type DailySummary } from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";

export default function DailySalesPage() {
	const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split("T")[0]);

	const {
		data: dailySummary,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["daily-sales", selectedDate],
		queryFn: () => inventoryService.getDailySalesSummary("HTL001", selectedDate),
		enabled: !!selectedDate,
	});

	const summaryData = dailySummary as DailySummary;

	// Format currency to KShs
	const formatCurrency = (amount: number) => {
		return `KShs ${amount.toFixed(2)}`;
	};

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">Daily Sales Summary</h1>
						<p className="text-muted-foreground">View daily sales performance and analytics</p>
					</div>
				</div>
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 text-destructive mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Failed to load daily sales data</h3>
						<p className="text-muted-foreground mb-4">{(error as Error).message}</p>
						<Button onClick={() => window.location.reload()}>Retry</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Daily Sales Summary</h1>
					<p className="text-muted-foreground">View daily sales performance and analytics</p>
				</div>
				<div className="flex items-center gap-4">
					<Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40" />
				</div>
			</div>

			{/* Overview Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Sales</p>
								<p className="text-2xl font-bold text-green-600">
									{isLoading ? "..." : formatCurrency(summaryData?.totalSales || 0)}
								</p>
							</div>
							<Icon icon="lucide:banknote" className="h-8 w-8 text-green-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Expenses</p>
								<p className="text-2xl font-bold text-red-600">
									{isLoading ? "..." : formatCurrency(summaryData?.totalExpenses || 0)}
								</p>
							</div>
							<Icon icon="lucide:trending-down" className="h-8 w-8 text-red-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Net Profit</p>
								<p className="text-2xl font-bold text-blue-600">
									{isLoading ? "..." : formatCurrency(summaryData?.netProfit || 0)}
								</p>
							</div>
							<Icon icon="lucide:trending-up" className="h-8 w-8 text-blue-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Items Sold</p>
								<p className="text-2xl font-bold text-orange-600">
									{isLoading ? "..." : (summaryData?.itemsSold || 0).toLocaleString()}
								</p>
							</div>
							<Icon icon="lucide:package" className="h-8 w-8 text-orange-500 opacity-60" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Detailed Summary */}
			<Card>
				<CardHeader>
					<CardTitle>Daily Performance Details</CardTitle>
					<CardDescription>Comprehensive breakdown of daily sales performance</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="text-center py-12">
							<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
							<p className="text-muted-foreground">Loading daily sales data...</p>
						</div>
					) : summaryData ? (
						<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
							<div className="space-y-4">
								<div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
									<span className="font-medium">Gross Revenue</span>
									<span className="font-bold text-green-600">{formatCurrency(summaryData.totalSales || 0)}</span>
								</div>
								<div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
									<span className="font-medium">Total Expenses</span>
									<span className="font-bold text-red-600">{formatCurrency(summaryData.totalExpenses || 0)}</span>
								</div>
								<div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
									<span className="font-medium">Net Profit</span>
									<span className="font-bold text-blue-600">{formatCurrency(summaryData.netProfit || 0)}</span>
								</div>
							</div>

							<div className="space-y-4">
								<div className="flex justify-between items-center p-4 bg-orange-50 dark:bg-orange-900/20 rounded-lg">
									<span className="font-medium">Items Sold</span>
									<span className="font-bold text-orange-600">{(summaryData.itemsSold || 0).toLocaleString()}</span>
								</div>
								<div className="flex justify-between items-center p-4 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
									<span className="font-medium">Average Order Value</span>
									<span className="font-bold text-purple-600">
										{formatCurrency((summaryData.totalSales || 0) / (summaryData.itemsSold || 1))}
									</span>
								</div>
								<div className="flex justify-between items-center p-4 bg-cyan-50 dark:bg-cyan-900/20 rounded-lg">
									<span className="font-medium">Profit Margin</span>
									<span className="font-bold text-cyan-600">
										{(((summaryData.netProfit || 0) / (summaryData.totalSales || 1)) * 100).toFixed(1)}%
									</span>
								</div>
							</div>

							<div className="space-y-4">
								<div className="text-center p-6 bg-slate-50 dark:bg-slate-800 rounded-lg">
									<p className="text-sm text-muted-foreground">Date</p>
									<p className="text-xl font-bold">{new Date(selectedDate).toLocaleDateString()}</p>
								</div>
								<div className="text-center p-6 bg-slate-50 dark:bg-slate-800 rounded-lg">
									<p className="text-sm text-muted-foreground">Merchant</p>
									<p className="text-xl font-bold">HTL001</p>
								</div>
							</div>
						</div>
					) : (
						<div className="text-center py-12 text-muted-foreground">
							<Icon icon="lucide:bar-chart" className="h-16 w-16 mx-auto mb-4 opacity-50" />
							<p className="text-lg font-medium">No data available for selected date</p>
							<p className="text-sm">Try selecting a different date</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}