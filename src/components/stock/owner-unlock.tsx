// src/components/stock/owner-unlock.tsx - Unlock owner-only stock quantities with an SMS code
import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import stockLevelsService from "@/api/services/stockLevelsService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";

interface OwnerUnlockProps {
	/** What the owner is unlocking, e.g. "stock levels". */
	what: string;
	onUnlocked: () => void;
	/** Why the page is locked; defaults to the stock-quantities explanation. */
	reason?: string;
	/** Shown as a secondary button, e.g. to leave the page. */
	onCancel?: () => void;
	cancelLabel?: string;
}

/**
 * Stock quantities are hidden at the shop. The owner proves it is them (not someone using their
 * login on the till) with a code sent to the shop's registered phone. Access lasts 30 minutes,
 * in this browser tab only.
 */
export function OwnerUnlock({ what, onUnlocked, reason, onCancel, cancelLabel = "Go back" }: OwnerUnlockProps) {
	const [sentTo, setSentTo] = useState<string | null>(null);
	const [code, setCode] = useState("");

	const requestCode = useMutation({
		mutationFn: () => stockLevelsService.requestCode(),
		onSuccess: (data) => {
			setSentTo(data.sentTo);
			setCode("");
			message.success(`Code sent to ${data.sentTo}`);
		},
		onError: (err: Error) => message.error(err.message),
	});

	const verify = useMutation({
		mutationFn: () => stockLevelsService.verifyCode(code.trim()),
		onSuccess: () => {
			message.success("Unlocked for 30 minutes");
			onUnlocked();
		},
		onError: (err: Error) => message.error(err.message),
	});

	return (
		<Card className="mx-auto max-w-md">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Icon icon="lucide:lock-keyhole" className="h-5 w-5" />
					Owner verification
				</CardTitle>
				<CardDescription>
					{reason ?? "Stock quantities are hidden so staff can't copy them during counts."} To open {what}, we'll send a
					code to the shop's registered phone. Access lasts 30 minutes on this tab only.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-4">
				{!sentTo ? (
					<Button className="w-full" onClick={() => requestCode.mutate()} disabled={requestCode.isPending}>
						<Icon
							icon={requestCode.isPending ? "eos-icons:loading" : "lucide:message-square"}
							className="mr-2 h-4 w-4"
						/>
						{requestCode.isPending ? "Sending…" : "Send me a code"}
					</Button>
				) : (
					<form
						className="space-y-3"
						onSubmit={(e) => {
							e.preventDefault();
							if (/^\d{6}$/.test(code.trim())) verify.mutate();
							else message.warning("Enter the 6-digit code");
						}}
					>
						<p className="text-sm text-muted-foreground">Enter the 6-digit code sent to {sentTo}.</p>
						<Input
							inputMode="numeric"
							autoComplete="one-time-code"
							maxLength={6}
							placeholder="123456"
							value={code}
							onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))}
							className="text-center text-2xl tracking-[0.5em]"
							autoFocus
						/>
						<Button type="submit" className="w-full" disabled={verify.isPending || code.length !== 6}>
							{verify.isPending ? "Checking…" : "Unlock"}
						</Button>
						<Button
							type="button"
							variant="ghost"
							className="w-full"
							onClick={() => requestCode.mutate()}
							disabled={requestCode.isPending}
						>
							Send a new code
						</Button>
					</form>
				)}
				{onCancel && (
					<Button type="button" variant="outline" className="w-full" onClick={onCancel}>
						{cancelLabel}
					</Button>
				)}
				<p className="text-xs text-muted-foreground">
					Got a code you didn't ask for? Someone is using your login — change your password.
				</p>
			</CardContent>
		</Card>
	);
}
