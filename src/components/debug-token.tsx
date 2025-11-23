// src/components/debug-token.tsx

import { useUserToken } from "@/store/userStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { decodeToken } from "@/utils/jwt";

export function DebugToken() {
	const { accessToken } = useUserToken();

	if (!accessToken || !import.meta.env.DEV) return null;

	const decoded = decodeToken(accessToken);

	return (
		<Card className="mb-4 border-orange-200">
			<CardHeader>
				<CardTitle className="text-orange-900">JWT Token Debug</CardTitle>
				<CardDescription>Development only - shows decoded token data</CardDescription>
			</CardHeader>
			<CardContent>
				<pre className="text-xs bg-orange-50 p-3 rounded border">{JSON.stringify(decoded, null, 2)}</pre>
				<div className="mt-2 text-sm text-orange-700">
					<strong>Role detected:</strong> {decoded?.role || "NOT FOUND"}
				</div>
			</CardContent>
		</Card>
	);
}
