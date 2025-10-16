// src/api/services/authService.ts
import { loyaltyApiClient } from "../apiClient";

export interface LoyaltyLoginRequest {
	username: string;
	password: string;
}

export interface LoyaltyLoginResponse {
	accessToken: string;
	refreshToken?: string;
	user: {
		id: string;
		username: string;
		role: string;
	};
}

const loyaltyLogin = (data: LoyaltyLoginRequest) =>
	loyaltyApiClient.post<LoyaltyLoginResponse>({ url: "/login", data });

export default {
	loyaltyLogin,
};
