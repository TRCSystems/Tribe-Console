// src/components/stock/report-recipients-card.tsx - Manage who receives stock count SMS
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import reportRecipientsService, { type ReportRecipient } from "@/api/services/reportRecipientsService";
import { Icon } from "@/components/icon";
import { OwnerUnlock } from "@/components/stock/owner-unlock";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Checkbox } from "@/ui/checkbox";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Switch } from "@/ui/switch";
import { isStockViewLockedError } from "@/utils/stock-visibility";

const QUERY_KEY = ["stock-view", "report-recipients"];

/**
 * Owner-only (shown after SMS unlock). The registered phone always receives everything;
 * up to 5 extra numbers can get the daily summary and/or instant shortage alerts.
 */
export function ReportRecipientsCard() {
	const queryClient = useQueryClient();
	const [adding, setAdding] = useState(false);
	const [name, setName] = useState("");
	const [phone, setPhone] = useState("");
	const [receiveSummary, setReceiveSummary] = useState(true);
	const [receiveAlerts, setReceiveAlerts] = useState(true);

	const { data, isLoading, error } = useQuery({
		queryKey: QUERY_KEY,
		queryFn: () => reportRecipientsService.list(),
		retry: (count, err) => !isStockViewLockedError(err) && count < 2,
	});
	// Changing who gets the SMS needs the owner's code, otherwise an attendant on the owner's
	// login could add their own number and receive the system figures.
	const locked = isStockViewLockedError(error);
	const [showUnlock, setShowUnlock] = useState(false);

	const refresh = () => queryClient.invalidateQueries({ queryKey: QUERY_KEY });

	const addMutation = useMutation({
		mutationFn: () => reportRecipientsService.add({ name, phone, receiveSummary, receiveAlerts }),
		onSuccess: (r) => {
			message.success(`${r.name} will now receive stock reports`);
			setName("");
			setPhone("");
			setReceiveSummary(true);
			setReceiveAlerts(true);
			setAdding(false);
			refresh();
		},
		onError: (err: Error) => message.error(err.message),
	});

	const updateMutation = useMutation({
		mutationFn: ({ id, changes }: { id: number; changes: Partial<ReportRecipient> }) =>
			reportRecipientsService.update(id, changes),
		onSuccess: refresh,
		onError: (err: Error) => {
			message.error(err.message);
			refresh();
		},
	});

	const removeMutation = useMutation({
		mutationFn: (id: number) => reportRecipientsService.remove(id),
		onSuccess: () => {
			message.success("Recipient removed");
			refresh();
		},
		onError: (err: Error) => message.error(err.message),
	});

	const recipients = data?.recipients ?? [];
	const full = !!data && recipients.length >= data.maxExtra;

	return (
		<Card id="report-recipients">
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Icon icon="lucide:users" className="h-5 w-5" />
					Who receives these reports
				</CardTitle>
				<CardDescription>
					The end-of-day summary and instant shortage alerts are sent by SMS. Add a partner or manager so more than one
					person sees them. Unlock codes only ever go to the registered phone.
				</CardDescription>
			</CardHeader>
			<CardContent className="space-y-3">
				{isLoading ? (
					<p className="text-sm text-muted-foreground">Loading…</p>
				) : locked ? (
					showUnlock ? (
						<OwnerUnlock
							what="and change who receives reports"
							onUnlocked={() => {
								setShowUnlock(false);
								refresh();
							}}
						/>
					) : (
						<Button onClick={() => setShowUnlock(true)}>
							<Icon icon="lucide:phone" className="mr-2 h-4 w-4" />
							Manage phone numbers
						</Button>
					)
				) : error ? (
					<p className="text-sm text-destructive">{(error as Error).message}</p>
				) : (
					<>
						<div className="flex flex-wrap items-center justify-between gap-2 rounded-md border bg-muted/40 p-3">
							<div>
								<p className="font-medium">Registered shop phone</p>
								<p className="text-sm text-muted-foreground">{data?.registeredPhone || "Not set — contact support"}</p>
							</div>
							<Badge variant="info">Always receives everything</Badge>
						</div>

						{recipients.map((r) => (
							<div key={r.id} className="flex flex-col gap-3 rounded-md border p-3 md:flex-row md:items-center">
								<div className="md:flex-1 min-w-0">
									<p className="font-medium truncate">{r.name}</p>
									<p className="text-sm text-muted-foreground">{r.phone}</p>
								</div>
								<div className="flex flex-wrap items-center gap-4">
									<div className="flex items-center gap-2 text-sm">
										<Switch
											id={`summary-${r.id}`}
											checked={r.receiveSummary}
											onCheckedChange={(v) => updateMutation.mutate({ id: r.id, changes: { receiveSummary: v } })}
										/>
										<Label htmlFor={`summary-${r.id}`} className="font-normal">
											Daily summary
										</Label>
									</div>
									<div className="flex items-center gap-2 text-sm">
										<Switch
											id={`alerts-${r.id}`}
											checked={r.receiveAlerts}
											onCheckedChange={(v) => updateMutation.mutate({ id: r.id, changes: { receiveAlerts: v } })}
										/>
										<Label htmlFor={`alerts-${r.id}`} className="font-normal">
											Shortage alerts
										</Label>
									</div>
									<Button
										size="sm"
										variant="ghost"
										className="text-red-600"
										onClick={() => {
											if (window.confirm(`Stop sending stock reports to ${r.name} (${r.phone})?`)) {
												removeMutation.mutate(r.id);
											}
										}}
										disabled={removeMutation.isPending}
										title="Remove"
									>
										<Icon icon="lucide:trash-2" className="h-4 w-4" />
									</Button>
								</div>
							</div>
						))}

						{adding ? (
							<form
								className="space-y-3 rounded-md border p-3"
								onSubmit={(e) => {
									e.preventDefault();
									addMutation.mutate();
								}}
							>
								<div className="grid gap-3 md:grid-cols-2">
									<div className="space-y-1">
										<Label htmlFor="recipient-name">Name</Label>
										<Input
											id="recipient-name"
											placeholder="e.g. Jane (partner)"
											value={name}
											onChange={(e) => setName(e.target.value)}
											maxLength={80}
										/>
									</div>
									<div className="space-y-1">
										<Label htmlFor="recipient-phone">Phone</Label>
										<Input
											id="recipient-phone"
											inputMode="tel"
											placeholder="0712345678"
											value={phone}
											onChange={(e) => setPhone(e.target.value)}
										/>
									</div>
								</div>
								<div className="flex flex-wrap gap-4">
									<div className="flex items-center gap-2 text-sm">
										<Checkbox
											id={"new-recipient-summary"}
											checked={receiveSummary}
											onCheckedChange={(v) => setReceiveSummary(v === true)}
										/>
										<Label htmlFor={"new-recipient-summary"} className="font-normal">
											Daily summary
										</Label>
									</div>
									<div className="flex items-center gap-2 text-sm">
										<Checkbox
											id={"new-recipient-alerts"}
											checked={receiveAlerts}
											onCheckedChange={(v) => setReceiveAlerts(v === true)}
										/>
										<Label htmlFor={"new-recipient-alerts"} className="font-normal">
											Shortage alerts
										</Label>
									</div>
								</div>
								<div className="flex gap-2">
									<Button type="submit" disabled={addMutation.isPending || !name.trim() || !phone.trim()}>
										{addMutation.isPending ? "Adding…" : "Add"}
									</Button>
									<Button type="button" variant="outline" onClick={() => setAdding(false)}>
										Cancel
									</Button>
								</div>
								<p className="text-xs text-muted-foreground">
									The registered phone gets an SMS whenever someone is added or removed.
								</p>
							</form>
						) : (
							<Button variant="outline" onClick={() => setAdding(true)} disabled={full}>
								<Icon icon="lucide:plus" className="mr-2 h-4 w-4" />
								{full ? `Maximum of ${data?.maxExtra} extra numbers` : "Add phone number"}
							</Button>
						)}
					</>
				)}
			</CardContent>
		</Card>
	);
}
