// src/store/userStore.ts - FIXED VERSION
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
	type JwtPayload,
} from "@/utils/jwt";

type UserStore = {
	userInfo: Partial<UserInfo>;
	userToken: UserToken;
	// Direct authentication state for easy checking
	isAuthenticated: boolean;
	merchantId: string | null; // Direct merchant ID access
	actions: {
		setUserInfo: (userInfo: UserInfo) => void;
		setUserToken: (token: UserToken) => void;
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
					console.log("🛠️ Setting user info:", userInfo);
					// Set merchantId directly and update auth state
					const merchantId = userInfo.merchantId || null;
					const hasValidData = !!userInfo.username && !!userInfo.id;
					set({
						userInfo,
						merchantId,
						isAuthenticated: hasValidData,
					});
					console.log("✅ User info set, auth state:", hasValidData);
				},
				setUserToken: (userToken) => {
					console.log("🛠️ Setting user token:", {
						hasToken: !!userToken?.accessToken,
						tokenPreview: userToken?.accessToken ? `${userToken.accessToken.substring(0, 20)}...` : "No token",
					});

					// Extract merchant ID from token immediately
					let merchantId: string | null = null;
					if (userToken?.accessToken) {
						try {
							const decoded = decodeToken(userToken.accessToken);
							merchantId = decoded?.id ? decoded.id.toString() : null;
							console.log("🛠️ Extracted merchant ID from token:", merchantId);
						} catch (error) {
							console.error("❌ Failed to decode token for merchant ID:", error);
						}
					}

					// Set authentication state based on token presence AND merchant ID
					const hasValidToken = !!userToken?.accessToken;
					set({
						userToken,
						merchantId,
						isAuthenticated: hasValidToken, // Will be updated when userInfo is set
					});
					console.log("✅ Token set, auth state:", hasValidToken);
				},
				clearUserInfoAndToken() {
					console.log("🛠️ Clearing user info and token");
					set({
						userInfo: {},
						userToken: {},
						isAuthenticated: false,
						merchantId: null,
					});
				},
				// ADDED: Quick method to check auth state
				checkAuthState: () => {
					const state = get();
					const hasToken = !!state.userToken?.accessToken;
					const hasUserInfo = !!state.userInfo?.username;
					const isAuth = hasToken && hasUserInfo;

					console.log("🔐 Auth State Check:", {
						hasToken,
						hasUserInfo,
						isAuth,
						username: state.userInfo?.username,
						merchantId: state.merchantId,
						tokenPreview: state.userToken?.accessToken
							? `${state.userToken.accessToken.substring(0, 20)}...`
							: "No token",
					});

					// FIXED: Sync the state if there's a mismatch
					if (isAuth !== state.isAuthenticated) {
						console.log("🔄 Fixing auth state mismatch:", { was: state.isAuthenticated, shouldBe: isAuth });
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
							const decoded = decodeToken(state.userToken.accessToken!);
							merchantId = decoded?.id ? decoded.id.toString() : null;
							console.log("🔄 Synced merchant ID from token:", merchantId);
						} catch (error) {
							console.error("❌ Failed to sync merchant ID:", error);
						}
					}

					console.log("🔄 Syncing auth state:", {
						was: state.isAuthenticated,
						shouldBe: isAuth,
						merchantId: state.merchantId,
						newMerchantId: merchantId,
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
				console.log("🔄 Storage rehydrated, syncing auth state...");
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
		console.log("🔄 useMerchantId: Extracted from token:", merchantId);
		return merchantId;
	} catch (error) {
		console.error("Failed to get merchant ID from token:", error);
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
	} catch (error) {
		console.error("Failed to get role from token:", error);
		return null;
	}
};

export const useUserId = (): string | null => {
	const { accessToken } = useUserToken();

	if (!accessToken) return null;

	try {
		const userId = getUserIdFromToken(accessToken);
		return userId;
	} catch (error) {
		console.error("Failed to get user ID from token:", error);
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

	return userPermissions.includes(permission);
};

export const useTokenDebug = () => {
	const token = useUserToken();
	const userInfo = useUserInfo();
	const actions = useUserActions();
	const isAuthenticated = useIsAuthenticated();
	const merchantId = useMerchantId();

	return {
		token,
		userInfo,
		actions,
		isAuthenticated,
		merchantId,
		checkAuth: actions.checkAuthState,
		syncAuth: actions.syncAuthState,
	};
};

//  Enhanced auth check hook
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
			console.log("🔐 isReallyAuthenticated:", { storeAuth, manualCheck, result, merchantId });
			return result;
		},
	};
};

// FIXED: Enhanced signIn function
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
				console.log("🛠️ Login response:", res);

				// FIXED: Proper token extraction - ONLY extract the JWT token
				let token: string | null = null;

				if (res?.respObject?.value && typeof res.respObject.value === "string") {
					// This is the correct path - extract just the JWT token
					token = res.respObject.value;
					console.log("🛠️ Token found in respObject.value:", token.substring(0, 50) + "...");
				} else if (res?.accessToken) {
					token = res.accessToken;
					console.log("🛠️ Token found in accessToken");
				} else if (res?.token) {
					token = res.token;
					console.log("🛠️ Token found in token");
				}

				if (!token) {
					console.error("🛠️ No token found in response. Full response:", res);
					throw new Error("No authentication token received from server");
				}

				// FIXED: Validate that we actually have a JWT token, not the whole response
				if (token.includes('{"status":"200"') || token.includes('"respObject"')) {
					console.error("🛠️ ERROR: Storing entire response as token instead of JWT!");
					console.error("🛠️ Token content:", token);
					throw new Error("Invalid token format received from server");
				}

				console.log("🛠️ Received valid JWT token:", token.substring(0, 50) + "...");

				// Decode token to get user information
				const decodedToken = decodeToken(token);
				console.log("🛠️ Decoded token:", decodedToken);

				if (!decodedToken) {
					console.error("🛠️ Failed to decode token");
					throw new Error("Failed to decode authentication token");
				}

				// FIXED: Extract merchant ID from the 'id' field in token
				const merchantId = decodedToken.id ? decodedToken.id.toString() : "";
				console.log("🛠️ Extracted merchant ID from token 'id' field:", merchantId);

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

				console.log("🛠️ Setting user info:", userInfo);
				console.log("🛠️ Setting JWT token...");

				// FIXED: Set token first, then user info to ensure proper state
				setUserToken({ accessToken: token });
				setUserInfo(userInfo);

				// FIXED: Force sync auth state after login
				setTimeout(() => {
					syncAuthState();
					const currentState = useUserStore.getState();
					console.log("✅ Login complete - Final store state:", {
						hasToken: !!currentState.userToken?.accessToken,
						hasUserInfo: !!currentState.userInfo?.username,
						username: currentState.userInfo?.username,
						merchantId: currentState.merchantId,
						isAuthenticated: currentState.isAuthenticated,
					});
				}, 100);

				return `Login successful! Welcome ${userInfo.username} (${userInfo.role}) - Merchant ID: ${merchantId}`;
			},
			error: (err) => {
				console.error("🛠️ Login error:", err);
				return err?.message || "Login failed. Please try again.";
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
