// src/routes/sections/dashboard/frontend.tsx - UPDATED
import type { RouteObject } from "react-router";
import { Navigate } from "react-router";
import { Component } from "./utils";

export function getFrontendDashboardRoutes(): RouteObject[] {
	const frontendDashboardRoutes: RouteObject[] = [
		{ path: "workbench", element: Component("/pages/dashboard/workbench") },
		{ path: "analysis", element: Component("/pages/dashboard/analysis") },
		{
			path: "management",
			children: [
				{ index: true, element: <Navigate to="user" replace /> },
				{
					path: "user",
					children: [
						{ index: true, element: <Navigate to="profile" replace /> },
						{ path: "profile", element: Component("/pages/management/user/profile") },
						{ path: "account", element: Component("/pages/management/user/account") },
					],
				},
				{
					path: "campaign",
					children: [
						{ index: true, element: <Navigate to="list" replace /> },
						{ path: "list", element: Component("/pages/management/campaign/list") },
						{ path: "create", element: Component("/pages/management/campaign/create") },
						{ path: "edit/:id", element: Component("/pages/management/campaign/edit") },
						{ path: "templates", element: Component("/pages/management/campaign/templates") },
					],
				},
				{
					path: "merchant",
					children: [
						{ index: true, element: <Navigate to="list" replace /> },
						{ path: "list", element: Component("/pages/management/merchant/list") },
						{ path: "create", element: Component("/pages/management/merchant/create") },
						{ path: "edit/:id", element: Component("/pages/management/merchant/edit") },
					],
				},
				{
					path: "system-users", // ADDED: System Users routes
					children: [
						{ index: true, element: <Navigate to="list" replace /> },
						{ path: "list", element: Component("/pages/management/system-users/list") },
						{ path: "create", element: Component("/pages/management/system-users/create") },
					],
				},
			],
		},
	];
	return frontendDashboardRoutes;
}
