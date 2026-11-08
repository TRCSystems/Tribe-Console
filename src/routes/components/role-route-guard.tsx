// src/routes/components/role-route-guard.tsx - UPDATED
import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { ROLE_PERMISSIONS, ROUTE_PERMISSIONS } from "#/entity";
import { GLOBAL_CONFIG } from "@/global-config";
import { useUserRole } from "@/store/userStore";
import { hasAll, homeFor, isPathAllowed, useModules } from "@/utils/plan";

interface RoleRouteGuardProps {
	children: React.ReactNode;
}

export const RoleRouteGuard = ({ children }: RoleRouteGuardProps) => {
	const userRole = useUserRole();
	const navigate = useNavigate();
	const location = useLocation();
	const modules = useModules();

	useEffect(() => {
		// Merchants see only the modules they bought. Without the whole shop system, the welcome page and
		// any other module's page send them to their first module.
		const path = location.pathname;
		if (!hasAll(modules) && modules.size > 0 && !path.startsWith("/auth")) {
			const home = homeFor(modules, GLOBAL_CONFIG.defaultRoute);
			const offPlan = !isPathAllowed(modules, path) || path === "/" || path === "/welcome";
			if (offPlan && path !== home) {
				navigate(home, { replace: true });
				return;
			}
		}

		if (!userRole) return;

		const currentPath = location.pathname;

		// NEW: If user lands on root, workbench, or default routes, redirect to welcome page
		if (currentPath === "/" || currentPath === "/workbench" || currentPath === "/dashboard") {
			console.log(`🔄 Redirecting from ${currentPath} to /welcome`);
			navigate("/welcome", { replace: true });
			return;
		}

		// Skip role check for these public routes
		const publicRoutes = ["/management/user/profile", "/management/user/account", "/welcome"];
		if (publicRoutes.some((route) => currentPath.startsWith(route))) {
			return;
		}

		// Find the required permissions for this route
		const routeKey = Object.keys(ROUTE_PERMISSIONS).find((key) => currentPath.startsWith(key));

		const requiredPermissions = routeKey ? ROUTE_PERMISSIONS[routeKey] : [];

		// ADMIN can see all pages (read-only for manager pages)
		if (userRole === "ADMIN") {
			// Admin can access any page, no redirect needed
			return;
		}

		// For MANAGER, check if they have access to this route
		if (userRole === "MANAGER") {
			const hasAccess =
				requiredPermissions.length === 0 ||
				requiredPermissions.some((permission) =>
					(ROLE_PERMISSIONS[userRole] as readonly string[] | undefined)?.includes(permission),
				);

			if (!hasAccess) {
				console.warn(`🚫 Access denied for ${userRole} to ${currentPath}`);
				// Redirect manager to welcome page
				navigate("/welcome", { replace: true });
			}
		}
	}, [userRole, modules, location.pathname, navigate]);

	return <>{children}</>;
};
