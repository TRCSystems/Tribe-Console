/**
 * Original Author: Marcellas
 * src/utils/jwt.ts - JWT Utility Functions
 */
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
	id?: string | number;
	user_id?: string;
	user_name?: string;
	preferred_username?: string;
	name?: string;
	businessName?: string;
}

/**
 * Original Author: Marcellas
 * Decode JWT token to extract payload
 */
export const decodeToken = (token: string): JwtPayload | null => {
	try {
		const decoded = jwtDecode<JwtPayload>(token);

		// PRIVACY: Remove full token structure logging
		console.log("🔐 JWT decoded successfully");
		console.debug("JWT Debug - Key fields (sensitive):", {
			id: decoded.id ? "[REDACTED]" : null,
			role: decoded.role,
			username: decoded.username ? "[REDACTED]" : null,
			has_username: !!(decoded.username || decoded.user_name || decoded.preferred_username),
			has_email: !!decoded.email,
			exp: decoded.exp,
			has_role: !!decoded.role,
			has_user_id: !!(decoded.user_id || decoded.sub || decoded.userId),
		});
		return decoded;
	} catch (_error) {
		console.error("❌ Failed to decode JWT token");
		return null;
	}
};

/**
 * Original Author: Marcellas
 * Check if token is expired
 */
export const isTokenExpired = (token: string): boolean => {
	try {
		const decoded = jwtDecode<JwtPayload>(token);
		const currentTime = Date.now() / 1000;
		const isExpired = decoded.exp < currentTime;

		// PRIVACY: Remove expiration time logging
		console.debug("Token expiration check:", {
			isExpired,
			will_expire_in: isExpired ? "Already expired" : `${Math.round((decoded.exp - currentTime) / 60)} minutes`,
		});
		return isExpired;
	} catch (_error) {
		console.error("Failed to check token expiration");
		return true;
	}
};

/**
 * Original Author: Marcellas
 * Extract user role from JWT token
 */
export const getRoleFromToken = (token: string): UserRole | null => {
	try {
		const decoded = decodeToken(token);
		const role = (decoded?.role as UserRole) || "ADMIN"; // Default to ADMIN if no role

		// PRIVACY: Log only role existence, not value
		console.debug(`Role extracted: ${role ? "[REDACTED]" : "Not found"}`);
		return role;
	} catch (_error) {
		console.error("Failed to extract role from token");
		return "ADMIN"; // Default fallback
	}
};

/**
 * Original Author: Marcellas
 * Extract user ID from JWT token
 */
export const getUserIdFromToken = (token: string): string | null => {
	try {
		const decoded = decodeToken(token);
		// Try multiple possible fields for user ID
		const userId = decoded?.id?.toString() || decoded?.user_id || decoded?.sub || decoded?.userId || "1"; // Default fallback

		// PRIVACY: Never log actual user IDs
		console.debug(`User ID extracted: ${userId ? "[REDACTED]" : "Not found"}`);
		return userId;
	} catch (_error) {
		console.error("Failed to get user ID from token");
		return "1"; // Default fallback
	}
};

/**
 * Original Author: Marcellas
 * Extract username from JWT token
 */
export const getUsernameFromToken = (token: string): string | null => {
	try {
		const decoded = decodeToken(token);

		// PRIVACY: Remove sensitive debug logging
		console.debug("Username extraction:", {
			has_username_field: !!(decoded?.username || decoded?.user_name || decoded?.preferred_username),
			has_email: !!decoded?.email,
			has_id: !!decoded?.id,
		});

		// FIXED: Try multiple possible fields for username with better fallbacks
		let username = decoded?.username || decoded?.user_name || decoded?.preferred_username || decoded?.sub;

		// FIXED: If no username fields found, create one from available data
		if (!username) {
			if (decoded?.email) {
				// Use email prefix as username
				username = decoded.email.split("@")[0];
				console.debug("Using email prefix as username");
			} else if (decoded?.id) {
				// Use ID-based username
				username = `user_[REDACTED]`;
				console.debug("Using ID-based username");
			} else {
				// Final fallback
				username = "admin";
				console.debug("Using default username fallback");
			}
		}

		// PRIVACY: Never log actual usernames
		console.debug(`Username extracted: ${username ? "[REDACTED]" : "Not found"}`);
		return username;
	} catch (_error) {
		console.error("Failed to get username from token");
		return "admin"; // Default fallback
	}
};

/**
 * Original Author: Marcellas
 * Extract merchant ID from JWT token
 */
export const getMerchantIdFromToken = (token: string): string | null => {
	try {
		const decoded = decodeToken(token);

		// PRIVACY: Remove full token field logging
		console.debug("Merchant ID extraction - Available fields:", {
			has_id: !!decoded?.id,
			has_merchantId: !!decoded?.merchantId,
			has_user_id: !!decoded?.user_id,
			has_sub: !!decoded?.sub,
		});

		// Try multiple possible fields for merchant ID
		let merchantId: string | null = null;

		if (decoded?.id) {
			merchantId = decoded.id.toString();
			console.debug("✅ Merchant ID found in 'id' field");
		} else if (decoded?.merchantId) {
			merchantId = decoded.merchantId;
			console.debug("✅ Merchant ID found in 'merchantId' field");
		} else if (decoded?.user_id) {
			merchantId = decoded.user_id;
			console.debug("✅ Merchant ID found in 'user_id' field");
		} else if (decoded?.sub) {
			merchantId = decoded.sub;
			console.debug("✅ Merchant ID found in 'sub' field");
		}

		if (!merchantId) {
			console.warn("❌ No merchant ID field found in token");
			merchantId = "1"; // Default fallback
		}

		// PRIVACY: Never log actual merchant IDs
		console.debug(`Final merchant ID extracted: ${merchantId ? "[REDACTED]" : "Not found"}`);
		return merchantId;
	} catch (_error) {
		console.error("❌ Failed to extract merchant ID from token");
		return "1"; // Default fallback
	}
};

/**
 * Original Author: Marcellas
 * Enhanced token validation that handles missing username gracefully
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

		// PRIVACY: Remove sensitive field values from logs
		console.debug("Token validation result:", {
			isValid,
			missingFieldsCount: missingFields.length,
			warningsCount: warnings.length,
		});

		return { isValid, missingFields, warnings };
	} catch (_error) {
		console.error("❌ Token validation failed");
		return { isValid: false, missingFields: ["decodable"], warnings: [] };
	}
};

/**
 * Original Author: Marcellas
 * Get all user info from token in one call
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
		};

		// PRIVACY: Only log that info was extracted, not the actual values
		console.debug("User info extracted from token successfully");
		console.debug("Extracted fields:", {
			has_id: !!userInfo.id,
			has_username: !!userInfo.username,
			has_email: !!userInfo.email,
			has_role: !!userInfo.role,
			has_merchantId: !!userInfo.merchantId,
		});

		return userInfo;
	} catch (_error) {
		console.error("❌ Failed to extract user info from token");
		return null;
	}
};
/**
 * Original Author: Marcellas
 * Extract merchant name from JWT token
 */
export const getMerchantNameFromToken = (token: string): string | null => {
	try {
		const decoded = decodeToken(token);

		const merchantName =
			decoded?.username ||
			decoded?.preferred_username ||
			decoded?.name ||
			decoded?.businessName ||
			decoded?.sub ||
			null;

		console.debug(`Merchant name extracted: ${merchantName ? "[REDACTED]" : "Not found"}`);

		return merchantName;
	} catch (_error) {
		console.error("Failed to extract merchant name from token");
		return null;
	}
};
