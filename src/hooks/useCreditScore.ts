// src/hooks/useCreditScore.ts
import { useQuery } from "@tanstack/react-query";
import { creditService } from "@/api/services/creditService";

export const useCreditScore = (merchantId: string | null) => {
	return useQuery({
		queryKey: ["credit-score", merchantId],
		queryFn: () => {
			if (!merchantId) {
				throw new Error("Merchant ID is required");
			}
			return creditService.getCreditScore(merchantId);
		},
		enabled: !!merchantId,
		retry: 2,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
};
