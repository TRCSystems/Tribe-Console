//original author : Marcellas
//[file name]: login-form.tsx
import { Loader2 } from "lucide-react";
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
import { Checkbox } from "@/ui/checkbox";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { cn } from "@/utils";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

export function LoginForm({ className, ...props }: React.ComponentPropsWithoutRef<"form">) {
	const { t } = useTranslation();
	const [loading, setLoading] = useState(false);
	const [remember, setRemember] = useState(true);
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
			console.log("🔐 Starting login process...");

			// Call the signIn function - should now get the full response
			const response = await signIn(values);
			console.log("📦 Full Login API response:", response);

			// Check if the response indicates failure
			if (response.status !== "200" || response.message !== "success") {
				console.error("❌ Login failed with response:", response);
				toast.error("The User does not exist, Please check your login details.");
				return;
			}

			const accessToken = response.respObject?.value;

			console.log("🔑 Extracted JWT token:", accessToken ? `***${accessToken.slice(-8)}` : "none");
			console.log("📋 Response structure:", {
				status: response.status,
				message: response.message,
				hasRespObject: !!response.respObject,
				respObjectKeys: response.respObject ? Object.keys(response.respObject) : "none",
			});

			if (!accessToken) {
				console.error("❌ No JWT token found in response. Full response:", response);
				toast.error("The User does not exist, Please check your login details.");
				return;
			}

			// Set token in store
			setUserToken({
				accessToken: accessToken,
				refreshToken: "",
			});

			setUserInfo({
				username: values.username,
			} as UserInfo);

			// Wait for state persistence
			await new Promise((resolve) => setTimeout(resolve, 100));

			// Verify storage
			const storedData = localStorage.getItem("userStore");
			console.log("💾 Stored data in localStorage:", storedData);

			if (storedData) {
				const parsed = JSON.parse(storedData);
				const storedToken = parsed.state?.userToken?.accessToken;

				if (storedToken) {
					console.log("✅ Login successful! Token stored. Redirecting to:", GLOBAL_CONFIG.defaultRoute);
					navigate(GLOBAL_CONFIG.defaultRoute, { replace: true });
					toast.success(t("sys.login.loginSuccessTitle"));
				} else {
					console.error("❌ Token not found in stored state. Parsed state:", parsed);
					toast.error("Login failed: Token not saved to storage");
				}
			} else {
				console.error("❌ userStore not found in localStorage");
				toast.error("Login failed: Authentication data not saved");
			}
		} catch (error) {
			console.error("💥 Login error:", error);
			// Show the specific error message for wrong credentials
			toast.error("The User does not exist, Please check your login details.");
		} finally {
			setLoading(false);
		}
	};

	return (
		<div className={cn("flex flex-col gap-6", className)}>
			<Form {...form} {...props}>
				<form onSubmit={form.handleSubmit(handleFinish)} className="space-y-4">
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="text-2xl font-bold">{t("sys.login.signInFormTitle")}</h1>
						<p className="text-balance text-sm text-muted-foreground">{t("sys.login.signInFormDescription")}</p>
					</div>

					<FormField
						control={form.control}
						name="username"
						rules={{ required: t("sys.login.accountPlaceholder") }}
						render={({ field }) => (
							<FormItem>
								<FormLabel>{t("sys.login.userName")}</FormLabel>
								<FormControl>
									<Input placeholder={t("sys.login.accountPlaceholder")} {...field} />
								</FormControl>
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
								<FormControl>
									<Input
										type="password"
										placeholder={t("sys.login.passwordPlaceholder")}
										{...field}
										suppressHydrationWarning
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<div className="flex flex-row justify-between">
						<div className="flex items-center space-x-2">
							<Checkbox
								id="remember"
								checked={remember}
								onCheckedChange={(checked) => setRemember(checked === "indeterminate" ? false : checked)}
							/>
							<label
								htmlFor="remember"
								className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
							>
								{t("sys.login.rememberMe")}
							</label>
						</div>
						<Button variant="link" onClick={() => setLoginState(LoginStateEnum.RESET_PASSWORD)} size="sm">
							{t("sys.login.forgotPassword") || "Forgot Password?"}
						</Button>
					</div>

					<Button type="submit" className="w-full" disabled={loading}>
						{loading && <Loader2 className="animate-spin mr-2" />}
						{t("sys.login.loginButton")}
					</Button>

					<div className="text-center text-sm">TRIBE_Your Business Growth Partner.</div>
				</form>
			</Form>
		</div>
	);
}

export default LoginForm;
