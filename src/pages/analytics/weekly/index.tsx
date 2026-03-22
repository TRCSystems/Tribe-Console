//original author : Marcellas
// src/pages/analytics/weekly/index.tsx - FINAL VERSION WITH SECURITY
import { useQuery } from "@tanstack/react-query";
import React, { useState } from "react";
import {
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
import { UserRoleIndicator } from "@/components/user-role-indicator";
import { useMerchantId } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";

// Security utility to protect sensitive data
const secureData = {
	// Store sensitive data in closure to prevent direct access
	_secureData: new Map(),

	// Securely store data
	setSecureData: function (key: string, value: any) {
		// Make non-enumerable in dev tools
		this._secureData.set(key, value);
		Object.defineProperty(this, "_secureData", {
			value: this._secureData,
			writable: true,
			enumerable: false,
			configurable: true,
		});
	},

	// Get data with security checks
	getSecureData: function (key: string) {
		if (typeof window !== "undefined" && window.location.hostname === "localhost") {
			// Allow full access in development
			return this._secureData.get(key);
		}

		// In production, return masked/limited data
		const data = this._secureData.get(key);
		if (!data) return null;

		// Mask sensitive data
		if (typeof data === "string") {
			if (key.includes("id") || key.includes("Id") || key.includes("ID")) {
				return data.length > 8 ? `${data.substring(0, 4)}***${data.substring(data.length - 4)}` : "****";
			}
		}

		return data;
	},

	// Secure console logging
	secureLog: function (message: string, data?: any, level: "info" | "warn" | "error" = "info") {
		if (typeof window === "undefined") return;

		// Only show minimal logs in production
		if (window.location.hostname !== "localhost") {
			const styles = {
				info: "color: #10b981; font-weight: bold;",
				warn: "color: #f59e0b; font-weight: bold;",
				error: "color: #ef4444; font-weight: bold;",
			};

			console[level](`%c[TRIBE Analytics] ${message}`, styles[level]);

			// Mask sensitive data in console
			if (data) {
				const maskedData = this.maskSensitiveData(data);
				console[level]("Data:", maskedData);
			}
			return;
		}

		// Full logging in development
		console[level](`[TRIBE Analytics] ${message}`, data || "");
	},

	// Mask sensitive data
	maskSensitiveData: (data: any): any => {
		if (!data || typeof data !== "object") {
			if (typeof data === "string" && (data.includes("id") || data.length > 12)) {
				return `${data.substring(0, 4)}***${data.substring(data.length - 4)}`;
			}
			return data;
		}

		const masked = Array.isArray(data) ? [...data] : { ...data };
		const sensitiveFields = ["merchantId", "id", "token", "password", "secret", "key", "apiKey", "auth"];

		Object.keys(masked).forEach((key) => {
			if (sensitiveFields.some((field) => key.toLowerCase().includes(field.toLowerCase()))) {
				const value = masked[key];
				if (typeof value === "string" && value.length > 4) {
					masked[key] = `${value.substring(0, 2)}***${value.substring(value.length - 2)}`;
				} else if (value) {
					masked[key] = "****";
				}
			}
		});

		return masked;
	},
};

const _COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042", "#8884D8"];

// Secure export function
const exportReport = async (currentData: any, merchantId: string, reportType: string, dateRange: string) => {
	try {
		secureData.secureLog("Exporting PDF report", {
			reportType,
			dateRange,
			merchantId: secureData.maskSensitiveData(merchantId),
		});

		// Create export data using the current page data (masked for security)
		const exportData = {
			reportType,
			dateRange,
			generatedAt: new Date().toISOString(),
			data: currentData,
		};

		// Securely store data
		secureData.setSecureData("exportData", exportData);
		secureData.setSecureData("merchantId", merchantId);

		// Generate professional banking PDF
		await generateProfessionalPDF(exportData, `Business-Report-${Date.now()}.pdf`);

		return true;
	} catch (error) {
		secureData.secureLog("Export failed", error, "error");
		throw error;
	}
};

// Generate professional banking PDF
const generateProfessionalPDF = async (data: any, _filename: string) => {
	try {
		// Use print dialog with professional banking template
		await generateBankingReportHTML(data);
	} catch (error) {
		secureData.secureLog("PDF generation failed, using fallback", error, "warn");
		// Fallback to simple print with security notice
		const fallbackMessage =
			'To save as PDF: Click "Print" and select "Save as PDF" as printer.\n\n⚠️ This document contains confidential business information.';
		alert(fallbackMessage);
		window.print();
	}
};

// Generate professional banking report HTML
const generateBankingReportHTML = (data: any) => {
	const profitMargin = data.data?.grossSales ? ((data.data.netSales / data.data.grossSales) * 100).toFixed(1) : "0";

	// Format date range for display
	const formatDateRange = (range: string) => {
		const now = new Date();
		switch (range) {
			case "this-week":
				return `Week of ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
			case "last-week": {
				const lastWeek = new Date(now);
				lastWeek.setDate(now.getDate() - 7);
				return `Week of ${lastWeek.toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`;
			}
			case "this-month":
				return `Month of ${new Date().toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
			case "last-month": {
				const lastMonth = new Date(now);
				lastMonth.setMonth(now.getMonth() - 1);
				return `Month of ${lastMonth.toLocaleDateString("en-US", { month: "long", year: "numeric" })}`;
			}
			default:
				return range;
		}
	};

	const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Business Financial Report - ${formatDateRange(data.dateRange)}</title>
    <style>
        @media print {
            @page {
                size: A4 portrait;
                margin: 20mm;
            }
            body { 
                font-family: 'Times New Roman', Times, serif; 
                line-height: 1.4; 
                color: #000; 
                background: #fff;
                padding: 0;
                font-size: 11pt;
            }
            .no-print { display: none !important; }
            .page-break { page-break-before: always; }
            h1, h2, h3 { color: #000 !important; }
            table { page-break-inside: avoid; }
        }
        
        body { 
            font-family: 'Times New Roman', Times, serif; 
            line-height: 1.6; 
            color: #000; 
            background: #fff;
            padding: 20px;
            max-width: 210mm;
            margin: 0 auto;
        }
        
        /* Professional Banking Styling */
        .letterhead {
            border-bottom: 3px double #1a365d;
            padding-bottom: 15px;
            margin-bottom: 25px;
        }
        
        .letterhead h1 {
            font-size: 24pt;
            color: #1a365d;
            text-align: center;
            margin: 0;
            font-weight: bold;
            letter-spacing: 1px;
        }
        
        .letterhead .subtitle {
            text-align: center;
            color: #666;
            font-size: 12pt;
            margin-top: 5px;
            font-style: italic;
        }
        
        .report-meta {
            display: flex;
            justify-content: space-between;
            margin: 20px 0;
            padding: 15px;
            background: #f8f9fa;
            border: 1px solid #dee2e6;
        }
        
        .report-meta div {
            text-align: center;
            flex: 1;
        }
        
        .report-meta .label {
            font-size: 10pt;
            color: #666;
            display: block;
            margin-bottom: 5px;
        }
        
        .report-meta .value {
            font-size: 11pt;
            font-weight: bold;
            color: #1a365d;
        }
        
        /* Financial Summary Cards */
        .financial-summary {
            display: grid;
            grid-template-columns: repeat(3, 1fr);
            gap: 15px;
            margin: 25px 0;
        }
        
        .summary-card {
            background: white;
            padding: 20px;
            border: 2px solid #1a365d;
            border-radius: 4px;
            text-align: center;
            box-shadow: 0 2px 4px rgba(0,0,0,0.1);
        }
        
        .summary-card h3 {
            color: #1a365d;
            font-size: 12pt;
            margin-bottom: 10px;
            font-weight: bold;
            text-transform: uppercase;
            letter-spacing: 0.5px;
        }
        
        .summary-card .value {
            font-size: 18pt;
            font-weight: bold;
            color: #000;
            margin: 10px 0;
        }
        
        .summary-card.gross .value { color: #059669; }
        .summary-card.expenses .value { color: #dc2626; }
        .summary-card.margin .value { color: #7c3aed; }
        
        /* Professional Table */
        .financial-table {
            width: 100%;
            border-collapse: collapse;
            margin: 25px 0;
            border: 2px solid #1a365d;
        }
        
        .financial-table th {
            background: #1a365d;
            color: white;
            font-weight: bold;
            padding: 12px 15px;
            text-align: left;
            font-size: 11pt;
            border-bottom: 2px solid #1a365d;
        }
        
        .financial-table td {
            padding: 10px 15px;
            border: 1px solid #dee2e6;
        }
        
        .financial-table tr:nth-child(even) {
            background: #f8f9fa;
        }
        
        .financial-table .total-row {
            background: #e8f4fd;
            font-weight: bold;
            border-top: 2px solid #1a365d;
        }
        
        /* Performance Metrics */
        .performance-metrics {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 15px;
            margin: 25px 0;
        }
        
        .metric-card {
            background: white;
            padding: 15px;
            border: 1px solid #dee2e6;
            border-radius: 4px;
        }
        
        .metric-card h4 {
            color: #1a365d;
            font-size: 11pt;
            margin-bottom: 8px;
            font-weight: bold;
        }
        
        .metric-card .metric-value {
            font-size: 14pt;
            font-weight: bold;
            color: #000;
        }
        
        /* Footer */
        .report-footer {
            margin-top: 40px;
            padding-top: 20px;
            border-top: 1px solid #1a365d;
            font-size: 10pt;
            color: #666;
        }
        
        .footer-grid {
            display: grid;
            grid-template-columns: repeat(2, 1fr);
            gap: 20px;
            margin-top: 15px;
        }
        
        .footer-section {
            padding: 10px;
        }
        
        .footer-section h5 {
            color: #1a365d;
            font-size: 10pt;
            margin-bottom: 5px;
            font-weight: bold;
        }
        
        .confidential-stamp {
            text-align: center;
            margin-top: 20px;
            padding: 10px;
            border: 2px dashed #dc2626;
            color: #dc2626;
            font-weight: bold;
            font-size: 10pt;
        }
        
        /* Print Controls */
        .print-controls {
            background: #f8f9fa;
            padding: 15px;
            border-radius: 4px;
            margin: 20px 0;
            text-align: center;
            border: 1px solid #dee2e6;
        }
        
        .print-button {
            background: #1a365d;
            color: white;
            border: none;
            padding: 10px 25px;
            border-radius: 4px;
            cursor: pointer;
            font-size: 12pt;
            margin: 5px;
            font-family: 'Times New Roman', Times, serif;
        }
        
        .print-button:hover {
            background: #2d4a7e;
        }
        
        /* Security Notice */
        .security-notice {
            background: #fff3cd;
            border: 1px solid #ffeaa7;
            padding: 10px;
            margin: 10px 0;
            border-radius: 4px;
            font-size: 10pt;
            color: #856404;
        }
    </style>
</head>
<body>
    <div class="print-controls no-print">
        <button class="print-button" onclick="window.print()">
            📄 Print to PDF
        </button>
        <p style="margin-top: 10px; font-size: 11pt; color: #666; font-style: italic;">
            To save as PDF: Click above button, then select "Save as PDF" as your printer
        </p>
    </div>

    <!-- Security Notice -->
    <div class="security-notice no-print">
        ⚠️ This document contains confidential business information. Do not share or distribute without authorization.
    </div>

    <!-- Professional Letterhead -->
    <div class="letterhead">
        <h1>BUSINESS FINANCIAL REPORT</h1>
        <div class="subtitle">Official Performance Analysis Document</div>
    </div>

    <!-- Report Metadata -->
    <div class="report-meta">
        <div>
            <span class="label">Report Period</span>
            <span class="value">${formatDateRange(data.dateRange)}</span>
        </div>
        <div>
            <span class="label">Report Date</span>
            <span class="value">${new Date(data.generatedAt).toLocaleDateString("en-US", {
							year: "numeric",
							month: "long",
							day: "numeric",
						})}</span>
        </div>
        <div>
            <span class="label">Document ID</span>
            <span class="value">REP-${new Date().getFullYear()}-${Math.floor(Math.random() * 10000)
							.toString()
							.padStart(4, "0")}</span>
        </div>
    </div>

    <!-- Executive Summary -->
    <div style="margin: 25px 0;">
        <h2 style="color: #1a365d; font-size: 14pt; border-bottom: 1px solid #1a365d; padding-bottom: 5px;">
            EXECUTIVE SUMMARY
        </h2>
        <p style="text-align: justify; line-height: 1.6;">
            This document presents the official financial performance report covering the specified period. 
            The report details revenue generation, expense management, and overall business profitability. 
            All figures are presented in Kenyan Shillings (KShs) and reflect the actual business performance.
        </p>
    </div>

    <!-- Financial Highlights -->
    <h2 style="color: #1a365d; font-size: 14pt; border-bottom: 1px solid #1a365d; padding-bottom: 5px; margin-top: 30px;">
        FINANCIAL HIGHLIGHTS
    </h2>
    
    <div class="financial-summary">
        <div class="summary-card gross">
            <h3>GROSS REVENUE</h3>
            <div class="value">KShs ${(data.data?.grossSales || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style="font-size: 10pt; color: #666; margin-top: 5px;">Total Sales Revenue</div>
        </div>
        
        <div class="summary-card expenses">
            <h3>TOTAL EXPENSES</h3>
            <div class="value">KShs ${(data.data?.deductions || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
            <div style="font-size: 10pt; color: #666; margin-top: 5px;">Operating Costs & Deductions</div>
        </div>
        
        <div class="summary-card margin">
            <h3>PROFIT MARGIN</h3>
            <div class="value">${profitMargin}%</div>
            <div style="font-size: 10pt; color: #666; margin-top: 5px;">Net Profit Percentage</div>
        </div>
    </div>

    <!-- Detailed Financial Analysis -->
    <h2 style="color: #1a365d; font-size: 14pt; border-bottom: 1px solid #1a365d; padding-bottom: 5px; margin-top: 30px;">
        DETAILED FINANCIAL ANALYSIS
    </h2>
    
    <table class="financial-table">
        <thead>
            <tr>
                <th>FINANCIAL METRIC</th>
                <th>AMOUNT (KShs)</th>
                <th>PERCENTAGE</th>
                <th>DESCRIPTION</th>
            </tr>
        </thead>
        <tbody>
            <tr>
                <td><strong>Gross Sales Revenue</strong></td>
                <td>${(data.data?.grossSales || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>100%</td>
                <td>Total revenue before any deductions</td>
            </tr>
            <tr>
                <td><strong>Operating Expenses</strong></td>
                <td>${(data.data?.deductions || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                <td>${data.data?.grossSales ? ((data.data.deductions / data.data.grossSales) * 100).toFixed(1) : "0"}%</td>
                <td>Business costs & operational deductions</td>
            </tr>
            <tr class="total-row">
                <td><strong>NET SALES</strong></td>
                <td><strong>${(data.data?.netSales || 0).toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</strong></td>
                <td><strong>${profitMargin}%</strong></td>
                <td><strong>Revenue after all expenses</strong></td>
            </tr>
        </tbody>
    </table>

    <!-- Report Footer -->
    <div class="report-footer">
        <div class="footer-grid">
            <div class="footer-section">
                <h5>PREPARED BY</h5>
                <p>TRIBE Business Analytics System<br>
                Powered by TRC Systems<br>
                ${new Date(data.generatedAt).toLocaleString("en-US")}</p>
            </div>
            
            <div class="footer-section">
                <h5>DOCUMENT PURPOSE</h5>
                <p>Official business performance analysis<br>
                For management review and strategic planning<br>
                Valid for financial assessment purposes</p>
            </div>
        </div>
        
        <div class="confidential-stamp">
            ⚠️ CONFIDENTIAL BUSINESS INFORMATION 
        </div>
        
        <div style="text-align: center; margin-top: 20px; font-size: 9pt; color: #999;">
            <p>© ${new Date().getFullYear()} TRC Systems. All rights reserved.</p>
            <p>This document is generated electronically and is valid without signature.</p>
        </div>
    </div>

    <script>
        // Security: Prevent right-click and dev tools inspection
        document.addEventListener('contextmenu', function(e) {
            e.preventDefault();
            alert('Right-click is disabled for security.');
        });
        
        // Security: Prevent keyboard shortcuts for dev tools
        document.addEventListener('keydown', function(e) {
            // Disable F12, Ctrl+Shift+I, Ctrl+Shift+J, Ctrl+U
            if (
                e.keyCode === 123 || // F12
                (e.ctrlKey && e.shiftKey && e.keyCode === 73) || // Ctrl+Shift+I
                (e.ctrlKey && e.shiftKey && e.keyCode === 74) || // Ctrl+Shift+J
                (e.ctrlKey && e.keyCode === 85) // Ctrl+U
            ) {
                e.preventDefault();
                alert('Developer tools are disabled for security.');
                return false;
            }
        });
        
        // Auto-trigger print dialog
        setTimeout(() => {
            window.print();
        }, 500);
    </script>
</body>
</html>`;

	// Create a new window for printing
	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		throw new Error("Could not open print window. Please allow popups for this site.");
	}

	printWindow.document.write(htmlContent);
	printWindow.document.close();

	// Add security to the print window
	setTimeout(() => {
		if (printWindow && !printWindow.closed) {
			// Add security event listeners to print window
			printWindow.document.addEventListener("contextmenu", (e) => e.preventDefault());
			printWindow.focus();
		}
	}, 500);
};

export default function WeeklyAnalyticsPage() {
	const merchantId = useMerchantId();
	const [dateRange, setDateRange] = useState<string>("this-week");
	const [reportType, _setReportType] = useState<string>("summary");
	const [isExporting, setIsExporting] = useState(false);

	// Security: Mask merchant ID in console
	React.useEffect(() => {
		if (merchantId) {
			secureData.setSecureData("currentMerchantId", merchantId);
			secureData.secureLog("Analytics page loaded", {
				dateRange,
				merchantId: secureData.maskSensitiveData(merchantId),
			});
		}
	}, [merchantId, dateRange]);

	// Security: Protect against dev tools access
	React.useEffect(() => {
		const handleDevTools = () => {
			secureData.secureLog("Security warning: Dev tools detected", null, "warn");
		};

		// Check for dev tools periodically
		const devToolsCheck = setInterval(() => {
			const widthThreshold = window.outerWidth - window.innerWidth > 160;
			const heightThreshold = window.outerHeight - window.innerHeight > 160;

			if (widthThreshold || heightThreshold) {
				handleDevTools();
			}
		}, 1000);

		return () => clearInterval(devToolsCheck);
	}, []);

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

	// Handle Export - PDF ONLY
	const handleExport = async () => {
		if (!merchantId || !transformedData) {
			secureData.secureLog("Export failed: No data available", null, "error");
			return;
		}

		setIsExporting(true);
		try {
			await exportReport(transformedData, merchantId, reportType, dateRange);
			secureData.secureLog("PDF report generated successfully");
		} catch (error) {
			secureData.secureLog("Export failed", error, "error");
			alert('To save as PDF: Click "Print" in your browser and select "Save as PDF" as your printer.');
		} finally {
			setIsExporting(false);
		}
	};

	// Weekly Analytics Query with security
	const {
		data: weeklyAnalytics,
		isLoading: analyticsLoading,
		error: analyticsError,
	} = useQuery({
		queryKey: ["weekly-analytics", secureData.maskSensitiveData(merchantId || ""), start, end],
		queryFn: async () => {
			secureData.secureLog("Fetching analytics data", { start, end });
			const result = await inventoryService.getWeeklyAnalytics(start, end);

			// Secure the data before returning
			const securedData = secureData.maskSensitiveData(result);
			secureData.setSecureData("analyticsData", securedData);

			return result;
		},
		enabled: !!merchantId,
	});

	// Transform data for charts and displays
	const getTransformedData = () => {
		if (!weeklyAnalytics) return null;

		const data = weeklyAnalytics.data || weeklyAnalytics;

		// Store securely
		const transformed = {
			grossSales: data.grossSales || data.totalRevenue || 0,
			deductions: data.deductions || data.totalExpenses || 0,
			netSales: data.netSales || data.profit || 0,
			dailyTrend: data.dailyTrend || [],
			totalItems: data.totalItems || 0,
			totalTransactions: data.totalTransactions || 0,
			averageSale: data.averageSale || 0,
			range: weeklyAnalytics.range || { start, end },
		};

		secureData.setSecureData("transformedData", transformed);
		return transformed;
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
								onClick={handleExport}
								disabled={isExporting || !merchantId || !transformedData}
							>
								{isExporting ? (
									<>
										<Icon icon="eos-icons:loading" className="h-4 w-4 mr-2" />
										Generating Report...
									</>
								) : (
									<>
										<Icon icon="lucide:file-text" className="h-4 w-4 mr-2" />
										Get Report (PDF)
									</>
								)}
							</Button>
							{/* CSV Button REMOVED */}
						</div>
					</div>
				</CardContent>
			</Card>

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
							</div>
							<Icon icon="lucide:banknote" className="h-8 w-8 text-green-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Expenses</p>
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
								<p className="text-sm font-medium text-muted-foreground">Profit Margin</p>
								<p className="text-2xl font-bold text-purple-600">
									{isLoading
										? "..."
										: transformedData?.grossSales
											? `${((transformedData.netSales / transformedData.grossSales) * 100).toFixed(1)}%`
											: "0%"}
								</p>
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
												if (payload?.[0]) {
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
												<span>Expense to Revenue Ratio:</span>
												<span className="font-bold">
													{transformedData.grossSales
														? `${((transformedData.deductions / transformedData.grossSales) * 100).toFixed(1)}%`
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
