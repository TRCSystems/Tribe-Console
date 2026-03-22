//original author : Marcellas
// src/pages/management/campaign/list/index.tsx - FINAL FIXED VERSION

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import { Link } from "react-router";
import {
	Bar,
	BarChart,
	CartesianGrid,
	Legend,
	Line,
	LineChart,
	ResponsiveContainer,
	Tooltip,
	XAxis,
	YAxis,
} from "recharts";
import campaignService from "@/api/services/campaignService";
import { Icon } from "@/components/icon";
import { useAuthCheck } from "@/store/userStore"; // ADDED: Import auth hook
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

interface Campaign {
	id: string;
	campaignName: string;
	campaignType: string;
	targetAudience: string;
	startDate: string;
	endDate: string;
	messages: Array<{ message: string }>;
	createdAt: string;
	updatedAt: string;
}

// Mock analytics data (since the API doesn't provide analytics yet)
const generateMockAnalytics = (_campaign: Campaign) => {
	const baseViews = Math.floor(Math.random() * 1000) + 500;
	const baseClicks = Math.floor(baseViews * 0.6);
	const baseConversions = Math.floor(baseClicks * 0.15);

	return {
		views: baseViews,
		clicks: baseClicks,
		conversions: baseConversions,
		conversionRate: `${((baseConversions / baseClicks) * 100).toFixed(1)}%`,
		weeklyData: [
			{
				name: "Week 1",
				views: Math.floor(baseViews * 0.2),
				clicks: Math.floor(baseClicks * 0.2),
				conversions: Math.floor(baseConversions * 0.2),
			},
			{
				name: "Week 2",
				views: Math.floor(baseViews * 0.25),
				clicks: Math.floor(baseClicks * 0.25),
				conversions: Math.floor(baseConversions * 0.25),
			},
			{
				name: "Week 3",
				views: Math.floor(baseViews * 0.3),
				clicks: Math.floor(baseClicks * 0.3),
				conversions: Math.floor(baseConversions * 0.3),
			},
			{
				name: "Week 4",
				views: Math.floor(baseViews * 0.25),
				clicks: Math.floor(baseClicks * 0.25),
				conversions: Math.floor(baseConversions * 0.25),
			},
		],
	};
};

// Calculate overall stats from campaigns
const calculateOverallStats = (campaigns: Campaign[]) => {
	let totalViews = 0;
	let totalClicks = 0;
	let totalConversions = 0;

	campaigns.forEach((campaign) => {
		const stats = generateMockAnalytics(campaign);
		totalViews += stats.views;
		totalClicks += stats.clicks;
		totalConversions += stats.conversions;
	});

	const conversionRate = totalClicks > 0 ? `${((totalConversions / totalClicks) * 100).toFixed(1)}%` : "0%";

	return {
		totalViews,
		totalClicks,
		totalConversions,
		conversionRate,
	};
};

// Generate overall campaign impact data
const generateCampaignImpactData = (campaigns: Campaign[]) => {
	return campaigns.map((campaign, index) => {
		const stats = generateMockAnalytics(campaign);
		return {
			name: `Campaign ${index + 1}`,
			views: stats.views,
			clicks: stats.clicks,
			conversions: stats.conversions,
		};
	});
};

export default function CampaignListPage() {
	const queryClient = useQueryClient();
	const [searchTerm, setSearchTerm] = useState("");
	const [statusFilter, setStatusFilter] = useState("all");
	const [expandedCampaign, setExpandedCampaign] = useState<string | null>(null);
	const [campaignToDelete, setCampaignToDelete] = useState<string | null>(null);

	// FIXED: Use auth hook to get merchantId
	const { isAuthenticated, merchantId } = useAuthCheck();

	console.log("🛠️ Campaign List Auth Status:", { isAuthenticated, merchantId });

	// FIXED: Convert merchantId to number for API
	const numericMerchantId = merchantId ? parseInt(merchantId) : null;

	// FIXED: Use proper merchantId parameter
	const {
		data: campaigns = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["campaigns", numericMerchantId],
		queryFn: () => {
			if (!numericMerchantId) {
				console.warn("❌ No merchantId available, skipping campaigns fetch");
				return Promise.resolve([]);
			}
			return campaignService.getCampaigns(numericMerchantId);
		},
		enabled: !!numericMerchantId && isAuthenticated,
	});

	// Delete campaign mutation
	const deleteMutation = useMutation({
		mutationFn: (id: string) => campaignService.deleteCampaign(parseInt(id)),
		onSuccess: () => {
			message.success("Campaign deleted successfully!");
			queryClient.invalidateQueries({ queryKey: ["campaigns", numericMerchantId] });
			setCampaignToDelete(null);
		},
		onError: (error: Error) => {
			message.error(`Failed to delete campaign: ${error.message}`);
			setCampaignToDelete(null);
		},
	});

	// Calculate campaign status based on dates
	const getCampaignStatus = (campaign: Campaign): "active" | "upcoming" | "completed" => {
		const today = new Date();
		const startDate = new Date(campaign.startDate);
		const endDate = new Date(campaign.endDate);

		if (today < startDate) return "upcoming";
		if (today > endDate) return "completed";
		return "active";
	};

	const filteredCampaigns = campaigns.filter((campaign) => {
		const matchesSearch =
			campaign.campaignName.toLowerCase().includes(searchTerm.toLowerCase()) ||
			campaign.campaignType.toLowerCase().includes(searchTerm.toLowerCase()) ||
			campaign.targetAudience.toLowerCase().includes(searchTerm.toLowerCase());

		const status = getCampaignStatus(campaign);
		const matchesStatus = statusFilter === "all" || status === statusFilter;

		return matchesSearch && matchesStatus;
	});

	const getStatusVariant = (status: string) => {
		switch (status) {
			case "active":
				return "success";
			case "upcoming":
				return "secondary";
			case "completed":
				return "default";
			default:
				return "secondary";
		}
	};

	const toggleCampaignExpansion = (campaignId: string) => {
		setExpandedCampaign(expandedCampaign === campaignId ? null : campaignId);
	};

	const handleDeleteClick = (campaignId: string, e: React.MouseEvent) => {
		e.stopPropagation();
		setCampaignToDelete(campaignId);
	};

	const confirmDelete = () => {
		if (campaignToDelete) {
			deleteMutation.mutate(campaignToDelete);
		}
	};

	const cancelDelete = () => {
		setCampaignToDelete(null);
	};

	const overallStats = calculateOverallStats(campaigns);
	const campaignImpactData = generateCampaignImpactData(campaigns);

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">My Campaigns</h1>
						<p className="text-muted-foreground">Track and manage your marketing campaigns</p>
					</div>
					<Button asChild>
						<Link to="/management/campaign/create">
							<Icon icon="lucide:plus" className="mr-2" />
							Create Campaign
						</Link>
					</Button>
				</div>
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 text-destructive mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Failed to load campaigns</h3>
						<p className="text-muted-foreground mb-4">{(error as Error).message}</p>
						<Button onClick={() => window.location.reload()}>Retry</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			{/* Delete Confirmation Modal */}
			{campaignToDelete && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<Card className="w-full max-w-md">
						<CardHeader>
							<CardTitle className="text-destructive">Delete Campaign</CardTitle>
							<CardDescription>
								Are you sure you want to delete this campaign? This action cannot be undone.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex gap-4 justify-end">
							<Button variant="outline" onClick={cancelDelete} disabled={deleteMutation.isPending}>
								Cancel
							</Button>
							<Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
								{deleteMutation.isPending ? (
									<>
										<Icon icon="eos-icons:loading" className="mr-2" />
										Deleting...
									</>
								) : (
									"Delete Campaign"
								)}
							</Button>
						</CardContent>
					</Card>
				</div>
			)}

			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">My Campaigns</h1>
					<p className="text-muted-foreground">Track and manage your marketing campaigns</p>
				</div>
				<Button asChild>
					<Link to="/management/campaign/create">
						<Icon icon="lucide:plus" className="mr-2" />
						Create Campaign
					</Link>
				</Button>
			</div>

			{/* Campaign Impact Section */}
			<Card>
				<CardHeader>
					<CardTitle>Campaign Performance Overview</CardTitle>
					<CardDescription>Overall performance across all your campaigns</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
						<Card className="bg-muted/50">
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-muted-foreground">Total Views</p>
										<p className="text-2xl font-bold text-blue-600">{overallStats.totalViews.toLocaleString()}</p>
									</div>
									<Icon icon="lucide:eye" className="h-8 w-8 text-blue-500 opacity-60" />
								</div>
							</CardContent>
						</Card>

						<Card className="bg-muted/50">
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-muted-foreground">Total Clicks</p>
										<p className="text-2xl font-bold text-green-600">{overallStats.totalClicks.toLocaleString()}</p>
									</div>
									<Icon icon="lucide:mouse-pointer-click" className="h-8 w-8 text-green-500 opacity-60" />
								</div>
							</CardContent>
						</Card>

						<Card className="bg-muted/50">
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-muted-foreground">Total Conversions</p>
										<p className="text-2xl font-bold text-orange-600">
											{overallStats.totalConversions.toLocaleString()}
										</p>
									</div>
									<Icon icon="lucide:trending-up" className="h-8 w-8 text-orange-500 opacity-60" />
								</div>
							</CardContent>
						</Card>

						<Card className="bg-muted/50">
							<CardContent className="p-4">
								<div className="flex items-center justify-between">
									<div>
										<p className="text-sm font-medium text-muted-foreground">Conversion Rate</p>
										<p className="text-2xl font-bold text-pink-600">{overallStats.conversionRate}</p>
									</div>
									<Icon icon="lucide:percent" className="h-8 w-8 text-pink-500 opacity-60" />
								</div>
							</CardContent>
						</Card>
					</div>

					{campaigns.length > 0 && (
						<div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-base">Engagement Over Time</CardTitle>
								</CardHeader>
								<CardContent>
									<ResponsiveContainer width="100%" height={250}>
										<LineChart data={campaignImpactData}>
											<CartesianGrid strokeDasharray="3 3" className="opacity-30" />
											<XAxis dataKey="name" tick={{ fontSize: 12 }} />
											<YAxis tick={{ fontSize: 12 }} />
											<Tooltip />
											<Legend />
											<Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} activeDot={{ r: 6 }} />
											<Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} activeDot={{ r: 6 }} />
											<Line
												type="monotone"
												dataKey="conversions"
												stroke="#f59e0b"
												strokeWidth={2}
												activeDot={{ r: 6 }}
											/>
										</LineChart>
									</ResponsiveContainer>
								</CardContent>
							</Card>

							<Card>
								<CardHeader className="pb-3">
									<CardTitle className="text-base">Performance by Campaign</CardTitle>
								</CardHeader>
								<CardContent>
									<ResponsiveContainer width="100%" height={250}>
										<BarChart data={campaignImpactData}>
											<CartesianGrid strokeDasharray="3 3" className="opacity-30" />
											<XAxis dataKey="name" tick={{ fontSize: 12 }} />
											<YAxis tick={{ fontSize: 12 }} />
											<Tooltip />
											<Legend />
											<Bar dataKey="views" fill="#3b82f6" name="Views" radius={[4, 4, 0, 0]} />
											<Bar dataKey="clicks" fill="#10b981" name="Clicks" radius={[4, 4, 0, 0]} />
											<Bar dataKey="conversions" fill="#f59e0b" name="Conversions" radius={[4, 4, 0, 0]} />
										</BarChart>
									</ResponsiveContainer>
								</CardContent>
							</Card>
						</div>
					)}
				</CardContent>
			</Card>

			{/* Individual Campaigns List */}
			<Card>
				<CardHeader>
					<CardTitle>My Campaigns</CardTitle>
					<CardDescription>Click on a campaign to view detailed analytics</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4 mb-6">
						<div className="flex-1">
							<Input
								placeholder="Search campaigns..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="max-w-sm"
							/>
						</div>
						<Select value={statusFilter} onValueChange={setStatusFilter}>
							<SelectTrigger className="w-32">
								<SelectValue placeholder="Status" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Status</SelectItem>
								<SelectItem value="active">Active</SelectItem>
								<SelectItem value="upcoming">Upcoming</SelectItem>
								<SelectItem value="completed">Completed</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{isLoading ? (
						<div className="text-center py-12">
							<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
							<p className="text-muted-foreground">Loading campaigns...</p>
						</div>
					) : (
						<div className="space-y-4">
							{filteredCampaigns.map((campaign) => {
								const status = getCampaignStatus(campaign);
								const stats = generateMockAnalytics(campaign);

								return (
									<Card
										key={campaign.id}
										className={`border-l-4 border-l-primary cursor-pointer transition-all hover:shadow-md ${
											expandedCampaign === campaign.id ? "ring-2 ring-primary" : ""
										}`}
										onClick={() => toggleCampaignExpansion(campaign.id)}
									>
										<CardContent className="p-6">
											<div className="flex items-start justify-between">
												<div className="space-y-3 flex-1">
													<div className="flex items-center gap-3">
														<h3 className="font-semibold text-lg">{campaign.campaignName}</h3>
														<Badge variant={getStatusVariant(status)}>{status}</Badge>
													</div>

													{/* Quick Stats */}
													<div className="grid grid-cols-2 md:grid-cols-4 gap-4 p-3 bg-muted/30 rounded-lg">
														<div className="text-center">
															<p className="text-2xl font-bold text-blue-600">{stats.views}</p>
															<p className="text-xs text-muted-foreground">Views</p>
														</div>
														<div className="text-center">
															<p className="text-2xl font-bold text-green-600">{stats.clicks}</p>
															<p className="text-xs text-muted-foreground">Clicks</p>
														</div>
														<div className="text-center">
															<p className="text-2xl font-bold text-orange-600">{stats.conversions}</p>
															<p className="text-xs text-muted-foreground">Conversions</p>
														</div>
														<div className="text-center">
															<p className="text-2xl font-bold text-pink-600">{stats.conversionRate}</p>
															<p className="text-xs text-muted-foreground">Conv. Rate</p>
														</div>
													</div>

													<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 text-sm">
														<div>
															<p className="text-muted-foreground">Type</p>
															<p className="font-medium">{campaign.campaignType}</p>
														</div>
														<div>
															<p className="text-muted-foreground">Target Audience</p>
															<p className="font-medium">{campaign.targetAudience}</p>
														</div>
														<div>
															<p className="text-muted-foreground">Start Date</p>
															<p className="font-medium">{new Date(campaign.startDate).toLocaleDateString()}</p>
														</div>
														<div>
															<p className="text-muted-foreground">End Date</p>
															<p className="font-medium">{new Date(campaign.endDate).toLocaleDateString()}</p>
														</div>
													</div>

													<div>
														<p className="text-muted-foreground">Messages</p>
														<div className="mt-1 space-y-1">
															{campaign.messages.map((msg, index) => (
																<p key={`${campaign.id}-message-${index}`} className="font-medium text-sm">
																	{msg.message}
																</p>
															))}
														</div>
													</div>

													{/* Expanded Analytics */}
													{expandedCampaign === campaign.id && (
														<div className="mt-4 pt-4 border-t">
															<h4 className="font-semibold mb-3">Campaign Analytics</h4>
															<ResponsiveContainer width="100%" height={200}>
																<LineChart data={stats.weeklyData}>
																	<CartesianGrid strokeDasharray="3 3" className="opacity-30" />
																	<XAxis dataKey="name" tick={{ fontSize: 10 }} />
																	<YAxis tick={{ fontSize: 10 }} />
																	<Tooltip />
																	<Legend />
																	<Line type="monotone" dataKey="views" stroke="#3b82f6" strokeWidth={2} />
																	<Line type="monotone" dataKey="clicks" stroke="#10b981" strokeWidth={2} />
																	<Line type="monotone" dataKey="conversions" stroke="#f59e0b" strokeWidth={2} />
																</LineChart>
															</ResponsiveContainer>
														</div>
													)}
												</div>

												<div className="flex gap-2 ml-4">
													<Button variant="outline" size="sm" asChild onClick={(e) => e.stopPropagation()}>
														<Link to={`/management/campaign/edit/${campaign.id}`}>
															<Icon icon="lucide:edit" className="h-4 w-4" />
															Edit
														</Link>
													</Button>
													<Button
														variant="outline"
														size="sm"
														className="text-destructive hover:text-destructive"
														onClick={(e) => handleDeleteClick(campaign.id, e)}
														disabled={deleteMutation.isPending}
													>
														<Icon icon="lucide:trash" className="h-4 w-4" />
														Delete
													</Button>
												</div>
											</div>
										</CardContent>
									</Card>
								);
							})}
						</div>
					)}

					{!isLoading && filteredCampaigns.length === 0 && (
						<div className="text-center py-12 text-muted-foreground">
							<Icon icon="lucide:megaphone" className="h-16 w-16 mx-auto mb-4 opacity-50" />
							<p className="text-lg font-medium">No campaigns found</p>
							<p className="text-sm">Try adjusting your search or filter criteria</p>
							<Button asChild className="mt-4">
								<Link to="/management/campaign/create">Create Your First Campaign</Link>
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
