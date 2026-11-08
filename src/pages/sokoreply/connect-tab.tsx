// Step 1: connect Facebook & Instagram, and the shadow / live / pause switches
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import smmService from "@/api/services/smmService";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Switch } from "@/ui/switch";

export function ConnectTab({ onNext }: { onNext: () => void }) {
	const qc = useQueryClient();
	const accounts = useQuery({ queryKey: ["smm-accounts"], queryFn: smmService.accounts });
	const profile = useQuery({ queryKey: ["smm-profile"], queryFn: smmService.profile });

	const connect = useMutation({
		mutationFn: smmService.connectUrl,
		onSuccess: (url) => {
			window.location.href = url; // Facebook's own login window; they never give Tribe a password
		},
		onError: (e: Error) => message.error(e.message),
	});
	const disconnect = useMutation({
		mutationFn: smmService.disconnect,
		onSuccess: () => {
			message.success("Disconnected");
			qc.invalidateQueries({ queryKey: ["smm-accounts"] });
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

	const active = (accounts.data ?? []).filter((a) => a.status !== "DISCONNECTED");
	const p = profile.data;

	return (
		<div className="grid gap-4 md:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Connect Facebook & Instagram</CardTitle>
					<CardDescription>
						Facebook opens its own login window. Pick your Page; the Instagram account linked to it comes with it. You
						must be an admin of the Page, and your Instagram must be a Business or Creator account linked to the Page.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{active.length === 0 && <p className="text-sm text-muted-foreground">Nothing connected yet.</p>}
					{active.map((a) => (
						<div key={a.id} className="flex items-center justify-between gap-2 rounded-md border p-2">
							<div>
								<div className="font-medium">{a.name}</div>
								<div className="text-xs text-muted-foreground">
									{a.platform === "INSTAGRAM" ? "Instagram" : "Facebook Page"}
									{a.lastWebhookAt
										? ` · last comment ${new Date(a.lastWebhookAt).toLocaleString()}`
										: " · no comments yet"}
								</div>
							</div>
							<div className="flex items-center gap-2">
								{a.status === "ACTIVE" ? (
									<Badge variant="success">Connected</Badge>
								) : (
									<Badge variant="error">Reconnect needed</Badge>
								)}
								<Button
									size="sm"
									variant="outline"
									disabled={disconnect.isPending}
									onClick={() => disconnect.mutate(a.id)}
								>
									Disconnect
								</Button>
							</div>
						</div>
					))}
					<div className="flex gap-2">
						<Button onClick={() => connect.mutate()} disabled={connect.isPending}>
							{active.length ? "Connect another Page" : "Connect Facebook & Instagram"}
						</Button>
						{active.length > 0 && (
							<Button variant="outline" onClick={onNext}>
								Next: shop details
							</Button>
						)}
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>How the agents work for you</CardTitle>
					<CardDescription>
						New shops start in shadow mode: the agents read every comment and write replies, and you see them here, but
						nothing is sent. Protecting you starts on day one: comments with phone numbers and harmful comments are
						hidden, and you get an urgent WhatsApp. Switch to live when you are happy with the replies.
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
								<Switch checked={!p.shadowMode} onCheckedChange={(on) => mode.mutate({ shadowMode: !on })} />
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
