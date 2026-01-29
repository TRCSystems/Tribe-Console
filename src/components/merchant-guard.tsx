// src/components/merchant-guard.tsx - COMPLETE FINAL VERSION

import { Icon } from "@/components/icon";
import { useMerchantOperations } from "@/hooks/useMerchantOperations";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";

interface MerchantGuardProps {
	children: React.ReactNode;
	featureName?: string;
	requiredAccess?: string[];
}

export const MerchantGuard: React.FC<MerchantGuardProps> = ({
	children,
	featureName = "this feature",
	requiredAccess = [],
}) => {
	const { isLoading, hasMerchantAccess, isAdmin, merchantId, shouldEnableComponent } = useMerchantOperations();

	if (isLoading) {
		return (
			<Card className="w-full">
				<CardContent className="flex items-center justify-center p-8">
					<div className="flex items-center gap-3">
						<div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary"></div>
						<span>Loading merchant information...</span>
					</div>
				</CardContent>
			</Card>
		);
	}

	if (!hasMerchantAccess) {
		return (
			<Card className="w-full border-yellow-200">
				<CardHeader>
					<CardTitle className="flex items-center gap-2 text-yellow-800">
						<Icon icon="lucide:store" className="h-5 w-5" />
						Merchant Access Required
					</CardTitle>
					<CardDescription>You need merchant access to use {featureName}.</CardDescription>
				</CardHeader>
				<CardContent className="space-y-4">
					<Card className="border-yellow-100 bg-yellow-50">
						<CardContent className="pt-6">
							<div className="flex gap-3">
								<Icon icon="lucide:alert-triangle" className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
								<div>
									<h3 className="font-semibold text-yellow-900">No Merchant Assignment</h3>
									<p className="text-sm text-yellow-800 mt-1">
										{isAdmin
											? "As an administrator, you need to select a specific merchant to access this feature."
											: "Your account is not associated with any merchant. Please contact your administrator."}
									</p>
								</div>
							</div>
						</CardContent>
					</Card>

					{isAdmin && (
						<div className="flex gap-2">
							<Button variant="default">
								<Icon icon="lucide:store" className="mr-2 h-4 w-4" />
								Select Merchant
							</Button>
							<Button variant="outline">
								<Icon icon="lucide:help-circle" className="mr-2 h-4 w-4" />
								Get Help
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		);
	}

	// Check specific access requirements
	if (requiredAccess.length > 0) {
		const hasRequiredAccess = requiredAccess.every((access) => shouldEnableComponent(access));

		if (!hasRequiredAccess) {
			return (
				<Card className="border-red-200 bg-red-50">
					<CardContent className="pt-6">
						<div className="flex gap-3">
							<Icon icon="lucide:ban" className="h-5 w-5 text-red-600 flex-shrink-0 mt-0.5" />
							<div>
								<h3 className="font-semibold text-red-900">Access Restricted</h3>
								<p className="text-sm text-red-800 mt-1">
									You don't have the required permissions to access {featureName}. Required: {requiredAccess.join(", ")}
								</p>
							</div>
						</div>
					</CardContent>
				</Card>
			);
		}
	}

	console.log(`✅ Merchant Guard passed for ${featureName}, merchant: ${merchantId}`);
	return <>{children}</>;
};
