/**
 * Original Author: Marcellas
 * src/routes/sections/dashboard/index.tsx - Dashboard Routes Configuration
 */

import { Navigate, type RouteObject } from "react-router";
import { GLOBAL_CONFIG } from "@/global-config";
import DashboardLayout from "@/layouts/dashboard";
import LoginAuthGuard from "@/routes/components/login-auth-guard";
import { getBackendDashboardRoutes } from "./backend";
import { getFrontendDashboardRoutes } from "./frontend";
import { Component } from "./utils";

const getRoutes = (): RouteObject[] => {
	if (GLOBAL_CONFIG.routerMode === "frontend") {
		return getFrontendDashboardRoutes();
	}
	return getBackendDashboardRoutes();
};

export const dashboardRoutes: RouteObject[] = [
	{ index: true, element: <Navigate to="/welcome" replace /> },
	{ path: "welcome", element: Component("/pages/welcome") },
	{
		element: (
			<LoginAuthGuard>
				<DashboardLayout />
			</LoginAuthGuard>
		),
		children: getRoutes().filter(({ path }) => path !== "welcome"),
	},
];
