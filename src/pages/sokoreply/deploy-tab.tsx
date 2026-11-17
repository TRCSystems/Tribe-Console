// Step 7: pick a plan, pay by M-Pesa STK push, then switch the agents live
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useEffect, useRef, useState } from "react";
import smmService, { type Platform, type SmmPlanName, type Subscription } from "@/api/services/smmService";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { RadioGroup, RadioGroupItem } from "@/ui/radio-group";
import { Switch } from "@/ui/switch";

const PLAN_LABELS: Record<SmmPlanName, string> = { STARTER: "Starter", GROWTH: "Growth", PRO: "Pro" };

export function DeployTab() {
	const qc = useQueryClient();
	const [selectedPlan, setSelectedPlan] = useState<SmmPlanName | null>(null);
	const [starterPlatform, setStarterPlatform] = useState<Platform>("FACEBOOK");
	const [phoneNumber, setPhoneNumber] = useState("");

	const plans = useQuery({ queryKey: ["smm-plans"], queryFn: smmService.plans });
	const subscription = useQuery({ queryKey: ["smm-billing-status"], queryFn: smmService.billingStatus });
	const profile = useQuery({ queryKey: ["smm-profile"], queryFn: smmService.profile });

	const subscribe = useMutation({
		mutationFn: smmService.subscribe,
		onSuccess: (sub) => {
			qc.setQueryData(["smm-billing-status"], sub);
			message.success(
				"STK push sent. Enter your M-Pesa PIN on your phone — we'll activate your plan the moment it's confirmed.",
			);
		},
		onError: (e: Error) => message.error(e.message),
	});
	const confirm = useMutation({
		mutationFn: smmService.confirmPayment,
		onSuccess: ({ data, message: msg }) => {
			qc.setQueryData(["smm-billing-status"], data);
			if (data.active) message.success(msg);
			else message.warning(`${msg} If you've paid, wait a few seconds and try again.`);
		},
		onError: (e: Error) => message.error(e.message),
	});
	const mode = useMutation({
		mutationFn: smmService.setMode,
		onSuccess: (p) => {
			qc.setQueryData(["smm-profile"], p);
			message.success(
				p.shadowMode
					? "Shadow mode: replies are written and shown to you, not sent"
					: "Live: the agents reply to buyers",
			);
		},
		onError: (e: Error) => message.error(e.message),
	});

	const sub = subscription.data;
	const p = profile.data;
	const pending = sub?.status === "PENDING_PAYMENT";

	// While a payment is pending, check M-Pesa every 3s so the plan activates the moment it's confirmed —
	// no need for the seller to notice and click "I've paid" themselves.
	const polling = useRef(false);
	useEffect(() => {
		if (!pending) return;
		const id = setInterval(async () => {
			if (polling.current) return;
			polling.current = true;
			try {
				const { data } = await smmService.confirmPayment();
				qc.setQueryData<Subscription>(["smm-billing-status"], data);
				if (data.active) message.success("Payment confirmed — your plan is active.");
			} catch {
				// Nothing pending (already resolved) or a transient error — the next tick retries.
			} finally {
				polling.current = false;
			}
		}, 3000);
		return () => clearInterval(id);
	}, [pending, qc]);

	return (
		<div className="flex flex-col gap-4">
			<Card>
				<CardHeader>
					<CardTitle>Choose a plan</CardTitle>
					<CardDescription>
						{sub?.active
							? `You're on ${PLAN_LABELS[sub.plan]}, paid until ${sub.currentPeriodEnd ? new Date(sub.currentPeriodEnd).toLocaleDateString() : "—"}.`
							: "Pick a plan and pay by M-Pesa to deploy your agents."}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					<div className="grid gap-3 md:grid-cols-3">
						{(plans.data ?? []).map((plan) => (
							<button
								key={plan.plan}
								type="button"
								onClick={() => setSelectedPlan(plan.plan)}
								className={`flex flex-col gap-2 rounded-md border p-3 text-left ${
									selectedPlan === plan.plan ? "border-primary ring-1 ring-primary" : ""
								}`}
							>
								<div className="flex items-center justify-between">
									<span className="font-medium">{PLAN_LABELS[plan.plan]}</span>
									{plan.recommended && <Badge variant="success">Recommended</Badge>}
								</div>
								<div className="text-2xl font-semibold">
									KES {plan.priceKes}
									<span className="text-sm font-normal text-muted-foreground">/mo</span>
								</div>
								<ul className="flex flex-col gap-1 text-xs text-muted-foreground">
									<li>
										{plan.platformChoiceRequired
											? "Facebook or Instagram (your choice)"
											: `Facebook, Instagram & TikTok (${plan.maxPlatforms} platforms)`}
									</li>
									{plan.crossPlatformPosting && <li>✓ Post once, published everywhere</li>}
									{plan.stockArrivalAlerts && <li>✓ Notify buyers when stock arrives</li>}
									{plan.scamContactHiding && <li>✓ Hide your contact from scammers</li>}
								</ul>
							</button>
						))}
					</div>

					{selectedPlan === "STARTER" && (
						<div className="flex flex-col gap-2">
							<Label>Which platform?</Label>
							<RadioGroup
								value={starterPlatform}
								onValueChange={(v) => setStarterPlatform(v as Platform)}
								className="flex gap-4"
							>
								{/* biome-ignore lint/a11y/noLabelWithoutControl: wraps a RadioGroupItem */}
								<label className="flex items-center gap-2 text-sm">
									<RadioGroupItem value="FACEBOOK" /> Facebook
								</label>
								{/* biome-ignore lint/a11y/noLabelWithoutControl: wraps a RadioGroupItem */}
								<label className="flex items-center gap-2 text-sm">
									<RadioGroupItem value="INSTAGRAM" /> Instagram
								</label>
							</RadioGroup>
						</div>
					)}

					{selectedPlan && !sub?.active && (
						<div className="flex flex-wrap items-end gap-2">
							<div className="flex flex-col gap-1">
								<Label htmlFor="billing-phone">M-Pesa number</Label>
								<Input
									id="billing-phone"
									className="w-48"
									placeholder="0712345678"
									value={phoneNumber}
									onChange={(e) => setPhoneNumber(e.target.value)}
								/>
							</div>
							<Button
								disabled={subscribe.isPending || !phoneNumber}
								onClick={() =>
									subscribe.mutate({
										plan: selectedPlan,
										platform: selectedPlan === "STARTER" ? starterPlatform : undefined,
										phoneNumber,
									})
								}
							>
								Pay KES {plans.data?.find((pl) => pl.plan === selectedPlan)?.priceKes} with M-Pesa
							</Button>
							{pending && (
								<div className="flex items-center gap-2">
									<span className="text-xs text-muted-foreground">Waiting for M-Pesa confirmation…</span>
									<Button variant="outline" disabled={confirm.isPending} onClick={() => confirm.mutate()}>
										Check now
									</Button>
								</div>
							)}
						</div>
					)}
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Deploy your agents</CardTitle>
					<CardDescription>
						{sub?.active
							? "Switch the agents live once you're happy with their replies in shadow mode."
							: "Pay for a plan above first — agents only go live on a paid, active subscription."}
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-4">
					{p && (
						<>
							{/* biome-ignore lint/a11y/noLabelWithoutControl: wraps a Switch */}
							<label className="flex items-center justify-between gap-2">
								<span>
									<span className="font-medium">Live</span>
									<span className="block text-xs text-muted-foreground">
										{p.shadowMode ? "Off: replies are logged for you to check" : "On: the agents answer buyers"}
									</span>
								</span>
								<Switch
									checked={!p.shadowMode}
									disabled={!sub?.active}
									onCheckedChange={(on) => mode.mutate({ shadowMode: !on })}
								/>
							</label>
							{/* biome-ignore lint/a11y/noLabelWithoutControl: wraps a Switch */}
							<label className="flex items-center justify-between gap-2">
								<span>
									<span className="font-medium">Pause</span>
									<span className="block text-xs text-muted-foreground">
										Stops replies (e.g. while you are away). Hiding numbers and harmful comments carries on.
									</span>
								</span>
								<Switch checked={p.agentsPaused} onCheckedChange={(on) => mode.mutate({ agentsPaused: on })} />
							</label>
						</>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
