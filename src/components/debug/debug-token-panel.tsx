// src/components/debug/debug-token-panel.tsx - CREATE THIS FILE
import { useUserInfo, useUserToken } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { decodeToken, isTokenExpired } from "@/utils/jwt";

export function DebugTokenPanel() {
	const { accessToken } = useUserToken();
	const userInfo = useUserInfo();

	if (!import.meta.env.DEV) return null;

	const decodedToken = accessToken ? decodeToken(accessToken) : null;
	const tokenExpired = accessToken ? isTokenExpired(accessToken) : true;

	return (
		<Card className="mb-4 border-orange-200 bg-orange-50">
			<CardHeader className="pb-3">
				<CardTitle className="text-orange-900 text-sm">🔐 Token Debug Panel</CardTitle>
				<CardDescription className="text-orange-700 text-xs">Development debug information</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2 pt-0">
				<div className="grid grid-cols-2 gap-1 text-xs">
					<div>
						<strong>Token:</strong> {accessToken ? "✅ Yes" : "❌ No"}
					</div>
					<div>
						<strong>Valid:</strong> {!tokenExpired ? "✅ Yes" : "❌ Expired"}
					</div>
					<div>
						<strong>User:</strong> {userInfo?.username ? `✅ ${userInfo.username}` : "❌ No"}
					</div>
					<div>
						<strong>Role:</strong> {userInfo?.role || "❌ No role"}
					</div>
				</div>

				{decodedToken && (
					<details className="text-xs">
						<summary className="cursor-pointer font-medium">Token Details</summary>
						<pre className="mt-1 bg-white p-2 rounded border overflow-auto max-h-32">
							{JSON.stringify(decodedToken, null, 2)}
						</pre>
					</details>
				)}

				<div className="flex gap-1 pt-1">
					<Button
						variant="outline"
						size="sm"
						className="text-xs h-7"
						onClick={() => {
							console.log("🔐 Full debug info:", {
								token: accessToken,
								userInfo,
								decodedToken,
								expired: tokenExpired,
								localStorage: localStorage.getItem("userStore"),
							});
						}}
					>
						Log to Console
					</Button>

					<Button
						variant="outline"
						size="sm"
						className="text-xs h-7"
						onClick={() => {
							localStorage.removeItem("userStore");
							window.location.reload();
						}}
					>
						Clear & Reload
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
