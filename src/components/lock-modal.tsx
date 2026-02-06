import type React from "react";
import { useState } from "react";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";

interface LockModalProps {
	isOpen: boolean;
	merchantName?: string;
	onUnlock: (password: string) => void;
	onCancel: () => void;
}

export const LockModal: React.FC<LockModalProps> = ({ isOpen, merchantName: _merchantName, onUnlock }) => {
	const [password, setPassword] = useState("");
	const [isVisible, setIsVisible] = useState(false);
	const [error, setError] = useState("");

	if (!isOpen) return null;

	const handleSubmit = (e: React.FormEvent) => {
		e.preventDefault();
		setError("");

		if (!password.trim()) {
			setError("Password is required");
			return;
		}

		onUnlock(password);
	};

	return (
		<div className="fixed inset-0 bg-black/80 flex items-center justify-center z-[9999] p-4">
			<Card className="w-full max-w-md border-red-200 dark:border-red-800 shadow-2xl">
				<CardHeader className="text-center border-b border-red-100 dark:border-red-900 pb-6">
					<div className="mx-auto mb-4">
						<div className="h-16 w-16 rounded-full bg-gradient-to-br from-red-500 to-red-600 flex items-center justify-center mx-auto">
							<Icon icon="lucide:lock" className="h-8 w-8 text-white" />
						</div>
					</div>
					<CardTitle className="text-2xl text-gray-900 dark:text-gray-100">
						Stock Management - Restricted Access
					</CardTitle>
					<CardDescription className="text-gray-600 dark:text-gray-400 text-base mt-2">
						Merchant password required to access stock operations
					</CardDescription>
				</CardHeader>

				<CardContent className="pt-6">
					<form onSubmit={handleSubmit}>
						<div className="space-y-6">
							<div>
								<label
									htmlFor="password-input"
									className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2 block"
								>
									Access Password
								</label>
								<div className="relative">
									<Input
										id="password-input"
										type={isVisible ? "text" : "password"}
										value={password}
										onChange={(e) => {
											setPassword(e.target.value);
											setError("");
										}}
										placeholder="Enter access password..."
										className="pr-10 py-6 text-base"
										autoFocus
									/>
									<button type="button" onClick={() => setIsVisible(!isVisible)} className="absolute right-3 top-3.5">
										<Icon
											icon={isVisible ? "lucide:eye-off" : "lucide:eye"}
											className="h-5 w-5 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
										/>
									</button>
								</div>

								{error && (
									<p className="text-sm text-red-600 dark:text-red-400 mt-2 flex items-center">
										<Icon icon="lucide:alert-circle" className="h-4 w-4 mr-1" />
										{error}
									</p>
								)}
							</div>

							<div className="flex gap-3 pt-2">
								<Button
									type="submit"
									className="flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 py-5 text-base"
									disabled={!password.trim()}
								>
									<Icon icon="lucide:unlock" className="mr-2 h-4 w-4" />
									Unlock Access
								</Button>
							</div>

							<div className="text-center pt-4 border-t border-gray-200 dark:border-gray-800">
								<p className="text-xs text-gray-500 flex items-center justify-center gap-1">
									<Icon icon="lucide:shield" className="h-3 w-3" />
									Tribe Powered by TRC Systems
								</p>
								<p className="text-xs text-gray-400 dark:text-gray-600 mt-1">Access will be valid for 8 hours</p>
							</div>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
};
