// src/pages/analytics/weekly/index.tsx - FINAL FIXED VERSION
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Legend,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import inventoryService from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { useMerchantId } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { UserRoleIndicator } from "@/components/user-role-indicator";

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

// Export service functions
const exportReport = async (
	currentData: any,
	merchantId: string,
	reportType: string,
	dateRange: string,
	format: string = "pdf",
) => {
	try {
		console.log(`📊 Exporting ${reportType} report for merchant ${merchantId} in ${format} format`);
		console.log("📊 Current data for export:", currentData);

		// Create export data using the current page data
		const exportData = {
			merchantId,
			reportType,
			dateRange,
			generatedAt: new Date().toISOString(),
			data: currentData,
		};

		// Create and download file based on format
		if (format === "csv") {
			downloadCSV(exportData, `business-report-${merchantId}-${new Date().getTime()}.csv`);
		} else {
			// For PDF, create a detailed HTML file that can be printed as PDF
			downloadPDF(exportData, `business-report-${merchantId}-${new Date().getTime()}.html`);
		}

		return true;
	} catch (error) {
		console.error("❌ Export failed:", error);
		throw error;
	}
};

// Download as CSV
const downloadCSV = (data: any, filename: string) => {
	const csvData = convertToCSV(data);
	const blob = new Blob([csvData], { type: "text/csv;charset=utf-8;" });
	downloadBlob(blob, filename);
};

// Download as PDF (Enhanced HTML that can be printed as PDF)
const downloadPDF = (data: any, filename: string) => {
	const htmlContent = generateReportHTML(data);
	const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
	downloadBlob(blob, filename);
};

// Generic blob download function
const downloadBlob = (blob: Blob, filename: string) => {
	const url = URL.createObjectURL(blob);
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	link.style.display = "none";

	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);

	// Clean up
	setTimeout(() => URL.revokeObjectURL(url), 100);
};

// Convert data to CSV format
const convertToCSV = (data: any) => {
	const profitMargin = data.data?.grossSales ? ((data.data.netSales / data.data.grossSales) * 100).toFixed(1) : "0";

	const headers = ["Metric", "Value", "Category"];
	const rows = [
		//["Merchant ID", data.merchantId, "Business Information"],
		["Report Type", data.reportType, "Business Information"],
		["Date Range", data.dateRange, "Business Information"],
		["Generated At", new Date(data.generatedAt).toLocaleString(), "Business Information"],
		["", "", ""],
		[
			"Gross Sales",
			`KShs ${(data.data?.grossSales || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
			"Financial Summary",
		],
		[
			"Net Sales",
			`KShs ${(data.data?.netSales || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
			"Financial Summary",
		],
		[
			"Deductions",
			`KShs ${(data.data?.deductions || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
			"Financial Summary",
		],
		["Profit Margin", `${profitMargin}%`, "Financial Summary"],
		["Total Transactions", data.data?.totalTransactions || "0", "Performance Metrics"],
		[
			"Average Sale Value",
			`KShs ${(data.data?.averageSale || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
			"Performance Metrics",
		],
	];

	return [headers, ...rows].map((row) => row.map((field) => `"${field}"`).join(",")).join("\n");
};

// Generate comprehensive HTML report
const generateReportHTML = (data: any) => {
	const profitMargin = data.data?.grossSales ? ((data.data.netSales / data.data.grossSales) * 100).toFixed(1) : "0";

	const expensePercentage = data.data?.grossSales
		? ((data.data.deductions / data.data.grossSales) * 100).toFixed(1)
		: "0";

	const revenueEfficiency =
		data.data?.grossSales && data.data.deductions
			? (((data.data.grossSales - data.data.deductions) / data.data.deductions) * 100).toFixed(1)
			: "0";

	return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Analytics Report - {Sales Report}</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        body { 
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
            line-height: 1.6; 
            color: #333; 
            background: #fff;
            padding: 20px;
        }
        .container { max-width: 1000px; margin: 0 auto; }
        .header { 
            text-align: center; 
            margin-bottom: 40px; 
            padding-bottom: 20px;
            border-bottom: 3px solid #2c5aa0;
        }
        .header h1 { 
            color: #2c5aa0; 
            font-size: 2.5em; 
            margin-bottom: 10px;
        }
        .header .subtitle { 
            color: #666; 
            font-size: 1.2em;
            margin-bottom: 20px;
        }
        .summary-grid { 
            display: grid; 
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr)); 
            gap: 20px; 
            margin: 30px 0;
        }
        .summary-card {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #2c5aa0;
        }
        .summary-card h3 { 
            color: #2c5aa0; 
            margin-bottom: 10px;
            font-size: 1.1em;
        }
        .summary-card .value { 
            font-size: 1.8em; 
            font-weight: bold; 
            color: #1a365d;
        }
        .summary-card .positive { color: #059669; }
        .summary-card .negative { color: #dc2626; }
        .table-container { 
            margin: 30px 0; 
            overflow-x: auto;
        }
        table { 
            width: 100%; 
            border-collapse: collapse; 
            background: white;
            box-shadow: 0 1px 3px rgba(0,0,0,0.1);
        }
        th, td { 
            padding: 12px 15px; 
            text-align: left; 
            border-bottom: 1px solid #e1e5e9;
        }
        th { 
            background: #2c5aa0; 
            color: white; 
            font-weight: 600;
        }
        tr:nth-child(even) { background: #f8f9fa; }
        .footer { 
            margin-top: 40px; 
            padding-top: 20px; 
            border-top: 2px solid #e1e5e9; 
            text-align: center; 
            color: #666;
            font-size: 0.9em;
        }
        .financial-highlights {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            padding: 30px;
            border-radius: 10px;
            margin: 30px 0;
        }
        .financial-highlights h2 {
            text-align: center;
            margin-bottom: 20px;
            font-size: 1.8em;
        }
        .info-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin: 20px 0;
        }
        .info-item {
            background: rgba(255,255,255,0.1);
            padding: 15px;
            border-radius: 6px;
            text-align: center;
        }
        .info-item .label {
            font-size: 0.9em;
            opacity: 0.9;
            margin-bottom: 5px;
        }
        .info-item .value {
            font-size: 1.2em;
            font-weight: bold;
        }
        @media print {
            body { padding: 0; }
            .summary-grid { grid-template-columns: 1fr 1fr; }
            .financial-highlights { break-inside: avoid; }
            .info-grid { grid-template-columns: 1fr 1fr; }
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>Business Analytics Report</h1>
            <div class="subtitle">Comprehensive Performance Analysis</div>
            <div class="info-grid">
               
                <div class="info-item">
                    <div class="label">Report Type</div>
                    <div class="value">${data.reportType}</div>
                </div>
                <div class="info-item">
                    <div class="label">Period</div>
                    <div class="value">${data.dateRange}</div>
                </div>
                <div class="info-item">
                    <div class="label">Generated</div>
                    <div class="value">${new Date(data.generatedAt).toLocaleDateString()}</div>
                </div>
            </div>
        </div>

        <div class="financial-highlights">
            <h2>Financial Highlights</h2>
            <div class="summary-grid">
                <div class="summary-card" style="background: rgba(255,255,255,0.1); border-left-color: #fff;">
                    <h3>Gross Revenue</h3>
                    <div class="value">KShs ${(data.data?.grossSales || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <!-- Net Profit card removed -->
                <div class="summary-card" style="background: rgba(255,255,255,0.1); border-left-color: #fff;">
                    <h3>Total Expenses</h3>
                    <div class="value">KShs ${(data.data?.deductions || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                </div>
                <div class="summary-card" style="background: rgba(255,255,255,0.1); border-left-color: #fff;">
                    <h3>Profit Margin</h3>
                    <div class="value">${profitMargin}%</div>
                </div>
            </div>
        </div>

        <div class="table-container">
            <h2>Detailed Financial Breakdown</h2>
            <table>
                <thead>
                    <tr>
                        <th>Financial Metric</th>
                        <th>Amount (KShs)</th>
                        <th>Percentage</th>
                    </tr>
                </thead>
                <tbody>
                    <tr>
                        <td>Gross Sales Revenue</td>
                        <td>${(data.data?.grossSales || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>100%</td>
                    </tr>
                    <tr>
                        <td>Operating Expenses & Deductions</td>
                        <td>${(data.data?.deductions || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>${expensePercentage}%</td>
                    </tr>
                    <tr>
                        <td><strong>Net Sales</strong></td>
                        <td><strong>${(data.data?.netSales || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                        <td><strong>${profitMargin}%</strong></td>
                    </tr>
                </tbody>
            </table>
        </div>

        <div class="summary-grid">
            <div class="summary-card">
                <h3>Performance Rating</h3>
                <div class="value ${parseFloat(profitMargin) > 20 ? "positive" : parseFloat(profitMargin) > 10 ? "positive" : "negative"}">
                    ${parseFloat(profitMargin) > 20 ? "Excellent" : parseFloat(profitMargin) > 10 ? "Good" : "Needs Improvement"}
                </div>
                <div style="margin-top: 10px; font-size: 0.9em;">
                    Based on ${profitMargin}% profit margin
                </div>
            </div>
            <div class="summary-card">
                <h3>Revenue Efficiency</h3>
                <div class="value ${parseFloat(revenueEfficiency) > 100 ? "positive" : "negative"}">
                    ${revenueEfficiency}%
                </div>
                <div style="margin-top: 10px; font-size: 0.9em;">
                    Return on expenses
                </div>
            </div>
            <div class="summary-card">
                <h3>Total Transactions</h3>
                <div class="value">
                    ${data.data?.totalTransactions || 0}
                </div>
                <div style="margin-top: 10px; font-size: 0.9em;">
                    Completed sales
                </div>
            </div>
            <div class="summary-card">
                <h3>Average Sale</h3>
                <div class="value">
                    KShs ${(data.data?.averageSale || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </div>
                <div style="margin-top: 10px; font-size: 0.9em;">
                    Per transaction
                </div>
            </div>
        </div>

        <div class="footer">
            <p><strong>Report Generated:</strong> ${new Date(data.generatedAt).toLocaleString()}</p>
            <p style="margin-top: 10px; color: #999;">
                This report contains confidential business information. Please handle with care.
            </p>
        </div>
    </div>

    <script>
        // Add print functionality when the HTML is opened
        setTimeout(() => {
            if (confirm('Do you want to print this report as PDF? Click "Print" and choose "Save as PDF" as printer.')) {
                window.print();
            }
        }, 500);
    </script>
</body>
</html>`;
};

export default function WeeklyAnalyticsPage() {
	const merchantId = useMerchantId();
	const [dateRange, setDateRange] = useState<string>("this-week");
	const [reportType, setReportType] = useState<string>("summary");
	const [isExporting, setIsExporting] = useState(false);

	// Date ranges
	const getDateRange = () => {
		const now = new Date();
		const startOfWeek = new Date(now);
		startOfWeek.setDate(now.getDate() - now.getDay());

		const endOfWeek = new Date(now);
		endOfWeek.setDate(now.getDate() + (6 - now.getDay()));

		switch (dateRange) {
			case "last-week":
				startOfWeek.setDate(startOfWeek.getDate() - 7);
				endOfWeek.setDate(endOfWeek.getDate() - 7);
				break;
			case "this-month":
				startOfWeek.setDate(1);
				break;
			case "last-month":
				startOfWeek.setMonth(startOfWeek.getMonth() - 1, 1);
				endOfWeek.setMonth(endOfWeek.getMonth(), 0);
				break;
		}

		return {
			start: startOfWeek.toISOString().split("T")[0],
			end: endOfWeek.toISOString().split("T")[0],
		};
	};

	const { start, end } = getDateRange();

	// Handle Export
	const handleExport = async (format: string = "pdf") => {
		if (!merchantId || !transformedData) {
			console.error("No merchant ID or data available for export");
			return;
		}

		setIsExporting(true);
		try {
			// Pass the current transformedData to the export function
			await exportReport(transformedData, merchantId, reportType, dateRange, format);
			console.log("✅ Export completed successfully");
		} catch (error) {
			console.error("❌ Export failed:", error);
		} finally {
			setIsExporting(false);
		}
	};

	// Weekly Analytics Query - FIXED: No merchantId parameter
	const {
		data: weeklyAnalytics,
		isLoading: analyticsLoading,
		error: analyticsError,
	} = useQuery({
		queryKey: ["weekly-analytics", merchantId, start, end],
		queryFn: () => inventoryService.getWeeklyAnalytics(start, end),
		enabled: !!merchantId,
	});

	// Transform data for charts and displays
	const getTransformedData = () => {
		if (!weeklyAnalytics) return null;

		const data = weeklyAnalytics.data || weeklyAnalytics;

		return {
			grossSales: data.grossSales || data.totalRevenue || 0,
			deductions: data.deductions || data.totalExpenses || 0,
			netSales: data.netSales || data.profit || 0,
			dailyTrend: data.dailyTrend || [],
			totalItems: data.totalItems || 0,
			totalTransactions: data.totalTransactions || 0,
			averageSale: data.averageSale || 0,
			range: weeklyAnalytics.range || { start, end },
		};
	};

	const transformedData = getTransformedData();
	const isLoading = analyticsLoading;
	const error = analyticsError;

	const formatCurrency = (amount: number) => {
		return `KShs ${amount?.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}`;
	};

	// Chart data preparation
	const getChartData = () => {
		if (!transformedData?.dailyTrend?.length) return [];

		return transformedData.dailyTrend.map((day: any) => ({
			date: new Date(day.recordDate).toLocaleDateString("en-US", { weekday: "short" }),
			grossSales: day.grossSales || 0,
			netSales: day.netSales || 0,
			deductions: day.deductions || 0,
			fullDate: day.recordDate,
		}));
	};

	const getPerformanceData = () => [
		{ name: "Gross Sales", value: transformedData?.grossSales || 0 },
		{ name: "Deductions", value: transformedData?.deductions || 0 },
		{ name: "Net Sales", value: transformedData?.netSales || 0 },
	];

	if (!merchantId) {
		return (
			<div className="space-y-6">
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 text-destructive mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
						<p className="text-muted-foreground">Please login to view analytics</p>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">Business Analytics & Reports</h1>
					<p className="text-muted-foreground">Comprehensive business insights and performance reports</p>
				</div>
				<div className="flex items-center gap-3">
					<UserRoleIndicator />
				</div>
			</div>

			{/* Date Range Selector */}
			<Card>
				<CardContent className="p-4">
					<div className="flex items-center gap-4">
						<div className="flex-1">
							<label className="text-sm font-medium mb-2 block">Date Range</label>
							<Select value={dateRange} onValueChange={setDateRange}>
								<SelectTrigger className="w-40">
									<SelectValue />
								</SelectTrigger>
								<SelectContent>
									<SelectItem value="this-week">This Week</SelectItem>
									<SelectItem value="last-week">Last Week</SelectItem>
									<SelectItem value="this-month">This Month</SelectItem>
									<SelectItem value="last-month">Last Month</SelectItem>
								</SelectContent>
							</Select>
						</div>

						<div className="flex items-end gap-2">
							<Button
								variant="outline"
								className="whitespace-nowrap"
								onClick={() => handleExport("pdf")}
								disabled={isExporting || !merchantId || !transformedData}
							>
								{isExporting ? (
									<>
										<Icon icon="eos-icons:loading" className="h-4 w-4 mr-2" />
										Exporting...
									</>
								) : (
									<>
										<Icon icon="lucide:file-text" className="h-4 w-4 mr-2" />
										Export Report (HTML)
									</>
								)}
							</Button>
							<Button
								variant="outline"
								className="whitespace-nowrap"
								onClick={() => handleExport("csv")}
								disabled={isExporting || !merchantId || !transformedData}
							>
								<Icon icon="lucide:download" className="h-4 w-4 mr-2" />
								Export CSV
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			{/* Rest of the UI remains the same */}
			{/* Key Metrics Overview */}
			<div className="grid grid-cols-2 md:grid-cols-3 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Gross Revenue</p>
								<p className="text-2xl font-bold text-green-600">
									{isLoading ? "..." : formatCurrency(transformedData?.grossSales || 0)}
								</p>
								<Badge variant="outline" className="mt-1">
									+12% from last week
								</Badge>
							</div>
							<Icon icon="lucide:banknote" className="h-8 w-8 text-green-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				{/* Net Profit card removed */}

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Expenses</p>
								<p className="text-2xl font-bold text-red-600">
									{isLoading ? "..." : formatCurrency(transformedData?.deductions || 0)}
								</p>
								<Badge variant="outline" className="mt-1">
									-5% from last week
								</Badge>
							</div>
							<Icon icon="lucide:trending-down" className="h-8 w-8 text-red-500 opacity-60" />
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
										: transformedData?.grossSales
											? `${((transformedData.netSales / transformedData.grossSales) * 100).toFixed(1)}%`
											: "0%"}
								</p>
								<Badge variant="outline" className="mt-1">
									Stable
								</Badge>
							</div>
							<Icon icon="lucide:percent" className="h-8 w-8 text-purple-500 opacity-60" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Detailed Reports Tabs */}
			<Tabs defaultValue="performance" className="space-y-6">
				<TabsList className="grid w-full grid-cols-3">
					<TabsTrigger value="performance">Performance</TabsTrigger>
					<TabsTrigger value="trends">Sales Trends</TabsTrigger>
					<TabsTrigger value="financial">Financial Report</TabsTrigger>
				</TabsList>

				{/* Performance Tab */}
				<TabsContent value="performance" className="space-y-6">
					<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
						{/* Revenue Distribution */}
						<Card>
							<CardHeader>
								<CardTitle>Revenue Distribution</CardTitle>
								<CardDescription>Breakdown of sales performance</CardDescription>
							</CardHeader>
							<CardContent>
								{isLoading ? (
									<div className="text-center py-12">
										<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
										<p className="text-muted-foreground">Loading revenue data...</p>
									</div>
								) : transformedData ? (
									<ResponsiveContainer width="100%" height={300}>
										<PieChart>
											<Pie
												data={getPerformanceData()}
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
										<p className="text-lg font-medium">No performance data available</p>
									</div>
								)}
							</CardContent>
						</Card>

						{/* Weekly Summary */}
						<Card>
							<CardHeader>
								<CardTitle>Weekly Summary</CardTitle>
								<CardDescription>Key performance indicators</CardDescription>
							</CardHeader>
							<CardContent>
								{isLoading ? (
									<div className="text-center py-12">
										<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
										<p className="text-muted-foreground">Loading summary data...</p>
									</div>
								) : transformedData ? (
									<div className="space-y-4">
										<div className="flex justify-between items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
											<span className="font-medium">Total Gross Revenue</span>
											<span className="font-bold text-green-600">{formatCurrency(transformedData.grossSales)}</span>
										</div>
										<div className="flex justify-between items-center p-3 bg-red-50 dark:bg-red-900/20 rounded-lg">
											<span className="font-medium">Total Expenses</span>
											<span className="font-bold text-red-600">{formatCurrency(transformedData.deductions)}</span>
										</div>
										{/* Net Profit summary removed */}
										<div className="flex justify-between items-center p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg">
											<span className="font-medium">Profit Margin</span>
											<span className="font-bold text-purple-600">
												{transformedData.grossSales
													? `${((transformedData.netSales / transformedData.grossSales) * 100).toFixed(1)}%`
													: "0%"}
											</span>
										</div>
									</div>
								) : (
									<div className="text-center py-12 text-muted-foreground">
										<Icon icon="lucide:bar-chart" className="h-16 w-16 mx-auto mb-4 opacity-50" />
										<p className="text-lg font-medium">No summary data available</p>
									</div>
								)}
							</CardContent>
						</Card>
					</div>
				</TabsContent>

				{/* Sales Trends Tab */}
				<TabsContent value="trends" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Sales Trends</CardTitle>
							<CardDescription>Daily sales performance throughout the period</CardDescription>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<div className="text-center py-12">
									<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
									<p className="text-muted-foreground">Loading trend data...</p>
								</div>
							) : getChartData().length > 0 ? (
								<ResponsiveContainer width="100%" height={400}>
									<LineChart data={getChartData()}>
										<CartesianGrid strokeDasharray="3 3" className="opacity-30" />
										<XAxis dataKey="date" />
										<YAxis />
										<Tooltip
											formatter={(value) => [formatCurrency(Number(value)), "Amount"]}
											labelFormatter={(label, payload) => {
												if (payload && payload[0]) {
													return `Date: ${payload[0].payload.fullDate}`;
												}
												return label;
											}}
										/>
										<Legend />
										<Line type="monotone" dataKey="grossSales" stroke="#10b981" strokeWidth={2} name="Gross Sales" />
										<Line type="monotone" dataKey="netSales" stroke="#3b82f6" strokeWidth={2} name="Net Sales" />
									</LineChart>
								</ResponsiveContainer>
							) : (
								<div className="text-center py-12 text-muted-foreground">
									<Icon icon="lucide:trending-up" className="h-16 w-16 mx-auto mb-4 opacity-50" />
									<p className="text-lg font-medium">No trend data available</p>
									<p className="text-sm">Sales trend data will appear here once available</p>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>

				{/* Financial Report Tab */}
				<TabsContent value="financial" className="space-y-6">
					<Card>
						<CardHeader>
							<CardTitle>Financial Report</CardTitle>
							<CardDescription>Comprehensive financial analysis</CardDescription>
						</CardHeader>
						<CardContent>
							{isLoading ? (
								<div className="text-center py-12">
									<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
									<p className="text-muted-foreground">Loading financial report...</p>
								</div>
							) : transformedData ? (
								<div className="space-y-6">
									<div className="space-y-4">
										<h3 className="font-semibold text-lg">Revenue Analysis</h3>
										<div className="space-y-2">
											<div className="flex justify-between">
												<span>Total Revenue:</span>
												<span className="font-bold">{formatCurrency(transformedData.grossSales)}</span>
											</div>
											<div className="flex justify-between">
												<span>Operating Costs:</span>
												<span className="font-bold text-red-600">{formatCurrency(transformedData.deductions)}</span>
											</div>
											{/* Net Profit line removed */}
										</div>
									</div>
									<div className="space-y-4">
										<h3 className="font-semibold text-lg">Performance Metrics</h3>
										<div className="space-y-2">
											<div className="flex justify-between">
												<span>Profit Margin:</span>
												<span className="font-bold">
													{transformedData.grossSales
														? `${((transformedData.netSales / transformedData.grossSales) * 100).toFixed(1)}%`
														: "0%"}
												</span>
											</div>
											<div className="flex justify-between">
												<span>Revenue Efficiency:</span>
												<span className="font-bold">
													{transformedData.grossSales && transformedData.deductions
														? `${(((transformedData.grossSales - transformedData.deductions) / transformedData.deductions) * 100).toFixed(1)}%`
														: "0%"}
												</span>
											</div>
										</div>
									</div>
								</div>
							) : (
								<div className="text-center py-12 text-muted-foreground">
									<Icon icon="lucide:file-text" className="h-16 w-16 mx-auto mb-4 opacity-50" />
									<p className="text-lg font-medium">No financial report available</p>
									<p className="text-sm">Financial reports will be generated as data becomes available</p>
								</div>
							)}
						</CardContent>
					</Card>
				</TabsContent>
			</Tabs>

			{/* Error Handling */}
			{error && (
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 text-destructive mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Failed to load analytics data</h3>
						<p className="text-muted-foreground mb-4">{(error as Error).message}</p>
						<Button onClick={() => window.location.reload()}>Retry</Button>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
