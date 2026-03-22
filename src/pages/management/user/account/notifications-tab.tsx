//original author : Marcellas
// src/pages/management/user-account/notifications-tab.tsx - FINAL VERSION
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import inventoryService from "@/api/services/inventoryService";
import { Icon } from "@/components/icon";
import { useMerchantId } from "@/store/userStore";
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
	const [today, _setToday] = useState(new Date().toISOString().split("T")[0]);
	const [lastRefresh, setLastRefresh] = useState(new Date());
	const merchantId = useMerchantId();

	// Notification settings state
	const [notificationSettings, setNotificationSettings] = useState({
		emailSales: true,
		pushLargeTransactions: true,
		dailySummary: true,
		lowStockAlerts: true,
		endOfDayReports: false,
		weeklyInsights: true,
	});

	// Fetch today's transactions
	const {
		data: todayTransactions,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["today-transactions", today, merchantId],
		queryFn: () => inventoryService.getDailySalesSummary(merchantId || "HTL001", today),
		refetchInterval: 30000, // Refresh every 30 seconds
		enabled: !!merchantId, // Only fetch if we have a merchant ID
	});

	const transactionsData = todayTransactions as DailyTransactionsResponse;

	const handleSaveSettings = () => {
		// Here you would typically save the notification settings to your backend
		// For now, we'll just show a success message
		toast.success("Notification settings updated successfully!");

		// In a real app, you would make an API call here:
		// userService.updateNotificationSettings(notificationSettings);
	};

	const handleRefresh = () => {
		refetch();
		setLastRefresh(new Date());
		toast.success("Transactions refreshed!");
	};

	const handleSettingChange = (key: keyof typeof notificationSettings, value: boolean) => {
		setNotificationSettings((prev) => ({
			...prev,
			[key]: value,
		}));
	};

	const formatCurrency = (amount: number) => {
		return `KShs ${amount.toLocaleString()}`;
	};

	const formatTime = (dateString: string) => {
		return new Date(dateString).toLocaleTimeString([], {
			hour: "2-digit",
			minute: "2-digit",
		});
	};

	const formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-KE", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	// Get total sales for today
	const totalSales = transactionsData?.data?.reduce((total, transaction) => total + transaction.amount, 0) || 0;
	const transactionCount = transactionsData?.data?.length || 0;

	// Auto-refresh when merchantId changes
	useEffect(() => {
		if (merchantId) {
			refetch();
		}
	}, [merchantId, refetch]);

	return (
		<div className="space-y-6">
			{/* Today's Transactions Section */}
			<Card>
				<CardHeader className="flex flex-row items-center justify-between">
					<div>
						<CardTitle>Today's Transactions</CardTitle>
						<CardDescription>
							Real-time sales transactions for {formatDate(today)}
							{merchantId && (
								<span className="ml-2 text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Merchant: {merchantId}</span>
							)}
						</CardDescription>
						{totalSales > 0 && (
							<div className="flex gap-4 mt-2">
								<Badge variant="outline" className="bg-green-50 text-green-700">
									Total Sales: {formatCurrency(totalSales)}
								</Badge>
								<Badge variant="outline" className="bg-blue-50 text-blue-700">
									Transactions: {transactionCount}
								</Badge>
							</div>
						)}
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
					{!merchantId ? (
						<div className="text-center py-8 text-amber-600">
							<Icon icon="lucide:alert-triangle" className="h-8 w-8 mx-auto mb-4" />
							<p className="font-medium">Merchant ID not available</p>
							<p className="text-sm">Please check your account authentication</p>
						</div>
					) : isLoading ? (
						<div className="text-center py-8">
							<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
							<p className="text-muted-foreground">Loading today's transactions...</p>
							<p className="text-xs text-muted-foreground mt-2">Merchant: {merchantId}</p>
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
									className="flex items-center justify-between p-4 border rounded-lg bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
								>
									<div className="flex-1">
										<div className="flex items-center gap-3 mb-2">
											<div
												className={`w-3 h-3 rounded-full ${
													transaction.paymentMethod === "mpesa"
														? "bg-green-500"
														: transaction.paymentMethod === "cash"
															? "bg-blue-500"
															: "bg-purple-500"
												}`}
											/>
											<span className="font-mono text-sm font-bold">{transaction.transactionId}</span>
											<Badge
												variant={
													transaction.paymentMethod === "mpesa"
														? "default"
														: transaction.paymentMethod === "cash"
															? "secondary"
															: "outline"
												}
											>
												{transaction.paymentMethod === "mpesa"
													? "M-Pesa"
													: transaction.paymentMethod === "cash"
														? "Cash"
														: transaction.paymentMethod}
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
										<div className="text-xs text-muted-foreground mt-1">{formatTime(transaction.createdAt)}</div>
									</div>
								</div>
							))}
						</div>
					) : (
						<div className="text-center py-12 text-muted-foreground">
							<Icon icon="lucide:shopping-cart" className="h-16 w-16 mx-auto mb-4 opacity-50" />
							<p className="text-lg font-medium">No transactions today</p>
							<p className="text-sm">Sales transactions will appear here as they occur</p>
							{merchantId && <p className="text-xs mt-2">Merchant ID: {merchantId}</p>}
						</div>
					)}
				</CardContent>
			</Card>

			{/* Notification Settings */}
			<Card>
				<CardHeader>
					<CardTitle>Notification Preferences</CardTitle>
					<CardDescription>Manage how you receive notifications and alerts</CardDescription>
				</CardHeader>
				<CardContent className="grid grid-cols-1 gap-6 lg:grid-cols-2">
					<div className="space-y-6">
						<div>
							<h4 className="font-semibold mb-2">Activity Notifications</h4>
							<p className="text-text-secondary text-sm mb-4">Get notified about sales activities</p>
							<div className="space-y-4 rounded-lg border p-4">
								<div className="flex items-center justify-between">
									<div className="space-y-1">
										<div className="font-medium">Email for successful sales</div>
										<div className="text-xs text-muted-foreground">Receive email for each completed transaction</div>
									</div>
									<Switch
										checked={notificationSettings.emailSales}
										onCheckedChange={(checked) => handleSettingChange("emailSales", checked)}
									/>
								</div>
								<div className="flex items-center justify-between">
									<div className="space-y-1">
										<div className="font-medium">Push for large transactions</div>
										<div className="text-xs text-muted-foreground">Get notified for transactions above KShs 10,000</div>
									</div>
									<Switch
										checked={notificationSettings.pushLargeTransactions}
										onCheckedChange={(checked) => handleSettingChange("pushLargeTransactions", checked)}
									/>
								</div>
								<div className="flex items-center justify-between">
									<div className="space-y-1">
										<div className="font-medium">Daily sales summary</div>
										<div className="text-xs text-muted-foreground">Receive end-of-day sales report</div>
									</div>
									<Switch
										checked={notificationSettings.dailySummary}
										onCheckedChange={(checked) => handleSettingChange("dailySummary", checked)}
									/>
								</div>
							</div>
						</div>
					</div>

					<div className="space-y-6">
						<div>
							<h4 className="font-semibold mb-2">System Notifications</h4>
							<p className="text-text-secondary text-sm mb-4">System and application updates</p>
							<div className="space-y-4 rounded-lg border p-4">
								<div className="flex items-center justify-between">
									<div className="space-y-1">
										<div className="font-medium">Low stock alerts</div>
										<div className="text-xs text-muted-foreground">Get notified when inventory is running low</div>
									</div>
									<Switch
										checked={notificationSettings.lowStockAlerts}
										onCheckedChange={(checked) => handleSettingChange("lowStockAlerts", checked)}
									/>
								</div>
								<div className="flex items-center justify-between">
									<div className="space-y-1">
										<div className="font-medium">End of day reports</div>
										<div className="text-xs text-muted-foreground">Detailed daily performance reports</div>
									</div>
									<Switch
										checked={notificationSettings.endOfDayReports}
										onCheckedChange={(checked) => handleSettingChange("endOfDayReports", checked)}
									/>
								</div>
								<div className="flex items-center justify-between">
									<div className="space-y-1">
										<div className="font-medium">Weekly insights</div>
										<div className="text-xs text-muted-foreground">Weekly performance and analytics</div>
									</div>
									<Switch
										checked={notificationSettings.weeklyInsights}
										onCheckedChange={(checked) => handleSettingChange("weeklyInsights", checked)}
									/>
								</div>
							</div>
						</div>
					</div>
				</CardContent>
				<CardFooter className="flex justify-between border-t pt-6">
					<Button
						variant="outline"
						onClick={() => {
							setNotificationSettings({
								emailSales: true,
								pushLargeTransactions: true,
								dailySummary: true,
								lowStockAlerts: true,
								endOfDayReports: false,
								weeklyInsights: true,
							});
							toast.info("Settings reset to defaults");
						}}
					>
						Reset to Defaults
					</Button>
					<Button onClick={handleSaveSettings}>Save Notification Settings</Button>
				</CardFooter>
			</Card>
		</div>
	);
}
