/**
 * Original Author: Marcellas
 * src/components/role-ui-guard.tsx - Role-based UI Guard Component
 */

import { AuthGuard } from "@/components/auth/auth-guard";
import { useUserRole } from "@/store/userStore";

interface RoleUIGuardProps {
	children: React.ReactNode;
	/**
	 * The permission required for full access
	 */
	permission: string;
	/**
	 * Content to show when user has read-only access
	 */
	readOnlyFallback?: React.ReactNode;
	/**
	 * Content to show when user has no access
	 */
	noAccessFallback?: React.ReactNode;
}

export const RoleUIGuard = ({
	children,
	permission,
	readOnlyFallback: _readOnlyFallback,
	noAccessFallback = null,
}: RoleUIGuardProps) => {
	const _userRole = useUserRole();

	// If user has write permission, show full access
	return (
		<AuthGuard check={permission} baseOn="permission" fallback={noAccessFallback}>
			{children}
		</AuthGuard>
	);
};

// Special component for read-only display
export const ReadOnlyIndicator = () => (
	<div className="inline-flex items-center px-2 py-1 rounded-full bg-gray-100 text-gray-600 text-xs border">
		<svg className="w-3 h-3 mr-1" fill="currentColor" viewBox="0 0 20 20" aria-hidden="true">
			<path
				fillRule="evenodd"
				d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z"
				clipRule="evenodd"
			/>
		</svg>
		Read Only
	</div>
);
