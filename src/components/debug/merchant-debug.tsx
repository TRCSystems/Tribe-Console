// src/components/debug/merchant-debug.tsx - COMPLETE FINAL VERSION
import { useMerchant } from "@/contexts/MerchantContext";
import { useMerchantId as useStoreMerchantId, useUserRole } from "@/store/userStore";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";

export function MerchantDebug() {
	const { merchantId, isAdmin, isLoading } = useMerchant();
	const storeMerchantId = useStoreMerchantId();
	const userRole = useUserRole();

	if (!import.meta.env.DEV) return null;

	return (
		<Card className="mb-4 border-blue-200 bg-blue-50">
			<CardHeader>
				<CardTitle className="text-blue-900 text-sm">🏪 Merchant Debug</CardTitle>
				<CardDescription className="text-blue-700 text-xs">Debug merchant ID issues</CardDescription>
			</CardHeader>
			<CardContent className="space-y-2 pt-0">
				<div className="grid grid-cols-2 gap-1 text-xs">
					<div>
						<strong>Store Merchant ID:</strong> {storeMerchantId || "❌ None"}
					</div>
					<div>
						<strong>Context Merchant ID:</strong> {merchantId || "❌ None"}
					</div>
					<div>
						<strong>User Role:</strong> {userRole || "❌ None"}
					</div>
					<div>
						<strong>Is Admin:</strong> {isAdmin ? "✅ Yes" : "❌ No"}
					</div>
					<div>
						<strong>Loading:</strong> {isLoading ? "⏳ Yes" : "✅ No"}
					</div>
				</div>

				{!merchantId && !isLoading && (
					<div className="text-xs text-red-600 bg-red-50 p-2 rounded border">
						⚠️ No merchant ID available. Some features may not work properly.
					</div>
				)}
			</CardContent>
		</Card>
	);
}
