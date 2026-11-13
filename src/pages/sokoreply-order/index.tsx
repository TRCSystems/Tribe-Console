// src/pages/sokoreply-order/index.tsx - Public SokoReply order page, opened from a Facebook/Instagram comment
// reply (no login, mobile first). One link per Reel, shared by every commenter on it.
import { useMutation, useQuery } from "@tanstack/react-query";
import type React from "react";
import { useState } from "react";
import { useParams, useSearchParams } from "react-router";
import sokoReplyOrderService, {
	type SokoReplyPlacedOrder,
	type SokoReplyViewItem,
} from "@/api/services/sokoReplyOrderService";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";

const kes = (n: number | null | undefined) =>
	`KES ${Number(n ?? 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

export default function SokoReplyOrderPage() {
	const { token = "" } = useParams();
	const [searchParams] = useSearchParams();
	const commentId = searchParams.get("c") ?? undefined;

	const [qty, setQty] = useState<Record<string, number>>({});
	const [zoneId, setZoneId] = useState<number | undefined>(undefined);
	const [phone, setPhone] = useState("");
	const [customerName, setCustomerName] = useState("");
	const [placed, setPlaced] = useState<SokoReplyPlacedOrder | null>(null);
	const [mpesaCode, setMpesaCode] = useState("");
	const [reported, setReported] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const {
		data,
		isLoading,
		error: loadError,
	} = useQuery({
		queryKey: ["sokoreply-order", token],
		queryFn: () => sokoReplyOrderService.view(token),
		retry: false,
		refetchOnWindowFocus: false,
	});

	const items = data?.items ?? [];
	const setItem = (code: string, q: number) => setQty((prev) => ({ ...prev, [code]: Math.max(0, Math.min(99, q)) }));
	const lineCount = Object.values(qty).filter((q) => q > 0).length;
	const zone = data?.zones.find((z) => z.id === zoneId);
	const subtotal = items.reduce((sum, i) => sum + (qty[i.itemCode] ?? 0) * i.price, 0);
	const total = subtotal + (zone?.fee ?? 0);

	const place = useMutation({
		mutationFn: () =>
			sokoReplyOrderService.place(
				token,
				Object.entries(qty)
					.filter(([, q]) => q > 0)
					.map(([itemCode, quantity]) => ({ itemCode, quantity })),
				zoneId,
				phone.trim(),
				customerName.trim() || undefined,
				commentId,
			),
		onSuccess: (order) => {
			setPlaced(order);
			setError(null);
			window.scrollTo({ top: 0 });
		},
		onError: (e: Error) => setError(e.message),
	});

	const reportPaid = useMutation({
		mutationFn: () => sokoReplyOrderService.reportPaid(token, placed?.orderCode ?? "", mpesaCode.trim() || undefined),
		onSuccess: () => setReported(true),
		onError: (e: Error) => setError(e.message),
	});

	if (isLoading) {
		return (
			<Shell>
				<div className="py-20 text-center">
					<Icon icon="eos-icons:loading" className="mx-auto h-8 w-8" />
				</div>
			</Shell>
		);
	}

	if (loadError || !data) {
		const msg = (loadError as Error)?.message ?? "";
		return (
			<Shell>
				<Card>
					<CardContent className="py-10 text-center space-y-2">
						<Icon icon="lucide:link-2-off" className="mx-auto h-10 w-10 text-slate-400" />
						<p className="text-lg font-semibold">Link haifanyi kazi</p>
						<p className="text-sm text-slate-600">
							{/expired|exist/i.test(msg)
								? "This order link has expired. Look for the seller's latest post, or message them directly on WhatsApp."
								: "This order link isn't valid. Look for the seller's latest post, or message them directly on WhatsApp."}
						</p>
					</CardContent>
				</Card>
			</Shell>
		);
	}

	// ── Order placed ──
	if (placed) {
		return (
			<Shell seller={data.sellerName}>
				<Card>
					<CardContent className="pt-6 space-y-4">
						<div className="text-center space-y-1">
							<Icon icon="lucide:circle-check" className="mx-auto h-12 w-12 text-emerald-600" />
							<p className="text-xl font-bold">Order imepokelewa!</p>
							<p className="text-sm text-slate-600">
								Order {placed.orderCode} has been sent to {data.sellerName}.
							</p>
						</div>
						<div className="flex justify-between rounded-lg border px-3 py-2 font-bold">
							<span>Total</span>
							<span>{kes(placed.totalAmount)}</span>
						</div>

						{placed.tillVerified ? (
							<div className="space-y-2 rounded-lg bg-emerald-50 p-3">
								<p className="text-sm font-semibold">Pay via M-Pesa</p>
								<p className="text-xs text-slate-600">
									Lipa na M-Pesa → Buy Goods and Services → Till{" "}
									<span className="font-mono font-bold">{placed.tillNumber}</span> ({placed.tillName}). Enter{" "}
									{kes(placed.totalAmount)} and your PIN.
								</p>
								{!reported ? (
									<>
										<Input
											placeholder="M-Pesa code (optional), e.g. QK7AB12XYZ"
											value={mpesaCode}
											maxLength={12}
											onChange={(e) => setMpesaCode(e.target.value.toUpperCase())}
										/>
										<Button className="w-full" onClick={() => reportPaid.mutate()} disabled={reportPaid.isPending}>
											{reportPaid.isPending ? "Telling the seller…" : "I've paid"}
										</Button>
									</>
								) : (
									<p className="text-center text-sm font-medium text-emerald-800">
										✅ Thanks — {data.sellerName} has been told. They'll check their till and get your order ready.
									</p>
								)}
							</div>
						) : (
							<p className="rounded-lg bg-amber-50 p-3 text-center text-sm text-amber-800">
								We'll contact you on WhatsApp to arrange payment with {data.sellerName}.
							</p>
						)}
						{error && <p className="text-center text-sm text-red-600">{error}</p>}
					</CardContent>
				</Card>
			</Shell>
		);
	}

	// ── Ordering ──
	return (
		<Shell seller={data.sellerName}>
			<div className="space-y-1">
				<p className="text-2xl font-bold">Hey 👋</p>
				<p className="text-sm text-slate-600">
					Order from {data.sellerName}
					{data.location ? ` (${data.location})` : ""}. Choose what you want below.
				</p>
			</div>

			<div className="space-y-2">
				{items.map((i) => (
					<ItemRow key={i.itemCode} item={i} quantity={qty[i.itemCode] ?? 0} onChange={(q) => setItem(i.itemCode, q)} />
				))}
				{items.length === 0 && (
					<p className="py-6 text-center text-sm text-slate-500">
						Nothing tagged on this post yet — message {data.sellerName} directly.
					</p>
				)}
			</div>

			{data.sets.length > 0 && (
				<Card>
					<CardContent className="pt-5 space-y-2">
						<p className="font-semibold">Sets</p>
						{data.sets.map((s) => (
							<div key={s.id} className="flex justify-between text-sm">
								<span>
									{s.name} ({s.items.join(", ")})
								</span>
								<span className="font-medium">{kes(s.price)}</span>
							</div>
						))}
						<p className="text-xs text-slate-500">Message {data.sellerName} to order a set.</p>
					</CardContent>
				</Card>
			)}

			{data.zones.length > 0 && (
				<Card>
					<CardContent className="pt-5 space-y-2">
						<p className="font-semibold">Delivery</p>
						{data.zones.map((z) => (
							<label key={z.id} className="flex items-center justify-between gap-2 text-sm">
								<span className="flex items-center gap-2">
									<input type="radio" name="zone" checked={zoneId === z.id} onChange={() => setZoneId(z.id)} />
									{z.name} {z.days ? `(${z.days})` : ""}
								</span>
								<span className="font-medium">{z.fee ? kes(z.fee) : "Free"}</span>
							</label>
						))}
					</CardContent>
				</Card>
			)}

			<Card>
				<CardContent className="pt-5 space-y-2">
					<p className="font-semibold">Your details</p>
					<Input placeholder="Your name" value={customerName} onChange={(e) => setCustomerName(e.target.value)} />
					<Input inputMode="tel" placeholder="0712345678" value={phone} onChange={(e) => setPhone(e.target.value)} />
				</CardContent>
			</Card>

			{error && <p className="text-center text-sm text-red-600">{error}</p>}

			<div className="sticky bottom-0 -mx-4 border-t bg-white/95 px-4 py-3 backdrop-blur">
				<div className="mx-auto flex max-w-xl items-center justify-between gap-3">
					<div>
						<p className="text-xs text-slate-500">{lineCount} item(s)</p>
						<p className="text-lg font-bold">{kes(total)}</p>
					</div>
					<Button
						size="lg"
						onClick={() => place.mutate()}
						disabled={place.isPending || lineCount === 0 || phone.trim().length < 9}
					>
						{place.isPending ? "Placing…" : "Order now"}
					</Button>
				</div>
			</div>
		</Shell>
	);
}

function ItemRow({
	item,
	quantity,
	onChange,
}: {
	item: SokoReplyViewItem;
	quantity: number;
	onChange: (q: number) => void;
}) {
	const outOfStock = item.stock !== null && item.stock <= 0;
	return (
		<div className={`flex items-center gap-3 rounded-lg border bg-white p-3 ${outOfStock ? "opacity-50" : ""}`}>
			<div className="min-w-0 flex-1">
				<p className="truncate font-medium">
					{item.name}
					{item.colour ? ` — ${item.colour}` : ""}
					{item.size ? ` (${item.size})` : ""}
				</p>
				<div className="flex items-center gap-2 text-sm text-slate-600">
					{kes(item.price)}
					{outOfStock && <Badge variant="destructive">Out of stock</Badge>}
				</div>
			</div>
			{!outOfStock && (
				<div className="flex items-center gap-1">
					<Button
						size="icon"
						variant="outline"
						className="h-9 w-9"
						onClick={() => onChange(quantity - 1)}
						disabled={quantity === 0}
						aria-label={`Less ${item.name}`}
					>
						−
					</Button>
					<Input
						inputMode="numeric"
						className="h-9 w-14 text-center"
						value={quantity === 0 ? "" : String(quantity)}
						placeholder="0"
						onChange={(e) => onChange(Number(e.target.value.replace(/\D/g, "")) || 0)}
						aria-label={`Quantity of ${item.name}`}
					/>
					<Button
						size="icon"
						variant="outline"
						className="h-9 w-9"
						onClick={() => onChange(quantity + 1)}
						aria-label={`More ${item.name}`}
					>
						+
					</Button>
				</div>
			)}
		</div>
	);
}

function Shell({ children, seller }: { children: React.ReactNode; seller?: string }) {
	return (
		<div className="min-h-screen bg-slate-50">
			<header className="border-b bg-white">
				<div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-3">
					<Icon icon="lucide:shopping-basket" className="h-5 w-5 text-emerald-600" />
					<span className="font-semibold">{seller ?? "Order"}</span>
					<span className="ml-auto text-xs text-slate-400">powered by TRIBE</span>
				</div>
			</header>
			<main className="mx-auto max-w-xl space-y-4 px-4 py-4">{children}</main>
		</div>
	);
}
