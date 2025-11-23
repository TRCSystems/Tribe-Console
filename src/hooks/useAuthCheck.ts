// src/hooks/useAuthCheck.ts - NEW FILE
import { useEffect, useState } from "react";
import { useMerchantId, useUserToken } from "@/store/userStore";

export const useAuthCheck = () => {
	const { accessToken } = useUserToken();
	const merchantId = useMerchantId();
	const [isReady, setIsReady] = useState(false);

	useEffect(() => {
		// Small delay to ensure token is loaded from localStorage
		const timer = setTimeout(() => {
			setIsReady(true);
		}, 100);

		return () => clearTimeout(timer);
	}, []);

	return {
		isAuthenticated: !!accessToken,
		merchantId,
		isReady,
		token: accessToken,
	};
};

// Usage in your stock page:
// const { isAuthenticated, merchantId, isReady } = useAuthCheck();
