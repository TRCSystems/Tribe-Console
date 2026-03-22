//original author : Marcellas
import { useQuery } from "@tanstack/react-query";
import { creditService } from "@/api/services/creditService";
import { Icon } from "@/components/icon";
import { UserRoleIndicator } from "@/components/user-role-indicator";
import { useAuthCheck } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Skeleton } from "@/ui/skeleton";
import { Text, Title } from "@/ui/typography";

const SCORE_RANGES = [
	{ min: 900, max: 1000, grade: "A+", color: "#10b981", label: "Excellent" },
	{ min: 800, max: 899, grade: "A", color: "#22c55e", label: "Very Good" },
	{ min: 700, max: 799, grade: "B", color: "#84cc16", label: "Good" },
	{ min: 600, max: 699, grade: "C", color: "#eab308", label: "Fair" },
	{ min: 500, max: 599, grade: "D", color: "#f59e0b", label: "Below Average" },
	{ min: 400, max: 499, grade: "E", color: "#f97316", label: "Poor" },
	{ min: 0, max: 399, grade: "F", color: "#ef4444", label: "Very Poor" },
];

const getScoreRange = (score: number) => {
	return SCORE_RANGES.find((range) => score >= range.min && score <= range.max) || SCORE_RANGES[6];
};

const GaugeIndicator = ({ score }: { score: number }) => {
	const _scoreRange = getScoreRange(score);

	const minScore = 200;
	const maxScore = 900;
	const normalizedScore = Math.max(minScore, Math.min(maxScore, score));
	const percentage = ((normalizedScore - minScore) / (maxScore - minScore)) * 100;

	// Needle angle: -90° at left (200), 0° at center, +90° at right (900)
	const needleAngle = -90 + (percentage / 100) * 180;

	return (
		<div className="relative w-full">
			{/* Gauge Container */}
			<div className="relative h-80">
				{/* Gauge Arc */}
				<div className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-170 h-100">
					<svg
						className="w-full h-full"
						viewBox="0 0 400 180"
						style={{ filter: "drop-shadow(0 10px 15px rgba(0, 0, 0, 0.2))" }}
					>
						{/* Gradient definitions */}
						<defs>
							<linearGradient id="gaugeGradient" x1="0%" y1="0%" x2="100%" y2="0%">
								<stop offset="0%" stopColor="#ef4444" /> {/* Red */}
								<stop offset="25%" stopColor="#f59e0b" /> {/* Orange */}
								<stop offset="50%" stopColor="#eab308" /> {/* Yellow */}
								<stop offset="75%" stopColor="#84cc16" /> {/* Light Green */}
								<stop offset="100%" stopColor="#10b981" /> {/* Green */}
							</linearGradient>
						</defs>

						{/* Background track - Wider semi-circle */}
						<path
							d="M 40,150 A 160,160 0 0 1 360,150"
							fill="none"
							stroke="#e5e7eb"
							strokeWidth="22"
							strokeLinecap="round"
						/>

						{/* Filled progress */}
						<path
							d="M 40,150 A 160,160 0 0 1 360,150"
							fill="none"
							stroke="url(#gaugeGradient)"
							strokeWidth="22"
							strokeLinecap="round"
							strokeDasharray="502.4"
							strokeDashoffset={502.4 - (502.4 * percentage) / 100}
						/>

						{/* Score Markers */}
						<g>
							{/* 200 marker at left */}
							<line x1="40" y1="150" x2="40" y2="128" stroke="#6b7280" strokeWidth="3" />
							<text x="43.5" y="118" textAnchor="middle" fill="#6b7280" fontSize="14" fontWeight="bold">
								200
							</text>

							{/* 400 marker */}
							<text x="80" y="50" textAnchor="middle" fill="#6b7280" fontSize="14" fontWeight="bold">
								400
							</text>

							{/* 600 marker at center */}
							<text x="200" y="-7" textAnchor="middle" fill="#6b7280" fontSize="14" fontWeight="bold">
								600
							</text>
							{/*TRIBE*/}
							<text x="200" y="110" textAnchor="middle" fill="#6b7280" fontSize="14" fontWeight="bold">
								TRIBE
							</text>
							<text x="200" y="125" textAnchor="middle" fill="#6b7280" fontSize="8" fontWeight="bold">
								Your Business Growth Partner.
							</text>

							{/* 800 marker */}
							<text x="319" y="47" textAnchor="middle" fill="#6b7280" fontSize="14" fontWeight="bold">
								800
							</text>

							{/* 900 marker at right */}
							<line x1="360" y1="150" x2="360" y2="128" stroke="#6b7280" strokeWidth="3" />
							<text x="356.5" y="118" textAnchor="middle" fill="#6b7280" fontSize="14" fontWeight="bold">
								900
							</text>
						</g>

						{/* Needle */}
						<g transform={`rotate(${needleAngle}, 200, 150)`}>
							<line x1="200" y1="150" x2="200" y2="45" stroke="#1f2937" strokeWidth="5" strokeLinecap="round" />
							<circle cx="200" cy="150" r="14" fill="#1f2937" />
							<circle cx="200" cy="45" r="7" fill="#dc2626" />
						</g>

						{/* Center Dot */}
						<circle cx="200" cy="150" r="8" fill="#374151" />
					</svg>
				</div>
			</div>
		</div>
	);
};

const ScoreDetails = ({ creditScore }: { creditScore: any }) => {
	const scoreRange = getScoreRange(creditScore.score);

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">Score Details</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				<div className="grid grid-cols-2 gap-4">
					<div className="bg-gray-50 p-4 rounded-lg">
						<Text variant="caption" className="text-xs font-medium mb-1">
							Total Score
						</Text>
						<div className="text-2xl font-bold text-gray-900 dark:text-white">{creditScore.score}</div>
					</div>
					<div className="bg-gray-50 p-4 rounded-lg">
						<Text variant="caption" className="text-xs font-medium mb-1">
							Grade
						</Text>
						<div className="text-2xl font-bold" style={{ color: scoreRange.color }}>
							{creditScore.grade}
						</div>
					</div>
				</div>

				<div className="space-y-3 pt-2">
					<div className="flex justify-between items-center p-2">
						<Text variant="caption" className="text-sm">
							Status
						</Text>
						<Badge
							variant={creditScore.is_provisional ? "secondary" : "default"}
							className={
								creditScore.is_provisional
									? "bg-amber-100 text-amber-800 hover:bg-amber-200"
									: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
							}
						>
							{creditScore.is_provisional ? "Provisional" : "Official"}
						</Badge>
					</div>
				</div>
			</CardContent>
		</Card>
	);
};

const PerformanceInsights = ({ score }: { score: number }) => {
	const insights = [
		{
			title: "Payment History",
			status: score > 700 ? "Excellent" : score > 500 ? "Good" : "Needs Improvement",
			icon: score > 700 ? "lucide:check-circle" : "lucide:alert-circle",
			color: score > 700 ? "text-green-600" : score > 500 ? "text-yellow-600" : "text-red-600",
		},
		{
			title: "Credit Utilization",
			status: score > 750 ? "Optimal" : score > 550 ? "Moderate" : "High",
			icon: score > 750 ? "lucide:trending-up" : "lucide:trending-down",
			color: score > 750 ? "text-green-600" : score > 550 ? "text-yellow-600" : "text-red-600",
		},
		{
			title: "Credit History",
			status: score > 800 ? "Long" : score > 600 ? "Average" : "Short",
			icon: "lucide:history",
			color: score > 800 ? "text-green-600" : score > 600 ? "text-yellow-600" : "text-red-600",
		},
	];

	return (
		<Card>
			<CardHeader>
				<CardTitle className="text-lg">Performance Insights</CardTitle>
			</CardHeader>
			<CardContent className="space-y-4">
				{insights.map((insight, index) => (
					<div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
						<div className="flex items-center gap-3">
							<Icon icon={insight.icon as any} className={`h-5 w-5 ${insight.color}`} />
							<div>
								<Text variant="body2" className="font-medium">
									{insight.title}
								</Text>
							</div>
						</div>
						<Badge
							variant="outline"
							className={`${insight.color.replace("text-", "bg-").replace("-600", "-100")} ${insight.color}`}
						>
							{insight.status}
						</Badge>
					</div>
				))}

				<div className="pt-4 border-t">
					<Text variant="caption" className="text-sm">
						{score > 700
							? "Your credit score is in excellent standing. Maintain current financial practices."
							: score > 500
								? "Your credit score is average. Focus on timely payments and reducing debt."
								: "Consider improving payment habits to boost your score."}
					</Text>
				</div>
			</CardContent>
		</Card>
	);
};

export default function CreditScorePage() {
	const { isAuthenticated, merchantId } = useAuthCheck();

	const {
		data: creditData,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["credit-score", merchantId],
		queryFn: async () => {
			console.log("🔄 Fetching credit score for merchant:", merchantId);
			try {
				const result = await creditService.getCreditScore(merchantId!);
				console.log("✅ Credit score API response:", result);
				return result;
			} catch (err: any) {
				console.error("❌ Credit score API error details:", {
					message: err.message,
					status: err.response?.status,
					data: err.response?.data,
					url: err.config?.url,
				});

				if (err.response?.status === 404) {
					throw new Error(
						"Credit score data not found for your account. If you're a new merchant, your score may not be calculated yet.",
					);
				} else if (err.response?.status === 401) {
					throw new Error("Please sign in to view your credit score.");
				} else if (err.response?.status === 500) {
					throw new Error("Service temporarily unavailable. Please try again later.");
				} else {
					throw new Error("Unable to load credit score. Please check your connection.");
				}
			}
		},
		enabled: !!merchantId && isAuthenticated,
		retry: false,
	});

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
					<div>
						<Skeleton className="h-8 w-48 mb-2" />
						<Skeleton className="h-4 w-64" />
					</div>
					<Skeleton className="h-8 w-32 mt-4 sm:mt-0" />
				</div>

				<div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
					<Card className="lg:col-span-2">
						<CardHeader className="text-center">
							<Skeleton className="h-7 w-56 mx-auto mb-2" />
							<Skeleton className="h-4 w-72 mx-auto" />
						</CardHeader>
						<CardContent className="px-8 py-12">
							<div className="relative w-full">
								<div className="mb-10 text-center">
									<Skeleton className="h-24 w-40 mx-auto mb-4" />
									<Skeleton className="h-12 w-56 mx-auto" />
								</div>
								<div className="relative h-64">
									<Skeleton className="w-full h-48 rounded-t-full" />
								</div>
							</div>
						</CardContent>
					</Card>

					<div className="space-y-6">
						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-32" />
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="grid grid-cols-2 gap-4">
									<Skeleton className="h-20 rounded-lg" />
									<Skeleton className="h-20 rounded-lg" />
								</div>
								{[...Array(4)].map((_, i) => (
									<div key={i} className="flex justify-between items-center">
										<Skeleton className="h-4 w-24" />
										<Skeleton className="h-4 w-20" />
									</div>
								))}
							</CardContent>
						</Card>

						<Card>
							<CardHeader>
								<Skeleton className="h-6 w-32" />
							</CardHeader>
							<CardContent>
								{[...Array(3)].map((_, i) => (
									<div key={i} className="mb-4">
										<Skeleton className="h-16 rounded-lg" />
									</div>
								))}
							</CardContent>
						</Card>
					</div>
				</div>
			</div>
		);
	}

	if (error) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold">Credit Score</h1>
					<p className="text-muted-foreground">Your business credit assessment</p>
				</div>
				<Card className="border-dashed border-2">
					<CardContent className="flex flex-col items-center justify-center py-16 text-center">
						<Icon icon="lucide:alert-circle" className="h-16 w-16 text-red-500 mb-6" />
						<h3 className="text-xl font-semibold text-gray-900 mb-2">Unable to Load Credit Score</h3>
						<p className="text-gray-600 max-w-md mb-6">{error.message}</p>
						<button
							onClick={() => window.location.reload()}
							className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
						>
							<Icon icon="lucide:refresh-cw" className="h-4 w-4" />
							Try Again
						</button>
					</CardContent>
				</Card>
			</div>
		);
	}

	if (!creditData) {
		return null;
	}

	const creditScore = creditData;
	const isPlaceholder = creditScore._isPlaceholder || creditScore.score === 0;

	return (
		<div className="space-y-6">
			{/* Warning banner for placeholder data */}
			{isPlaceholder && (
				<div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
					<div className="flex items-center">
						<Icon icon="lucide:alert-triangle" className="h-5 w-5 text-yellow-600 mr-2" />
						<div className="text-sm text-yellow-800">
							<strong>Note:</strong>{" "}
							{creditScore.message ||
								"Credit score data is not yet available for your account. This may be because you're a new merchant or your account is still being processed."}
						</div>
					</div>
				</div>
			)}

			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
				<div>
					<Title as="h1" className="text-2xl font-bold">
						Credit Score Overview
					</Title>

					<Text variant="caption" className="mt-1">
						{isPlaceholder ? "Credit assessment pending" : "Complete credit assessment and financial health analysis"}
					</Text>
				</div>
				<div className="flex items-center gap-3 mt-4 sm:mt-0">
					<Badge
						variant={creditScore.is_provisional ? "secondary" : "default"}
						className={
							creditScore.is_provisional
								? "bg-amber-100 text-amber-800 hover:bg-amber-200"
								: "bg-emerald-100 text-emerald-800 hover:bg-emerald-200"
						}
					>
						{isPlaceholder ? "Pending" : creditScore.is_provisional ? "Provisional" : "Official"}
					</Badge>
					<div className="flex items-center gap-2 text-sm text-gray-600">
						<Icon icon="lucide:clock" className="h-4 w-4" />
						{isPlaceholder
							? "Calculating..."
							: `Updated: ${new Date(creditScore.calculated_on).toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
									year: "numeric",
								})}`}
					</div>
					<UserRoleIndicator />
				</div>
			</div>

			{/* Main Content */}
			<div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
				{/* Gauge Card */}
				<Card className="lg:col-span-2">
					<CardHeader className="text-center pb-0">
						<CardTitle className="text-1xl">
							{isPlaceholder ? "Credit Score Pending" : "Credit Score Indicator"}
						</CardTitle>
						<CardDescription className="text-base"></CardDescription>
					</CardHeader>
					<CardContent className="pt-8 px-8">
						{isPlaceholder ? (
							<div className="flex flex-col items-center justify-center py-12">
								<Icon icon="lucide:bar-chart" className="h-24 w-24 text-gray-300 mb-6" />
								<Text variant="caption" className="text-center mb-4">
									Your credit score is being calculated
								</Text>
							</div>
						) : (
							<GaugeIndicator score={creditScore.score} />
						)}
					</CardContent>
				</Card>

				{/* Right Column */}
				{!isPlaceholder ? (
					<div className="space-y-6">
						<ScoreDetails creditScore={creditScore} />
						<PerformanceInsights score={creditScore.score} />
					</div>
				) : (
					<div className="space-y-6">
						<Card>
							<CardHeader>
								<CardTitle className="text-lg">Next Steps</CardTitle>
							</CardHeader>
							<CardContent className="space-y-4">
								<div className="flex items-start gap-3">
									<Icon icon="lucide:shopping-cart" className="h-5 w-5 text-blue-600 mt-0.5" />
									<div>
										<Text variant="body2" className="font-medium">
											Make Transactions
										</Text>
										<Text variant="caption" className="text-sm">
											Complete transactions to generate your score
										</Text>
									</div>
								</div>
								<div className="flex items-start gap-3">
									<Icon icon="lucide:clock" className="h-5 w-5 text-blue-600 mt-0.5" />
									<div>
										<Text variant="body2" className="font-medium">
											Tribe User
										</Text>
										<Text variant="caption" className="text-sm">
											Your score will be calculated after sufficient data
										</Text>
									</div>
								</div>
							</CardContent>
						</Card>
					</div>
				)}
			</div>

			<footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
				<div className="flex flex-col items-center justify-center gap-2">
					<div className="flex items-center gap-2">
						<Icon icon="lucide:shield" className="h-4 w-4 text-gray-400" />
						<span className="text-sm text-gray-500 dark:text-gray-400">Secure • Reliable • Efficient</span>
					</div>
					<p className="text-xs text-gray-400 dark:text-gray-500">
						TRIBE powered by <span className="font-bold text-gray-600 dark:text-gray-300">TRC Systems</span>
					</p>
					<p className="text-xs text-gray-400 dark:text-gray-500">© {new Date().getFullYear()} All rights reserved</p>
				</div>
			</footer>
		</div>
	);
}
