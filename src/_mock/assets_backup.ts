import { faker } from "@faker-js/faker";
import type { Menu, Permission, Role, User } from "#/entity";
import { PermissionType } from "#/enum";

const { GROUP, MENU, CATALOGUE } = PermissionType;

export const DB_MENU: Menu[] = [
	// group
	{ id: "group_dashboard", name: "sys.nav.dashboard", code: "dashboard", parentId: "", type: GROUP },
	{ id: "group_pages", name: "sys.nav.pages", code: "pages", parentId: "", type: GROUP },

	// group_dashboard
	{
		id: "workbench",
		parentId: "group_dashboard",
		name: "sys.nav.workbench",
		code: "workbench",
		icon: "local:ic-workbench",
		type: MENU,
		path: "/workbench",
		component: "/pages/dashboard/workbench",
	},
	{
		id: "analysis",
		parentId: "group_dashboard",
		name: "sys.nav.analysis",
		code: "analysis",
		icon: "local:ic-analysis",
		type: MENU,
		path: "/analysis",
		component: "/pages/dashboard/analysis",
	},

	// group_pages
	// management
	{
		id: "management",
		parentId: "group_pages",
		name: "sys.nav.management",
		code: "management",
		icon: "local:ic-management",
		type: CATALOGUE,
		path: "/management",
	},

	// User Management (kept from original)
	{
		id: "management_user",
		parentId: "management",
		name: "sys.nav.user.index",
		code: "management:user",
		type: CATALOGUE,
		path: "/management/user",
	},
	{
		id: "management_user_profile",
		parentId: "management_user",
		name: "sys.nav.user.profile",
		code: "management:user:profile",
		type: MENU,
		path: "management/user/profile",
		component: "/pages/management/user/profile",
	},
	{
		id: "management_user_account",
		parentId: "management_user",
		name: "sys.nav.user.account",
		code: "management:user:account",
		type: MENU,
		path: "management/user/account",
		component: "/pages/management/user/account",
	},

	// Campaign Management (NEW - Replaces System)
	{
		id: "management_campaign",
		parentId: "management",
		name: "sys.nav.campaign.index",
		code: "management:campaign",
		type: CATALOGUE,
		path: "/management/campaign",
		icon: "solar:megaphone-bold-duotone",
	},
	{
		id: "management_campaign_list",
		parentId: "management_campaign",
		name: "sys.nav.campaign.list",
		code: "management:campaign:list",
		type: MENU,
		path: "/management/campaign/list",
		component: "/pages/management/campaign/list",
	},
	{
		id: "management_campaign_create",
		parentId: "management_campaign",
		name: "sys.nav.campaign.create",
		code: "management:campaign:create",
		type: MENU,
		path: "/management/campaign/create",
		component: "/pages/management/campaign/create",
	},
	{
		id: "management_campaign_edit",
		parentId: "management_campaign",
		name: "sys.nav.campaign.edit",
		code: "management:campaign:edit",
		type: MENU,
		path: "/management/campaign/edit/:id",
		component: "/pages/management/campaign/edit",
		hidden: true,
	},

	// Merchant Management (NEW)
	{
		id: "management_merchant",
		parentId: "management",
		name: "sys.nav.merchant.index",
		code: "management:merchant",
		type: CATALOGUE,
		path: "/management/merchant",
		icon: "solar:shop-bold-duotone",
	},
	{
		id: "management_merchant_list",
		parentId: "management_merchant",
		name: "sys.nav.merchant.list",
		code: "management:merchant:list",
		type: MENU,
		path: "/management/merchant/list",
		component: "/pages/management/merchant/list",
	},
	{
		id: "management_merchant_create",
		parentId: "management_merchant",
		name: "sys.nav.merchant.create",
		code: "management:merchant:create",
		type: MENU,
		path: "/management/merchant/create",
		component: "/pages/management/merchant/create",
	},
	{
		id: "management_merchant_edit",
		parentId: "management_merchant",
		name: "sys.nav.merchant.edit",
		code: "management:merchant:edit",
		type: MENU,
		path: "/management/merchant/edit/:id",
		component: "/pages/management/merchant/edit/[id]",
		hidden: true,
	},
];

// KEEP ALL THESE EXPORTS - they are used by other files
export const DB_USER: User[] = [
	{
		id: "user_admin_id",
		username: "admin",
		password: "demo1234",
		avatar: faker.image.avatarGitHub(),
		email: "admin@slash.com",
	},
	{
		id: "user_test_id",
		username: "test",
		password: "demo1234",
		avatar: faker.image.avatarGitHub(),
		email: "test@slash.com",
	},
	{
		id: "user_guest_id",
		username: "guest",
		password: "demo1234",
		avatar: faker.image.avatarGitHub(),
		email: "guest@slash.com",
	},
];

export const DB_ROLE: Role[] = [
	{ id: "role_admin_id", name: "admin", code: "SUPER_ADMIN" },
	{ id: "role_test_id", name: "test", code: "TEST" },
];

export const DB_PERMISSION: Permission[] = [
	{ id: "permission_create", name: "permission-create", code: "permission:create" },
	{ id: "permission_read", name: "permission-read", code: "permission:read" },
	{ id: "permission_update", name: "permission-update", code: "permission:update" },
	{ id: "permission_delete", name: "permission-delete", code: "permission:delete" },
];

export const DB_USER_ROLE = [
	{ id: "user_admin_role_admin", userId: "user_admin_id", roleId: "role_admin_id" },
	{ id: "user_test_role_test", userId: "user_test_id", roleId: "role_test_id" },
];

export const DB_ROLE_PERMISSION = [
	{ id: faker.string.uuid(), roleId: "role_admin_id", permissionId: "permission_create" },
	{ id: faker.string.uuid(), roleId: "role_admin_id", permissionId: "permission_read" },
	{ id: faker.string.uuid(), roleId: "role_admin_id", permissionId: "permission_update" },
	{ id: faker.string.uuid(), roleId: "role_admin_id", permissionId: "permission_delete" },

	{ id: faker.string.uuid(), roleId: "role_test_id", permissionId: "permission_read" },
	{ id: faker.string.uuid(), roleId: "role_test_id", permissionId: "permission_update" },
];

// NEW: Function to handle user registration (for your auth system)
export const registerUser = (userData: { username: string; email: string; password: string }) => {
	const newUser: User = {
		id: faker.string.uuid(),
		username: userData.username,
		password: userData.password, // Hash this in production!
		email: userData.email,
		avatar: faker.image.avatarGitHub(),
	};

	// Add to existing users
	DB_USER.push(newUser);

	// Assign basic role
	DB_USER_ROLE.push({
		id: faker.string.uuid(),
		userId: newUser.id,
		roleId: "role_test_id", // Assign test role by default
	});

	return newUser;
};

// NEW: Mock data for Campaigns (for backend mode)
export const DB_CAMPAIGNS = [
	{
		id: "1",
		name: "Summer Sale 2024",
		type: "Promotional",
		targetAudience: "All Customers",
		startDate: "2024-06-01",
		endDate: "2024-08-31",
		message: "Get 50% off on all summer items!",
		status: "active",
	},
	{
		id: "2",
		name: "New User Welcome",
		type: "Onboarding",
		targetAudience: "New Users",
		startDate: "2024-01-01",
		endDate: "2024-12-31",
		message: "Welcome to our platform! Enjoy your first purchase.",
		status: "active",
	},
];

// NEW: Mock data for Merchants (for backend mode)
export const DB_MERCHANTS = [
	{
		id: "1",
		name: "Tech Solutions Ltd",
		businessType: "Technology",
		contactEmail: "contact@techsolutions.com",
		phoneNumber: "+1-555-0101",
		address: "123 Tech Street, Silicon Valley, CA",
		status: "active",
		registrationDate: "2024-01-15",
	},
	{
		id: "2",
		name: "Fashion Boutique Inc",
		businessType: "Retail",
		contactEmail: "info@fashionboutique.com",
		phoneNumber: "+1-555-0102",
		address: "456 Fashion Ave, New York, NY",
		status: "active",
		registrationDate: "2024-02-20",
	},
];
