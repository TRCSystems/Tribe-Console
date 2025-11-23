//[file name]: protected-route.tsx
//[file content begin]
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import { useUserToken } from "@/store/userStore";
import { RoleRouteGuard } from "./role-route-guard"; // ADD THIS IMPORT

interface ProtectedRouteProps {
	children: React.ReactNode;
}

export const ProtectedRoute = ({ children }: ProtectedRouteProps) => {
	const { accessToken } = useUserToken();
	const navigate = useNavigate();
	const location = useLocation();
	const [isChecking, setIsChecking] = useState(true);

	useEffect(() => {
		console.log("🔐 ProtectedRoute - Token check:", {
			hasToken: !!accessToken,
			currentPath: location.pathname,
		});

		if (!accessToken) {
			console.log("🚫 No access token, redirecting to login...");
			navigate("/auth/login", {
				replace: true,
				state: { from: location },
			});
		} else {
			console.log("✅ Access granted!");
			setIsChecking(false);
		}
	}, [accessToken, navigate, location]);

	if (!accessToken) {
		return (
			<div className="flex items-center justify-center min-h-screen">
				<div className="text-center">
					<div className="animate-spin rounded-full h-8 w-8 border-b-2 border-gray-900 mx-auto"></div>
					<p className="mt-2">Checking authentication...</p>
				</div>
			</div>
		);
	}

	// ADD ROLE-BASED PROTECTION
	return <RoleRouteGuard>{children}</RoleRouteGuard>;
};
//[file content end]
