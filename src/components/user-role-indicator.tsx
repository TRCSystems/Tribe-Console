/**
 * Original Author: Marcellas
 * src/components/user-role-indicator.tsx - User Role Indicator Component
 */

import { Icon } from "@/components/icon";
import { useMerchantId, useUserActions, useUserInfo, useUserRole } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuLabel,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/ui/dropdown-menu";

export function UserRoleIndicator() {
	const userInfo = useUserInfo();
	const userRole = useUserRole();
	const merchantId = useMerchantId();
	const { clearUserInfoAndToken } = useUserActions(); // ADDED: Use proper logout action

	if (!userRole) {
		return (
			<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
				<Icon icon="lucide:user" className="h-4 w-4 text-muted-foreground" />
				<span className="text-sm text-muted-foreground">Not logged in</span>
			</div>
		);
	}

	// FIXED: Updated role colors to match your API roles
	const getRoleColor = (role: string) => {
		switch (role) {
			case "ADMIN":
				return "bg-purple-100 text-purple-800 border-purple-200 dark:bg-purple-900 dark:text-purple-300";
			case "LEAD_COLLECTOR":
				return "bg-green-100 text-green-800 border-green-200 dark:bg-green-900 dark:text-green-300";
			case "MERCHANT":
				return "bg-blue-100 text-blue-800 border-blue-200 dark:bg-blue-900 dark:text-blue-300";
			case "SALES_PERSON":
				return "bg-orange-100 text-orange-800 border-orange-200 dark:bg-orange-900 dark:text-orange-300";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200 dark:bg-gray-800 dark:text-gray-300";
		}
	};

	// FIXED: Updated role icons to match your API roles
	const getRoleIcon = (role: string) => {
		switch (role) {
			case "ADMIN":
				return "lucide:shield";
			case "LEAD_COLLECTOR":
				return "lucide:users";
			case "MERCHANT":
				return "lucide:store";
			case "SALES_PERSON":
				return "lucide:shopping-cart";
			default:
				return "lucide:user";
		}
	};

	// FIXED: Proper role display names
	const getRoleDisplayName = (role: string) => {
		switch (role) {
			case "ADMIN":
				return "Administrator";
			case "LEAD_COLLECTOR":
				return "Lead Collector";
			case "MERCHANT":
				return "Merchant";
			case "SALES_PERSON":
				return "Sales Person";
			default:
				return role.toLowerCase();
		}
	};

	// FIXED: Proper logout function (unused)
	const _handleLogout = () => {
		console.log("🚪 Logging out user...");
		clearUserInfoAndToken(); // Use the proper store action
		// Optional: Redirect to login page
		setTimeout(() => {
			window.location.href = "/login";
		}, 100);
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="flex items-center gap-2 hover:bg-accent h-auto py-2">
					<div className="flex items-center gap-2">
						<div className={`p-1.5 rounded-full ${getRoleColor(userRole)}`}>
							<Icon icon={getRoleIcon(userRole)} className="h-3.5 w-3.5" />
						</div>
						<div className="flex flex-col items-start">
							<span className="text-sm font-medium leading-none">{userInfo?.username || "User"}</span>
							<Badge variant="outline" className={`text-xs capitalize ${getRoleColor(userRole)} border-0 mt-0.5`}>
								{getRoleDisplayName(userRole)}
							</Badge>
						</div>
					</div>
					<Icon icon="lucide:chevron-down" className="h-4 w-4 text-muted-foreground" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<DropdownMenuLabel className="flex flex-col gap-2">
					<div className="flex items-center gap-3">
						<div className={`p-2 rounded-full ${getRoleColor(userRole)}`}>
							<Icon icon={getRoleIcon(userRole)} className="h-4 w-4" />
						</div>
						<div className="flex-1 min-w-0">
							<p className="font-medium text-sm truncate">{userInfo?.username || "User"}</p>
						</div>
					</div>
				</DropdownMenuLabel>

				<DropdownMenuSeparator />

				<div className="px-2 py-1.5 text-sm space-y-2">
					<div className="flex justify-between items-center">
						<span className="text-muted-foreground">Role:</span>
						<Badge variant="secondary" className={`capitalize ${getRoleColor(userRole)} text-xs`}>
							{getRoleDisplayName(userRole)}
						</Badge>
					</div>

					{merchantId && (
						<div className="flex justify-between items-center">
							<span className="text-muted-foreground">Merchant ID:</span>
							<code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{merchantId}</code>
						</div>
					)}

					{userInfo?.id && (
						<div className="flex justify-between items-center">
							<span className="text-muted-foreground">User ID:</span>
							<code className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono">{userInfo.id.slice(0, 8)}...</code>
						</div>
					)}
				</div>

				<DropdownMenuSeparator />
				<DropdownMenuItem
					className="flex items-center gap-2 cursor-pointer"
					onClick={() => {
						window.location.href = "/inventory/stock";
					}}
				>
					<Icon icon="lucide:boxes" className="h-4 w-4" />
					<span>My Stock</span>
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					className="flex items-center gap-2 cursor-pointer"
					onClick={() => {
						window.location.href = "/analytics/daily-sales";
					}}
				>
					<Icon icon="lucide:trending-up" className="h-4 w-4" />
					<span>Daily Sales</span>
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					className="flex items-center gap-2 cursor-pointer"
					onClick={() => {
						window.location.href = "/analytics/weekly";
					}}
				>
					<Icon icon="lucide:bar-chart-3" className="h-4 w-4" />
					<span>Weekly Sales</span>
				</DropdownMenuItem>

				<DropdownMenuSeparator />

				<DropdownMenuItem
					className="flex items-center gap-2 cursor-pointer"
					onClick={() => {
						window.location.href = "/analytics/sold-items";
					}}
				>
					<Icon icon="lucide:receipt" className="h-4 w-4" />
					<span>Sold Items</span>
				</DropdownMenuItem>

				<DropdownMenuSeparator />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
