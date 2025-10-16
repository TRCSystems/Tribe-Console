// src/pages/dashboard/analysis/index.tsx - UPDATED VERSION
import { useQuery } from "@tanstack/react-query";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Cell,
	Line,
	LineChart,
	Pie,
	PieChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import campaignService from "@/api/services/campaignService";
import merchantService from "@/api/services/merchantService";
import { Icon } from "@/components/icon";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";

// Mock data generation for analytics (since API doesn't provide analytics yet)
const generateAnalyticsData = (campaigns: any[], merchants: any[]) => {
	const campaignPerformance = campaigns.map((campaign) => ({
		name: campaign.campaignName,
		performance: Math.floor(Math.random() * 100) + 50,
		engagement: Math.floor(Math.random() * 1000) + 200,
	}));

	const merchantDistribution = [
		{ name: "Retail", value: Math.floor(Math.random() * 40) + 20 },
		{ name: "Pharma", value: Math.floor(Math.random() * 30) + 15 },
		{ name: "Restaurant", value: Math.floor(Math.random() * 20) + 10 },
		{ name: "Services", value: Math.floor(Math.random() * 10) + 5 },
	];

	const monthlyTrends = [
		{ month: "Jan", campaigns: Math.floor(Math.random() * 10) + 5, merchants: Math.floor(Math.random() * 20) + 10 },
		{ month: "Feb", campaigns: Math.floor(Math.random() * 10) + 5, merchants: Math.floor(Math.random() * 20) + 10 },
		{ month: "Mar", campaigns: Math.floor(Math.random() * 10) + 5, merchants: Math.floor(Math.random() * 20) + 10 },
		{ month: "Apr", campaigns: campaigns.length, merchants: merchants.length },
	];

	return {
		campaignPerformance,
		merchantDistribution,
		monthlyTrends,
		totalCampaigns: campaigns.length,
		totalMerchants: merchants.length,
		activeCampaigns: campaigns.filter((c) => new Date(c.endDate) > new Date()).length,
		completedCampaigns: campaigns.filter((c) => new Date(c.endDate) <= new Date()).length,
	};
};

const COLORS = ["#0088FE", "#00C49F", "#FFBB28", "#FF8042"];

export default function AnalysisPage() {
	const { data: campaigns = [], isLoading: campaignsLoading } = useQuery({
		queryKey: ["campaigns-analysis"],
		queryFn: campaignService.getCampaigns,
	});

	const { data: merchants = [], isLoading: merchantsLoading } = useQuery({
		queryKey: ["merchants-analysis"],
		queryFn: merchantService.getMerchants,
	});

	const isLoading = campaignsLoading || merchantsLoading;
	const analyticsData = generateAnalyticsData(campaigns, merchants);

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold">Analytics Dashboard</h1>
					<p className="text-muted-foreground">Campaign and merchant performance insights</p>
				</div>
				<div className="text-center py-12">
					<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
					<p className="text-muted-foreground">Loading analytics data...</p>
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Analytics Dashboard</h1>
				<p className="text-muted-foreground">Campaign and merchant performance insights</p>
			</div>

			{/* Overview Cards */}
			<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Campaigns</p>
								<p className="text-2xl font-bold">{analyticsData.totalCampaigns}</p>
							</div>
							<Icon icon="lucide:megaphone" className="h-8 w-8 text-blue-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Active Campaigns</p>
								<p className="text-2xl font-bold text-green-600">{analyticsData.activeCampaigns}</p>
							</div>
							<Icon icon="lucide:activity" className="h-8 w-8 text-green-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Completed Campaigns</p>
								<p className="text-2xl font-bold text-orange-600">{analyticsData.completedCampaigns}</p>
							</div>
							<Icon icon="lucide:check-circle" className="h-8 w-8 text-orange-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Merchants</p>
								<p className="text-2xl font-bold text-purple-600">{analyticsData.totalMerchants}</p>
							</div>
							<Icon icon="lucide:store" className="h-8 w-8 text-purple-500 opacity-60" />
						</div>
					</CardContent>
				</Card>
			</div>

			<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
				{/* Campaign Performance */}
				<Card>
					<CardHeader>
						<CardTitle>Campaign Performance</CardTitle>
						<CardDescription>Performance metrics across all campaigns</CardDescription>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={300}>
							<BarChart data={analyticsData.campaignPerformance}>
								<CartesianGrid strokeDasharray="3 3" className="opacity-30" />
								<XAxis dataKey="name" tick={{ fontSize: 12 }} />
								<YAxis tick={{ fontSize: 12 }} />
								<Tooltip />
								<Bar dataKey="performance" fill="#3b82f6" radius={[4, 4, 0, 0]} />
							</BarChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				{/* Merchant Distribution */}
				<Card>
					<CardHeader>
						<CardTitle>Merchant Distribution</CardTitle>
						<CardDescription>Distribution of merchants by business type</CardDescription>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={300}>
							<PieChart>
								<Pie
									data={analyticsData.merchantDistribution}
									cx="50%"
									cy="50%"
									labelLine={false}
									label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
									outerRadius={80}
									fill="#8884d8"
									dataKey="value"
								>
									{analyticsData.merchantDistribution.map((entry, index) => (
										<Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
									))}
								</Pie>
								<Tooltip />
							</PieChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>

				{/* Monthly Trends */}
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Monthly Trends</CardTitle>
						<CardDescription>Campaign and merchant growth over time</CardDescription>
					</CardHeader>
					<CardContent>
						<ResponsiveContainer width="100%" height={300}>
							<LineChart data={analyticsData.monthlyTrends}>
								<CartesianGrid strokeDasharray="3 3" className="opacity-30" />
								<XAxis dataKey="month" tick={{ fontSize: 12 }} />
								<YAxis tick={{ fontSize: 12 }} />
								<Tooltip />
								<Legend />
								<Line type="monotone" dataKey="campaigns" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 6 }} />
								<Line type="monotone" dataKey="merchants" stroke="#10b981" strokeWidth={2} activeDot={{ r: 6 }} />
							</LineChart>
						</ResponsiveContainer>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
