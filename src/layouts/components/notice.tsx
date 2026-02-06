import { useQuery } from "@tanstack/react-query";
import { type CSSProperties, useState } from "react";
import inventoryService from "@/api/services/inventoryService";
import CyanBlur from "@/assets/images/background/cyan-blur.png";
import RedBlur from "@/assets/images/background/red-blur.png";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { ScrollArea } from "@/ui/scroll-area";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Text } from "@/ui/typography";

export default function NoticeButton() {
	const [drawerOpen, setDrawerOpen] = useState(false);
	const [unreadCount, setUnreadCount] = useState(0);

	// Use existing endpoints
	const today = new Date().toISOString().split("T")[0];
	const { data: dailySales } = useQuery({
		queryKey: ["daily-sales-notice", today],
		queryFn: () => inventoryService.getDailySalesSummary("HTL001", today),
	});

	const { data: weeklyAnalytics } = useQuery({
		queryKey: ["weekly-analytics-notice"],
		queryFn: () => inventoryService.getWeeklyAnalytics("HTL001"),
	});

	// Calculate notification count based on data availability
	let count = 0;
	if (dailySales) count++;
	if (weeklyAnalytics) count++;
	if (count > unreadCount) setUnreadCount(count);

	const style: CSSProperties = {
		backdropFilter: "blur(20px)",
		backgroundImage: `url("${CyanBlur}"), url("${RedBlur}")`,
		backgroundRepeat: "no-repeat, no-repeat",
		backgroundPosition: "right top, left bottom",
		backgroundSize: "50%, 50%",
	};

	const handleMarkAllAsRead = () => {
		setUnreadCount(0);
		setDrawerOpen(false);
	};

	return (
		<>
			<div className="relative" onClick={() => setDrawerOpen(true)}>
				<Button variant="ghost" size="icon" className="rounded-full">
					<Icon icon="solar:bell-bing-bold-duotone" size={24} />
				</Button>
				{unreadCount > 0 && (
					<Badge variant="destructive" shape="circle" className="absolute -right-2 -top-2">
						{unreadCount > 99 ? "99+" : unreadCount}
					</Badge>
				)}
			</div>
			<Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
				<SheetContent side="right" className="sm:max-w-md p-0 [&>button]:hidden flex flex-col" style={style}>
					<SheetHeader className="flex flex-row items-center justify-between p-4 h-16 shrink-0">
						<SheetTitle>Business Insights</SheetTitle>
						<Button
							variant="ghost"
							size="icon"
							className="rounded-full text-primary"
							onClick={() => setDrawerOpen(false)}
						>
							<Icon icon="solar:close-circle-bold" size={20} />
						</Button>
					</SheetHeader>
					<div className="px-4 flex-1 overflow-hidden">
						<NoticeTab />
					</div>
					<SheetFooter className="flex flex-row h-16 w-full items-center justify-between p-4 shrink-0">
						<Button variant="outline" className="flex-1 mr-2" onClick={() => setUnreadCount(0)}>
							Dismiss all
						</Button>
						<Button className="flex-1 ml-2" onClick={handleMarkAllAsRead}>
							Mark as read
						</Button>
					</SheetFooter>
				</SheetContent>
			</Sheet>
		</>
	);
}

function NoticeTab() {
	const today = new Date().toISOString().split("T")[0];

	// Use existing endpoints
	const {
		data: dailySales,
		isLoading: dailyLoading,
		error: dailyError,
	} = useQuery({
		queryKey: ["daily-sales-drawer", today],
		queryFn: () => inventoryService.getDailySalesSummary("HTL001", today),
	});

	const {
		data: weeklyAnalytics,
		isLoading: weeklyLoading,
		error: weeklyError,
	} = useQuery({
		queryKey: ["weekly-analytics-drawer"],
		queryFn: () => inventoryService.getWeeklyAnalytics("HTL001"),
	});

	const formatCurrency = (amount: number) => {
		return `KShs ${amount?.toFixed(2) || "0.00"}`;
	};

	const _formatDate = (dateString: string) => {
		return new Date(dateString).toLocaleDateString("en-US", {
			weekday: "long",
			year: "numeric",
			month: "long",
			day: "numeric",
		});
	};

	// Daily Performance Notifications
	const dailyNotifications = [
		{
			id: 1,
			type: "sales",
			title: "Today's Sales Performance",
			message: dailySales
				? `Gross Sales: ${formatCurrency(dailySales.grossSales || 0)} • Net Sales: ${formatCurrency(dailySales.netSales || 0)}`
				: "Loading today's sales data...",
			time: "Updated just now",
			icon: "solar:chart-bold",
			color: "text-blue-600",
			bgColor: "bg-blue-50",
			data: dailySales,
		},
		{
			id: 2,
			type: "deductions",
			title: "Today's Deductions",
			message: dailySales
				? `Total deductions: ${formatCurrency(dailySales.deductions || 0)}`
				: "Loading deductions data...",
			time: "Updated just now",
			icon: "solar:receipt-bold",
			color: "text-red-600",
			bgColor: "bg-red-50",
			data: dailySales,
		},
	];

	// Weekly Performance Notifications
	const weeklyNotifications = [
		{
			id: 1,
			type: "revenue",
			title: "Weekly Revenue",
			message: weeklyAnalytics
				? `Total weekly revenue: ${formatCurrency(weeklyAnalytics.grossSales || 0)}`
				: "Loading weekly revenue...",
			time: "This week",
			icon: "solar:graph-bold",
			color: "text-green-600",
			bgColor: "bg-green-50",
			data: weeklyAnalytics,
		},
		{
			id: 2,
			type: "profit",
			title: "Weekly Net Profit",
			message: weeklyAnalytics
				? `Net sales for the week: ${formatCurrency(weeklyAnalytics.netSales || 0)}`
				: "Loading profit data...",
			time: "This week",
			icon: "solar:wallet-money-bold",
			color: "text-purple-600",
			bgColor: "bg-purple-50",
			data: weeklyAnalytics,
		},
		{
			id: 3,
			type: "trend",
			title: "Daily Trends Available",
			message: weeklyAnalytics?.dailyTrend
				? `${weeklyAnalytics.dailyTrend.length} days of sales data available`
				: "Loading trend data...",
			time: "Weekly overview",
			icon: "solar:trend-up-bold",
			color: "text-orange-600",
			bgColor: "bg-orange-50",
			data: weeklyAnalytics,
		},
	];

	// System Notifications
	const systemNotifications = [
		{
			id: 1,
			type: "summary",
			title: "Business Summary",
			message: "View detailed analytics in the analytics section",
			time: "Always available",
			icon: "solar:pie-chart-bold",
			color: "text-gray-600",
			bgColor: "bg-gray-50",
		},
		{
			id: 2,
			type: "performance",
			title: "Performance Tracking",
			message: "Monitor your daily and weekly business performance",
			time: "Real-time updates",
			icon: "solar:shield-check-bold",
			color: "text-green-600",
			bgColor: "bg-green-50",
		},
	];

	const renderNotification = (notification: any) => {
		return (
			<div key={notification.id} className="flex items-start space-x-3 py-4 border-b border-border last:border-b-0">
				<div className={`w-10 h-10 rounded-full flex items-center justify-center ${notification.bgColor}`}>
					<Icon icon={notification.icon} className={notification.color} size={20} />
				</div>

				<div className="flex-1 min-w-0">
					<div className="flex items-center justify-between">
						<div className="flex-1">
							<Text variant="subTitle2" className="font-semibold">
								{notification.title}
							</Text>
							<Text variant="body2" className="mt-1">
								{notification.message}
							</Text>
							<div className="flex items-center space-x-2 mt-2">
								<Text variant="caption" color="secondary">
									{notification.time}
								</Text>
							</div>
						</div>
					</div>

					{/* Show additional data if available */}
					{notification.data && (
						<div className="mt-3 p-3 bg-bg-neutral rounded-lg">
							{notification.type === "sales" && notification.data && (
								<div className="grid grid-cols-2 gap-2 text-sm">
									<div className="text-center p-2 bg-green-50 rounded">
										<div className="font-semibold text-green-700">Gross</div>
										<div className="font-bold">{formatCurrency(notification.data.grossSales || 0)}</div>
									</div>
									<div className="text-center p-2 bg-blue-50 rounded">
										<div className="font-semibold text-blue-700">Net</div>
										<div className="font-bold">{formatCurrency(notification.data.netSales || 0)}</div>
									</div>
								</div>
							)}

							{notification.type === "revenue" && notification.data && (
								<div className="text-center">
									<div className="text-lg font-bold text-green-600">
										{formatCurrency(notification.data.grossSales || 0)}
									</div>
									<Text variant="caption" color="secondary">
										Total weekly gross sales
									</Text>
								</div>
							)}
						</div>
					)}

					{/* Quick Actions */}
					<div className="mt-3 flex space-x-2">
						<Button size="sm" variant="outline">
							<Icon icon="solar:eye-bold" className="mr-1" size={14} />
							View Details
						</Button>
						{notification.type.includes("sales") && (
							<Button size="sm" variant="outline">
								<Icon icon="solar:chart-bold" className="mr-1" size={14} />
								Analytics
							</Button>
						)}
					</div>
				</div>
			</div>
		);
	};

	const isLoading = dailyLoading || weeklyLoading;
	const hasError = dailyError || weeklyError;

	if (isLoading) {
		return (
			<div className="flex flex-col items-center justify-center h-32">
				<Icon icon="eos-icons:loading" className="h-8 w-8 mb-2" />
				<Text variant="body2">Loading business insights...</Text>
			</div>
		);
	}

	if (hasError) {
		return (
			<div className="text-center py-8 text-destructive">
				<Icon icon="solar:alert-circle-bold" className="h-12 w-12 mx-auto mb-4" />
				<Text variant="subTitle2">Failed to load data</Text>
				<Text variant="caption" className="mt-2">
					{dailyError?.message || weeklyError?.message}
				</Text>
			</div>
		);
	}

	return (
		<Tabs defaultValue="daily" className="w-full h-full flex flex-col">
			<TabsList className="gap-2 w-full flex justify-between items-center shrink-0">
				<TabsTrigger value="daily" className="flex items-center gap-1">
					<span>Daily</span>
					<Badge variant="default">{dailyNotifications.length}</Badge>
				</TabsTrigger>
				<TabsTrigger value="weekly" className="flex items-center gap-1">
					<span>Weekly</span>
					<Badge variant="info">{weeklyNotifications.length}</Badge>
				</TabsTrigger>
				<TabsTrigger value="system" className="flex items-center gap-1">
					<span>System</span>
					<Badge variant="success">{systemNotifications.length}</Badge>
				</TabsTrigger>
			</TabsList>

			<TabsContent value="daily" className="flex-1 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="space-y-0">{dailyNotifications.map(renderNotification)}</div>
				</ScrollArea>
			</TabsContent>

			<TabsContent value="weekly" className="flex-1 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="space-y-0">{weeklyNotifications.map(renderNotification)}</div>
				</ScrollArea>
			</TabsContent>

			<TabsContent value="system" className="flex-1 overflow-hidden">
				<ScrollArea className="h-full">
					<div className="space-y-0">{systemNotifications.map(renderNotification)}</div>
				</ScrollArea>
			</TabsContent>
		</Tabs>
	);
}
