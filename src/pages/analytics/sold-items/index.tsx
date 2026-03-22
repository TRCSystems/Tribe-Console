//original author : Marcellas
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import inventoryService, { type SoldItemsResponse } from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { UserRoleIndicator } from "@/components/user-role-indicator";
import { useMerchantId } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/ui/dialog";
import { ScrollArea } from "@/ui/scroll-area";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

interface SummaryByItem {
	timesSold: number;
	totalAmount: number;
	itemName: string;
	totalQuantity: number;
	itemCode: string;
}

interface ItemTransaction {
	itemName: string;
	customerPhone: string;
	quantity: number;
	totalPrice: number;
	itemCode: string;
	transactionRef: string;
}

interface TransactionsDialogProps {
	itemName: string;
	transactions: ItemTransaction[];
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
}

const TransactionsDialog = ({ itemName, transactions, isOpen, onOpenChange }: TransactionsDialogProps) => {
	// Format phone number for display
	const formatPhoneNumber = (phone: string) => {
		if (!phone || phone.trim() === "") return "N/A";
		const cleaned = phone.replace(/\D/g, "");
		if (cleaned.startsWith("254") && cleaned.length === 12) {
			return `0${cleaned.substring(3, 6)} ${cleaned.substring(6, 9)} ${cleaned.substring(9)}`;
		}
		return phone;
	};

	// Format currency
	const formatCurrency = (amount: number) => {
		return `KShs ${amount?.toFixed(2) || "0.00"}`;
	};

	return (
		<Dialog open={isOpen} onOpenChange={onOpenChange}>
			<DialogContent className="sm:max-w-md">
				<DialogHeader>
					<DialogTitle>Transactions for {itemName}</DialogTitle>
				</DialogHeader>
				<ScrollArea className="max-h-[400px]">
					<div className="space-y-4">
						{transactions.length > 0 ? (
							transactions.map((transaction, index) => (
								<Card key={`${transaction.transactionRef}-${index}`} className="p-4">
									<div className="space-y-2">
										<div className="flex justify-between items-start">
											<div>
												<p className="font-medium text-sm">Transaction Ref:</p>
												<p className="text-xs font-mono text-muted-foreground truncate max-w-[200px]">
													{transaction.transactionRef}
												</p>
											</div>
											<Badge variant="outline" className="ml-2">
												{transaction.quantity} qty
											</Badge>
										</div>
										<div className="grid grid-cols-2 gap-4">
											<div>
												<p className="text-sm font-medium">Customer Phone:</p>
												<p className="text-sm">{formatPhoneNumber(transaction.customerPhone)}</p>
											</div>
											<div className="text-right">
												<p className="text-sm font-medium">Total Price:</p>
												<p className="text-sm font-semibold text-green-600">{formatCurrency(transaction.totalPrice)}</p>
											</div>
										</div>
									</div>
								</Card>
							))
						) : (
							<div className="text-center py-4">
								<Icon icon="lucide:receipt" className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
								<p className="text-muted-foreground">No transactions found for this item</p>
							</div>
						)}
					</div>
				</ScrollArea>
				<div className="flex justify-end pt-4">
					<Button onClick={() => onOpenChange(false)} variant="outline">
						Close
					</Button>
				</div>
			</DialogContent>
		</Dialog>
	);
};

export default function SoldItemsPage() {
	const location = useLocation();
	const navigate = useNavigate();
	const merchantId = useMerchantId();
	const printRef = useRef<HTMLDivElement>(null);

	// State for transactions dialog
	const [selectedItem, setSelectedItem] = useState<string | null>(null);
	const [dialogOpen, setDialogOpen] = useState(false);

	// Get date from URL query parameter or default to today
	const queryParams = new URLSearchParams(location.search);
	const initialDate = queryParams.get("date") || new Date().toISOString().split("T")[0];

	const [selectedDate, _setSelectedDate] = useState(initialDate);
	const [printMode, setPrintMode] = useState(false);

	const {
		data: soldItemsData,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["sold-items", merchantId, selectedDate],
		queryFn: () => inventoryService.getSoldItems(selectedDate),
		enabled: !!merchantId,
	});

	// Use the API response directly
	const apiResponse: SoldItemsResponse = soldItemsData || {
		totalItemsSold: 0,
		status: "LOADING",
		items: [],
		totalSalesAmount: 0,
		numberOfTransactions: 0,
		merchantId: merchantId || "",
		date: selectedDate,
		summaryByItem: [],
	};

	const soldItems = apiResponse.items;
	const summaryByItem = apiResponse.summaryByItem || [];
	const totals = apiResponse;

	// Group transactions by item name for the dialog
	const transactionsByItem: Record<string, ItemTransaction[]> = {};
	soldItems.forEach((item) => {
		if (!transactionsByItem[item.itemName]) {
			transactionsByItem[item.itemName] = [];
		}
		transactionsByItem[item.itemName].push(item as ItemTransaction);
	});

	// Handle opening transactions dialog
	const handleViewTransactions = (itemName: string) => {
		setSelectedItem(itemName);
		setDialogOpen(true);
	};

	// Format currency
	const formatCurrency = (amount: number) => {
		return `KShs ${amount?.toFixed(2) || "0.00"}`;
	};

	// Print function
	const handlePrint = () => {
		setPrintMode(true);
		setTimeout(() => {
			window.print();
			setTimeout(() => setPrintMode(false), 1000);
		}, 100);
	};

	// Navigate back
	const handleGoBack = () => {
		navigate("/analytics/daily-sales");
	};

	if (!merchantId) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">Sold Items Report</h1>
						<p className="text-muted-foreground">View detailed list of items sold</p>
					</div>
				</div>
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 text-destructive mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Authentication Required</h3>
						<p className="text-muted-foreground mb-4">Please login to view sold items data</p>
						<Button onClick={() => navigate("/login")}>Go to Login</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Header */}
			<div className="flex items-center justify-between">
				<div>
					<div className="flex items-center gap-3">
						<Button onClick={handleGoBack} variant="ghost" size="icon" className="h-8 w-8">
							<Icon icon="lucide:arrow-left" className="h-4 w-4" />
						</Button>
						<div>
							<h1 className="text-2xl font-bold">Sold Items Report</h1>
							<p className="text-muted-foreground">Detailed list of items sold for {merchantId}</p>
						</div>
					</div>
				</div>
				<div className="flex items-center gap-4">
					<Badge variant="outline" className="px-3 py-1">
						<Icon icon="lucide:calendar" className="h-3 w-3 mr-1" />
						{new Date(selectedDate).toLocaleDateString()}
					</Badge>
					<UserRoleIndicator />
				</div>
			</div>

			{/* Action Buttons */}
			<Card>
				<CardHeader>
					<CardTitle>Report Actions</CardTitle>
					<CardDescription>Manage and export your sold items data</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-wrap gap-4">
						<Button
							onClick={handlePrint}
							className="flex items-center gap-2"
							disabled={isLoading || summaryByItem.length === 0}
						>
							<Icon icon="lucide:printer" className="h-4 w-4" />
							Print Report
						</Button>
						<Button onClick={() => refetch()} className="flex items-center gap-2" variant="secondary">
							<Icon icon="lucide:refresh-cw" className="h-4 w-4" />
							Refresh Data
						</Button>
						<Button onClick={handleGoBack} className="flex items-center gap-2" variant="outline">
							<Icon icon="lucide:arrow-left" className="h-4 w-4" />
							Back to Summary
						</Button>
					</div>
					<p className="text-sm text-muted-foreground mt-3">
						{summaryByItem.length > 0
							? `Showing ${summaryByItem.length} items with ${totals.numberOfTransactions} transactions for ${new Date(selectedDate).toLocaleDateString()}`
							: "No sold items found for selected date"}
					</p>
				</CardContent>
			</Card>

			{/* Summary Cards */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Items Sold</p>
								<p className="text-2xl font-bold text-blue-600">{isLoading ? "..." : totals.totalItemsSold}</p>
							</div>
							<Icon icon="lucide:package" className="h-8 w-8 text-blue-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Sales Amount</p>
								<p className="text-2xl font-bold text-green-600">
									{isLoading ? "..." : formatCurrency(totals.totalSalesAmount)}
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
								<p className="text-sm font-medium text-muted-foreground">Number of Transactions</p>
								<p className="text-2xl font-bold text-purple-600">{isLoading ? "..." : totals.numberOfTransactions}</p>
							</div>
							<Icon icon="lucide:receipt" className="h-8 w-8 text-purple-500 opacity-60" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Main Table - Hidden during print */}
			<div className={printMode ? "hidden" : ""}>
				<Card>
					<CardHeader>
						<CardTitle>Sold Items Summary</CardTitle>
						<CardDescription>
							Aggregated view of items sold on {new Date(selectedDate).toLocaleDateString()}
						</CardDescription>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<div className="text-center py-12">
								<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
								<p className="text-muted-foreground">Loading sold items data...</p>
							</div>
						) : error ? (
							<div className="text-center py-12">
								<Icon icon="lucide:alert-circle" className="h-12 w-12 text-destructive mx-auto mb-4" />
								<h3 className="text-lg font-semibold mb-2">Failed to load sold items</h3>
								<p className="text-muted-foreground mb-4">{(error as Error).message}</p>
								<Button onClick={() => refetch()}>Retry</Button>
							</div>
						) : summaryByItem.length > 0 ? (
							<div className="rounded-md border">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Item Name</TableHead>
											<TableHead>Times Sold</TableHead>
											<TableHead className="text-right">Quantity</TableHead>
											<TableHead className="text-right">Total Amount</TableHead>
											<TableHead>Actions</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{summaryByItem.map((item: SummaryByItem, index) => (
											<TableRow key={`${item.itemCode}-${index}`}>
												<TableCell className="font-medium">{item.itemName}</TableCell>
												<TableCell>
													<Badge variant="outline">{item.timesSold}</Badge>
												</TableCell>
												<TableCell className="text-right font-semibold">{item.totalQuantity}</TableCell>
												<TableCell className="text-right font-semibold text-green-600">
													{formatCurrency(item.totalAmount)}
												</TableCell>
												<TableCell>
													<Button
														variant="outline"
														size="sm"
														onClick={() => handleViewTransactions(item.itemName)}
														className="flex items-center gap-2"
													>
														<Icon icon="lucide:receipt" className="h-3 w-3" />
														Transactions
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						) : (
							<div className="text-center py-12 text-muted-foreground">
								<Icon icon="lucide:package-x" className="h-16 w-16 mx-auto mb-4 opacity-50" />
								<p className="text-lg font-medium">No sold items found for selected date</p>
								<p className="text-sm">Try selecting a different date or check if sales were processed for this date</p>
								<Button onClick={handleGoBack} className="mt-4 flex items-center gap-2" variant="outline">
									<Icon icon="lucide:arrow-left" className="h-4 w-4" />
									Back to Daily Summary
								</Button>
							</div>
						)}
					</CardContent>
				</Card>
			</div>

			{/* Transactions Dialog */}
			{selectedItem && transactionsByItem[selectedItem] && (
				<TransactionsDialog
					itemName={selectedItem}
					transactions={transactionsByItem[selectedItem]}
					isOpen={dialogOpen}
					onOpenChange={setDialogOpen}
				/>
			)}

			{/* Printable Version - Only visible during print */}
			<div ref={printRef} className={printMode ? "block" : "hidden print:block"}>
				<div className="print-container p-8">
					{/* Print Header */}
					<div className="mb-8 border-b pb-4">
						<div className="flex justify-between items-start">
							<div>
								<h1 className="text-2xl font-bold">Sold Items Report</h1>
								<p className="text-gray-600">Date: {selectedDate}</p>
								<p className="text-gray-600">Report Date: {new Date().toLocaleString()}</p>
							</div>
							<div className="text-right">
								<div className="text-sm text-gray-500">Tribe Systems</div>
								<div className="text-xs text-gray-400">Sales Report</div>
							</div>
						</div>
					</div>

					{/* Print Summary */}
					<div className="mb-6 grid grid-cols-3 gap-4">
						<div className="border p-4 rounded">
							<div className="text-sm text-gray-500">Total Items Sold</div>
							<div className="text-xl font-bold">{totals.totalItemsSold}</div>
						</div>
						<div className="border p-4 rounded">
							<div className="text-sm text-gray-500">Total Sales Amount</div>
							<div className="text-xl font-bold">{formatCurrency(totals.totalSalesAmount)}</div>
						</div>
						<div className="border p-4 rounded">
							<div className="text-sm text-gray-500">Number of Transactions</div>
							<div className="text-xl font-bold">{totals.numberOfTransactions}</div>
						</div>
					</div>

					{/* Print Table */}
					{summaryByItem.length > 0 && (
						<div className="mb-8">
							<h2 className="text-lg font-bold mb-4">Sold Items Summary ({summaryByItem.length} items)</h2>
							<table className="w-full border-collapse border">
								<thead>
									<tr className="bg-gray-100">
										<th className="border p-2 text-left">Item Name</th>
										<th className="border p-2 text-left">Times Sold</th>
										{/*<th className="border p-2 text-right">Total Quantity</th>*/}
										<th className="border p-2 text-right">Total Amount</th>
									</tr>
								</thead>
								<tbody>
									{summaryByItem.map((item: SummaryByItem) => (
										<tr key={item.itemCode} className="border-b hover:bg-gray-50">
											<td className="border p-2 font-medium">{item.itemName}</td>
											<td className="border p-2">{item.timesSold}</td>
											{/*<td className="border p-2 text-right font-bold">{item.totalQuantity}</td>*/}
											<td className="border p-2 text-right font-bold text-green-600">
												{formatCurrency(item.totalAmount)}
											</td>
										</tr>
									))}
								</tbody>
								<tfoot className="bg-gray-50">
									<tr>
										<td colSpan={2} className="border p-2 font-bold">
											Totals
										</td>
										{/*<td className="border p-2 text-right font-bold">{totals.totalItemsSold}</td>*/}
										<td className="border p-2 text-right font-bold text-green-600">
											{formatCurrency(totals.totalSalesAmount)}
										</td>
									</tr>
								</tfoot>
							</table>
						</div>
					)}

					{/* Print Footer */}
					<div className="mt-8 pt-4 border-t text-sm text-gray-500">
						<p>This is an automated report generated by TRIBE System</p>
					</div>
				</div>
			</div>

			{/* Print Styles (only applied during print) */}
			<style>
				{`
          @media print {
            body * {
              visibility: hidden;
            }
            .print-container, .print-container * {
              visibility: visible;
            }
            .print-container {
              position: absolute;
              left: 0;
              top: 0;
              width: 100%;
              background: white;
            }
            .no-print {
              display: none !important;
            }
          }
        `}
			</style>
		</div>
	);
}
