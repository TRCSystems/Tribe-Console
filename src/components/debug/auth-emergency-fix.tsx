// src/components/debug/auth-emergency-fix.tsx - FIXED VERSION
import { useEffect } from "react";
import { useUserActions } from "@/store/userStore";

export const AuthEmergencyFix = () => {
	// const { accessToken: _accessToken } = useUserToken();
	const { clearUserInfoAndToken } = useUserActions();

	useEffect(() => {
		// Only intercept critical authentication failures
		const originalFetch = window.fetch;

		window.fetch = async function (...args) {
			const response = await originalFetch.apply(this, args);

			if (response.status === 401) {
				const url = args[0];
				// Only handle critical auth endpoints
				if (typeof url === "string" && (url.includes("/auth/") || url.includes("/user/"))) {
					console.log("🚨 Emergency: Critical authentication failure intercepted");
					clearUserInfoAndToken();
				}
			}

			return response;
		};

		return () => {
			window.fetch = originalFetch;
		};
	}, [clearUserInfoAndToken]);

	return null;
};
