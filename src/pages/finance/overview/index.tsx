// src/pages/finance/overview/index.tsx
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

export default function FinancePage() {
	return (
		<div className="min-h-screen bg-gradient-to-br from-green-50 to-emerald-50 dark:from-green-950 dark:to-emerald-950 py-8">
			<div className="container mx-auto px-4">
				<div className="text-center mb-12">
					<div className="inline-flex items-center gap-2 bg-gradient-to-r from-green-600 to-emerald-600 text-white px-4 py-2 rounded-full text-sm font-medium mb-4">
						<Icon icon="lucide:trending-up" className="h-4 w-4" />
						<span>TRIBE</span>
					</div>
					<h1 className="text-4xl md:text-5xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
						FINANCE management
					</h1>
					<p className="text-lg text-gray-600 dark:text-gray-300 max-w-2xl mx-auto">
						Take control of your business finances with powerful tools and insights
					</p>

					<h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-green-600 to-emerald-600 bg-clip-text text-transparent mb-4">
						COMING SOON !!!!
					</h2>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
					<Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300">
						<CardHeader className="text-center pb-4">
							<div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-3">
								<Icon icon="lucide:bar-chart" className="h-6 w-6 text-white" />
							</div>
							<CardTitle className="text-xl">Financial Analytics</CardTitle>
							<CardDescription>Comprehensive insights into your revenue, expenses, and profitability</CardDescription>
						</CardHeader>
					</Card>

					

					<Card className="border-0 shadow-md hover:shadow-lg transition-all duration-300">
						<CardHeader className="text-center pb-4">
							<div className="mx-auto w-12 h-12 bg-gradient-to-r from-green-500 to-emerald-500 rounded-full flex items-center justify-center mb-3">
								<Icon icon="lucide:target" className="h-6 w-6 text-white" />
							</div>
							<CardTitle className="text-xl">Financial Goals</CardTitle>
							<CardDescription>Set and track financial targets for your business growth</CardDescription>
						</CardHeader>
					</Card>
				</div>
			</div>
		</div>
	);
}