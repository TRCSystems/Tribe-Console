//[file name]: register-form.tsx
//[file content begin]

import { useMutation } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { toast } from "sonner";
import userService from "@/api/services/userService";
import { Button } from "@/ui/button";
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/ui/form";
import { Input } from "@/ui/input";
import { ReturnButton } from "./components/ReturnButton";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

function RegisterForm() {
	const { t } = useTranslation();
	const { loginState, backToLogin } = useLoginStateContext();

	const signUpMutation = useMutation({
		mutationFn: userService.signup,
		onSuccess: () => {
			toast.success(t("sys.login.registerSuccessTitle") || "Registration successful!");
			// Use setTimeout to ensure form submission completes before navigation
			setTimeout(() => {
				backToLogin();
			}, 100);
		},
		onError: (error: any) => {
			const errorMessage = error?.message || t("sys.login.registerFailed") || "Registration failed";
			toast.error(errorMessage);
		},
	});

	const form = useForm({
		defaultValues: {
			username: "",
			email: "",
			password: "",
			confirmPassword: "",
		},
		mode: "onChange", // Add form mode to prevent issues
	});

	// Reset form when component mounts/unmounts to prevent state issues
	useEffect(() => {
		return () => {
			form.reset();
		};
	}, [form]);

	const onFinish = async (values: any) => {
		console.log("Register form values: ", values);

		// Temporary: Show message if backend doesn't support registration
		toast.info("User registration endpoint is being configured. Please try again later.");
		return;

		// Remove the above 2 lines once backend supports registration
		/*
		const { confirmPassword, ...submitData } = values;
		
		try {
			await signUpMutation.mutateAsync(submitData);
		} catch (error) {
			console.error("Registration error:", error);
		}
		*/
	};

	// Return null early to prevent form rendering issues
	if (loginState !== LoginStateEnum.REGISTER) {
		return null;
	}

	return (
		<div className="space-y-4">
			<Form {...form}>
				<form
					onSubmit={form.handleSubmit(onFinish)}
					className="space-y-4"
					noValidate // Prevent default browser validation
				>
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="text-2xl font-bold">{t("sys.login.signUpFormTitle")}</h1>
						<p className="text-balance text-sm text-muted-foreground">
							{t("sys.login.signUpFormDescription") || "Create your account to get started"}
						</p>
					</div>

					<FormField
						control={form.control}
						name="username"
						rules={{
							required: t("sys.login.accountPlaceholder") || "Username is required",
							minLength: {
								value: 3,
								message: "Username must be at least 3 characters",
							},
						}}
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input placeholder={t("sys.login.userName") || "Username"} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="email"
						rules={{
							required: "Email is required",
							pattern: {
								value: /^[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}$/i,
								message: "Invalid email address",
							},
						}}
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input type="email" placeholder={t("sys.login.email") || "Email"} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="password"
						rules={{
							required: "Password is required",
							minLength: {
								value: 6,
								message: "Password must be at least 6 characters",
							},
						}}
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input type="password" placeholder={t("sys.login.password") || "Password"} {...field} />
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<FormField
						control={form.control}
						name="confirmPassword"
						rules={{
							required: "Please confirm your password",
							validate: (value) => value === form.getValues("password") || "Passwords do not match",
						}}
						render={({ field }) => (
							<FormItem>
								<FormControl>
									<Input
										type="password"
										placeholder={t("sys.login.confirmPassword") || "Confirm Password"}
										{...field}
									/>
								</FormControl>
								<FormMessage />
							</FormItem>
						)}
					/>

					<Button type="submit" className="w-full" disabled={signUpMutation.isPending}>
						{signUpMutation.isPending && <Loader2 className="animate-spin mr-2" />}
						{t("sys.login.registerButton") || "Register"}
					</Button>

					<div className="mb-2 text-xs text-gray-500">
						<span>{t("sys.login.registerAndAgree") || "By registering, you agree to the"}</span>
						<a href="./" className="text-sm underline text-primary">
							{t("sys.login.termsOfService") || "Terms of Service"}
						</a>
						{" & "}
						<a href="./" className="text-sm underline text-primary">
							{t("sys.login.privacyPolicy") || "Privacy Policy"}
						</a>
					</div>

					<ReturnButton onClick={backToLogin} />
				</form>
			</Form>
		</div>
	);
}

export default RegisterForm;
//[file content end]
