// src/routes/components/role-route-guard.tsx - FINAL

import { useEffect } from "react";
import { useLocation, useNavigate } from "react-router";
import { ROLE_PERMISSIONS, ROUTE_PERMISSIONS, type UserRole } from "#/entity";
import { useUserRole } from "@/store/userStore";

interface RoleRouteGuardProps {
	children: React.ReactNode;
}

export const RoleRouteGuard = ({ children }: RoleRouteGuardProps) => {
	const userRole = useUserRole();
	const navigate = useNavigate();
	const location = useLocation();

	useEffect(() => {
		if (!userRole) return;

		const currentPath = location.pathname;

		// Skip role check for these public routes
		const publicRoutes = ["/management/user/profile", "/management/user/account"];
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
				requiredPermissions.some((permission) => ROLE_PERMISSIONS[userRole]?.includes(permission));

			if (!hasAccess) {
				console.warn(`🚫 Access denied for ${userRole} to ${currentPath}`);
				// Redirect manager to their default route
				navigate("/pos", { replace: true });
			}
		}
	}, [userRole, location.pathname, navigate]);

	return <>{children}</>;
};
