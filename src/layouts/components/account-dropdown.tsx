import { useTranslation } from "react-i18next";
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

/**
 * Account Dropdown
 */
export default function AccountDropdown() {
	const { replace } = useRouter();
	const userInfo = useUserInfo();
	const { clearUserInfoAndToken } = useUserActions();
	const { backToLogin } = useLoginStateContext();
	const { t } = useTranslation();

	// Safe destructuring with defaults
	const username = userInfo?.username ?? "User";
	const email = userInfo?.email ?? "";
	const avatar = userInfo?.avatar ?? "";

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
				<Button variant="ghost" size="icon" className="rounded-full">
					{avatar ? (
						<img className="h-6 w-6 rounded-full" src={avatar} alt="" />
					) : (
						<div className="flex h-6 w-6 items-center justify-center rounded-full bg-gray-300 text-xs font-medium">
							{username.charAt(0).toUpperCase()}
						</div>
					)}
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent className="w-68">
				<div className="flex items-center gap-2 p-2">
					{avatar ? (
						<img className="h-10 w-10 rounded-full" src={avatar} alt="" />
					) : (
						<div className="flex h-10 w-10 items-center justify-center rounded-full bg-gray-300 text-sm font-medium">
							{username.charAt(0).toUpperCase()}
						</div>
					)}
					<div className="flex flex-col items-start">
						<div className="text-text-primary text-sm font-medium">{username}</div>
						{email && <div className="text-text-secondary text-xs">{email}</div>}
					</div>
				</div>
				<DropdownMenuSeparator />
				<b>TRIBE powered by TRC Systems </b>
				<p>Your Business Growth Partner</p>
				{/*<DropdownMenuItem asChild>
					<NavLink to="/management/user/profile">{t("sys.nav.user.profile")}</NavLink>
				</DropdownMenuItem>
				<DropdownMenuItem asChild>
					<NavLink to="/management/user/account">{t("sys.nav.user.account")}</NavLink>
				</DropdownMenuItem>
				<DropdownMenuSeparator />*/}
				<DropdownMenuItem className="font-bold text-warning" onClick={logout}>
					{t("sys.login.logout")}
				</DropdownMenuItem>
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
