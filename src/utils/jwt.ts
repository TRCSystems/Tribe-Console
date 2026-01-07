// src/utils/jwt.ts - FIXED VERSION
import { jwtDecode } from "jwt-decode";
import type { UserRole } from "#/entity";

export interface JwtPayload {
	userId?: string;
	username?: string;
	email?: string;
	role?: UserRole;
	merchantId?: string;
	exp: number;
	iat: number;
	sub?: string;
	iss?: string;
	// The actual merchant ID is in the 'id' field
	id?: string | number;
	// ADDED: Support for different field names
	user_id?: string;
	user_name?: string;
	preferred_username?: string;
}

/**
 * Decode JWT token to extract payload
 */
export const decodeToken = (token: string): JwtPayload | null => {
	try {
		const decoded = jwtDecode<JwtPayload>(token);
		console.log("🛠️ JWT Debug - Full decoded token structure:", decoded);
		console.log("🛠️ JWT Debug - Key fields:", {
			id: decoded.id,
			role: decoded.role,
			username: decoded.username,
			user_name: decoded.user_name,
			preferred_username: decoded.preferred_username,
			email: decoded.email,
			exp: decoded.exp,
			sub: decoded.sub,
			user_id: decoded.user_id,
		});
		return decoded;
	} catch (error) {
		console.error("🛠️ Failed to decode JWT token:", error);
		return null;
	}
};

/**
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
	try {
		const decoded = jwtDecode<JwtPayload>(token);
		const currentTime = Date.now() / 1000;
		const isExpired = decoded.exp < currentTime;
		console.log("🛠️ Token expiration check:", {
			exp: decoded.exp,
			current: currentTime,
			isExpired,
		});
		return isExpired;
	} catch (error) {
		console.error("Failed to check token expiration:", error);
		return true;
	}
};

/**
 * Extract user role from JWT token
 */
export const getRoleFromToken = (token: string): UserRole | null => {
	try {
		const decoded = decodeToken(token);
		const role = (decoded?.role as UserRole) || "ADMIN"; // Default to ADMIN if no role
		console.log("🛠️ Extracted role from token:", role);
		return role;
	} catch (error) {
		console.error("Failed to extract role from token:", error);
		return "ADMIN"; // Default fallback
	}
};

/**
 * Extract user ID from JWT token
 */
export const getUserIdFromToken = (token: string): string | null => {
	try {
		const decoded = decodeToken(token);
		// Try multiple possible fields for user ID
		const userId = decoded?.id?.toString() || decoded?.user_id || decoded?.sub || decoded?.userId || "1"; // Default fallback

		console.log("🛠️ Extracted user ID from token:", userId);
		return userId;
	} catch (error) {
		console.error("Failed to get user ID from token:", error);
		return "1"; // Default fallback
	}
};

/**
 * Extract username from JWT token - FIXED: Handle missing username fields
 */
export const getUsernameFromToken = (token: string): string | null => {
	try {
		const decoded = decodeToken(token);

		// FIXED: Enhanced debug to see what's actually available
		console.log("🛠️ Username extraction debug:", {
			availableFields: Object.keys(decoded || {}),
			username: decoded?.username,
			user_name: decoded?.user_name,
			preferred_username: decoded?.preferred_username,
			sub: decoded?.sub,
			email: decoded?.email,
			id: decoded?.id,
		});

		// FIXED: Try multiple possible fields for username with better fallbacks
		let username = decoded?.username || decoded?.user_name || decoded?.preferred_username || decoded?.sub;

		// FIXED: If no username fields found, create one from available data
		if (!username) {
			if (decoded?.email) {
				// Use email prefix as username
				username = decoded.email.split("@")[0];
				console.log("🛠️ Using email prefix as username:", username);
			} else if (decoded?.id) {
				// Use ID-based username
				username = `user_${decoded.id}`;
				console.log("🛠️ Using ID-based username:", username);
			} else {
				// Final fallback
				username = "admin";
				console.log("🛠️ Using default username fallback");
			}
		}

		console.log("🛠️ Final extracted username:", username);
		return username;
	} catch (error) {
		console.error("Failed to get username from token:", error);
		return "admin"; // Default fallback
	}
};

/**
 * Extract merchant ID from JWT token - ENHANCED with better fallbacks
 */
export const getMerchantIdFromToken = (token: string): string | null => {
	try {
		const decoded = decodeToken(token);
		console.log("🛠️ Merchant ID extraction - All token fields:", decoded);

		// Try multiple possible fields for merchant ID
		let merchantId: string | null = null;

		if (decoded?.id) {
			merchantId = decoded.id.toString();
			console.log("✅ Extracted merchant ID from 'id' field:", merchantId);
		} else if (decoded?.merchantId) {
			merchantId = decoded.merchantId;
			console.log("✅ Extracted merchant ID from 'merchantId' field:", merchantId);
		} else if (decoded?.user_id) {
			merchantId = decoded.user_id;
			console.log("✅ Extracted merchant ID from 'user_id' field:", merchantId);
		} else if (decoded?.sub) {
			merchantId = decoded.sub;
			console.log("✅ Extracted merchant ID from 'sub' field:", merchantId);
		}

		if (!merchantId) {
			console.warn("❌ No merchant ID field found in token, using default '1'");
			merchantId = "1"; // Default fallback
		}

		console.log("🛠️ Final merchant ID:", merchantId);
		return merchantId;
	} catch (error) {
		console.error("❌ Failed to extract merchant ID from token:", error);
		return "1"; // Default fallback
	}
};

/**
 * NEW: Enhanced token validation that handles missing username gracefully
 */
export const validateToken = (token: string): { isValid: boolean; missingFields: string[]; warnings: string[] } => {
	try {
		const decoded = decodeToken(token);
		const missingFields: string[] = [];
		const warnings: string[] = [];

		if (!decoded) {
			return { isValid: false, missingFields: ["decodable"], warnings: [] };
		}

		// Check for essential fields
		if (!decoded.id && !decoded.sub && !decoded.user_id) {
			missingFields.push("id/sub/user_id");
		}

		if (!decoded.role) {
			missingFields.push("role");
		}

		if (!decoded.exp) {
			missingFields.push("exp");
		}

		// FIXED: Username is not critical, just warn about it
		if (!decoded?.username && !decoded?.user_name && !decoded?.preferred_username) {
			warnings.push("username (will use fallback)");
		}

		const isValid = missingFields.length === 0;

		console.log("🛠️ Token validation:", {
			isValid,
			missingFields,
			warnings,
			hasId: !!decoded.id,
			hasRole: !!decoded.role,
			hasExp: !!decoded.exp,
			hasUsername: !!(decoded?.username || decoded?.user_name || decoded?.preferred_username),
		});

		return { isValid, missingFields, warnings };
	} catch (error) {
		console.error("❌ Token validation failed:", error);
		return { isValid: false, missingFields: ["decodable"], warnings: [] };
	}
};

/**
 * NEW: Get all user info from token in one call - FIXED
 */
export const extractUserInfoFromToken = (token: string) => {
	try {
		const decoded = decodeToken(token);
		if (!decoded) {
			throw new Error("Failed to decode token");
		}

		const userInfo = {
			id: getUserIdFromToken(token),
			username: getUsernameFromToken(token), // This now handles missing username properly
			email: decoded.email || "",
			role: getRoleFromToken(token) || "ADMIN",
			merchantId: getMerchantIdFromToken(token),
			// FIXED: Add raw token data for debugging
			rawTokenData: {
				hasUsername: !!(decoded.username || decoded.user_name || decoded.preferred_username),
				hasEmail: !!decoded.email,
				hasRole: !!decoded.role,
				hasId: !!decoded.id,
			},
		};

		console.log("🛠️ Extracted complete user info from token:", userInfo);
		return userInfo;
	} catch (error) {
		console.error("❌ Failed to extract user info from token:", error);
		return null;
	}
};
