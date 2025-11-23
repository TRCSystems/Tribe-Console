// src/components/debug/token-recovery.tsx - NEW FILE
import { useEffect } from "react";
import { useUserActions, useUserToken } from "@/store/userStore";
import { decodeToken } from "@/utils/jwt";

export const TokenRecovery = () => {
	const { setUserToken, setUserInfo } = useUserActions();
	const { accessToken } = useUserToken();

	useEffect(() => {
		// If no token in state, check localStorage
		if (!accessToken) {
			const stored = localStorage.getItem("userStore");
			if (stored) {
				try {
					const parsed = JSON.parse(stored);
					const storedToken = parsed.state?.userToken?.accessToken;
					const storedUserInfo = parsed.state?.userInfo;

					if (storedToken && !accessToken) {
						console.log("🛠️ TokenRecovery: Restoring token from localStorage");

						// Verify token is valid before restoring
						const decoded = decodeToken(storedToken);
						if (decoded) {
							setUserToken({ accessToken: storedToken });
							if (storedUserInfo) {
								setUserInfo(storedUserInfo);
							}
							console.log("🛠️ TokenRecovery: Token restored successfully");
						} else {
							console.warn("🛠️ TokenRecovery: Invalid token in localStorage, clearing");
							localStorage.removeItem("userStore");
						}
					}
				} catch (error) {
					console.error("🛠️ TokenRecovery: Failed to restore token:", error);
				}
			}
		}
	}, [accessToken, setUserToken, setUserInfo]);

	return null;
};
