// src/pages/shop-order/index.tsx - Public order page opened from an SMS/WhatsApp link (no login, mobile first)
import { useMutation, useQuery } from "@tanstack/react-query";
import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useParams } from "react-router";
import shopOrderService, { type ShopOrderSummary } from "@/api/services/shopOrderService";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";

const kes = (n: number | null | undefined) =>
	`KES ${Number(n ?? 0).toLocaleString("en-KE", { maximumFractionDigits: 0 })}`;

interface Extra {
	id: number;
	name: string;
	quantity: number;
}

export default function ShopOrderPage() {
	const { token = "" } = useParams();
	const [qty, setQty] = useState<Record<string, number>>({});
	const [search, setSearch] = useState("");
	const [extras, setExtras] = useState<Extra[]>([]);
	const [placed, setPlaced] = useState<ShopOrderSummary | null>(null);
	const [payPhone, setPayPhone] = useState("");
	const [payMessage, setPayMessage] = useState<string | null>(null);
	const [error, setError] = useState<string | null>(null);
	const prefilled = useRef(false);

	const {
		data,
		isLoading,
		error: loadError,
	} = useQuery({
		queryKey: ["shop-order", token],
		queryFn: () => shopOrderService.view(token),
		retry: false,
		refetchOnWindowFocus: false,
	});

	// Pre-fill the shop's usual order once, when the page first loads
	useEffect(() => {
		if (!data || prefilled.current) return;
		prefilled.current = true;
		if (data.status === "OPEN" && data.usual) {
			const inStock = new Set((data.catalog ?? []).filter((c) => c.inStock).map((c) => c.itemCode));
			const initial: Record<string, number> = {};
			for (const u of data.usual) if (inStock.has(u.itemCode)) initial[u.itemCode] = u.quantity;
			setQty(initial);
		}
		if (data.phone) setPayPhone(data.phone);
		if (data.status === "USED" && data.order) setPlaced(data.order);
	}, [data]);

	const catalog = data?.catalog ?? [];
	const usualCodes = useMemo(() => new Set((data?.usual ?? []).map((u) => u.itemCode)), [data]);
	const visible = catalog
		.filter((c) => !search || c.itemName.toLowerCase().includes(search.toLowerCase()))
		.sort((a, b) => Number(usualCodes.has(b.itemCode)) - Number(usualCodes.has(a.itemCode)));
	const total = catalog.reduce((sum, c) => sum + (qty[c.itemCode] ?? 0) * c.price, 0);
	const lineCount = Object.values(qty).filter((q) => q > 0).length + extras.filter((e) => e.name.trim()).length;

	const setItem = (code: string, q: number) => setQty((prev) => ({ ...prev, [code]: Math.max(0, Math.min(999, q)) }));

	const place = useMutation({
		mutationFn: () =>
			shopOrderService.place(
				token,
				Object.entries(qty)
					.filter(([, q]) => q > 0)
					.map(([itemCode, quantity]) => ({ itemCode, quantity })),
				extras.filter((e) => e.name.trim()).map((e) => ({ name: e.name.trim(), quantity: e.quantity })),
				data?.phone ? undefined : payPhone.trim(),
			),
		onSuccess: (order) => {
			setPlaced(order);
			setError(null);
			window.scrollTo({ top: 0 });
		},
		onError: (e: Error) => setError(e.message),
	});

	const pay = useMutation({
		mutationFn: () => shopOrderService.pay(token, payPhone.trim() || undefined),
		onSuccess: (r) => {
			setPayMessage(r.message);
			setError(null);
		},
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
							{/expired/i.test(msg)
								? "This order link has expired. Wait for the next message or call your rep."
								: "This order link isn't valid. Wait for the next message or call your rep."}
						</p>
					</CardContent>
				</Card>
			</Shell>
		);
	}

	// ── Order placed ──
	if (placed) {
		return (
			<Shell distributor={data.distributorName}>
				<Card>
					<CardContent className="pt-6 space-y-4">
						<div className="text-center space-y-1">
							<Icon icon="lucide:circle-check" className="mx-auto h-12 w-12 text-emerald-600" />
							<p className="text-xl font-bold">Order imepokelewa!</p>
							<p className="text-sm text-slate-600">
								Order {placed.orderCode} has been sent to {data.distributorName}. They'll confirm and deliver.
							</p>
						</div>
						<div className="rounded-lg border divide-y">
							{placed.items.map((i) => (
								<div key={i.itemName} className="flex justify-between px-3 py-2 text-sm">
									<span>
										{i.quantity} × {i.itemName}
									</span>
									<span>{kes(i.lineTotal)}</span>
								</div>
							))}
							{placed.shopNote && <p className="px-3 py-2 text-xs text-slate-600">{placed.shopNote}</p>}
							<div className="flex justify-between px-3 py-2 font-bold">
								<span>Total</span>
								<span>{kes(placed.totalKes)}</span>
							</div>
						</div>

						{placed.totalKes > 0 && !payMessage && (
							<div className="space-y-2 rounded-lg bg-emerald-50 p-3">
								<p className="text-sm font-semibold">Lipa sasa na M-Pesa (optional)</p>
								<p className="text-xs text-slate-600">
									Or pay on delivery. We'll send the M-Pesa prompt to this number:
								</p>
								<Input
									inputMode="tel"
									value={payPhone}
									onChange={(e) => setPayPhone(e.target.value)}
									placeholder="0712345678"
								/>
								<Button className="w-full" onClick={() => pay.mutate()} disabled={pay.isPending}>
									{pay.isPending ? "Sending prompt…" : `Pay ${kes(placed.totalKes)} with M-Pesa`}
								</Button>
							</div>
						)}
						{payMessage && (
							<p className="rounded-lg bg-emerald-50 p-3 text-center text-sm font-medium text-emerald-800">
								{payMessage} — weka PIN yako.
							</p>
						)}
						{error && <p className="text-center text-sm text-red-600">{error}</p>}
					</CardContent>
				</Card>
				<p className="text-center text-xs text-slate-500">Coming soon: order faster on our app.</p>
			</Shell>
		);
	}

	// ── Ordering ──
	return (
		<Shell distributor={data.distributorName}>
			<div className="space-y-1">
				<p className="text-2xl font-bold">Hey {data.shopName} 👋</p>
				<p className="text-sm text-slate-600">
					Order from {data.distributorName}. Your usual is already filled in — change anything you like. Pay on delivery
					or with M-Pesa.
				</p>
			</div>

			<Input placeholder="Search products…" value={search} onChange={(e) => setSearch(e.target.value)} />

			<div className="space-y-2">
				{visible.map((c) => {
					const q = qty[c.itemCode] ?? 0;
					return (
						<div
							key={c.itemCode}
							className={`flex items-center gap-3 rounded-lg border bg-white p-3 ${!c.inStock ? "opacity-50" : ""}`}
						>
							<div className="min-w-0 flex-1">
								<p className="truncate font-medium">{c.itemName}</p>
								<div className="flex items-center gap-2 text-sm text-slate-600">
									{kes(c.price)}
									{usualCodes.has(c.itemCode) && <Badge variant="info">Your usual</Badge>}
									{!c.inStock && <Badge variant="destructive">Out of stock</Badge>}
								</div>
							</div>
							{c.inStock && (
								<div className="flex items-center gap-1">
									<Button
										size="icon"
										variant="outline"
										className="h-9 w-9"
										onClick={() => setItem(c.itemCode, q - 1)}
										disabled={q === 0}
										aria-label={`Less ${c.itemName}`}
									>
										−
									</Button>
									<Input
										inputMode="numeric"
										className="h-9 w-14 text-center"
										value={q === 0 ? "" : String(q)}
										placeholder="0"
										onChange={(e) => setItem(c.itemCode, Number(e.target.value.replace(/\D/g, "")) || 0)}
										aria-label={`Quantity of ${c.itemName}`}
									/>
									<Button
										size="icon"
										variant="outline"
										className="h-9 w-9"
										onClick={() => setItem(c.itemCode, q + 1)}
										aria-label={`More ${c.itemName}`}
									>
										+
									</Button>
								</div>
							)}
						</div>
					);
				})}
				{visible.length === 0 && <p className="py-6 text-center text-sm text-slate-500">No products match.</p>}
			</div>

			<Card>
				<CardContent className="pt-5 space-y-3">
					<p className="font-semibold">Unataka kitu hakiko kwa list?</p>
					<p className="text-xs text-slate-600">
						Add anything else you need. {data.distributorName} will confirm the price and availability.
					</p>
					{extras.map((e) => (
						<div key={e.id} className="flex gap-2">
							<Input
								placeholder="e.g. Guinness 500ml"
								value={e.name}
								maxLength={80}
								onChange={(ev) =>
									setExtras((prev) => prev.map((x) => (x.id === e.id ? { ...x, name: ev.target.value } : x)))
								}
							/>
							<Input
								inputMode="numeric"
								className="w-16 text-center"
								value={String(e.quantity)}
								onChange={(ev) =>
									setExtras((prev) =>
										prev.map((x) =>
											x.id === e.id ? { ...x, quantity: Number(ev.target.value.replace(/\D/g, "")) || 1 } : x,
										),
									)
								}
								aria-label="Quantity"
							/>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setExtras((prev) => prev.filter((x) => x.id !== e.id))}
								aria-label="Remove"
							>
								<Icon icon="lucide:x" className="h-4 w-4" />
							</Button>
						</div>
					))}
					<Button
						variant="outline"
						size="sm"
						onClick={() => setExtras((prev) => [...prev, { id: Date.now(), name: "", quantity: 1 }])}
						disabled={extras.length >= 20}
					>
						<Icon icon="lucide:plus" className="mr-1 h-4 w-4" />
						Add an item
					</Button>
				</CardContent>
			</Card>

			{!data.phone && (
				<Card>
					<CardContent className="pt-5 space-y-2">
						<p className="font-semibold">Your phone number</p>
						<p className="text-xs text-slate-600">So {data.distributorName} can confirm your order.</p>
						<Input
							inputMode="tel"
							placeholder="0712345678"
							value={payPhone}
							onChange={(e) => setPayPhone(e.target.value)}
						/>
					</CardContent>
				</Card>
			)}

			{error && <p className="text-center text-sm text-red-600">{error}</p>}

			{/* Sticky order bar */}
			<div className="sticky bottom-0 -mx-4 border-t bg-white/95 px-4 py-3 backdrop-blur">
				<div className="mx-auto flex max-w-xl items-center justify-between gap-3">
					<div>
						<p className="text-xs text-slate-500">{lineCount} item(s)</p>
						<p className="text-lg font-bold">{kes(total)}</p>
					</div>
					<Button size="lg" onClick={() => place.mutate()} disabled={place.isPending || lineCount === 0}>
						{place.isPending ? "Placing…" : "Place order"}
					</Button>
				</div>
			</div>
		</Shell>
	);
}

function Shell({ children, distributor }: { children: React.ReactNode; distributor?: string }) {
	return (
		<div className="min-h-screen bg-slate-50">
			<header className="border-b bg-white">
				<div className="mx-auto flex max-w-xl items-center gap-2 px-4 py-3">
					<Icon icon="lucide:shopping-basket" className="h-5 w-5 text-emerald-600" />
					<span className="font-semibold">{distributor ?? "Order"}</span>
					<span className="ml-auto text-xs text-slate-400">powered by TRIBE</span>
				</div>
			</header>
			<main className="mx-auto max-w-xl space-y-4 px-4 py-4">{children}</main>
		</div>
	);
}
