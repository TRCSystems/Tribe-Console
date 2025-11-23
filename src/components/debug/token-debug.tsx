// src/components/debug/token-debug.tsx
import { useUserToken } from "@/store/userStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { decodeToken } from "@/utils/jwt";

export function TokenDebug() {
	const { accessToken } = useUserToken();

	if (!accessToken || !import.meta.env.DEV) return null;

	const decoded = decodeToken(accessToken);

	return (
		<Card className="mb-4 border-green-200">
			<CardHeader>
				<CardTitle className="text-green-900 text-sm">🔐 Token Debug</CardTitle>
				<CardDescription className="text-green-700 text-xs">JWT Token Contents</CardDescription>
			</CardHeader>
			<CardContent className="pt-0">
				<div className="space-y-2 text-xs">
					<div>
						<strong>Token Preview:</strong> {accessToken.substring(0, 50)}...
					</div>
					<div>
						<strong>Merchant ID (id field):</strong> {decoded?.id || "❌ Not found"}
					</div>
					<div>
						<strong>Role:</strong> {decoded?.role || "❌ Not found"}
					</div>
					<div>
						<strong>Username:</strong> {decoded?.username || "❌ Not found"}
					</div>
					<div>
						<strong>Expires:</strong> {decoded?.exp ? new Date(decoded.exp * 1000).toLocaleString() : "❌ Not found"}
					</div>
				</div>
				<details className="mt-2">
					<summary className="cursor-pointer text-xs text-muted-foreground">Full Token Payload</summary>
					<pre className="text-xs bg-green-50 p-2 rounded border mt-1 overflow-auto">
						{JSON.stringify(decoded, null, 2)}
					</pre>
				</details>
			</CardContent>
		</Card>
	);
}
