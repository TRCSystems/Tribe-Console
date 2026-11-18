//original author : Marcellas
//[file name]: login-form.tsx
import { ArrowRight, Eye, EyeOff, Loader2, LockKeyhole, UserRound } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import type { UserInfo } from "#/entity";
import type { SignInReq } from "@/api/services/userService";
import { GLOBAL_CONFIG } from "@/global-config";
import { useSignIn, useUserActions } from "@/store/userStore";
import { Button } from "@/ui/button";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { decodeToken, getIsWholesalerFromToken } from "@/utils/jwt";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"form">) {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);
	const [showPassword, setShowPassword] = useState(false);
	const navigate = useNavigate();

	const { loginState, setLoginState } = useLoginStateContext();
	const signIn = useSignIn();
	const { setUserToken, setUserInfo } = useUserActions();

	const form = useForm<SignInReq>({
		defaultValues: {
			username: "",
			password: "",
		},
	});

	if (loginState !== LoginStateEnum.LOGIN) return null;

	const handleFinish = async (values: SignInReq) => {
		setLoading(true);

		try {
			const response = await signIn(values);

			if (response.status !== "200" || response.message !== "success") {
				toast.error("The User does not exist, Please check your login details.");
				return;
			}

			const accessToken = response.respObject?.value;

			if (!accessToken) {
				toast.error("The User does not exist, Please check your login details.");
				return;
			}

			// Set token in store
			setUserToken({
				accessToken: accessToken,
				refreshToken: "",
			});

			// Extract user info from token
			const decodedToken = decodeToken(accessToken);
			const isWholesaler = getIsWholesalerFromToken(accessToken);

			setUserInfo({
				username: values.username,
				id: decodedToken?.id?.toString() || "",
				email: decodedToken?.email || "",
				role: decodedToken?.role || "MERCHANT",
				isWholesaler: isWholesaler,
			} as UserInfo);

			// Wait for state persistence
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify storage
			const storedData = localStorage.getItem("userStore");
			if (storedData) {
				const parsed = JSON.parse(storedData);
				const storedToken = parsed.state?.userToken?.accessToken;

				if (storedToken) {
					navigate(GLOBAL_CONFIG.defaultRoute, { replace: true });
					toast.success(t("sys.login.loginSuccessTitle"));
				} else {
					toast.error("Login failed: Token not saved to storage");
				}
			} else {
				toast.error("Login failed: Authentication data not saved");
			}
		} catch {
			toast.error("The User does not exist, Please check your login details.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<Form {...form}>
			<form {...props} className={className} onSubmit={form.handleSubmit(handleFinish)}>
				<header className="tribe-auth__form-heading">
					<h1>{t("sys.login.signInFormTitle")}</h1>
					<p>{t("sys.login.signInFormDescription")}</p>
				</header>
				<div className="tribe-auth__fields">
					<FormField
						control={form.control}
						name="username"
						rules={{ required: t("sys.login.accountPlaceholder") }}
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("sys.login.userName")}</FormLabel>
								<div className="tribe-auth__input">
									<UserRound size={18} aria-hidden="true" />
									<FormControl>
										<Input autoComplete="username" autoCapitalize="none" spellCheck={false} {...field} />
									</FormControl>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="password"
						rules={{ required: t("sys.login.passwordPlaceholder") }}
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("sys.login.password")}</FormLabel>
								<div className="tribe-auth__input tribe-auth__input--password">
									<LockKeyhole size={18} aria-hidden="true" />
									<FormControl>
										<Input type={showPassword ? "text" : "password"} autoComplete="current-password" {...field} />
									</FormControl>
									<button
										className="tribe-auth__visibility"
										type="button"
										aria-label={t(showPassword ? "sys.login.hidePassword" : "sys.login.showPassword")}
										onClick={() => setShowPassword(!showPassword)}
									>
										{showPassword ? <EyeOff size={18} aria-hidden="true" /> : <Eye size={18} aria-hidden="true" />}
									</button>
								</div>
								<FormMessage />
							</FormItem>
						)}
					/>
				</div>
				<button
					className="tribe-auth__forgot"
					type="button"
					onClick={() => {
						setShowPassword(false);
						setLoginState(LoginStateEnum.RESET_PASSWORD);
					}}
				>
					{t("sys.login.forgotPassword")}
				</button>
				<Button type="submit" className="tribe-auth__submit" disabled={loading} aria-busy={loading}>
					{t(loading ? "sys.login.signingIn" : "sys.login.loginButton")}
					{loading ? <Loader2 className="animate-spin" aria-hidden="true" /> : <ArrowRight aria-hidden="true" />}
				</Button>
			</form>
		</Form>
	);
}

export default LoginForm;
