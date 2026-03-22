/**
 * Original Author: Marcellas
 * src/store/userStore.ts - User State Management
 */
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";
import type { UserInfo, UserRole, UserToken } from "#/entity";
import userService, { type SignInReq } from "@/api/services/userService";
import {
	decodeToken,
	getMerchantIdFromToken,
	getRoleFromToken,
	getUserIdFromToken,
	getUsernameFromToken,
	isTokenExpired,
} from "@/utils/jwt";

type UserStore = {
	userInfo: Partial<UserInfo>;
	userToken: UserToken;
	// Direct authentication state for easy checking
	isAuthenticated: boolean;
	merchantId: string | null; // Direct merchant ID access
	actions: {
		setUserInfo: (userInfo: UserInfo) => void;
		setUserToken: (userToken: UserToken) => void;
		clearUserInfoAndToken: () => void;
		//  Quick auth check method
		checkAuthState: () => boolean;
		//  Sync auth state method
		syncAuthState: () => void;
	};
};

const useUserStore = create<UserStore>()(
	persist(
		(set, get) => ({
			userInfo: {},
			userToken: {},
			isAuthenticated: false, //Direct auth state
			merchantId: null, // Direct merchant ID
			actions: {
				setUserInfo: (userInfo) => {
					// PRIVACY: Remove sensitive user info from logs
					console.log("🛠️ Setting user info");
					console.debug("User info fields:", {
						has_username: !!userInfo.username,
						has_email: !!userInfo.email,
						has_role: !!userInfo.role,
						has_merchantId: !!userInfo.merchantId,
					});

					// Set merchantId directly and update auth state
					const merchantId = userInfo.merchantId || null;
					const hasValidData = !!userInfo.username && !!userInfo.id;
					set({
						userInfo,
						merchantId,
						isAuthenticated: hasValidData,
					});
					console.log("✅ User info set");
				},
				setUserToken: (userToken) => {
					// PRIVACY: Remove token preview from logs
					console.log("🛠️ Setting user token");
					console.debug("Token details:", {
						hasToken: !!userToken?.accessToken,
						token_length: userToken?.accessToken ? userToken.accessToken.length : 0,
					});

					// Extract merchant ID from token immediately
					let merchantId: string | null = null;
					if (userToken?.accessToken) {
						try {
							const decoded = decodeToken(userToken.accessToken);
							merchantId = decoded?.id ? decoded.id.toString() : null;
							console.debug("Extracted merchant ID from token");
						} catch (_error) {
							console.error("❌ Failed to decode token for merchant ID");
						}
					}

					// Set authentication state based on token presence AND merchant ID
					const hasValidToken = !!userToken?.accessToken;
					set({
						userToken,
						merchantId,
						isAuthenticated: hasValidToken, // Will be updated when userInfo is set
					});
					console.log("✅ Token set");
				},
				clearUserInfoAndToken() {
					console.log("🛠️ Clearing user info and token");

					// IMPORTANT: Clear stock page password when user logs out
					try {
						localStorage.removeItem("stock_page_unlocked");
						console.log("🔐 Cleared stock page password on logout");
					} catch (error) {
						console.error("Failed to clear stock page password:", error);
					}

					set({
						userInfo: {},
						userToken: {},
						isAuthenticated: false,
						merchantId: null,
					});

					console.log("✅ User info and token cleared");
				},
				// ADDED: Quick method to check auth state
				checkAuthState: () => {
					const state = get();
					const hasToken = !!state.userToken?.accessToken;
					const hasUserInfo = !!state.userInfo?.username;
					const isAuth = hasToken && hasUserInfo;

					// PRIVACY: Remove sensitive info from auth check logs
					console.debug("🔐 Auth State Check:", {
						hasToken,
						hasUserInfo,
						isAuth,
						merchantId: state.merchantId ? "[REDACTED]" : null,
					});

					// FIXED: Sync the state if there's a mismatch
					if (isAuth !== state.isAuthenticated) {
						console.debug("🔄 Fixing auth state mismatch");
						set({ isAuthenticated: isAuth });
					}

					return isAuth;
				},
				// ADDED: Method to sync authentication state
				syncAuthState: () => {
					const state = get();
					const hasToken = !!state.userToken?.accessToken;
					const hasUserInfo = !!state.userInfo?.username;
					const isAuth = hasToken && hasUserInfo;

					// Extract merchant ID if we have a token but no merchant ID
					let merchantId = state.merchantId;
					if (hasToken && !merchantId) {
						try {
							const token = state.userToken.accessToken;
							if (token) {
								const decoded = decodeToken(token);
								merchantId = decoded?.id ? decoded.id.toString() : null;
							}
							console.debug("🔄 Synced merchant ID from token");
						} catch (_error) {
							console.error("❌ Failed to sync merchant ID");
						}
					}

					console.debug("🔄 Syncing auth state:", {
						was: state.isAuthenticated,
						shouldBe: isAuth,
						hasMerchantId: !!merchantId,
					});

					set({
						isAuthenticated: isAuth,
						merchantId: merchantId || state.merchantId,
					});
				},
			},
		}),
		{
			name: "userStore",
			storage: createJSONStorage(() => localStorage),
			partialize: (state) => ({
				userInfo: state.userInfo,
				userToken: state.userToken,
				isAuthenticated: state.isAuthenticated, // ADDED: Persist auth state
				merchantId: state.merchantId, // ADDED: Persist merchant ID
			}),
			version: 3, // INCREMENT VERSION since we added new fields
			onRehydrateStorage: () => (state) => {
				console.log("🔄 Storage rehydrated");
				if (state) {
					// Sync authentication state after rehydration
					setTimeout(() => {
						state.actions.syncAuthState();
					}, 100);
				}
			},
		},
	),
);

export const useUserInfo = () => useUserStore((state) => state.userInfo);
export const useUserToken = () => useUserStore((state) => state.userToken);
export const useUserPermissions = () => useUserStore((state) => state.userInfo?.permissions ?? []);
export const useUserActions = () => useUserStore((state) => state.actions);

// ADDED: Direct hook for authentication state
export const useIsAuthenticated = () => useUserStore((state) => state.isAuthenticated);

// FIXED: Direct merchant ID hook - uses the direct store field
export const useMerchantId = (): string | null => {
	const storeMerchantId = useUserStore((state) => state.merchantId);
	const token = useUserToken();

	// If we have a merchant ID in store, use it
	if (storeMerchantId) return storeMerchantId;

	// Otherwise try to extract from token
	if (!token?.accessToken) return null;

	try {
		const merchantId = getMerchantIdFromToken(token.accessToken);
		console.debug("🔄 useMerchantId: Extracted from token");
		return merchantId;
	} catch (_error) {
		console.error("Failed to get merchant ID from token");
		return null;
	}
};

// Convenience hooks
export const useUsername = () => useUserStore((state) => state.userInfo?.username);
export const useUserEmail = () => useUserStore((state) => state.userInfo?.email);

export const useUserRole = (): UserRole | null => {
	const { accessToken } = useUserToken();

	if (!accessToken) return null;

	try {
		const role = getRoleFromToken(accessToken);
		return role;
	} catch (_error) {
		console.error("Failed to get role from token");
		return null;
	}
};

export const useUserId = (): string | null => {
	const { accessToken } = useUserToken();

	if (!accessToken) return null;

	try {
		const userId = getUserIdFromToken(accessToken);
		return userId;
	} catch (_error) {
		console.error("Failed to get user ID from token");
		return null;
	}
};

export const useIsTokenValid = (): boolean => {
	const { accessToken } = useUserToken();

	if (!accessToken) return false;

	try {
		return !isTokenExpired(accessToken);
	} catch {
		return false;
	}
};

export const useHasPermission = (permission: string): boolean => {
	const userRole = useUserRole();
	const userPermissions = useUserPermissions();

	if (!userRole) return false;

	return userPermissions.some((p) => p.code === permission);
};

export const useTokenDebug = () => {
	const token = useUserToken();
	const userInfo = useUserInfo();
	const actions = useUserActions();
	const isAuthenticated = useIsAuthenticated();
	const merchantId = useMerchantId();

	// PRIVACY: Never expose actual token in debug
	return {
		token: token?.accessToken ? "[REDACTED]" : null,
		userInfo: userInfo ? "[REDACTED]" : null,
		actions,
		isAuthenticated,
		merchantId: merchantId ? "[REDACTED]" : null,
		checkAuth: actions.checkAuthState,
		syncAuth: actions.syncAuthState,
	};
};

/**
 * Original Author: Marcellas
 * Enhanced auth check hook
 */
export const useAuthCheck = () => {
	const isAuthenticated = useIsAuthenticated();
	const merchantId = useMerchantId();
	const checkAuthState = useUserStore((state) => state.actions.checkAuthState);
	const syncAuthState = useUserStore((state) => state.actions.syncAuthState);

	// Auto-sync on mount
	React.useEffect(() => {
		console.log("🔄 useAuthCheck: Auto-syncing auth state");
		syncAuthState();
	}, [syncAuthState]);

	return {
		isAuthenticated,
		merchantId,
		checkAuthState,
		syncAuthState,
		// Combined check that tries both
		isReallyAuthenticated: () => {
			const storeAuth = isAuthenticated;
			const manualCheck = checkAuthState();
			const result = storeAuth && manualCheck;

			// PRIVACY: Remove sensitive details from auth check
			console.debug("🔐 Authentication check:", {
				isAuthenticated: result,
				hasMerchantId: !!merchantId,
			});

			return result;
		},
	};
};

/**
 * Original Author: Marcellas
 * Enhanced signIn function
 */
export const useSignIn = () => {
	const { setUserToken, setUserInfo, syncAuthState } = useUserActions();

	const signInMutation = useMutation({
		mutationFn: userService.signin,
	});

	const signIn = async (data: SignInReq) => {
		console.log("🛠️ Starting signin process...");

		const signInPromise = signInMutation.mutateAsync(data);

		toast.promise(signInPromise, {
			loading: "Logging in...",
			success: (res) => {
				// PRIVACY: Remove full response logging
				console.log("🛠️ Login response received");

				// FIXED: Proper token extraction - ONLY extract the JWT token
				let token: string | null = null;
				const resAny = res as unknown as Record<string, unknown>;

				if (res?.respObject?.value && typeof res.respObject.value === "string") {
					// This is the correct path - extract just the JWT token
					token = res.respObject.value;
					console.debug("Token length:", token.length);
				} else if (resAny?.accessToken) {
					token = resAny.accessToken as string;
					console.debug("Token found in accessToken");
				} else if (resAny?.token) {
					token = resAny.token as string;
					console.debug("Token found in token");
				}

				if (!token) {
					console.error("🛠️ No token found in response");
					throw new Error("No authentication token received from server");
				}

				// FIXED: Validate that we actually have a JWT token, not the whole response
				if (token.includes('{"status":"200"') || token.includes('"respObject"')) {
					console.error("🛠️ ERROR: Storing entire response as token instead of JWT!");
					throw new Error("Invalid token format received from server");
				}

				console.log("🛠️ Received valid JWT token");

				// Decode token to get user information
				const decodedToken = decodeToken(token);

				if (!decodedToken) {
					console.error("🛠️ Failed to decode token");
					throw new Error("Failed to decode authentication token");
				}

				// FIXED: Extract merchant ID from the 'id' field in token
				const merchantId = decodedToken.id ? decodedToken.id.toString() : "";
				console.debug("Extracted merchant ID from token");

				// Extract user information from token
				const username = getUsernameFromToken(token) || data.username;
				const userId = getUserIdFromToken(token) || decodedToken.sub || "";
				const userRole = (decodedToken.role as UserRole) || "ADMIN";

				if (!username) {
					console.error("🛠️ No username found in token or request");
					throw new Error("No username found in authentication data");
				}

				const userInfo: UserInfo = {
					id: userId,
					username: username,
					email: decodedToken.email || "",
					role: userRole,
					merchantId: merchantId,
				};

				console.log("🛠️ Setting user info");

				// FIXED: Set token first, then user info to ensure proper state
				setUserToken({ accessToken: token });
				setUserInfo(userInfo);

				// FIXED: Force sync auth state after login
				setTimeout(() => {
					syncAuthState();
					const currentState = useUserStore.getState();

					// PRIVACY: Remove sensitive final state logging
					console.log("✅ Login complete");
					console.debug("Final store state:", {
						hasToken: !!currentState.userToken?.accessToken,
						hasUserInfo: !!currentState.userInfo?.username,
						isAuthenticated: currentState.isAuthenticated,
					});
				}, 100);

				return `Login successful! Welcome ${userInfo.username} (${userInfo.role})`;
			},
			error: (_err) => {
				// PRIVACY: Don't expose error details
				console.error("🛠️ Login error");
				return "Login failed. Please try again.";
			},
		});

		return signInPromise;
	};

	return signIn;
};

// Import React for useEffect
import React from "react";

export { useUserStore };
export default useUserStore;
