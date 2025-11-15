import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import inventoryService from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/ui/card";
import { Switch } from "@/ui/switch";

interface Transaction {
	id: string;
	transactionId: string;
	amount: number;
	paymentMethod: string;
	customerContact?: string;
	createdAt: string;
	items: Array<{
		name: string;
		quantity: number;
		price: number;
	}>;
}

interface DailyTransactionsResponse {
	status: string;
	statusCode: number;
	message: string;
	data: Transaction[];
}

export default function NotificationsTab() {
	const [today, setToday] = useState(new Date().toISOString().split("T")[0]);
	const [lastRefresh, setLastRefresh] = useState(new Date());

	// Fetch today's transactions
	const {
		data: todayTransactions,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["today-transactions", today],
		queryFn: () => inventoryService.getDailyTransactions("HTL001", today),
		refetchInterval: 30000, // Refresh every 30 seconds
	});

	const transactionsData = todayTransactions as DailyTransactionsResponse;

	const handleSaveSettings = () => {
		// Here you would typically save the notification settings to your backend
		toast.success("Notification settings updated successfully!");
	};

	const handleRefresh = () => {
		refetch();
		setLastRefresh(new Date());
		toast.success("Transactions refreshed!");
	};

	const formatCurrency = (amount: number) => {
		return `KShs ${amount.toFixed(2)}`;
	};

	const formatTime = (dateString: string) => {
		return new Date(dateString).toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	// Get total sales for today
	const totalSales = transactionsData?.data?.reduce((total, transaction) => total + transaction.amount, 0) || 0;

	return (
		<div className="space-y-6">
			{/* Today's Transactions Section */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Today's Transactions</CardTitle>
						<CardDescription>
							Real-time sales transactions for {new Date(today).toLocaleDateString()}
							{totalSales > 0 && (
								<span className="ml-2 font-semibold text-green-600">• Total: {formatCurrency(totalSales)}</span>
							)}
						</CardDescription>
					</div>
					<div className="flex items-center gap-2">
						<Button variant="outline" size="sm" onClick={handleRefresh} disabled={isLoading}>
							<Icon icon="lucide:refresh-cw" className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
							Refresh
						</Button>
						<Badge variant={isLoading ? "secondary" : "default"}>
							{isLoading ? "Loading..." : `Last: ${lastRefresh.toLocaleTimeString()}`}
						</Badge>
					</div>
				</CardHeader>
				<CardContent>
					{isLoading ? (
						<div className="text-center py-8">
							<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
							<p className="text-muted-foreground">Loading today's transactions...</p>
						</div>
					) : error ? (
						<div className="text-center py-8 text-destructive">
							<Icon icon="lucide:alert-circle" className="h-8 w-8 mx-auto mb-4" />
							<p className="font-medium">Failed to load transactions</p>
							<p className="text-sm">{(error as Error).message}</p>
							<Button variant="outline" onClick={handleRefresh} className="mt-4">
								Retry
							</Button>
						</div>
					) : transactionsData?.data && transactionsData.data.length > 0 ? (
						<div className="space-y-3 max-h-96 overflow-y-auto">
							{transactionsData.data.map((transaction) => (
								<div
									key={transaction.id}
									className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-800"
								>
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<div
												className={`w-3 h-3 rounded-full ${
													transaction.paymentMethod === "mpesa" ? "bg-green-500" : "bg-blue-500"
												}`}
											/>
											<span className="font-mono text-sm font-bold">{transaction.transactionId}</span>
											<Badge variant={transaction.paymentMethod === "mpesa" ? "default" : "secondary"}>
												{transaction.paymentMethod === "mpesa" ? "M-Pesa" : "Cash"}
											</Badge>
										</div>
										<div className="text-sm text-muted-foreground">
											{transaction.customerContact && (
												<span className="mr-4">Contact: {transaction.customerContact}</span>
											)}
											<span>Time: {formatTime(transaction.createdAt)}</span>
										</div>
										{transaction.items && transaction.items.length > 0 && (
											<div className="text-xs text-muted-foreground mt-1">
												Items: {transaction.items.map((item) => `${item.name} (x${item.quantity})`).join(", ")}
											</div>
										)}
									</div>
									<div className="text-right">
										<div className="text-lg font-bold text-green-600">{formatCurrency(transaction.amount)}</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-12 text-muted-foreground">
							<Icon icon="lucide:shopping-cart" className="h-16 w-16 mx-auto mb-4 opacity-50" />
							<p className="text-lg font-medium">No transactions today</p>
							<p className="text-sm">Sales transactions will appear here as they occur</p>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Notification Settings */}
			<Card>
				<CardContent className="grid grid-cols-1 gap-4 lg:grid-cols-2 pt-6">
					<div className="flex-1">
						<h4 className="font-semibold">Activity Notifications</h4>
						<p className="text-text-secondary">Get notified about sales activities</p>
					</div>
					<div className="flex-2">
						<div className="flex w-full flex-col gap-4 rounded-lg px-6 py-8 bg-bg-neutral">
							<div className="flex w-full justify-between">
								<div>Email me for each successful sale</div>
								<Switch defaultChecked />
							</div>
							<div className="flex w-full justify-between">
								<div>Push notification for large transactions</div>
								<Switch defaultChecked />
							</div>
							<div className="flex w-full justify-between">
								<div>Daily sales summary report</div>
								<Switch defaultChecked />
							</div>
						</div>
					</div>

					<div className="flex-1">
						<h4 className="font-semibold">System Notifications</h4>
						<p className="text-text-secondary">System and application updates</p>
					</div>
					<div className="flex-2">
						<div className="flex w-full flex-col gap-4 rounded-lg px-6 py-8 bg-bg-neutral">
							<div className="flex w-full justify-between">
								<div>Low stock alerts</div>
								<Switch defaultChecked />
							</div>
							<div className="flex w-full justify-between">
								<div>End of day reports</div>
								<Switch />
							</div>
							<div className="flex w-full justify-between">
								<div>Weekly performance insights</div>
								<Switch defaultChecked />
							</div>
						</div>
					</div>
				</CardContent>
				<CardFooter className="flex w-full justify-end">
					<Button onClick={handleSaveSettings}>Save Notification Settings</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
