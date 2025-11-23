// src/contexts/MerchantContext.tsx - FIXED VERSION
import type React from "react";
import { createContext, useContext, useEffect, useState } from "react";
import { useMerchantId, useUserInfo, useUserRole, useUserToken } from "@/store/userStore";
import { decodeToken } from "@/utils/jwt";

interface MerchantContextType {
	merchantId: string | null;
	isAdmin: boolean;
	isLoading: boolean;
	hasMerchantAccess: boolean;
	setMerchantId: (id: string) => void;
}

const MerchantContext = createContext<MerchantContextType | undefined>(undefined);

export const MerchantProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
	const merchantIdFromStore = useMerchantId();
	const userRole = useUserRole();
	const { accessToken } = useUserToken();
	const userInfo = useUserInfo();
	const [merchantId, setMerchantIdState] = useState<string | null>(null);
	const [isLoading, setIsLoading] = useState(true);

	useEffect(() => {
		const resolveMerchantId = () => {
			console.log("🛠️ Resolving merchant ID:", {
				fromStore: merchantIdFromStore,
				userRole,
				hasToken: !!accessToken,
				userInfo: userInfo,
			});

			// Priority 1: Use merchant ID from store (this comes from useMerchantId() which extracts from token)
			if (merchantIdFromStore) {
				console.log("✅ Using merchant ID from store (token extraction):", merchantIdFromStore);
				setMerchantIdState(merchantIdFromStore);
				setIsLoading(false);
				return;
			}

			// Priority 2: Extract directly from token if available
			if (accessToken) {
				try {
					const decoded = decodeToken(accessToken);
					console.log("🔍 Decoded token for merchant ID:", decoded);

					// THE FIX: The merchant ID is in the 'id' field of the token
					const merchantIdFromToken = decoded?.id;
					if (merchantIdFromToken) {
						console.log("✅ Using merchant ID from token 'id' field:", merchantIdFromToken);
						setMerchantIdState(merchantIdFromToken.toString());
						setIsLoading(false);
						return;
					} else {
						console.warn("❌ No 'id' field found in token for merchant ID");
					}
				} catch (error) {
					console.error("❌ Error decoding token:", error);
				}
			}

			// Priority 3: Check user info
			if (userInfo?.merchantId) {
				console.log("✅ Using merchant ID from user info:", userInfo.merchantId);
				setMerchantIdState(userInfo.merchantId);
				setIsLoading(false);
				return;
			}

			// Priority 4: No merchant ID available
			console.warn("❌ No merchant ID available from any source");
			setMerchantIdState(null);
			setIsLoading(false);
		};

		// Use a more immediate resolution without long timeout
		if (accessToken || userInfo) {
			resolveMerchantId();
		} else {
			// If no token or user info yet, wait a bit and try again
			const timer = setTimeout(() => {
				resolveMerchantId();
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [merchantIdFromStore, accessToken, userRole, userInfo]);

	const setMerchantId = (id: string) => {
		console.log("🔄 Setting merchant ID manually:", id);
		setMerchantIdState(id);
	};

	const isAdmin = userRole === "ADMIN";
	const hasMerchantAccess = !!merchantId;

	console.log("🛠️ Merchant Context State:", {
		merchantId,
		isAdmin,
		isLoading,
		hasMerchantAccess,
	});

	return (
		<MerchantContext.Provider
			value={{
				merchantId,
				isAdmin,
				isLoading,
				hasMerchantAccess,
				setMerchantId,
			}}
		>
			{children}
		</MerchantContext.Provider>
	);
};

export const useMerchant = () => {
	const context = useContext(MerchantContext);
	if (context === undefined) {
		throw new Error("useMerchant must be used within a MerchantProvider");
	}
	return context;
};
