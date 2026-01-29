// src/components/debug/debug-auth.tsx - ENHANCED VERSION
import { useEffect } from "react";
import { useUserActions, useUserInfo, useUserToken } from "@/store/userStore";
import { decodeToken, isTokenExpired } from "@/utils/jwt";

export const DebugAuth = () => {
	const { accessToken } = useUserToken();
	const userInfo = useUserInfo();
	const actions = useUserActions();

	useEffect(() => {
		console.group("🔐 AUTH DEBUG PANEL");
		console.log("🛠️ Current token state:", accessToken);
		console.log("🛠️ User info state:", userInfo);

		// Check localStorage
		const stored = localStorage.getItem("userStore");
		if (stored) {
			try {
				const parsed = JSON.parse(stored);
				console.log("🛠️ LocalStorage state:", parsed);

				// Check if token exists in localStorage but not in state
				const storedToken = parsed.state?.userToken?.accessToken;
				if (storedToken && !accessToken) {
					console.warn("⚠️ Token exists in localStorage but not in state! Restoring...");
					actions.setUserToken({ accessToken: storedToken });
				}
			} catch (error) {
				console.error("🛠️ Failed to parse localStorage:", error);
			}
		} else {
			console.log("🛠️ No userStore in localStorage");
		}

		// Token analysis
		if (accessToken) {
			const decoded = decodeToken(accessToken);
			const expired = isTokenExpired(accessToken);

			console.log("🛠️ Decoded token:", decoded);
			console.log("🛠️ Token expired:", expired);
			console.log(`🛠️ Token preview: ${accessToken.substring(0, 50)}...`);
		} else {
			console.log("🛠️ No access token available");
		}

		console.groupEnd();
	}, [accessToken, userInfo, actions]);

	return null;
};
