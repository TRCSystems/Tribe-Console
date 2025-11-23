// src/api/services/authService.ts - UPDATED TO AVOID DUPLICATION
import { loyaltyApiClient } from "../apiClient";

// Re-export types from userService for consistency
export type { SignInReq as LoyaltyLoginRequest, SignInRes as LoyaltyLoginResponse } from "./userService";

// Use the same endpoints as userService - keeping it simple
const loyaltyLogin = (data: any) => loyaltyApiClient.post({ url: "/login", data });

export default {
	loyaltyLogin,
};
