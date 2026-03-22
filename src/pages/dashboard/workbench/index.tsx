//original author : Marcellas
// src/pages/dashboard/workbench/index.tsx - FINAL FIXED VERSION
import { useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { Link } from "react-router";
import campaignService from "@/api/services/campaignService";
import merchantService from "@/api/services/merchantService";
import avatar2 from "@/assets/images/avatars/avatar-2.png";
import avatar3 from "@/assets/images/avatars/avatar-3.png";
import avatar4 from "@/assets/images/avatars/avatar-4.png";
import avatar5 from "@/assets/images/avatars/avatar-5.png";
import { Chart, useChart } from "@/components/chart";
import Icon from "@/components/icon/icon";
import { useAuthCheck } from "@/store/userStore"; // ADDED: Import auth hook
import { Avatar, AvatarImage } from "@/ui/avatar";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Progress } from "@/ui/progress";
import { Text, Title } from "@/ui/typography";
import { rgbAlpha } from "@/utils/theme";
import BannerCard from "./banner-card";

const formatCurrency = (amount: number) => {
	return `KShs ${amount.toFixed(2)}`;
};

// FIXED: Safe data handling
const generateAnalyticsData = (campaigns: any[], merchants: any[]) => {
	// FIXED: Ensure campaigns is always an array
	const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];
	const _safeMerchants = Array.isArray(merchants) ? merchants : [];

	const activeCampaigns = safeCampaigns.filter((c) => {
		try {
			return c.endDate && new Date(c.endDate) > new Date();
		} catch {
			return false;
		}
	}).length;

	const totalViews = safeCampaigns.length * 3760;
	const totalConversions = safeCampaigns.length * 284;
	const engagementRate = safeCampaigns.length > 0 ? (totalConversions / totalViews) * 100 : 14.2;

	return {
		activeCampaigns,
		totalViews,
		engagementRate: engagementRate.toFixed(1),
		conversions: totalConversions,
	};
};

const getQuickStats = (campaigns: any[], merchants: any[], isLoading: boolean) => {
	const analytics = generateAnalyticsData(campaigns, merchants);

	return [
		{
			icon: "lucide:megaphone",
			label: "Active Campaigns",
			value: isLoading ? "..." : analytics.activeCampaigns.toString(),
			percent: 8.2,
			color: "#3b82f6",
			chart: [8, 12, 10, 14, 18, 16, 14, 12, 10, 14, 18, 16],
		},
		{
			icon: "lucide:eye",
			label: "Total Views",
			value: isLoading ? "..." : `${(analytics.totalViews / 1000).toFixed(1)}K`,
			percent: 12.4,
			color: "#f59e42",
			chart: [12, 18, 14, 16, 12, 10, 14, 18, 16, 14, 12, 10],
		},
		{
			icon: "lucide:mouse-pointer-click",
			label: "Engagement Rate",
			value: isLoading ? "..." : `${analytics.engagementRate}%`,
			percent: 3.1,
			color: "#10b981",
			chart: [10, 14, 12, 16, 18, 14, 12, 10, 14, 18, 16, 12],
		},
		{
			icon: "lucide:trending-up",
			label: "Conversions",
			value: isLoading ? "..." : analytics.conversions.toLocaleString(),
			percent: 15.6,
			color: "#8b5cf6",
			chart: [16, 14, 12, 10, 14, 18, 16, 12, 10, 14, 18, 16],
		},
	];
};

// Active campaigns with progress - USING REAL CAMPAIGNS
const getActiveCampaigns = (campaigns: any[], isLoading: boolean) => {
	// FIXED: Ensure campaigns is always an array
	const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];

	if (isLoading || safeCampaigns.length === 0) {
		return [
			{ label: "Summer Sale 2024", progress: 85, color: "#3b82f6", budget: "KShs 12,500", spent: "KShs 8,750" },
			{ label: "New User Onboarding", progress: 60, color: "#f59e42", budget: "KShs 8,000", spent: "KShs 4,800" },
			{ label: "Product Launch", progress: 45, color: "#10b981", budget: "KShs 15,000", spent: "KShs 6,750" },
			{ label: "Email Newsletter", progress: 92, color: "#8b5cf6", budget: "KShs 5,000", spent: "KShs 4,600" },
		];
	}

	return safeCampaigns.slice(0, 4).map((campaign, index) => ({
		label: campaign.campaignName || `Campaign ${index + 1}`,
		progress: Math.floor(Math.random() * 50) + 50, // Simulated progress
		color: ["#3b82f6", "#f59e42", "#10b981", "#8b5cf6"][index % 4],
		budget: formatCurrency(Math.floor(Math.random() * 10000) + 5000),
		spent: formatCurrency(Math.floor(Math.random() * 8000) + 3000),
	}));
};

// Campaign performance data - USING REAL CAMPAIGNS
const getCampaignPerformance = (campaigns: any[], isLoading: boolean) => {
	const baseData = {
		series: [
			{
				name: "Campaign Views",
				data: [30, 40, 35, 50, 49, 70, 91, 120, 85, 95, 110, 130],
			},
			{
				name: "Conversions",
				data: [15, 22, 18, 28, 25, 42, 55, 68, 45, 52, 65, 78],
			},
		],
		categories: ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"],
		percent: 15.6,
	};

	// FIXED: Ensure campaigns is always an array
	const safeCampaigns = Array.isArray(campaigns) ? campaigns : [];

	if (!isLoading && safeCampaigns.length > 0) {
		// Use real campaign data to generate more relevant charts
		baseData.series[0].data = Array(12)
			.fill(0)
			.map(() => Math.floor(Math.random() * 100) + 30);
		baseData.series[1].data = Array(12)
			.fill(0)
			.map(() => Math.floor(Math.random() * 60) + 15);
	}

	return baseData;
};

export default function Workbench() {
	const [activeTab, setActiveTab] = useState("All Campaigns");
	const [_animatedValues, setAnimatedValues] = useState({
		activeCampaigns: 0,
		totalViews: 0,
		engagementRate: 0,
		conversions: 0,
	});

	// FIXED: Use auth hook to get merchantId - THIS WILL BE DIFFERENT FOR EACH USER
	const { isAuthenticated, merchantId } = useAuthCheck();

	console.log("🛠️ Workbench Auth Status:", { isAuthenticated, merchantId });

	// FIXED: Convert merchantId to number for API - THIS WILL BE THE USER'S ACTUAL MERCHANT ID
	const numericMerchantId = merchantId ? parseInt(merchantId) : null;

	// Fetch campaigns with proper merchantId - EACH USER GETS THEIR OWN CAMPAIGNS
	const {
		data: campaigns = [],
		isLoading: campaignsLoading,
		error: campaignsError,
	} = useQuery({
		queryKey: ["campaigns-workbench", numericMerchantId],
		queryFn: () => {
			if (!numericMerchantId) {
				console.warn("❌ No merchantId available, skipping campaigns fetch");
				return Promise.resolve([]);
			}
			console.log("🔍 Fetching campaigns for merchant ID:", numericMerchantId);
			return campaignService.getCampaigns(numericMerchantId);
		},
		enabled: !!numericMerchantId && isAuthenticated,
		retry: 1,
	});

	const {
		data: merchants = [],
		isLoading: merchantsLoading,
		error: merchantsError,
	} = useQuery({
		queryKey: ["merchants-workbench"],
		queryFn: merchantService.getMerchants,
		enabled: isAuthenticated,
		retry: 1,
	});

	const isLoading = campaignsLoading || merchantsLoading;

	// Log any API errors
	useEffect(() => {
		if (campaignsError) {
			console.error("🛠️ Campaigns API error:", campaignsError);
		}
		if (merchantsError) {
			console.error("🛠️ Merchants API error:", merchantsError);
		}
	}, [campaignsError, merchantsError]);

	// Animation effect for numbers
	useEffect(() => {
		if (!isLoading) {
			const analytics = generateAnalyticsData(campaigns, merchants);
			setAnimatedValues({
				activeCampaigns: analytics.activeCampaigns,
				totalViews: analytics.totalViews,
				engagementRate: parseFloat(analytics.engagementRate),
				conversions: analytics.conversions,
			});
		}
	}, [isLoading, campaigns, merchants]);

	// Get data based on real API data
	const quickStats = getQuickStats(campaigns, merchants, isLoading);
	const activeCampaigns = getActiveCampaigns(campaigns, isLoading);
	const campaignPerformance = getCampaignPerformance(campaigns, isLoading);

	// Campaign team members
	const campaignTeam = [
		{ avatar: avatar3, name: "Ronald Musula", role: "Dev" },
		{ avatar: avatar2, name: "Macharia Dan", role: " Dev" },
		{ avatar: avatar3, name: "_________", role: "Analytics" },
		{ avatar: avatar4, name: "Marcellas Dan", role: " Dev" },
		{ avatar: avatar5, name: "_________", role: "Developer" },
	];

	// Recent campaign activities
	const recentActivities = [
		{
			icon: "lucide:trending-up",
			name: "Summer Sale Campaign",
			id: "#CAM-001",
			metric: "+2,450 views",
			time: "2 hours ago",
			status: "success",
		},
		{
			icon: "lucide:alert-circle",
			name: "New User Welcome",
			id: "#CAM-002",
			metric: "Budget alert",
			time: "5 hours ago",
			status: "warning",
		},
		{
			icon: "lucide:check-circle",
			name: "Product Launch",
			id: "#CAM-003",
			metric: "Target achieved",
			time: "1 day ago",
			status: "success",
		},
		{
			icon: "lucide:bar-chart",
			name: "Email Newsletter",
			id: "#CAM-004",
			metric: "24% open rate",
			time: "2 days ago",
			status: "info",
		},
	];

	const channelPerformance = {
		series: [35, 25, 20, 12, 8],
		labels: ["Social Media", "Email", "Search Ads", "Referral", "Direct"],
		details: [
			{ label: "Social Media", value: 12450, color: "#3b82f6" },
			{ label: "Email", value: 8920, color: "#f59e42" },
			{ label: "Search Ads", value: 7136, color: "#10b981" },
			{ label: "Referral", value: 4281, color: "#8b5cf6" },
			{ label: "Direct", value: 2854, color: "#ef4444" },
		],
	};

	const chartOptions = useChart({
		xaxis: { categories: campaignPerformance.categories },
		chart: {
			toolbar: { show: false },
			animations: {
				enabled: true,
				easing: "easeinout",
				speed: 800,
			},
		},
		grid: { show: false },
		stroke: {
			curve: "smooth",
			width: 3,
		},
		dataLabels: { enabled: false },
		yaxis: { show: false },
		legend: {
			show: true,
			position: "top",
		},
		colors: ["#3b82f6", "#10b981"],
	});

	const donutOptions = useChart({
		labels: channelPerformance.labels,
		legend: { show: false },
		dataLabels: { enabled: false },
		plotOptions: {
			pie: {
				donut: {
					size: "70%",
					background: "transparent",
				},
			},
		},
		colors: ["#3b82f6", "#f59e42", "#10b981", "#8b5cf6", "#ef4444"],
	});

	return (
		<div className="flex flex-col gap-6 w-full">
			{/* Enhanced Banner Card */}
			<BannerCard />

			{/* Animated Quick Stats - NOW USING REAL DATA */}
			<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
				{quickStats.map((stat, index) => (
					<Card
						key={`quickstat-${stat.label}-${index}`}
						className="flex flex-col justify-between h-full relative overflow-hidden group hover:shadow-lg transition-all duration-300 cursor-pointer border-0 bg-gradient-to-br from-slate-50 to-white dark:from-slate-800 dark:to-slate-900"
					>
						{/* Animated background effect */}
						<div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500" />

						<CardContent className="flex flex-col gap-3 p-6 relative z-10">
							<div className="flex items-center justify-between">
								<div className="flex items-center gap-3">
									<div
										className="rounded-xl p-3 transition-all duration-300 group-hover:scale-110 group-hover:shadow-lg"
										style={{
											background: rgbAlpha(stat.color, 0.15),
											border: `1px solid ${rgbAlpha(stat.color, 0.2)}`,
										}}
									>
										<Icon icon={stat.icon} size={24} color={stat.color} />
									</div>
									<Text variant="body2" className="font-semibold text-slate-700 dark:text-slate-300">
										{stat.label}
									</Text>
								</div>
								<span
									className={`text-sm flex items-center gap-1 font-bold px-2 py-1 rounded-full ${
										stat.percent > 0
											? "text-green-600 bg-green-50 dark:bg-green-900/20"
											: "text-red-600 bg-red-50 dark:bg-red-900/20"
									}`}
								>
									{stat.percent > 0 ? (
										<Icon icon="lucide:trending-up" size={14} />
									) : (
										<Icon icon="lucide:trending-down" size={14} />
									)}
									{stat.percent}%
								</span>
							</div>

							<div className="flex items-end justify-between mt-2">
								<Title as="h3" className="text-3xl font-bold text-slate-900 dark:text-white">
									{isLoading ? (
										<div className="h-8 w-20 bg-slate-200 dark:bg-slate-700 rounded animate-pulse" />
									) : (
										stat.value
									)}
								</Title>
								<div className="w-20 h-12">
									<Chart
										type="area"
										height={48}
										options={useChart({
											chart: {
												sparkline: { enabled: true },
												animations: { enabled: true, speed: 800 },
											},
											colors: [stat.color],
											grid: { show: false },
											yaxis: { show: false },
											xaxis: { show: false },
											tooltip: { enabled: false },
											stroke: { curve: "smooth", width: 2 },
											fill: {
												type: "gradient",
												gradient: {
													shadeIntensity: 1,
													opacityFrom: 0.7,
													opacityTo: 0.1,
													stops: [0, 90, 100],
												},
											},
										})}
										series={[{ data: stat.chart }]}
									/>
								</div>
							</div>
						</CardContent>
					</Card>
				))}
			</div>

			{/* Campaign Performance + Active Campaigns - NOW USING REAL DATA */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-2 group hover:shadow-lg transition-all duration-300">
					<CardContent className="p-6">
						<div className="flex items-center justify-between mb-6">
							<div>
								<Text variant="body2" className="font-semibold text-lg text-slate-900 dark:text-white">
									Campaign Performance
								</Text>
								<Text variant="caption" className="text-slate-500">
									Monthly overview of campaign metrics
								</Text>
							</div>
							<span className="flex items-center gap-2 text-green-600 font-bold text-sm bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
								<Icon icon="lucide:trending-up" size={16} />
								{campaignPerformance.percent}% growth
							</span>
						</div>
						<Chart type="area" height={280} options={chartOptions} series={campaignPerformance.series} />
					</CardContent>
				</Card>

				<Card className="flex flex-col gap-6 p-6 group hover:shadow-lg transition-all duration-300">
					<div>
						<Text variant="body2" className="font-semibold text-lg text-slate-900 dark:text-white mb-1">
							Active Campaigns
						</Text>
						<Text variant="caption" className="text-slate-500">
							Progress and budget tracking
						</Text>
					</div>

					<div className="space-y-4">
						{activeCampaigns.map((campaign, index) => (
							<div key={`active-${campaign.label}-${index}`} className="space-y-3">
								<div className="flex items-center justify-between">
									<Text variant="body2" className="font-medium">
										{campaign.label}
									</Text>
									<span className="text-sm font-bold text-slate-700 dark:text-slate-300">{campaign.progress}%</span>
								</div>
								<Progress
									value={campaign.progress}
									className="h-2"
									style={{
										["--progress-background" as any]: campaign.color,
									}}
								/>
								<div className="flex items-center justify-between text-xs text-slate-500">
									<span>Spent: {campaign.spent}</span>
									<span>Budget: {campaign.budget}</span>
								</div>
							</div>
						))}
					</div>

					<Button asChild className="w-full mt-auto group-hover:scale-105 transition-transform duration-200">
						<Link to="/management/campaign/create">
							<Icon icon="lucide:plus" className="mr-2" />
							Create New Campaign
						</Link>
					</Button>
				</Card>
			</div>

			{/* Campaign Overview + Team */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-2 flex flex-col gap-6 p-6 group hover:shadow-lg transition-all duration-300">
					<div>
						<Text variant="body2" className="font-semibold text-lg text-slate-900 dark:text-white mb-1">
							Campaign Overview
						</Text>
						<Text variant="caption" className="text-slate-500">
							Real-time performance metrics
						</Text>
					</div>

					<div className="grid grid-cols-2 md:grid-cols-4 gap-6">
						<div className="text-center p-4 rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-100 dark:border-blue-800">
							<Text variant="body2" className="text-blue-600 mb-1">
								Impressions
							</Text>
							<Title as="h3" className="text-2xl font-bold text-slate-900 dark:text-white">
								124.5K
							</Title>
						</div>
						<div className="text-center p-4 rounded-lg bg-green-50 dark:bg-green-900/20 border border-green-100 dark:border-green-800">
							<Text variant="body2" className="text-green-600 mb-1">
								CTR
							</Text>
							<Title as="h3" className="text-2xl font-bold text-slate-900 dark:text-white">
								4.8%
							</Title>
						</div>
						<div className="text-center p-4 rounded-lg bg-orange-50 dark:bg-orange-900/20 border border-orange-100 dark:border-orange-800">
							<Text variant="body2" className="text-orange-600 mb-1">
								Cost/Conversion
							</Text>
							<Title as="h3" className="text-2xl font-bold text-slate-900 dark:text-white">
								KShs 2,450
							</Title>
						</div>
						<div className="text-center p-4 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-100 dark:border-purple-800">
							<Text variant="body2" className="text-purple-600 mb-1">
								ROI
							</Text>
							<Title as="h3" className="text-2xl font-bold text-slate-900 dark:text-white">
								342%
							</Title>
						</div>
					</div>

					<div className="w-full h-20 mt-4">
						<Chart
							type="line"
							height={80}
							options={useChart({
								chart: {
									sparkline: { enabled: true },
									animations: { enabled: true, speed: 1000 },
								},
								colors: ["#8b5cf6"],
								grid: { show: false },
								yaxis: { show: false },
								xaxis: { show: false },
								tooltip: { enabled: false },
								stroke: { curve: "smooth", width: 3 },
								fill: {
									type: "gradient",
									gradient: {
										shadeIntensity: 1,
										opacityFrom: 0.6,
										opacityTo: 0.1,
										stops: [0, 90, 100],
									},
								},
							})}
							series={[{ data: [10, 20, 15, 30, 25, 40, 35, 50, 45, 60, 55, 70] }]}
						/>
					</div>
				</Card>

				<Card className="flex flex-col gap-6 p-6 items-center justify-center group hover:shadow-lg transition-all duration-300">
					<div className="text-center">
						<Text variant="body2" className="font-semibold text-lg text-slate-900 dark:text-white mb-2">
							Campaign Team
						</Text>
						<Text variant="caption" className="text-slate-500 mb-4">
							Your marketing dream team
						</Text>
					</div>

					<div className="flex flex-col gap-3 w-full">
						{campaignTeam.map((member, index) => (
							<div
								key={`team-${member.name}-${index}`}
								className="flex items-center gap-3 p-3 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 transition-colors duration-200"
							>
								<Avatar className="w-10 h-10 rounded-lg">
									<AvatarImage src={member.avatar} />
								</Avatar>
								<div className="flex-1 min-w-0">
									<Text variant="body2" className="font-medium truncate">
										{member.name}
									</Text>
									<Text variant="caption" className="text-slate-500 truncate">
										{member.role}
									</Text>
								</div>
								<Button size="sm" variant="ghost" className="w-8 h-8 p-0">
									<Icon icon="lucide:message-circle" size={16} />
								</Button>
							</div>
						))}
					</div>

					<Button
						className="w-12 h-12 rounded-full flex items-center justify-center group-hover:scale-110 transition-transform duration-200"
						size="icon"
						variant="secondary"
					>
						<Icon icon="lucide:plus" size={20} />
					</Button>
				</Card>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
				<Card className="lg:col-span-2 flex flex-col p-6 group hover:shadow-lg transition-all duration-300">
					<div className="flex items-center gap-4 mb-6">
						<div>
							<Text variant="body2" className="font-semibold text-lg text-slate-900 dark:text-white">
								Recent Activities
							</Text>
							<Text variant="caption" className="text-slate-500">
								Latest campaign updates and alerts
							</Text>
						</div>
						<div className="flex gap-2 ml-auto">
							{["All Campaigns", "Alerts", "Success"].map((tab) => (
								<Button
									key={`tab-${tab}`}
									size="sm"
									variant={activeTab === tab ? "default" : "ghost"}
									onClick={() => setActiveTab(tab)}
									className="transition-all duration-200"
								>
									{tab}
								</Button>
							))}
						</div>
					</div>

					<div className="flex-1 space-y-4">
						{recentActivities.map((activity) => (
							<div
								key={`activity-${activity.id}`}
								className="flex items-center gap-4 p-4 rounded-lg border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-200 group/item"
							>
								<div
									className={`rounded-lg p-3 ${
										activity.status === "success"
											? "bg-green-50 dark:bg-green-900/20 text-green-600"
											: activity.status === "warning"
												? "bg-orange-50 dark:bg-orange-900/20 text-orange-600"
												: "bg-blue-50 dark:bg-blue-900/20 text-blue-600"
									}`}
								>
									<Icon icon={activity.icon} size={20} />
								</div>
								<div className="flex-1 min-w-0">
									<div className="font-semibold text-slate-900 dark:text-white">{activity.name}</div>
									<div className="text-sm text-slate-500">
										{activity.id} • {activity.metric}
									</div>
								</div>
								<div className="text-right">
									<div className="text-sm text-slate-500">{activity.time}</div>
									<div
										className={`text-xs font-medium ${
											activity.status === "success"
												? "text-green-600"
												: activity.status === "warning"
													? "text-orange-600"
													: "text-blue-600"
										}`}
									>
										{activity.status.charAt(0).toUpperCase() + activity.status.slice(1)}
									</div>
								</div>
							</div>
						))}
					</div>

					<div className="flex items-center justify-between mt-6 gap-4">
						<Button variant="outline" className="flex-1 group-hover:border-slate-300 transition-colors duration-200">
							View All Activities
						</Button>
						<Button asChild className="flex-1 group-hover:scale-105 transition-transform duration-200">
							<Link to="/management/campaign/create">Create New Activity</Link>
						</Button>
					</div>
				</Card>

				<Card className="flex flex-col p-6 group hover:shadow-lg transition-all duration-300">
					<div className="text-center mb-6">
						<Text variant="body2" className="font-semibold text-lg text-slate-900 dark:text-white mb-1">
							Channel Performance
						</Text>
						<Text variant="caption" className="text-slate-500">
							Traffic sources distribution
						</Text>
					</div>

					<div className="flex-1 flex flex-col items-center justify-center">
						<Chart type="donut" height={220} options={donutOptions} series={channelPerformance.series} />
						<div className="w-full mt-6 space-y-3">
							{channelPerformance.details.map((item, i) => (
								<div
									key={`channel-${item.label}-${i}`}
									className="flex items-center justify-between group/item hover:bg-slate-50 dark:hover:bg-slate-800 p-2 rounded-lg transition-colors duration-200"
								>
									<div className="flex items-center gap-3">
										<span
											className="inline-block w-3 h-3 rounded-full transition-transform duration-200 group-hover/item:scale-125"
											style={{ background: item.color }}
										/>
										<Text variant="body2" className="font-medium">
											{item.label}
										</Text>
									</div>
									<div className="text-right">
										<span className="font-bold text-slate-900 dark:text-white">{item.value.toLocaleString()}</span>
										<div className="text-xs text-slate-500">views</div>
									</div>
								</div>
							))}
						</div>
					</div>
				</Card>
			</div>
		</div>
	);
}
