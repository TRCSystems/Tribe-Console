// src/pages/analytics/weekly/index.tsx
import { useQuery } from "@tanstack/react-query";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import inventoryService, { type WeeklyAnalytics } from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

export default function WeeklyAnalyticsPage() {
	const {
		data: weeklyAnalytics,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["weekly-analytics"],
		queryFn: () => inventoryService.getWeeklyAnalytics("HTL001"),
	});

	const analyticsData = weeklyAnalytics as WeeklyAnalytics;

	// Format currency to KShs
	const formatCurrency = (amount: number) => {
		return `KShs ${amount.toFixed(2)}`;
	};

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">Weekly Analytics</h1>
						<p className="text-muted-foreground">Comprehensive weekly performance insights</p>
					</div>
				</div>
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 text-destructive mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Failed to load weekly analytics</h3>
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
					<h1 className="text-2xl font-bold">Weekly Analytics</h1>
					<p className="text-muted-foreground">Comprehensive weekly performance insights</p>
				</div>
				<Select defaultValue="HTL001">
					<SelectTrigger className="w-32">
						<SelectValue placeholder="Merchant" />
					</SelectTrigger>
					<SelectContent>
						<SelectItem value="HTL001">HTL001</SelectItem>
						<SelectItem value="HTL002">HTL002</SelectItem>
					</SelectContent>
				</Select>
			</div>

			{/* Overview Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
								<p className="text-2xl font-bold text-green-600">
									{isLoading ? "..." : formatCurrency(analyticsData?.totalRevenue || 0)}
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
									{isLoading ? "..." : formatCurrency(analyticsData?.totalExpenses || 0)}
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
									{isLoading ? "..." : formatCurrency(analyticsData?.profit || 0)}
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
								<p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
								<p className="text-2xl font-bold text-purple-600">
									{isLoading
										? "..."
										: `${(((analyticsData?.profit || 0) / (analyticsData?.totalRevenue || 1)) * 100).toFixed(1)}%`}
								</p>
							</div>
							<Icon icon="lucide:percent" className="h-8 w-8 text-purple-500 opacity-60" />
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Top Selling Items */}
				<Card>
					<CardHeader>
						<CardTitle>Top Selling Items</CardTitle>
						<CardDescription>Best performing products this week</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className="text-center py-12">
								<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
								<p className="text-muted-foreground">Loading top items...</p>
							</div>
						) : analyticsData?.topSellingItems && analyticsData.topSellingItems.length > 0 ? (
							<div className="space-y-4">
								{analyticsData.topSellingItems.map((item, index) => (
									<div key={item.name} className="flex items-center justify-between p-3 border rounded-lg">
										<div className="flex items-center gap-3">
											<div className="w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
												<span className="text-sm font-bold text-blue-600">{index + 1}</span>
											</div>
											<div>
												<p className="font-medium">{item.name}</p>
												<p className="text-sm text-muted-foreground">{item.quantity} sold</p>
											</div>
										</div>
										<div className="text-right">
											<p className="font-bold text-green-600">{formatCurrency(item.revenue)}</p>
										</div>
									</div>
								))}
							</div>
						) : (
							<div className="text-center py-12 text-muted-foreground">
								<Icon icon="lucide:bar-chart" className="h-16 w-16 mx-auto mb-4 opacity-50" />
								<p className="text-lg font-medium">No sales data available</p>
								<p className="text-sm">Sales data will appear here once available</p>
							</div>
						)}
					</CardContent>
				</Card>

				{/* Revenue Distribution */}
				<Card>
					<CardHeader>
						<CardTitle>Revenue Distribution</CardTitle>
						<CardDescription>Breakdown of revenue and expenses</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className="text-center py-12">
								<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
								<p className="text-muted-foreground">Loading revenue data...</p>
							</div>
						) : analyticsData ? (
							<ResponsiveContainer width="100%" height={300}>
								<PieChart>
									<Pie
										data={[
											{ name: "Revenue", value: analyticsData.totalRevenue },
											{ name: "Expenses", value: analyticsData.totalExpenses },
											{ name: "Profit", value: analyticsData.profit },
										]}
										cx="50%"
										cy="50%"
										labelLine={false}
										label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
										outerRadius={80}
										fill="#8884d8"
										dataKey="value"
									>
										<Cell fill="#10b981" />
										<Cell fill="#ef4444" />
										<Cell fill="#3b82f6" />
									</Pie>
									<Tooltip formatter={(value) => [formatCurrency(Number(value)), "Amount"]} />
									<Legend />
								</PieChart>
							</ResponsiveContainer>
						) : (
							<div className="text-center py-12 text-muted-foreground">
								<Icon icon="lucide:pie-chart" className="h-16 w-16 mx-auto mb-4 opacity-50" />
								<p className="text-lg font-medium">No revenue data available</p>
								<p className="text-sm">Revenue data will appear here once available</p>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Performance Trends */}
			<Card>
				<CardHeader>
					<CardTitle>Weekly Performance Trends</CardTitle>
					<CardDescription>Revenue and profit trends over time</CardDescription>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="text-center py-12">
							<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
							<p className="text-muted-foreground">Loading performance data...</p>
						</div>
					) : analyticsData ? (
						<div className="text-center py-12">
							<ResponsiveContainer width="100%" height={300}>
								<BarChart
									data={[
										{ name: "Revenue", value: analyticsData.totalRevenue },
										{ name: "Expenses", value: analyticsData.totalExpenses },
										{ name: "Profit", value: analyticsData.profit },
									]}
								>
									<CartesianGrid strokeDasharray="3 3" className="opacity-30" />
									<XAxis dataKey="name" />
									<YAxis />
									<Tooltip formatter={(value) => [formatCurrency(Number(value)), "Amount"]} />
									<Bar dataKey="value" fill="#3b82f6" radius={[4, 4, 0, 0]} />
								</BarChart>
							</ResponsiveContainer>
						</div>
					) : (
						<div className="text-center py-12 text-muted-foreground">
							<Icon icon="lucide:trending-up" className="h-16 w-16 mx-auto mb-4 opacity-50" />
							<p className="text-lg font-medium">No trend data available</p>
							<p className="text-sm">Performance trends will appear here once available</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}