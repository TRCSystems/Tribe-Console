//original author : Marcellas
// src/pages/welcome/index.tsx - LANDSCAPE FRIENDLY VERSION
import { useNavigate } from "react-router";
import { Icon } from "@/components/icon";
import { useUserInfo } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";

export default function WelcomePage() {
	const navigate = useNavigate();
	const userInfo = useUserInfo();

	const handleEnterPOS = () => {
		navigate("/pos");
	};

	const username = userInfo?.username || "User";

	return (
		<div className="fixed inset-0 bg-gradient-to-br from-blue-50 via-white to-green-50 flex items-center justify-center p-6 z-50 overflow-auto">
			<div className="w-full max-w-5xl">
				<Card className="shadow-2xl border-0 bg-white/90 backdrop-blur-sm mx-auto">
					<div className="flex flex-col lg:flex-row items-center">
						{/* Left Side - Welcome Message */}
						<CardHeader className="text-center lg:text-left lg:w-2/5 pb-8 pt-8 lg:py-12 lg:pl-12 lg:pr-8">
							<div className="mb-6">
								<div className="w-20 h-20 bg-gradient-to-r from-blue-600 to-green-600 rounded-full flex items-center justify-center mx-auto lg:mx-0 mb-4 shadow-lg">
									<Icon icon="lucide:rocket" className="h-10 w-10 text-white" />
								</div>
								<CardTitle className="text-3xl lg:text-4xl font-black text-gray-900 mb-3">
									Welcome, {username}! 🎉
								</CardTitle>
							</div>

							<div>
								<CardDescription className="text-lg lg:text-xl text-gray-600 mb-3">
									You're now logged into
								</CardDescription>
								<h1 className="text-4xl lg:text-5xl font-black bg-gradient-to-r from-blue-600 via-purple-600 to-green-600 bg-clip-text text-transparent mb-4">
									TRIBE
								</h1>
								<p className="text-xl lg:text-2xl font-bold text-gray-800">YOUR BUSINESS GROWTH PARTNER</p>
							</div>
						</CardHeader>

						{/* Right Side - Content */}
						<CardContent className="lg:w-3/5 space-y-6 py-8 lg:py-12 lg:pr-12 lg:pl-8">
							{/* Features Grid - 2x2 layout */}
							<div className="grid grid-cols-2 gap-4">
								<div className="text-center p-4 rounded-lg bg-blue-50 border border-blue-200">
									<Icon icon="lucide:trending-up" className="h-8 w-8 text-blue-600 mx-auto mb-2" />
									<h3 className="font-semibold text-blue-800">Sales Growth</h3>
									<p className="text-sm text-blue-600">Boost revenue</p>
								</div>

								<div className="text-center p-4 rounded-lg bg-green-50 border border-green-200">
									<Icon icon="lucide:users" className="h-8 w-8 text-green-600 mx-auto mb-2" />
									<h3 className="font-semibold text-green-800">Customer Loyalty</h3>
									<p className="text-sm text-green-600">Retain customers</p>
								</div>

								<div className="text-center p-4 rounded-lg bg-purple-50 border border-purple-200">
									<Icon icon="lucide:bar-chart-3" className="h-8 w-8 text-purple-600 mx-auto mb-2" />
									<h3 className="font-semibold text-purple-800">Smart Analytics</h3>
									<p className="text-sm text-purple-600">Data insights</p>
								</div>

								<div className="text-center p-4 rounded-lg bg-orange-50 border border-orange-200">
									<Icon icon="lucide:zap" className="h-8 w-8 text-orange-600 mx-auto mb-2" />
									<h3 className="font-semibold text-orange-800">Fast Setup</h3>
									<p className="text-sm text-orange-600">Quick start</p>
								</div>
							</div>

							{/* Quick Stats - Horizontal */}
							<div className="grid grid-cols-3 gap-3 text-center">
								<div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
									<div className="text-2xl font-bold text-gray-900">🚀</div>
									<div className="text-xs text-gray-600">Fast Setup</div>
								</div>
								<div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
									<div className="text-2xl font-bold text-gray-900">💳</div>
									<div className="text-xs text-gray-600">Easy Payments</div>
								</div>
								<div className="p-3 rounded-lg bg-gray-50 border border-gray-200">
									<div className="text-2xl font-bold text-gray-900">📊</div>
									<div className="text-xs text-gray-600">Live Reports</div>
								</div>
							</div>

							{/* Action Button */}
							<div className="text-center pt-4">
								<Button
									onClick={handleEnterPOS}
									className="h-14 px-10 text-lg font-bold shadow-2xl hover:shadow-3xl transition-all duration-300 transform hover:scale-105 rounded-xl border-2 border-black w-full max-w-md"
									style={{
										background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
										color: "white",
									}}
									size="lg"
								>
									<Icon icon="lucide:shopping-cart" className="mr-3 h-5 w-5" />
									Enter Point of Sale
									<Icon icon="lucide:arrow-right" className="ml-3 h-4 w-4" />
								</Button>

								<p className="text-sm text-gray-500 mt-3">Ready to start processing sales and growing your business?</p>
							</div>
						</CardContent>
					</div>
				</Card>

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
		</div>
	);
}
