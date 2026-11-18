import { ArrowLeft, KeyRound } from "lucide-react";
import { useEffect, useRef } from "react";
import { useTranslation } from "react-i18next";
import { LoginStateEnum, useLoginStateContext } from "./providers/login-provider";

function ResetForm() {
	const { t } = useTranslation();
	const { loginState, backToLogin } = useLoginStateContext();
	const heading = useRef<HTMLHeadingElement>(null);
	const isReset = loginState === LoginStateEnum.RESET_PASSWORD;

	useEffect(() => {
		if (isReset) heading.current?.focus();
	}, [isReset]);

	if (!isReset) return null;

	return (
		<>
			<header className="tribe-auth__form-heading">
				<span className="tribe-auth__recovery-icon">
					<KeyRound size={23} aria-hidden="true" />
				</span>
				<h1 ref={heading} tabIndex={-1}>
					{t("sys.login.forgetFormTitle")}
				</h1>
				<p>{t("sys.login.recoveryInstructions")}</p>
			</header>
			<button type="button" className="tribe-auth__back" onClick={backToLogin}>
				<ArrowLeft size={16} aria-hidden="true" />
				{t("sys.login.backSignIn")}
			</button>
		</>
	);
}

export default ResetForm;
