//original author : Marcellas
// src/pages/analytics/daily-sales/index.tsx - UPDATED VERSION
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { useNavigate } from "react-router";
import inventoryService from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { UserRoleIndicator } from "@/components/user-role-indicator";
import { useMerchantId } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";

export default function DailySalesPage() {
	const [selectedDate, _setSelectedDate] = useState(new Date().toISOString().split("T")[0]);
	const merchantId = useMerchantId();
	const navigate = useNavigate(); // ADD NAVIGATION HOOK

	const {
		data: dailySummary,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["daily-sales", merchantId, selectedDate],
		queryFn: () => inventoryService.getDailySalesSummary(selectedDate),
		enabled: !!merchantId,
	});

	// Function to navigate to sold items page
	const handleViewSoldItems = () => {
		navigate(`/analytics/sold-items?date=${selectedDate}`);
	};

	// SIMPLIFIED: Directly use the API response
	const getTransformedData = () => {
		if (!dailySummary) return null;

		// API returns object with additionalProperties, so we extract what we need
		return {
			grossSales: dailySummary.grossSales || dailySummary.totalSales || 0,
			deductions: dailySummary.deductions || dailySummary.totalExpenses || 0,
			netSales: dailySummary.netSales || dailySummary.netProfit || 0,
		};
	};

	const transformedData = getTransformedData();

	const formatCurrency = (amount: number) => {
		return `KShs ${amount?.toFixed(2) || "0.00"}`;
	};

	if (!merchantId) {
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
						<h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
						<p className="text-muted-foreground mb-4">Please login to view daily sales data</p>
					</CardContent>
				</Card>
			</div>
		);
	}

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
						<Button onClick={() => refetch()}>Retry</Button>
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
					<p className="text-muted-foreground">View daily sales performance for your merchant account</p>
				</div>
				<div className="flex items-center gap-4">
					<UserRoleIndicator />
					{/* <Input type="date" value={selectedDate} onChange={(e) => setSelectedDate(e.target.value)} className="w-40" /> */}
				</div>
			</div>

			{/* NEW: Action Buttons Card */}
			<Card>
				<CardHeader>
					<CardTitle>Sales Actions</CardTitle>
					<CardDescription>Additional actions you can perform with daily sales data</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-4">
						<Button onClick={handleViewSoldItems} className="flex items-center gap-2" variant="outline">
							<Icon icon="lucide:list" className="h-4 w-4" />
							View Sold Items
						</Button>
						{/*  <Button 
              onClick={() => refetch()}
              className="flex items-center gap-2"
              variant="secondary"
            >
              <Icon icon="lucide:refresh-cw" className="h-4 w-4" />
              Refresh Data
            </Button> */}
						{/*{transformedData && (
              <Button 
                onClick={() => window.print()}
                className="flex items-center gap-2"
                variant="outline"
              >
                <Icon icon="lucide:printer" className="h-4 w-4" />
                Print Summary
              </Button> 
            )}*/}
					</div>
					<p className="text-sm text-muted-foreground mt-3">
						Click "View Sold Items" to see detailed list of items sold on {new Date(selectedDate).toLocaleDateString()}
					</p>
				</CardContent>
			</Card>

			{/* Overview Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Gross Sales</p>
								<p className="text-2xl font-bold text-green-600">
									{isLoading ? "..." : formatCurrency(transformedData?.grossSales || 0)}
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
								<p className="text-sm font-medium text-muted-foreground">Deductions</p>
								<p className="text-2xl font-bold text-red-600">
									{isLoading ? "..." : formatCurrency(transformedData?.deductions || 0)}
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
								<p className="text-sm font-medium text-muted-foreground">Net Sales</p>
								<p className="text-2xl font-bold text-blue-600">
									{isLoading ? "..." : formatCurrency(transformedData?.netSales || 0)}
								</p>
							</div>
							<Icon icon="lucide:trending-up" className="h-8 w-8 text-blue-500 opacity-60" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Detailed Summary */}
			<Card>
				<CardHeader>
					<CardTitle>Daily Performance Details</CardTitle>
					<CardDescription>
						Comprehensive breakdown of daily sales performance for {merchantId}
						<span className="ml-2 text-blue-600 font-medium">
							• {new Date(selectedDate).toLocaleDateString("en-US", { weekday: "long" })}
						</span>
					</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="text-center py-12">
							<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
							<p className="text-muted-foreground">Loading daily sales data...</p>
						</div>
					) : transformedData ? (
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							{/* Financial Summary */}
							<div className="space-y-4">
								<h3 className="font-semibold text-lg mb-4">Financial Summary</h3>
								<div className="flex justify-between items-center p-4 bg-green-50 dark:bg-green-900/20 rounded-lg">
									<span className="font-medium">Gross Sales</span>
									<span className="font-bold text-green-600">{formatCurrency(transformedData.grossSales)}</span>
								</div>
								<div className="flex justify-between items-center p-4 bg-red-50 dark:bg-red-900/20 rounded-lg">
									<span className="font-medium">Deductions</span>
									<span className="font-bold text-red-600">{formatCurrency(transformedData.deductions)}</span>
								</div>
								<div className="flex justify-between items-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg">
									<span className="font-medium">Net Sales</span>
									<span className="font-bold text-blue-600">{formatCurrency(transformedData.netSales)}</span>
								</div>

								{/* Sold Items Quick Action */}
								<div className="mt-6 p-4 bg-amber-50 dark:bg-amber-900/20 rounded-lg border border-amber-200 dark:border-amber-800">
									<div className="flex items-center justify-between">
										<div>
											<h4 className="font-semibold text-amber-800 dark:text-amber-300">Sold Items Details</h4>
											<p className="text-sm text-amber-600 dark:text-amber-400 mt-1">
												View detailed list of all items sold
											</p>
										</div>
										<Button onClick={handleViewSoldItems} size="sm" className="bg-amber-600 hover:bg-amber-700">
											View Items
										</Button>
									</div>
								</div>
							</div>

							{/* Summary Info */}
							<div className="space-y-4">
								<h3 className="font-semibold text-lg mb-4">Summary</h3>
								<div className="text-center p-6 bg-slate-50 dark:bg-slate-800 rounded-lg">
									<p className="text-sm text-muted-foreground">Selected Date</p>
									<p className="text-xl font-bold">{new Date(selectedDate).toLocaleDateString()}</p>
								</div>

								{transformedData.grossSales > 0 && (
									<div className="text-center p-6 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
										<p className="text-sm text-muted-foreground">Profit Margin</p>
										<p className="text-xl font-bold text-purple-600">
											{((transformedData.netSales / transformedData.grossSales) * 100).toFixed(1)}%
										</p>
									</div>
								)}
							</div>
						</div>
					) : (
						<div className="text-center py-12 text-muted-foreground">
							<Icon icon="lucide:bar-chart" className="h-16 w-16 mx-auto mb-4 opacity-50" />
							<p className="text-lg font-medium">No data available for selected date</p>
							<p className="text-sm">Try selecting a different date or check if sales were processed for this date</p>
							<Button onClick={handleViewSoldItems} className="mt-4 flex items-center gap-2" variant="outline">
								<Icon icon="lucide:package-search" className="h-4 w-4" />
								Check for sold items anyway
							</Button>
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
