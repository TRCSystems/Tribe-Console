import { useTranslation } from "react-i18next";
import { NavLink } from "react-router";
import { Icon } from "@/components/icon";
import { useLoginStateContext } from "@/pages/sys/login/providers/login-provider";
import { useRouter } from "@/routes/hooks";
import { useUserActions, useUserInfo } from "@/store/userStore";
import { Button } from "@/ui/button";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuSeparator,
	DropdownMenuTrigger,
} from "@/ui/dropdown-menu";

/** "ASANO" → "AS", "Mama Njeri Wines" → "MN". */
function initials(name: string) {
	const words = name.trim().split(/\s+/).filter(Boolean);
	if (words.length === 0) return "?";
	if (words.length === 1) return words[0].slice(0, 2).toUpperCase();
	return (words[0][0] + words[1][0]).toUpperCase();
}

function Avatar({ name, avatar, size }: { name: string; avatar: string; size: "sm" | "md" }) {
	const cls = size === "sm" ? "h-7 w-7 text-[11px]" : "h-10 w-10 text-sm";
	return avatar ? (
		<img className={`${cls} rounded-full object-cover`} src={avatar} alt="" />
	) : (
		<span
			className={`${cls} flex shrink-0 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary`}
		>
			{initials(name)}
		</span>
	);
}

/**
 * Account menu: who is signed in (shop / business name), help, sign out.
 */
export default function AccountDropdown() {
	const { replace } = useRouter();
	const userInfo = useUserInfo();
	const { clearUserInfoAndToken } = useUserActions();
	const { backToLogin } = useLoginStateContext();
	const { t } = useTranslation();

	const username = userInfo?.username ?? "User";
	const email = userInfo?.email ?? "";
	const avatar = userInfo?.avatar ?? "";
	const role = userInfo?.role ? String(userInfo.role).toLowerCase().replace(/_/g, " ") : "";

	const logout = () => {
		try {
			clearUserInfoAndToken();
			backToLogin();
		} catch (error) {
			console.log(error);
		} finally {
			replace("/login");
		}
	};

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="ghost" className="h-9 gap-2 rounded-full pl-1 pr-2 sm:pr-3" aria-label="Account menu">
					<Avatar name={username} avatar={avatar} size="sm" />
					<span className="hidden max-w-[160px] truncate text-sm font-medium sm:inline">{username}</span>
					<Icon icon="lucide:chevron-down" size={14} className="hidden text-muted-foreground sm:inline" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end" className="w-64">
				<div className="flex items-center gap-3 p-2">
					<Avatar name={username} avatar={avatar} size="md" />
					<div className="flex min-w-0 flex-col">
						<span className="truncate text-sm font-semibold">{username}</span>
						{(email || role) && (
							<span className="truncate text-xs capitalize text-muted-foreground">{email || role}</span>
						)}
					</div>
				</div>
				<DropdownMenuSeparator />
				<DropdownMenuItem asChild>
					<NavLink to="/features" className="flex items-center gap-2">
						<Icon icon="lucide:help-circle" size={16} />
						What Tribe can do
					</NavLink>
				</DropdownMenuItem>
				<DropdownMenuItem onClick={logout} className="flex items-center gap-2 text-destructive focus:text-destructive">
					<Icon icon="lucide:log-out" size={16} />
					{t("sys.login.logout")}
				</DropdownMenuItem>
				<DropdownMenuSeparator />
				<p className="px-2 py-1.5 text-[11px] text-muted-foreground">
					Tribe by ASANO GROUP LIMITED · your business growth partner
				</p>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
