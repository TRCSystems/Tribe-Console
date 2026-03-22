import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import { Icon } from "@/components/icon";
import { Form, FormField, FormItem, FormMessage } from "@/ui/form";
import { ReturnButton } from "./components/ReturnButton";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

function ResetForm() {
	const { t } = useTranslation();
	const { loginState, backToLogin } = useLoginStateContext();
	const form = useForm();

	const onFinish = (values: any) => {
		console.log("Received values of form: ", values);
	};

	if (loginState !== LoginStateEnum.RESET_PASSWORD) return null;

	return (
		<>
			<div className="mb-8 text-center">
				<Icon icon="local:ic-reset-password" size="100" className="text-primary!" />
			</div>
			<Form {...form}>
				<form onSubmit={form.handleSubmit(onFinish)} className="space-y-4">
					<div className="flex flex-col items-center gap-2 text-center">
						<h1 className="text-2xl font-bold">{t("sys.login.forgetFormTitle")}</h1>
						<p className="text-balance text-sm text-muted-foreground">
							Please reach out to the admin for guidance on how to retrieve your account @Musula
						</p>
					</div>

					<FormField
						control={form.control}
						name="email"
						render={({ field }) => (
							<FormItem>
								<FormMessage />
							</FormItem>
						)}
					/>

					<ReturnButton onClick={backToLogin} />
				</form>
			</Form>
		</>
	);
}

export default ResetForm;
