// src/api/services/userManagementService.ts - UPDATED WITH ROLES
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
	permissions?: string[];
}

// Define available roles and their permissions
export const USER_ROLES = {
	ADMIN: {
		value: "ADMIN",
		label: "Administrator",
		permissions: ["*"], // All permissions
	},
	MANAGER: {
		value: "MANAGER",
		label: "Manager",
		permissions: ["campaigns:read", "campaigns:write", "merchants:read", "merchants:write", "analytics:read"],
	},
	USER: {
		value: "USER",
		label: "User",
		permissions: ["campaigns:read", "analytics:read"],
	},
	VIEWER: {
		value: "VIEWER",
		label: "Viewer",
		permissions: ["campaigns:read"],
	},
} as const;

export type UserRole = keyof typeof USER_ROLES;

const createUser = (data: CreateUserRequest) => loyaltyApiClient.post<SystemUser>({ url: "/user/add", data });

const getUsers = () => loyaltyApiClient.get<SystemUser[]>({ url: "/user" });

const getUserById = (id: string) => loyaltyApiClient.get<SystemUser>({ url: `/user/${id}` });

const updateUserRole = (id: string, role: string, permissions?: string[]) =>
	loyaltyApiClient.put<SystemUser>({
		url: `/user/${id}/role`,
		data: { role, permissions },
	});

export default {
	createUser,
	getUsers,
	getUserById,
	updateUserRole,
	USER_ROLES,
};
