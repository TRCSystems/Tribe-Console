// src/pages/crm/shop/index.tsx - One shop: buying rhythm, products, orders, messages and actions
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router";
import crmService from "@/api/services/crmService";
import { formatDate, formatKes, SegmentBadge } from "@/components/crm/segment-badge";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Switch } from "@/ui/switch";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Textarea } from "@/ui/textarea";
import { useCanViewStockCountResults } from "@/utils/stock-visibility";

const TEMPLATE_LABELS: Record<string, string> = {
	SELF_ORDER_INVITE: "Invite to order themselves",
	WHATSAPP_INVITE: "Invite to order on WhatsApp",
	REORDER_DUE: "Time to restock",
	WIN_BACK: "We miss you",
	WEEKEND_STOCKUP: "Weekend stock-up",
	PAYDAY_WEEK: "Payday week",
	NEW_STOCK: "New stock arrived",
	PROMO: "Promo / offer",
	CUSTOM: "Custom note",
};

const SOURCE_LABEL = { DISTRIBUTOR: "Distributor", REP: "Rep", SHOP: "Shop itself" } as const;

export default function CrmShopProfilePage() {
	const { shopId: shopIdParam } = useParams();
	const shopId = Number(shopIdParam);
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const isDistributor = useCanViewStockCountResults(); // not a shop attendant

	const {
		data: shop,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["crm", "shop", shopId],
		queryFn: () => crmService.shop(shopId),
		enabled: Number.isFinite(shopId),
	});
	const { data: messages = [] } = useQuery({
		queryKey: ["crm", "shop", shopId, "messages"],
		queryFn: () => crmService.shopMessages(shopId),
		enabled: Number.isFinite(shopId),
	});
	const { data: templates = [] } = useQuery({ queryKey: ["crm", "templates"], queryFn: () => crmService.templates() });
	const { data: reps = [] } = useQuery({
		queryKey: ["crm", "reps"],
		queryFn: () => crmService.reps(),
		retry: false,
	});

	const [template, setTemplate] = useState("SELF_ORDER_INVITE");
	const [customText, setCustomText] = useState("");
	const [phone, setPhone] = useState("");
	const [whatsapp, setWhatsapp] = useState("");

	useEffect(() => {
		if (shop) setPhone(shop.phone ?? "");
	}, [shop]);

	const invalidate = () => queryClient.invalidateQueries({ queryKey: ["crm"] });

	const send = useMutation({
		mutationFn: () =>
			crmService.sendMessage(
				shopId,
				template,
				template === "CUSTOM" || template === "PROMO" ? { text: customText.trim() } : {},
			),
		onSuccess: ({ message: msg, result }) => {
			if (result.status === "SENT") message.success(msg);
			else message.warning(msg);
			setCustomText("");
			invalidate();
		},
		onError: (e: Error) => message.error(e.message),
	});

	const assign = useMutation({
		mutationFn: (rep: number | null) => crmService.assignRep(shopId, rep),
		onSuccess: () => {
			message.success("Rep updated");
			invalidate();
		},
		onError: (e: Error) => message.error(e.message),
	});

	const contact = useMutation({
		mutationFn: (changes: Parameters<typeof crmService.updateContact>[1]) => crmService.updateContact(shopId, changes),
		onSuccess: () => {
			message.success("Contact updated");
			invalidate();
		},
		onError: (e: Error) => message.error(e.message),
	});

	if (isLoading) {
		return (
			<div className="p-6 text-center">
				<Icon icon="eos-icons:loading" className="mx-auto h-8 w-8" />
			</div>
		);
	}
	if (error || !shop) {
		return (
			<div className="p-6">
				<Card>
					<CardContent className="py-10 text-center space-y-3">
						<p className="text-destructive">{(error as Error)?.message ?? "Shop not found"}</p>
						<Button variant="outline" onClick={() => navigate("/crm/shops")}>
							Back to shops
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	const stats = [
		{ label: "Last order", value: shop.daysSinceLastOrder === null ? "Never" : `${shop.daysSinceLastOrder} days ago` },
		{
			label: "Usually orders every",
			value: shop.usualGapDays ? `${shop.usualGapDays} days${shop.gapIsEstimated ? " (est.)" : ""}` : "—",
		},
		{ label: "Next order expected", value: formatDate(shop.nextExpectedOrderDate) },
		{ label: "Orders (30 / 90 days)", value: `${shop.orders30d ?? 0} / ${shop.orders90d ?? 0}` },
		{ label: "Average order", value: formatKes(shop.avgBasketKes) },
		{ label: "Bought (90 days)", value: formatKes(shop.revenue90d) },
	];

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
				<div>
					<button
						type="button"
						onClick={() => navigate("/crm/shops")}
						className="mb-2 text-sm text-muted-foreground hover:underline"
					>
						← All shops
					</button>
					<div className="flex flex-wrap items-center gap-2">
						<h1 className="text-2xl font-semibold tracking-tight text-foreground">{shop.name}</h1>
						<SegmentBadge segment={shop.segment} />
						{shop.marketingOptOut && <Badge variant="destructive">Opted out</Badge>}
					</div>
					<p className="text-sm text-muted-foreground">
						{shop.location || "—"} · {shop.phone || "no phone"} · {shop.ordersAllTime ?? shop.orderCount} orders since{" "}
						{formatDate(shop.firstOrderAt)}
					</p>
				</div>
			</div>

			<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
				{stats.map((s) => (
					<Card key={s.label}>
						<CardContent className="pt-5">
							<p className="text-xs font-medium text-muted-foreground">{s.label}</p>
							<p className="mt-1 text-lg font-bold">{s.value}</p>
						</CardContent>
					</Card>
				))}
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>What they buy</CardTitle>
						<CardDescription>
							Top products over the last 90 days, and what similar shops buy that they don't.
						</CardDescription>
					</CardHeader>
					<CardContent className="grid gap-6 md:grid-cols-2">
						<div className="space-y-2">
							<p className="text-sm font-semibold">Top products</p>
							{(shop.topItems ?? []).length === 0 ? (
								<p className="text-sm text-muted-foreground">No orders in 90 days.</p>
							) : (
								(shop.topItems ?? []).map((t) => (
									<div key={t.itemCode} className="flex justify-between text-sm">
										<span>{t.itemName}</span>
										<span className="text-muted-foreground">
											{t.units} units · {t.orders} orders
										</span>
									</div>
								))
							)}
						</div>
						<div className="space-y-2">
							<p className="text-sm font-semibold">Suggest to them</p>
							{(shop.crossSell ?? []).length === 0 ? (
								<p className="text-sm text-muted-foreground">No suggestions — they already stock the popular lines.</p>
							) : (
								(shop.crossSell ?? []).map((t) => (
									<div key={t.itemCode} className="flex justify-between text-sm">
										<span>{t.itemName}</span>
										<span className="text-muted-foreground">{t.shopShare}% of shops stock it</span>
									</div>
								))
							)}
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Send a message</CardTitle>
						<CardDescription>
							By{" "}
							{shop.preferredChannel === "WHATSAPP"
								? "WhatsApp, with an Order now button (SMS if WhatsApp is off or fails)"
								: "SMS"}
							. Limits: 3 marketing messages a week, none 7 PM–8 AM.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						<Select value={template} onValueChange={setTemplate}>
							<SelectTrigger>
								<SelectValue />
							</SelectTrigger>
							<SelectContent>
								{templates
									.filter((t) => TEMPLATE_LABELS[t.key])
									.map((t) => (
										<SelectItem key={t.key} value={t.key}>
											{TEMPLATE_LABELS[t.key]}
										</SelectItem>
									))}
							</SelectContent>
						</Select>
						{template === "CUSTOM" || template === "PROMO" ? (
							<Textarea
								placeholder={template === "PROMO" ? "e.g. County 1/4 iko na discount this week" : "Your message"}
								value={customText}
								maxLength={300}
								onChange={(e) => setCustomText(e.target.value)}
							/>
						) : (
							<p className="rounded-md bg-muted p-2 text-xs text-muted-foreground">
								{templates.find((t) => t.key === template)?.preview}
							</p>
						)}
						<Button
							className="w-full"
							onClick={() => send.mutate()}
							disabled={send.isPending || ((template === "CUSTOM" || template === "PROMO") && !customText.trim())}
						>
							{send.isPending ? "Sending…" : "Send"}
						</Button>
					</CardContent>
				</Card>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Recent orders</CardTitle>
				</CardHeader>
				<CardContent>
					{shop.recentOrders.length === 0 ? (
						<p className="text-sm text-muted-foreground">No orders in the last 6 months.</p>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Date</TableHead>
										<TableHead>Order</TableHead>
										<TableHead>Products</TableHead>
										<TableHead>Placed by</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">Total</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{shop.recentOrders.map((o) => (
										<TableRow key={o.orderCode}>
											<TableCell>{formatDate(o.orderDate)}</TableCell>
											<TableCell>{o.orderCode}</TableCell>
											<TableCell className="max-w-md truncate" title={o.items}>
												{o.items}
											</TableCell>
											<TableCell>{SOURCE_LABEL[o.source]}</TableCell>
											<TableCell>{o.status}</TableCell>
											<TableCell className="text-right">{formatKes(o.totalKes)}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			<div className="grid gap-6 lg:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Messages</CardTitle>
						<CardDescription>Everything sent to this shop, including messages held back and why.</CardDescription>
					</CardHeader>
					<CardContent className="space-y-3">
						{messages.length === 0 ? (
							<p className="text-sm text-muted-foreground">No messages yet.</p>
						) : (
							messages.slice(0, 15).map((m) => (
								<div key={m.id} className="rounded-md border p-2 text-sm">
									<div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
										<span>{new Date(m.createdAt).toLocaleString()}</span>
										<Badge
											variant={m.status === "SENT" ? "success" : m.status === "FAILED" ? "destructive" : "warning"}
										>
											{m.status === "SENT" ? `Sent by ${m.channel}` : m.status === "FAILED" ? "Failed" : "Not sent"}
										</Badge>
										{m.skipReason && <span>{m.skipReason}</span>}
									</div>
									<p className="mt-1">{m.body}</p>
								</div>
							))
						)}
					</CardContent>
				</Card>

				{isDistributor && (
					<Card>
						<CardHeader>
							<CardTitle>Rep and contact</CardTitle>
						</CardHeader>
						<CardContent className="space-y-5">
							<div className="space-y-2">
								<Label>Field rep</Label>
								<Select
									value={shop.repUserId ? String(shop.repUserId) : "none"}
									onValueChange={(v) => assign.mutate(v === "none" ? null : Number(v))}
								>
									<SelectTrigger>
										<SelectValue />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="none">Unassigned</SelectItem>
										{reps.map((r) => (
											<SelectItem key={r.userId} value={String(r.userId)}>
												{r.username}
											</SelectItem>
										))}
									</SelectContent>
								</Select>
								{reps.length === 0 && (
									<p className="text-xs text-muted-foreground">
										No field reps yet —{" "}
										<button type="button" className="underline" onClick={() => navigate("/crm/reps")}>
											add one
										</button>
										.
									</p>
								)}
							</div>
							<div className="grid gap-3 md:grid-cols-2">
								<div className="space-y-1">
									<Label htmlFor="crm-phone">SMS number</Label>
									<Input
										id="crm-phone"
										value={phone}
										onChange={(e) => setPhone(e.target.value)}
										placeholder="0712345678"
									/>
								</div>
								<div className="space-y-1">
									<Label htmlFor="crm-wa">WhatsApp number</Label>
									<Input
										id="crm-wa"
										value={whatsapp}
										onChange={(e) => setWhatsapp(e.target.value)}
										placeholder="Same as SMS if empty"
									/>
								</div>
							</div>
							<Button
								variant="outline"
								onClick={() => contact.mutate({ phone, ...(whatsapp ? { whatsappNumber: whatsapp } : {}) })}
								disabled={contact.isPending}
							>
								Save numbers
							</Button>
							<div className="flex items-center justify-between gap-3">
								<div>
									<Label htmlFor="crm-wa-pref">Prefer WhatsApp</Label>
									<p className="text-xs text-muted-foreground">
										Turns on by itself when the shop messages the Tribe WhatsApp number. Falls back to SMS.
									</p>
								</div>
								<Switch
									id="crm-wa-pref"
									checked={shop.preferredChannel === "WHATSAPP"}
									onCheckedChange={(v) => contact.mutate({ preferredChannel: v ? "WHATSAPP" : "SMS" })}
								/>
							</div>
							<div className="flex items-center justify-between gap-3">
								<div>
									<Label htmlFor="crm-optout">Opted out of marketing</Label>
									<p className="text-xs text-muted-foreground">Order updates still go out.</p>
								</div>
								<Switch
									id="crm-optout"
									checked={shop.marketingOptOut}
									onCheckedChange={(v) => contact.mutate({ marketingOptOut: v })}
								/>
							</div>
						</CardContent>
					</Card>
				)}
			</div>
		</div>
	);
}
