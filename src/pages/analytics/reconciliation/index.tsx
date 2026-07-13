// Original Author: Marcellas
// src/pages/analytics/reconciliation/index.tsx - Daily Reconciliation Report Page
import { useQuery } from "@tanstack/react-query";
import React, { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import inventoryService, { ReconciliationTransaction } from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { UserRoleIndicator } from "@/components/user-role-indicator";
import { useMerchantId } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { ScrollArea } from "@/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

interface TransactionDialogProps {
	transaction: ReconciliationTransaction;
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

const TransactionDialog = ({ transaction, isOpen, onOpenChange }: TransactionDialogProps) => {
	const formatCurrency = (amount: number) => `KShs ${amount?.toFixed(2) || "0.00"}`;

	const formatDateTime = (datetime: string) => {
		if (!datetime) return "-";
		const parsedDate = new Date(datetime);
		if (Number.isNaN(parsedDate.getTime())) return "-";
		return parsedDate.toLocaleString();
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-2xl max-h-[80vh]">
				<DialogHeader>
					<DialogTitle>Transaction Details</DialogTitle>
				</DialogHeader>
				<ScrollArea className="max-h-[60vh]">
					<div className="space-y-4">
						<div className="grid grid-cols-2 gap-4 rounded-lg border bg-slate-50 p-4">
							<div>
								<p className="text-xs font-medium uppercase text-slate-500">Transaction Ref</p>
								<p className="font-semibold text-slate-950 truncate">{transaction.transactionRef}</p>
							</div>
							<div>
								<p className="text-xs font-medium uppercase text-slate-500">Sale Date & Time</p>
								<p className="font-semibold text-slate-950">{formatDateTime(transaction.saleDatetime)}</p>
							</div>
					<div>
						<p className="text-xs font-medium uppercase text-slate-500">Merchant Name</p>
						<p className="font-semibold text-slate-950">{transaction.merchantName || "N/A"}</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase text-slate-500">Merchant Phone</p>
						<p className="font-semibold text-slate-950">{transaction.merchantPhone || "N/A"}</p>
					</div>
					<div>
						<p className="text-xs font-medium uppercase text-slate-500">Order Type</p>
						<Badge className={transaction.items.some((i) => i.orderType === "WHOLESALE") ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
							{transaction.items.some((i) => i.orderType === "WHOLESALE") ? "Wholesale" : "Retail"}
						</Badge>
					</div>
						</div>

						<div className="border rounded-lg overflow-hidden">
							<table className="w-full">
								<thead className="bg-slate-100">
									<tr>
										<th className="px-4 py-2 text-left text-sm font-semibold">Item</th>
										<th className="px-4 py-2 text-left text-sm font-semibold">Qty</th>
										<th className="px-4 py-2 text-right text-sm font-semibold">Unit Price</th>
										<th className="px-4 py-2 text-right text-sm font-semibold">Total</th>
									</tr>
								</thead>
								<tbody>
									{transaction.items.map((item, index) => (
										<tr key={`${item.itemCode}-${index}`} className="border-t">
											<td className="px-4 py-2">
												<p className="font-medium text-sm">{item.itemName}</p>
												<p className="text-xs text-slate-500">{item.itemCode}</p>
											</td>
											<td className="px-4 py-2">{item.quantity}</td>
											<td className="px-4 py-2 text-right">{formatCurrency(item.unitPrice)}</td>
											<td className="px-4 py-2 text-right font-semibold text-green-600">{formatCurrency(item.totalPrice)}</td>
										</tr>
									))}
								</tbody>
								<tfoot className="bg-slate-50 border-t">
									<tr>
										<td colSpan={3} className="px-4 py-2 font-bold">Basket Total</td>
										<td className="px-4 py-2 font-bold text-right text-green-600">{formatCurrency(transaction.basketTotal)}</td>
									</tr>
								</tfoot>
							</table>
						</div>
					</div>
				</ScrollArea>
				<div className="flex justify-end pt-4">
					<Button onClick={() => onOpenChange(false)} variant="outline">Close</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

const generateReconciliationPDF = (data: any, selectedDate: string) => {
	const formatCurrency = (amount: number) => `KShs ${amount?.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}`;

	const formatDateTime = (datetime: string) => {
		if (!datetime) return "-";
		const parsedDate = new Date(datetime);
		if (Number.isNaN(parsedDate.getTime())) return "-";
		return parsedDate.toLocaleString();
	};

	const htmlContent = `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Daily Reconciliation Report - ${selectedDate}</title>
	<style>
		@media print {
			@page { size: A4 portrait; margin: 15mm; }
			body { font-family: 'Times New Roman', serif; line-height: 1.4; color: #000; background: #fff; padding: 0; font-size: 10pt; }
			.no-print { display: none !important; }
		}
		body { font-family: 'Times New Roman', serif; line-height: 1.6; color: #000; background: #fff; padding: 20px; max-width: 210mm; margin: 0 auto; }
		.letterhead { border-bottom: 3px double #1a365d; padding-bottom: 15px; margin-bottom: 25px; }
		.letterhead h1 { font-size: 22pt; color: #1a365d; text-align: center; margin: 0; font-weight: bold; }
		.report-meta { display: flex; justify-content: space-between; margin: 20px 0; padding: 15px; background: #f8f9fa; border: 1px solid #dee2e6; }
		.items-table { width: 100%; border-collapse: collapse; margin: 15px 0; border: 1px solid #dee2e6; }
		.items-table th { background: #f1f5f9; padding: 6px; text-align: left; font-size: 9pt; border: 1px solid #dee2e6; }
		.items-table td { padding: 6px; border: 1px solid #dee2e6; font-size: 8pt; }
		.confidential { text-align: center; margin-top: 20px; padding: 10px; border: 2px dashed #dc2626; color: #dc2626; font-weight: bold; }
		.transaction-block { margin: 20px 0; border: 1px solid #dee2e6; border-radius: 4px; padding: 10px; }
		.transaction-header { font-weight: bold; margin-bottom: 8px; color: #1a365d; }
	</style>
</head>
<body>
	<div class="letterhead">
		<h1>DAILY RECONCILIATION REPORT</h1>
	</div>
	<div class="report-meta">
		<div><span class="label">Report Date</span><span class="value">${selectedDate}</span></div>
		<div><span class="label">Merchant</span><span class="value">${data.merchantName || data.merchantId}</span></div>
		<div><span class="label">Merchant Phone</span><span class="value">${data.merchantPhone || "N/A"}</span></div>
		<div><span class="label">Total Transactions</span><span class="value">${data.totalTransactions}</span></div>
		<div><span class="label">Total Revenue</span><span class="value">${formatCurrency(data.totalRevenue)}</span></div>
	</div>
	${data.transactions
		.map(
			(t: any) => `
	<div class="transaction-block">
		<div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
			<div><strong>Transaction Ref:</strong> ${t.transactionRef}</div>
			<div><strong>Sale Date & Time:</strong> ${formatDateTime(t.saleDatetime)}</div>
		</div>
		<div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
			<div><strong>Merchant Name:</strong> ${t.merchantName || "N/A"}</div>
			<div><strong>Merchant Phone:</strong> ${t.merchantPhone || "N/A"}</div>
		</div>
		<div style="margin-bottom: 10px;">
			<strong>Order Type:</strong> ${t.items.some((i: any) => i.orderType === "WHOLESALE") ? "Wholesale" : "Retail"}
		</div>
		<table class="items-table">
			<thead>
				<tr>
					<th>Item Name</th>
					<th>Qty</th>
					<th>Unit Price</th>
					<th>Total</th>
				</tr>
			</thead>
			<tbody>
				${t.items
					.map(
						(item: any) => `
				<tr>
					<td>${item.itemName}</td>
					<td>${item.quantity}</td>
					<td>${formatCurrency(item.unitPrice)}</td>
					<td>${formatCurrency(item.totalPrice)}</td>
				</tr>
				`,
					)
					.join("")}
			</tbody>
		</table>
		<div style="text-align: right; font-weight: bold; margin-top: 8px;">Basket Total: ${formatCurrency(t.basketTotal)}</div>
	</div>
	`,
		)
		.join("")}
	<div class="confidential">CONFIDENTIAL - DO NOT DISTRIBUTE WITHOUT AUTHORIZATION</div>
	<script>setTimeout(() => window.print(), 500);</script>
</body>
</html>`;

	const printWindow = window.open("", "_blank");
	if (!printWindow) {
		throw new Error("Could not open print window. Please allow popups.");
	}
	printWindow.document.write(htmlContent);
	printWindow.document.close();
};

export default function ReconciliationPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const merchantId = useMerchantId();
	const printRef = useRef<HTMLDivElement>(null);

	const [selectedTransaction, setSelectedTransaction] = useState<ReconciliationTransaction | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);
	const [printMode, setPrintMode] = useState(false);

	const queryParams = new URLSearchParams(location.search);
	const initialDate = queryParams.get("date") || new Date().toISOString().split("T")[0];
	const [selectedDate, setSelectedDate] = useState(initialDate);

	const {
		data: reconciliationData,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["reconciliation", merchantId, selectedDate],
		queryFn: () => inventoryService.getReconciliation(selectedDate),
		enabled: !!merchantId,
	});

	const formatCurrency = (amount: number) => `KShs ${amount?.toLocaleString("en-KE", { minimumFractionDigits: 2, maximumFractionDigits: 2 }) || "0.00"}`;

	const formatDateTime = (datetime: string) => {
		if (!datetime) return "-";
		const parsedDate = new Date(datetime);
		if (Number.isNaN(parsedDate.getTime())) return "-";
		return parsedDate.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
	};

	const handleViewTransaction = (transaction: ReconciliationTransaction) => {
		setSelectedTransaction(transaction);
		setDialogOpen(true);
	};

	const handlePrint = () => {
		if (!reconciliationData) return;
		setPrintMode(true);
		setTimeout(() => {
			generateReconciliationPDF(reconciliationData, selectedDate);
			setTimeout(() => setPrintMode(false), 1000);
		}, 100);
	};

	const handleDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const newDate = e.target.value;
		if (newDate) {
			setSelectedDate(newDate);
			const params = new URLSearchParams(location.search);
			params.set("date", newDate);
			navigate(`${location.pathname}?${params.toString()}`, { replace: true });
			refetch();
		}
	};

	if (!merchantId) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<h1 className="text-2xl font-bold">Daily Reconciliation</h1>
					<p className="text-muted-foreground">End-of-day reconciliation report</p>
				</div>
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 text-destructive mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
						<p className="text-muted-foreground mb-4">Please login to view reconciliation data</p>
						<Button onClick={() => navigate("/login")}>Go to Login</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const transactions = reconciliationData?.transactions || [];

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
				<div>
					<h1 className="text-3xl font-semibold tracking-tight text-slate-950">Daily Reconciliation</h1>
					<p className="mt-2 text-sm text-slate-600">
						End-of-day reconciliation report for {reconciliationData?.merchantName || merchantId}
					</p>
					{reconciliationData?.merchantPhone && (
						<p className="text-sm text-slate-600">Phone: {reconciliationData.merchantPhone}</p>
					)}
				</div>
				<div className="flex items-center gap-4">
					<div className="flex items-center gap-2 border rounded-md px-3 py-2 bg-background">
						<Icon icon="lucide:calendar" className="h-4 w-4 text-muted-foreground" />
						<input
							type="date"
							value={selectedDate}
							onChange={handleDateChange}
							className="border-0 bg-transparent focus:outline-none focus:ring-0 p-0 text-sm"
							max={new Date().toISOString().split("T")[0]}
						/>
					</div>
					<UserRoleIndicator />
				</div>
			</div>

			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Transactions</p>
								<p className="text-2xl font-bold text-blue-600">{isLoading ? "..." : reconciliationData?.totalTransactions || 0}</p>
							</div>
							<Icon icon="lucide:receipt" className="h-8 w-8 text-blue-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Units</p>
								<p className="text-2xl font-bold text-purple-600">{isLoading ? "..." : reconciliationData?.totalUnits || 0}</p>
							</div>
							<Icon icon="lucide:package" className="h-8 w-8 text-purple-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Revenue</p>
								<p className="text-2xl font-bold text-green-600">{isLoading ? "..." : formatCurrency(reconciliationData?.totalRevenue || 0)}</p>
							</div>
							<Icon icon="lucide:wallet" className="h-8 w-8 text-green-500 opacity-60" />
						</div>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Report Actions</CardTitle>
					<CardDescription>Export and manage reconciliation data</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-4">
						<Button onClick={handlePrint} className="flex items-center gap-2" disabled={isLoading || transactions.length === 0}>
							<Icon icon="lucide:printer" className="h-4 w-4" />
							Export PDF
						</Button>
						<Button onClick={() => refetch()} className="flex items-center gap-2" variant="secondary">
							<Icon icon="lucide:refresh-cw" className="h-4 w-4" />
							Refresh Data
						</Button>
						<Button onClick={() => navigate("/analytics/daily-sales")} className="flex items-center gap-2" variant="outline">
							<Icon icon="lucide:arrow-left" className="h-4 w-4" />
							Back to Daily Sales
						</Button>
					</div>
					<p className="text-sm text-muted-foreground mt-3">
						{transactions.length > 0
							? `Showing ${transactions.length} transactions for ${new Date(selectedDate).toLocaleDateString()}`
							: "No transactions found for selected date"}
					</p>
				</CardContent>
			</Card>

			{isLoading ? (
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
						<p className="text-muted-foreground">Loading reconciliation data...</p>
					</CardContent>
				</Card>
			) : error ? (
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 text-destructive mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Failed to load reconciliation</h3>
						<p className="text-muted-foreground mb-4">{(error as Error).message}</p>
						<Button onClick={() => refetch()}>Retry</Button>
					</CardContent>
				</Card>
			) : transactions.length > 0 ? (
				<Card>
					<CardHeader>
						<CardTitle>Transactions ({transactions.length})</CardTitle>
						<CardDescription>Detailed list of all transactions for {new Date(selectedDate).toLocaleDateString()}</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="rounded-md border">
							<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Item Name</TableHead>
									<TableHead>Time</TableHead>
									<TableHead>Merchant</TableHead>
									<TableHead>Phone</TableHead>
									<TableHead>Qty</TableHead>
									<TableHead>Units</TableHead>
									<TableHead className="text-right">Total</TableHead>
									<TableHead>Type</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{transactions.map((t, index) => {
									const hasWholesale = t.items.some((i) => i.orderType === "WHOLESALE");
									return (
										<TableRow key={`${t.transactionRef}-${index}`}>
											<TableCell>
												<span className="font-medium text-sm">{t.items[0]?.itemName || "Multiple Items"}</span>
												{t.items.length > 1 && (
													<span className="ml-1 text-xs text-slate-500">+ {t.items.length - 1} more</span>
												)}
											</TableCell>
											<TableCell>{formatDateTime(t.saleDatetime)}</TableCell>
											<TableCell>{t.merchantName || "N/A"}</TableCell>
											<TableCell>{t.merchantPhone || "N/A"}</TableCell>
											<TableCell>
												<Badge variant="outline">{t.itemCount}</Badge>
											</TableCell>
											<TableCell>{t.totalUnits}</TableCell>
											<TableCell className="text-right font-semibold text-green-600">{formatCurrency(t.basketTotal)}</TableCell>
											<TableCell>
												<Badge className={hasWholesale ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"}>
													{hasWholesale ? "Wholesale" : "Retail"}
												</Badge>
											</TableCell>
											<TableCell>
												<Button variant="outline" size="sm" onClick={() => handleViewTransaction(t)} className="flex items-center gap-2">
													<Icon icon="lucide:eye" className="h-3 w-3" />
													View
												</Button>
											</TableCell>
										</TableRow>
									);
								})}
								</TableBody>
							</Table>
						</div>
					</CardContent>
				</Card>
			) : (
				<Card>
					<CardContent className="flex flex-col items-center justify-center px-6 py-12 text-center">
						<div className="grid h-14 w-14 place-items-center rounded-2xl bg-slate-100 text-slate-600">
							<Icon icon="lucide:receipt" className="h-6 w-6" />
						</div>
						<h2 className="mt-4 text-lg font-semibold text-slate-950">No transactions found</h2>
						<p className="mt-2 max-w-md text-sm text-slate-600">No sales were recorded for {new Date(selectedDate).toLocaleDateString()}.</p>
						<Button onClick={() => navigate("/pos")} className="mt-5">
							Go to POS
						</Button>
					</CardContent>
				</Card>
			)}

			{selectedTransaction && <TransactionDialog transaction={selectedTransaction} isOpen={dialogOpen} onOpenChange={setDialogOpen} />}

			<div ref={printRef} className={printMode ? "block" : "hidden print:block"}>
				<div className="print-container p-8">
					<div className="mb-8 border-b pb-4">
						<h1 className="text-2xl font-bold">Daily Reconciliation Report</h1>
						<p className="text-gray-600">Date: {selectedDate}</p>
						<p className="text-gray-600">Merchant: {reconciliationData?.merchantName || reconciliationData?.merchantId}</p>
						{reconciliationData?.merchantPhone && (
							<p className="text-gray-600">Phone: {reconciliationData.merchantPhone}</p>
						)}
						<p className="text-gray-600">Report Date: {new Date().toLocaleString()}</p>
					</div>
					<div className="mb-6 grid grid-cols-3 gap-4">
						<div className="border p-4 rounded">
							<div className="text-sm text-gray-500">Total Transactions</div>
							<div className="text-xl font-bold">{reconciliationData?.totalTransactions || 0}</div>
						</div>
						<div className="border p-4 rounded">
							<div className="text-sm text-gray-500">Total Units</div>
							<div className="text-xl font-bold">{reconciliationData?.totalUnits || 0}</div>
						</div>
						<div className="border p-4 rounded">
							<div className="text-sm text-gray-500">Total Revenue</div>
							<div className="text-xl font-bold">{formatCurrency(reconciliationData?.totalRevenue || 0)}</div>
						</div>
					</div>
					<h2 className="text-lg font-bold mb-4">Transactions ({transactions.length})</h2>
					<table className="w-full border-collapse border">
						<thead className="bg-gray-100">
							<tr>
								<th className="border p-2 text-left">Item Name</th>
								<th className="border p-2 text-left">Time</th>
								<th className="border p-2 text-right">Qty</th>
								<th className="border p-2 text-right">Units</th>
								<th className="border p-2 text-right">Total</th>
							</tr>
						</thead>
						<tbody>
							{transactions.map((t) => (
								<tr key={t.transactionRef} className="border-b">
									<td className="border p-2">
										{t.items[0]?.itemName || "Multiple Items"}
										{t.items.length > 1 && <span className="ml-1 text-xs">+{t.items.length - 1}</span>}
									</td>
									<td className="border p-2">{formatDateTime(t.saleDatetime)}</td>
									<td className="border p-2 text-right">{t.itemCount}</td>
									<td className="border p-2 text-right">{t.totalUnits}</td>
									<td className="border p-2 text-right font-bold">{formatCurrency(t.basketTotal)}</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
			</div>

			<style>
				{`
          @media print {
            body * { visibility: hidden; }
            .print-container, .print-container * { visibility: visible; }
            .print-container { position: absolute; left: 0; top: 0; width: 100%; background: white; }
            .no-print { display: none !important; }
          }
        `}
			</style>
		</div>
	);
}