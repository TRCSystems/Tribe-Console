/**
 * Original Author: Marcellas
 * src/components/otp-modal.tsx - OTP Verification Modal Component
 */
import { useEffect, useRef, useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";

interface OTPModalProps {
	isOpen: boolean;
	onClose: () => void;
	onVerify: (otp: string) => void;
	onResendOTP?: () => void;
	isLoading?: boolean;
	isResending?: boolean;
	merchantPhone?: string;
	errorMessage?: string;
}

export const OTPModal = ({
	isOpen,
	onClose,
	onVerify,
	onResendOTP,
	isLoading = false,
	isResending = false,
	merchantPhone,
	errorMessage,
}: OTPModalProps) => {
	const [otp, setOtp] = useState(["", "", "", ""]);
	const [localError, setLocalError] = useState<string>("");
	const [resendTimer, setResendTimer] = useState<number>(60);
	const [canResend, setCanResend] = useState<boolean>(false);
	const inputsRef = useRef<(HTMLInputElement | null)[]>([]);

	// Detect Electron and add class to body
	const isElectron = !!(window as any).electronAPI || !!(window as any).process?.versions?.electron;

	useEffect(() => {
		if (isElectron) {
			document.body.classList.add("electron-app");
			console.log("Electron environment detected");
		}

		return () => {
			document.body.classList.remove("electron-app");
		};
	}, [isElectron]);

	useEffect(() => {
		if (isOpen) {
			console.log("OTP Screen opened - Electron:", isElectron);

			// Clear errors
			setLocalError("");

			// Start timer
			setResendTimer(60);
			setCanResend(false);

			// CRITICAL: Focus strategy for Electron
			const focusFirstInput = () => {
				const firstInput = inputsRef.current[0];
				if (firstInput) {
					console.log("Focusing first OTP input");

					if (isElectron) {
						// Multiple aggressive attempts for Electron
						firstInput.focus();
						firstInput.click();

						setTimeout(() => {
							firstInput.focus();
							firstInput.select();
							firstInput.setSelectionRange(0, 0);

							// Extra attempt
							setTimeout(() => {
								firstInput.focus();
								firstInput.click();
							}, 100);
						}, 50);
					} else {
						// Simple focus for web
						firstInput.focus();
						firstInput.select();
					}
				}
			};

			setTimeout(focusFirstInput, 200);

			// Prevent body scroll
			document.body.style.overflow = "hidden";

			// DEBUG: Log keyboard events
			const debugKeyHandler = (e: KeyboardEvent) => {
				if (e.target && (e.target as HTMLElement).tagName === "INPUT") {
					console.log("Key event on input:", e.key, "type:", e.type);
				}
			};

			document.addEventListener("keydown", debugKeyHandler, true);
			document.addEventListener("keyup", debugKeyHandler, true);

			return () => {
				document.body.style.overflow = "";
				document.removeEventListener("keydown", debugKeyHandler, true);
				document.removeEventListener("keyup", debugKeyHandler, true);
			};
		} else {
			// Reset on close
			setOtp(["", "", "", ""]);
			setLocalError("");
			document.body.style.overflow = "";
		}
	}, [isOpen, isElectron]);

	// Timer effect
	useEffect(() => {
		let timer: NodeJS.Timeout;

		if (isOpen && resendTimer > 0) {
			timer = setTimeout(() => {
				setResendTimer((prev) => prev - 1);
			}, 1000);
		} else if (isOpen && resendTimer === 0) {
			setCanResend(true);
		}

		return () => {
			if (timer) clearTimeout(timer);
		};
	}, [isOpen, resendTimer]);

	// Update error from props
	useEffect(() => {
		if (errorMessage) {
			setLocalError(errorMessage);

			const timer = setTimeout(() => {
				setLocalError("");
			}, 5000);

			return () => clearTimeout(timer);
		}
	}, [errorMessage]);

	const handleChange = (value: string, index: number) => {
		const numericValue = value.replace(/\D/g, "");
		if (numericValue !== value) return;

		const newOtp = [...otp];
		newOtp[index] = numericValue.slice(-1);
		setOtp(newOtp);

		if (localError) {
			setLocalError("");
		}

		if (numericValue && index < 3) {
			setTimeout(
				() => {
					const nextInput = inputsRef.current[index + 1];
					if (nextInput) {
						nextInput.focus();
						nextInput.select();

						if (isElectron) {
							setTimeout(() => {
								nextInput.click();
								nextInput.setSelectionRange(0, nextInput.value.length);
							}, 10);
						}
					}
				},
				isElectron ? 30 : 10,
			);
		}

		if (newOtp.every((digit) => digit !== "") && index === 3) {
			setTimeout(() => handleSubmit(newOtp.join("")), isElectron ? 100 : 50);
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>, index: number) => {
		console.log("OTP Key down:", e.key, "index:", index);

		if (isElectron) {
			// In Electron, we handle navigation manually
			e.preventDefault();
		}

		if (e.key === "Backspace") {
			if (!otp[index] && index > 0) {
				setTimeout(() => {
					const prevInput = inputsRef.current[index - 1];
					if (prevInput) {
						prevInput.focus();
						prevInput.select();
					}
				}, 10);
			}
		}

		if (e.key === "ArrowRight" && index < 3) {
			setTimeout(() => {
				const nextInput = inputsRef.current[index + 1];
				if (nextInput) {
					nextInput.focus();
					nextInput.select();
				}
			}, 10);
		}

		if (e.key === "ArrowLeft" && index > 0) {
			setTimeout(() => {
				const prevInput = inputsRef.current[index - 1];
				if (prevInput) {
					prevInput.focus();
					prevInput.select();
				}
			}, 10);
		}

		if (e.key === "Enter" && isOTPComplete) {
			handleSubmit();
		}

		if (e.key === "Escape") {
			onClose();
		}
	};

	const handlePaste = (e: React.ClipboardEvent) => {
		e.preventDefault();
		const pastedData = e.clipboardData.getData("text").slice(0, 4);

		if (/^\d+$/.test(pastedData)) {
			const newOtp = [...otp];
			pastedData.split("").forEach((char, index) => {
				if (index < 4) {
					newOtp[index] = char;
				}
			});
			setOtp(newOtp);

			setTimeout(() => {
				const lastInput = inputsRef.current[Math.min(3, pastedData.length - 1)];
				if (lastInput) {
					lastInput.focus();
					lastInput.select();
				}
			}, 10);
		}
	};

	const handleSubmit = (submittedOtp?: string) => {
		const finalOtp = submittedOtp || otp.join("");

		if (finalOtp.length !== 4 || !/^\d{4}$/.test(finalOtp)) {
			setLocalError("OTP must be exactly 4 digits");
			return;
		}

		onVerify(finalOtp);
	};

	const handleResend = () => {
		if (!canResend || !onResendOTP) return;

		setResendTimer(60);
		setCanResend(false);
		setOtp(["", "", "", ""]);
		setLocalError("");

		setTimeout(() => {
			const firstInput = inputsRef.current[0];
			if (firstInput) {
				firstInput.focus();
				firstInput.select();
			}
		}, 100);

		onResendOTP();
	};

	const handleBack = () => {
		onClose();
	};

	const isOTPComplete = otp.every((digit) => digit !== "");

	if (!isOpen) return null;

	const displayPhone = merchantPhone
		? `${merchantPhone.slice(0, 4)}****${merchantPhone.slice(-3)}`
		: "your registered phone";

	return (
		<div className="fixed inset-0 bg-white z-50 overflow-auto" data-otp-modal="true">
			{/* Header */}
			<div className="flex items-center justify-between p-4 md:p-6 border-b border-gray-200">
				<Button
					variant="ghost"
					onClick={handleBack}
					className="flex items-center gap-2 text-gray-600 hover:text-gray-900"
					disabled={isLoading || isResending}
				>
					<Icon icon="lucide:arrow-left" className="h-4 w-4" />
					<span className="hidden sm:inline">Back</span>
				</Button>

				<div className="flex items-center gap-2">
					<img
						src="/logo.png"
						alt="TRIBE"
						className="h-6 w-auto"
						onError={(e) => {
							e.currentTarget.style.display = "none";
						}}
					/>
					<span className="text-sm md:text-base font-semibold text-gray-900">TRIBE</span>
				</div>

				<div className="w-10 md:w-20"></div>
			</div>

			{/* Main Content */}
			<div className="flex flex-col items-center justify-center min-h-[calc(100vh-80px)] p-4 md:p-6">
				<Card className="w-full max-w-sm md:max-w-md border shadow-lg md:shadow-xl">
					<CardHeader className="text-center space-y-3 px-4 md:px-6">
						<div className="flex justify-center">
							<div className="p-3 bg-blue-50 rounded-full">
								<Icon icon="lucide:shield-check" className="h-6 w-6 md:h-8 md:w-8 text-blue-600" />
							</div>
						</div>
						<CardTitle className="text-xl md:text-2xl">Verify OTP to Close Day</CardTitle>
						<CardDescription className="text-sm md:text-base">
							Enter the 4-digit OTP sent to <span className="font-semibold text-gray-900">{displayPhone}</span>
						</CardDescription>
					</CardHeader>

					<CardContent className="space-y-6 md:space-y-8 px-4 md:px-6">
						{/* OTP Input Section */}
						<div className="space-y-4 md:space-y-6">
							<div className="text-center space-y-2">
								<Label htmlFor="otp-input-0" className="text-sm md:text-base font-medium">
									Enter 4-digit OTP Code
								</Label>
							</div>

							<div className="flex justify-center gap-3 md:gap-4">
								{otp.map((digit, index) => (
									<Input
										key={`otp-${index}`}
										ref={(el) => {
											inputsRef.current[index] = el;
											if (el && isElectron) {
												// Add Electron-specific attributes
												el.setAttribute("data-electron-fix", "true");
												el.setAttribute("data-otp-input", "true");
											}
										}}
										id={`otp-input-${index}`}
										type="text"
										inputMode="numeric"
										pattern="[0-9]*"
										maxLength={1}
										value={digit}
										onChange={(e) => handleChange(e.target.value, index)}
										onKeyDown={(e) => handleKeyDown(e, index)}
										onPaste={index === 0 ? handlePaste : undefined}
										onClick={(e) => {
											const target = e.currentTarget;
											target.focus();
											target.select();

											if (isElectron) {
												setTimeout(() => {
													target.focus();
													target.select();
												}, 10);
											}
										}}
										onFocus={(e) => {
											// Force selection on focus
											e.target.select();

											if (isElectron) {
												setTimeout(() => {
													e.target.focus();
													e.target.select();
												}, 10);
											}
										}}
										className={`
                      w-14 h-14 md:w-16 md:h-16 text-center text-2xl md:text-3xl font-bold 
                      border-2 transition-all duration-200
                      ${localError ? "border-red-500 bg-red-50" : "border-gray-300"}
                      focus:border-blue-500 focus:ring-2 md:focus:ring-4 focus:ring-blue-100
                      disabled:bg-gray-100 disabled:cursor-not-allowed
                      ${digit ? "bg-blue-50 border-blue-300" : ""}
                      otp-input
                    `}
										style={
											isElectron
												? {
														WebkitUserSelect: "text",
														userSelect: "text",
														WebkitUserModify: "read-write-plaintext-only",
														caretColor: "#3b82f6",
													}
												: undefined
										}
										disabled={isLoading || isResending}
										tabIndex={0}
										autoComplete="off"
										spellCheck={false}
									/>
								))}
							</div>

							{/* Error Message */}
							{localError && (
								<div className="flex items-center justify-center gap-2 p-3 bg-red-50 border border-red-200 rounded-lg">
									<Icon icon="lucide:alert-circle" className="h-4 w-4 text-red-600" />
									<span className="text-sm text-red-600 font-medium">{localError}</span>
								</div>
							)}
						</div>

						{/* Resend OTP Section */}
						<div className="flex flex-col items-center justify-center gap-2">
							<div className="text-center text-sm text-gray-600">
								{canResend ? (
									"Didn't receive the code?"
								) : (
									<span className="flex items-center justify-center gap-2">
										<Icon icon="lucide:clock" className="h-3 w-3 md:h-4 md:w-4" />
										Resend available in <span className="font-semibold">{resendTimer}s</span>
									</span>
								)}
							</div>

							{onResendOTP && (
								<Button
									variant="link"
									onClick={handleResend}
									disabled={!canResend || isResending}
									className="text-blue-600 hover:text-blue-800 h-auto p-0 text-sm md:text-base"
								>
									{isResending ? (
										<span className="flex items-center gap-2">
											<Icon icon="eos-icons:loading" className="h-3 w-3 md:h-4 md:w-4 animate-spin" />
											Resending...
										</span>
									) : (
										<span className="flex items-center gap-2">
											<Icon icon="lucide:refresh-cw" className="h-3 w-3 md:h-4 md:w-4" />
											Resend OTP
										</span>
									)}
								</Button>
							)}
						</div>

						{/* Action Buttons */}
						<div className="flex flex-col gap-3 pt-2">
							<div className="flex gap-3">
								<Button
									variant="outline"
									className="flex-1 border-gray-300 hover:border-gray-400 py-2 md:py-3 text-sm md:text-base"
									onClick={handleBack}
									disabled={isLoading || isResending}
								>
									<Icon icon="lucide:x" className="mr-2 h-3 w-3 md:h-4 md:w-4" />
									Cancel
								</Button>
								<Button
									className="flex-1 bg-blue-600 hover:bg-blue-700 py-2 md:py-3 text-sm md:text-base"
									onClick={() => handleSubmit()}
									disabled={!isOTPComplete || isLoading || isResending}
								>
									{isLoading ? (
										<>
											<Icon icon="eos-icons:loading" className="mr-2 h-3 w-3 md:h-4 md:w-4 animate-spin" />
											Verifying...
										</>
									) : (
										<>
											<Icon icon="lucide:lock" className="mr-2 h-3 w-3 md:h-4 md:w-4" />
											Verify
										</>
									)}
								</Button>
							</div>
						</div>

						{/* Help Section */}
						<div className="pt-4 border-t border-gray-200 space-y-4">
							<p className="text-center text-sm font-medium text-gray-900">Need help?</p>
							<div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs md:text-sm text-gray-600">
								<div className="text-center p-2 bg-gray-50 rounded">
									<Icon icon="lucide:message-square" className="h-3 w-3 md:h-4 md:w-4 text-blue-600 mx-auto mb-1" />
									Check SMS
								</div>
								<div className="text-center p-2 bg-gray-50 rounded">
									<Icon icon="lucide:wifi" className="h-3 w-3 md:h-4 md:w-4 text-blue-600 mx-auto mb-1" />
									Check network
								</div>
								<div className="text-center p-2 bg-gray-50 rounded">
									<Icon icon="lucide:headphones" className="h-3 w-3 md:h-4 md:w-4 text-blue-600 mx-auto mb-1" />
									Contact support
								</div>
							</div>

							{/* Info Box */}
							<div className="p-3 bg-blue-50 border border-blue-200 rounded-lg">
								<div className="flex items-start gap-2">
									<Icon icon="lucide:info" className="h-3 w-3 md:h-4 md:w-4 text-blue-600 flex-shrink-0 mt-0.5" />
									<p className="text-xs md:text-sm text-blue-700">
										After verification, your business day will be closed and sales summary generated.
									</p>
								</div>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
};
