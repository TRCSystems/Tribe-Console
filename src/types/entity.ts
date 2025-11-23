import type { NavItemDataProps } from "@/components/nav/types";
import type { BasicStatus, PermissionType } from "./enum";

export interface UserToken {
	accessToken?: string;
	refreshToken?: string;
}

export interface UserInfo {
	id: string;
	email: string;
	username: string;
	role: UserRole; // ADDED: This was missing!
	password?: string;
	avatar?: string;
	roles?: Role[];
	status?: BasicStatus;
	permissions?: Permission[];
	menu?: MenuTree[];
	merchantId?: string; // ADDED: For merchant-specific data
}

export interface Permission_Old {
	id: string;
	parentId: string;
	name: string;
	label: string;
	type: PermissionType;
	route: string;
	status?: BasicStatus;
	order?: number;
	icon?: string;
	component?: string;
	hide?: boolean;
	hideTab?: boolean;
	frameSrc?: URL;
	newFeature?: boolean;
	children?: Permission_Old[];
}

export interface Role_Old {
	id: string;
	name: string;
	code: string;
	status: BasicStatus;
	order?: number;
	desc?: string;
	permission?: Permission_Old[];
}

export interface CommonOptions {
	status?: BasicStatus;
	desc?: string;
	createdAt?: string;
	updatedAt?: string;
}
export interface User extends CommonOptions {
	id: string; // uuid
	username: string;
	password: string;
	email: string;
	phone?: string;
	avatar?: string;
	role?: UserRole; // ADDED
}

export interface Role extends CommonOptions {
	id: string; // uuid
	name: string;
	code: string;
}

export interface Permission extends CommonOptions {
	id: string; // uuid
	name: string;
	code: string; // resource:action  example: "user-management:read"
}

export interface Menu extends CommonOptions, MenuMetaInfo {
	id: string; // uuid
	parentId: string;
	name: string;
	code: string;
	order?: number;
	type: PermissionType;
}

export type MenuMetaInfo = Partial<
	Pick<NavItemDataProps, "path" | "icon" | "caption" | "info" | "disabled" | "auth" | "hidden">
> & {
	externalLink?: URL;
	component?: string;
};

export type MenuTree = Menu & {
	children?: MenuTree[];
};

// ADD these to your existing entity.ts file

export type UserRole = "ADMIN" | "MANAGER";

export const ROLE_PERMISSIONS = {
	ADMIN: [
		"merchant:read",
		"merchant:write",
		"merchant:delete",
		"analysis:read",
		"analysis:write",
		"roi:read",
		"user:read",
		"user:write",
		"pos:write",
		"pos:write",
		"campaign:read",
		"inventory:write",
	],
	MANAGER: [
		"pos:read",
		"pos:write",
		"campaign:read",
		"campaign:write",
		"inventory:write",
		"inventory:write",
		"roi:read",
	],
} as const;

export const ROUTE_PERMISSIONS: Record<string, string[]> = {
	"/management/merchant": ["merchant:read"],
	"/management/merchant/list": ["merchant:read"],
	"/management/merchant/create": ["merchant:write"],
	"/management/merchant/edit": ["merchant:write"],
	"/analysis": ["analysis:read"],
	"/management/system-users": ["user:write"],
	"/management/system-users/create": ["user:write"],

	"/pos": ["pos:write"],
	"/management/campaign": ["campaign:read"],
	"/management/campaign/list": ["campaign:read"],
	"/management/campaign/create": ["campaign:write"],
	"/inventory": ["inventory:write"],
	"/inventory/stock": ["inventory:write"],
	"/inventory/expenses": ["inventory:write"],

	"/workbench": ["roi:read"],
	"/management/user": [],
};
