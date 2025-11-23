// src/hooks/useAuth.ts - NEW FILE (if you don't have it)
import { useEffect } from "react";
import { useUserStore } from "@/store/userStore";

export const useAuth = () => {
	const { isAuthenticated, merchantId, checkAuth } = useUserStore();

	useEffect(() => {
		// Check authentication on mount and when dependencies change
		checkAuth();
	}, [checkAuth]);

	return {
		isAuthenticated,
		merchantId,
		checkAuth,
	};
};
