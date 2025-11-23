// src/hooks/useMerchantOperations.ts - COMPLETE FINAL VERSION
import { useMerchant } from "@/contexts/MerchantContext";

export const useMerchantOperations = () => {
	const { merchantId, isAdmin, isLoading, hasMerchantAccess } = useMerchant();

	/**
	 * Get merchant ID for API calls - throws error if not available
	 */
	const requireMerchantId = (operationName?: string): string => {
		if (isLoading) {
			throw new Error("Merchant information is still loading. Please wait.");
		}

		if (!merchantId) {
			if (isAdmin) {
				throw new Error(
					operationName
						? `Admin access: ${operationName} requires a specific merchant context. Please select a merchant.`
						: "Admin user: This operation requires a specific merchant context.",
				);
			} else {
				throw new Error(
					operationName
						? `No merchant access: Cannot perform ${operationName}. Please contact administrator.`
						: "No merchant access available. Please contact administrator.",
				);
			}
		}

		return merchantId;
	};

	/**
	 * Wrap API calls with merchant ID validation
	 */
	const withMerchantId = async <T>(
		operation: (merchantId: string) => Promise<T>,
		operationName: string = "operation",
	): Promise<T> => {
		const id = requireMerchantId(operationName);
		console.log(`🛠️ Executing ${operationName} for merchant:`, id);
		return operation(id);
	};

	/**
	 * Check if a component should be enabled based on merchant access
	 */
	const shouldEnableComponent = (componentName: string): boolean => {
		if (isLoading) return false;
		if (!hasMerchantAccess) {
			console.warn(`⚠️ Component '${componentName}' disabled: No merchant access`);
			return false;
		}
		return true;
	};

	return {
		// State
		merchantId,
		isAdmin,
		isLoading,
		hasMerchantAccess,

		// Operations
		requireMerchantId,
		withMerchantId,
		shouldEnableComponent,

		// Convenience checkers
		canAccessInventory: shouldEnableComponent("inventory"),
		canAccessSales: shouldEnableComponent("sales"),
		canAccessCampaigns: shouldEnableComponent("campaigns"),
		canAccessReports: shouldEnableComponent("reports"),
	};
};
