/**
 * Original Author: Marcellas
 * src/routes/sections/dashboard/frontend.tsx - Frontend Dashboard Routes Configuration
 */
import type { RouteObject } from "react-router";
import { Navigate } from "react-router";
import { Component } from "./utils";

/**
 * Original Author: Marcellas
 * Get frontend dashboard routes
 */
export function getFrontendDashboardRoutes(): RouteObject[] {
	const frontendDashboardRoutes: RouteObject[] = [
		{ path: "welcome", element: Component("/pages/welcome") },
		//	{ path: "workbench", element: Component("/pages/dashboard/workbench") },
		//	{ path: "analysis", element: Component("/pages/dashboard/analysis") },
		{ path: "pos", element: Component("/pages/inventory/pos") },

		{
			path: "management",
			children: [
				{ index: true, element: <Navigate to="user" replace /> },
				/*	{
					path: "user",
					children: [
						{ index: true, element: <Navigate to="profile" replace /> },
						{ path: "profile", element: Component("/pages/management/user/profile") },
						{ path: "account", element: Component("/pages/management/user/account") },
					],
				}, */
				/*	{
					path: "campaign",
					children: [
						{ index: true, element: <Navigate to="list" replace /> },
						{ path: "list", element: Component("/pages/management/campaign/list") },
						{ path: "create", element: Component("/pages/management/campaign/create") },
						{ path: "edit/:id", element: Component("/pages/management/campaign/edit") },
						{ path: "templates", element: Component("/pages/management/campaign/templates") },
					],
				},*/
				{
					path: "merchant",
					children: [
						{ index: true, element: <Navigate to="list" replace /> },
						{ path: "list", element: Component("/pages/management/merchant/list") },
						{ path: "create", element: Component("/pages/management/merchant/create") },
						{ path: "edit/:id", element: Component("/pages/management/merchant/edit") },
					],
				},
				/*	{
					path: "system-users",
					children: [
						{ index: true, element: <Navigate to="list" replace /> },
						{ path: "list", element: Component("/pages/management/system-users/list") },
						{ path: "create", element: Component("/pages/management/system-users/create") },
					],
				},*/
			],
		},

		{
			path: "inventory",
			children: [
				{ index: true, element: <Navigate to="stock" replace /> },
				{ path: "stock", element: Component("/pages/inventory/stock") },
				{ path: "expenses", element: Component("/pages/inventory/expenses") },
				{ path: "import", element: Component("/pages/inventory/import") },
				{ path: "close-day", element: Component("/pages/inventory/close-day") },
			],
		},
		{
			path: "analytics",
			children: [
				{ index: true, element: <Navigate to="daily-sales" replace /> },
				{ path: "daily-sales", element: Component("/pages/analytics/daily-sales") },
				{ path: "weekly", element: Component("/pages/analytics/weekly") },
				{ path: "sold-items", element: Component("/pages/analytics/sold-items") },
			],
		},
		//	{ path: "marketing", element: Component("/pages/marketing/social/index") },
		{ path: "finance", element: Component("/pages/finance/overview/index") },
		{ path: "features", element: Component("/pages/features/index") },
	];
	return frontendDashboardRoutes;
}
