// src/components/user-role-indicator.tsx

import { Icon } from "@/components/icon";
import { useMerchantId, useUserInfo, useUserRole } from "@/store/userStore";
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

	if (!userRole) {
		return (
			<div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/50">
				<Icon icon="lucide:user" className="h-4 w-4 text-muted-foreground" />
				<span className="text-sm text-muted-foreground">Not logged in</span>
			</div>
		);
	}

	const getRoleColor = (role: string) => {
		switch (role) {
			case "ADMIN":
				return "bg-purple-100 text-purple-800 border-purple-200";
			case "MANAGER":
				return "bg-blue-100 text-blue-800 border-blue-200";
			default:
				return "bg-gray-100 text-gray-800 border-gray-200";
		}
	};

	const getRoleIcon = (role: string) => {
		switch (role) {
			case "ADMIN":
				return "lucide:shield";
			case "MANAGER":
				return "lucide:user-cog";
			default:
				return "lucide:user";
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="flex items-center gap-2 hover:bg-accent">
					<div className="flex items-center gap-2">
						<div className={`p-1 rounded-full ${getRoleColor(userRole)}`}>
							<Icon icon={getRoleIcon(userRole)} className="h-3 w-3" />
						</div>
						<div className="flex flex-col items-start">
							<span className="text-sm font-medium">{userInfo?.username || "User"}</span>
							<Badge variant="outline" className={`text-xs capitalize ${getRoleColor(userRole)} border`}>
								{userRole.toLowerCase()}
							</Badge>
						</div>
					</div>
					<Icon icon="lucide:chevron-down" className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<DropdownMenuLabel className="flex flex-col gap-1">
					<div className="flex items-center gap-2">
						<div className={`p-1 rounded-full ${getRoleColor(userRole)}`}>
							<Icon icon={getRoleIcon(userRole)} className="h-3 w-3" />
						</div>
						<div>
							<p className="font-medium">{userInfo?.username || "User"}</p>
							<p className="text-sm text-muted-foreground">{userInfo?.email}</p>
						</div>
					</div>
				</DropdownMenuLabel>

				<DropdownMenuSeparator />

				<div className="px-2 py-1.5 text-sm">
					<div className="flex justify-between items-center mb-1">
						<span className="text-muted-foreground">Role:</span>
						<Badge className={`capitalize ${getRoleColor(userRole)}`}>{userRole.toLowerCase()}</Badge>
					</div>

					{merchantId && (
						<div className="flex justify-between items-center">
							<span className="text-muted-foreground">Merchant ID:</span>
							<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{merchantId}</code>
						</div>
					)}

					{userInfo?.id && (
						<div className="flex justify-between items-center mt-1">
							<span className="text-muted-foreground">User ID:</span>
							<code className="text-xs bg-muted px-1.5 py-0.5 rounded">{userInfo.id.slice(0, 8)}...</code>
						</div>
					)}
				</div>

				<DropdownMenuSeparator />

				<DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
					<Icon icon="lucide:user" className="h-4 w-4" />
					<span>Profile</span>
				</DropdownMenuItem>

				<DropdownMenuItem className="flex items-center gap-2 cursor-pointer">
					<Icon icon="lucide:settings" className="h-4 w-4" />
					<span>Settings</span>
				</DropdownMenuItem>

				<DropdownMenuSeparator />
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
