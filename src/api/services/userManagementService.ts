// src/api/services/userManagementService.ts - UPDATED WITH CORRECT ENDPOINTS
import { loyaltyApiClient } from "../apiClient";

export interface SystemUser {
	id: string;
	username: string;
	role: string;
	status: string;
	createdAt: string;
	permissions?: string[];
}

export interface CreateUserRequest {
	username: string;
	password: string;
	role: string;
	status: string;
	merchantId?: string;
}

export interface ApiResponse<T = any> {
	status: string;
	message: string;
	respObject?: T;
}

// Define available roles and their permissions
export const USER_ROLES = {
	ADMIN: {
		value: "ADMIN",
		label: "Administrator",
		permissions: ["*"], // All permissions
	},
	LEAD_COLLECTOR: {
		value: "LEAD_COLLECTOR",
		label: "Lead Collector",
		permissions: ["leads:read", "leads:write"],
	},
	MERCHANT: {
		value: "MERCHANT",
		label: "Merchant",
		permissions: ["inventory:read", "inventory:write", "sales:read", "sales:write"],
	},
	SALES_PERSON: {
		value: "SALES_PERSON",
		label: "Sales Person",
		permissions: ["sales:read", "sales:write"],
	},
} as const;

export type UserRole = keyof typeof USER_ROLES;

const createUser = (data: CreateUserRequest) =>
	loyaltyApiClient.post<ApiResponse>({
		url: "/user/add",
		data,
	});

const getUsersByRole = (role: string) =>
	loyaltyApiClient.get<ApiResponse>({
		url: "/user/get/by-role",
		data: role,
	});

const getUserById = (userId: number) =>
	loyaltyApiClient.get<ApiResponse>({
		url: `/user/get/by-id/${userId}`,
	});

const getAllUsers = () =>
	loyaltyApiClient.get<ApiResponse>({
		url: "/user/get/all",
	});

const updateUser = (data: { id: string; attributeName: string; attributeValue: string }) =>
	loyaltyApiClient.put<ApiResponse>({
		url: "/user/update",
		data,
	});

export default {
	createUser,
	getUsersByRole,
	getUserById,
	getAllUsers,
	updateUser,
	USER_ROLES,
};
