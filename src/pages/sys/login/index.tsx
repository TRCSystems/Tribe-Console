//original author : Marcellas
// src/pages/sys/login/index.tsx - UPDATED
import { Navigate } from "react-router";
import { Icon } from "@/components/icon";
import Logo, { LogoMark } from "@/components/logo";
import SettingButton from "@/layouts/components/setting-button";
import { useUserToken } from "@/store/userStore";
import LoginForm from "./login-form";
import MobileForm from "./mobile-form";
import { LoginProvider } from "./providers/login-provider";
import QrCodeFrom from "./qrcode-form";
import RegisterForm from "./register-form";
import ResetForm from "./reset-form";

function LoginPage() {
	const token = useUserToken();

	if (token.accessToken) {
		return <Navigate to="/welcome" replace />;
	}

	return (
		<div className="relative grid min-h-svh lg:grid-cols-2 bg-background">
			<div className="flex flex-col gap-4 p-6 md:p-10">
				<div className="flex justify-center gap-2 md:justify-start">
					<Logo size={30} withText />
				</div>
				<div className="flex flex-1 items-center justify-center">
					<div className="w-full max-w-xs">
						<LoginProvider>
							<LoginForm />
							<MobileForm />
							<QrCodeFrom />
							<RegisterForm />
							<ResetForm />
						</LoginProvider>
					</div>
				</div>
			</div>

			<div className="relative hidden flex-col justify-between bg-[#26215C] p-12 text-white lg:flex">
				<LogoMark size={56} />
				<div className="max-w-md space-y-6">
					<h2 className="text-3xl font-semibold leading-tight tracking-tight">
						Orders, stock and payments for distributors and their shops
					</h2>
					<ul className="space-y-3 text-sm text-white/80">
						{[
							["lucide:message-circle", "Shops order on WhatsApp: text, photo or voice note"],
							["lucide:package-check", "Blind stock counts, audit trail and live stock value"],
							["lucide:wallet", "M-Pesa payments and trade records for stock finance"],
						].map(([icon, text]) => (
							<li key={text} className="flex items-center gap-3">
								<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-white/10">
									<Icon icon={icon} size={16} />
								</span>
								{text}
							</li>
						))}
					</ul>
				</div>
				<p className="text-xs text-white/50">Tribe by ASANO GROUP LIMITED · your business growth partner</p>
			</div>

			<div className="absolute right-2 top-0 flex flex-row">
				<SettingButton />
			</div>
		</div>
	);
}
export default LoginPage;
