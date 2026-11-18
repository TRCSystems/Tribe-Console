//original author : Marcellas
// src/pages/sys/login/index.tsx - UPDATED
import { ArrowLeft } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link, Navigate } from "react-router";
import logo from "@/assets/logo.png";
import SettingButton from "@/layouts/components/setting-button";
import { useUserToken } from "@/store/userStore";
import LoginForm from "./login-form";
import MobileForm from "./mobile-form";
import { LoginProvider } from "./providers/login-provider";
import QrCodeFrom from "./qrcode-form";
import RegisterForm from "./register-form";
import ResetForm from "./reset-form";
import "./auth.css";

function LoginPage() {
	const { t } = useTranslation();
	const token = useUserToken();

	if (token.accessToken) {
		return <Navigate to="/welcome" replace />;
	}

	return (
		<main className="tribe-auth">
			<header className="tribe-auth__header">
				<Link to="/welcome" className="tribe-auth__brand">
					<img src={logo} alt="" />
					<span>
						TRIBE <small>CONSOLE</small>
					</span>
				</Link>
				<div className="tribe-auth__navigation">
					<Link to="/welcome">
						<ArrowLeft size={16} aria-hidden="true" />
						{t("sys.login.backToHome")}
					</Link>
					<SettingButton />
				</div>
			</header>

			<div className="tribe-auth__layout">
				<aside className="tribe-auth__brand-panel">
					<p>
						{t("sys.login.salesHeadline")}
						<span>{t("sys.login.retentionHeadline")}</span>
					</p>
				</aside>

				<div className="tribe-auth__workspace">
					<div className="tribe-auth__form">
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
		</main>
	);
}
export default LoginPage;
