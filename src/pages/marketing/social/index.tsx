//original author : Marcellas
// src/pages/marketing/social/index.tsx
import { Icon } from "@/components/icon";
import { Card, CardDescription, CardHeader, CardTitle } from "@/ui/card";

export default function SocialMarketingPage() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 py-8">
			<div className="container mx-auto px-4">
				<div className="text-center mb-12">
					<div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
						<Icon icon="lucide:rocket" className="h-4 w-4" />
						<span>TRIBE</span>
					</div>
					<h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
						SOCIAL MARKETING
					</h1>
					<p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
						In <span className="font-bold text-green-600">TRIBE</span> get to grow your business with your socials and
						daily trends
					</p>
					<h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
						COMING SOON !!!!
					</h2>
					<p className="text-gray-600 dark:text-gray-300 mb-6">
						We're building something amazing to revolutionize your social marketing. Get ready to transform how you
						connect with your audience!
					</p>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
					<Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300">
						<CardHeader className="text-center pb-4">
							<div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-3">
								<Icon icon="lucide:trending-up" className="h-6 w-6 text-white" />
							</div>
							<CardTitle className="text-xl">Social Analytics</CardTitle>
							<CardDescription>Track engagement and growth across all your social platforms</CardDescription>
						</CardHeader>
					</Card>

					<Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300">
						<CardHeader className="text-center pb-4">
							<div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-3">
								<Icon icon="lucide:users" className="h-6 w-6 text-white" />
							</div>
							<CardTitle className="text-xl">Audience Insights</CardTitle>
							<CardDescription>Understand your followers and target the right customers</CardDescription>
						</CardHeader>
					</Card>

					<Card className="border-0 shadow-md hover:shadow-md hover:shadow-lg transition-all duration-300">
						<CardHeader className="text-center pb-4">
							<div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-3">
								<Icon icon="lucide:bar-chart" className="h-6 w-6 text-white" />
							</div>
							<CardTitle className="text-xl">Trend Analysis</CardTitle>
							<CardDescription>Stay ahead with real-time trend monitoring and insights</CardDescription>
						</CardHeader>
					</Card>
				</div>
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
