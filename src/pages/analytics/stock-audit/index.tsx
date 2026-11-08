// src/pages/analytics/stock-audit/index.tsx - Stock audit trail: how every product's stock moved (owner only)
import { useQuery } from "@tanstack/react-query";
import { message } from "antd";
import { useEffect, useMemo, useState } from "react";
import { useNavigate, useSearchParams } from "react-router";
import stockAuditService, {
	type AuditEvent,
	type AuditSummaryRow,
	type ItemTrail,
	type MovementKind,
} from "@/api/services/stockAuditService";
import { Icon } from "@/components/icon";
import { OwnerUnlock } from "@/components/stock/owner-unlock";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Input } from "@/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { isStockViewLockedError, useOwnerUnlock } from "@/utils/stock-visibility";

const KIND_BADGE: Record<
	MovementKind,
	{ label: string; variant: "success" | "info" | "warning" | "destructive" | "outline" }
> = {
	ADDED: { label: "Stock added", variant: "success" },
	SOLD: { label: "Sold", variant: "info" },
	DISPATCHED: { label: "Dispatched", variant: "info" },
	COUNT_CORRECTION: { label: "Count correction", variant: "warning" },
	CORRECTION: { label: "Other correction", variant: "destructive" },
	PRICE: { label: "Price change", variant: "outline" },
};

// ───────────────────────────── dates ─────────────────────────────

const iso = (d: Date) => {
	const y = d.getFullYear();
	const m = String(d.getMonth() + 1).padStart(2, "0");
	const day = String(d.getDate()).padStart(2, "0");
	return `${y}-${m}-${day}`;
};
const daysAgo = (n: number) => {
	const d = new Date();
	d.setDate(d.getDate() - n);
	return iso(d);
};
const PRESETS: Array<{ label: string; range: () => [string, string] }> = [
	{ label: "Today", range: () => [iso(new Date()), iso(new Date())] },
	{ label: "Last 7 days", range: () => [daysAgo(6), iso(new Date())] },
	{ label: "Last 30 days", range: () => [daysAgo(29), iso(new Date())] },
	{
		label: "This month",
		range: () => {
			const now = new Date();
			return [iso(new Date(now.getFullYear(), now.getMonth(), 1)), iso(now)];
		},
	},
];

const when = (value: string | null) =>
	value ? new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" }) : "—";

// ───────────────────────────── CSV download ─────────────────────────────

const csvCell = (v: unknown) => {
	const s = v === null || v === undefined ? "" : String(v);
	return /[",\n\r]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
};

/** Downloads rows as a CSV file that opens in Excel (UTF-8 with BOM). */
const downloadCsv = (fileName: string, header: string[], rows: unknown[][]) => {
	const text = [header, ...rows].map((r) => r.map(csvCell).join(",")).join("\r\n");
	const blob = new Blob(["﻿", text], { type: "text/csv;charset=utf-8" });
	const url = URL.createObjectURL(blob);
	const a = document.createElement("a");
	a.href = url;
	a.download = fileName;
	document.body.appendChild(a);
	a.click();
	a.remove();
	setTimeout(() => URL.revokeObjectURL(url), 1000);
};

const safeName = (s: string) => s.replace(/[^A-Za-z0-9-]+/g, "-").replace(/^-+|-+$/g, "") || "item";

// ───────────────────────────── small pieces ─────────────────────────────

function Units({ value, plain = false }: { value: number | null | undefined; plain?: boolean }) {
	if (value === null || value === undefined) return <span className="text-muted-foreground">—</span>;
	if (value === 0) return <span className="text-muted-foreground tabular-nums">0</span>;
	if (plain) return <span className="tabular-nums">{value.toLocaleString()}</span>;
	const tone = value > 0 ? "text-emerald-700 dark:text-emerald-400" : "text-red-600 dark:text-red-400";
	return (
		<span className={`font-medium tabular-nums ${tone}`}>
			{value > 0 ? "+" : "−"}
			{Math.abs(value).toLocaleString()}
		</span>
	);
}

function Stat({ label, value }: { label: string; value: number }) {
	return (
		<div className="rounded-lg border p-3">
			<div className="text-xs text-muted-foreground">{label}</div>
			<div className="text-xl font-bold">
				<Units value={value} />
			</div>
		</div>
	);
}

// ───────────────────────────── page ─────────────────────────────

export default function StockAuditTrailPage() {
	const navigate = useNavigate();
	const [params, setParams] = useSearchParams();
	const { unlocked, markUnlocked, relock } = useOwnerUnlock();

	const [from, setFrom] = useState(daysAgo(29));
	const [to, setTo] = useState(iso(new Date()));
	const [search, setSearch] = useState("");
	const selected = params.get("item");

	const openItem = (code: string | null) => {
		const next = new URLSearchParams(params);
		if (code) next.set("item", code);
		else next.delete("item");
		setParams(next);
	};

	const summaryQuery = useQuery({
		queryKey: ["stock-audit", "summary", from, to],
		queryFn: () => stockAuditService.summary(from, to),
		enabled: unlocked && !selected,
	});
	const itemQuery = useQuery({
		queryKey: ["stock-audit", "item", selected, from, to],
		queryFn: () => (selected ? stockAuditService.item(selected, from, to) : Promise.reject(new Error("No item"))),
		enabled: unlocked && !!selected,
	});

	const lockedError = [summaryQuery.error, itemQuery.error].find((e) => isStockViewLockedError(e));
	// The 30-minute unlock ran out while the page was open: ask for a new code
	useEffect(() => {
		if (lockedError && unlocked) relock();
	}, [lockedError, unlocked, relock]);

	const rows = useMemo(() => {
		const q = search.trim().toLowerCase();
		return (summaryQuery.data?.items ?? []).filter(
			(r) => !q || `${r.itemName} ${r.itemCode} ${r.category ?? ""}`.toLowerCase().includes(q),
		);
	}, [summaryQuery.data, search]);

	if (!unlocked) {
		return (
			<div className="p-4 md:p-8">
				<OwnerUnlock
					what="the stock audit trail"
					reason="The audit trail shows real stock quantities, so only the owner can open it."
					onUnlocked={markUnlocked}
					onCancel={() => navigate("/analytics/reconciliation")}
					cancelLabel="Back to reports"
				/>
			</div>
		);
	}

	const downloadSummary = () => {
		const data = summaryQuery.data;
		if (!data) return;
		downloadCsv(
			`stock-audit-${data.from}-to-${data.to}.csv`,
			[
				"Item",
				"Item code",
				"Category",
				"Stock added",
				"Sold",
				"Dispatched to shops",
				"Stock count corrections",
				"Other corrections",
				"Net change",
				"Stock now",
				"Movements",
				"Last movement",
			],
			rows.map((r) => [
				r.itemName,
				r.itemCode,
				r.category ?? "",
				r.added,
				r.sold,
				r.dispatched,
				r.countCorrections,
				r.otherCorrections,
				r.netChange,
				r.currentStock ?? "",
				r.movements,
				r.lastMovementAt ? when(r.lastMovementAt) : "",
			]),
		);
		message.success("Downloaded");
	};

	const downloadItem = (trail: ItemTrail) => {
		downloadCsv(
			`stock-audit-${safeName(trail.itemName)}-${trail.from}-to-${trail.to}.csv`,
			[
				"Date and time",
				"Movement",
				"What happened",
				"Units in/out",
				"Stock before",
				"Stock after",
				"By",
				"Reference",
				"Notes",
			],
			trail.events.map((e) => [
				when(e.at),
				e.kindLabel,
				e.description,
				e.change ?? "",
				e.stockBefore ?? "",
				e.stockAfter ?? "",
				e.by,
				e.reference ?? "",
				e.notes ?? "",
			]),
		);
		message.success("Downloaded");
	};

	const periodBar = (
		<div className="flex flex-wrap items-end gap-3">
			<div>
				<label htmlFor="audit-from" className="text-xs text-muted-foreground">
					From
				</label>
				<Input
					id="audit-from"
					type="date"
					value={from}
					max={to}
					onChange={(e) => e.target.value && setFrom(e.target.value)}
					className="h-9"
				/>
			</div>
			<div>
				<label htmlFor="audit-to" className="text-xs text-muted-foreground">
					To
				</label>
				<Input
					id="audit-to"
					type="date"
					value={to}
					min={from}
					max={iso(new Date())}
					onChange={(e) => e.target.value && setTo(e.target.value)}
					className="h-9"
				/>
			</div>
			<div className="flex flex-wrap gap-2">
				{PRESETS.map((p) => {
					const [f, t] = p.range();
					return (
						<Button
							key={p.label}
							size="sm"
							variant={f === from && t === to ? "default" : "outline"}
							onClick={() => {
								setFrom(f);
								setTo(t);
							}}
						>
							{p.label}
						</Button>
					);
				})}
			</div>
		</div>
	);

	return (
		<div className="space-y-6">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">Stock audit trail</h1>
					<p className="text-sm text-muted-foreground">
						Every unit in and out: stock added, sold, dispatched to shops, and corrections after stock counts. Pick a
						product to see its full history.
					</p>
				</div>
				<Button variant="outline" size="sm" onClick={relock}>
					<Icon icon="lucide:lock" className="mr-2 h-4 w-4" />
					Lock
				</Button>
			</div>

			<Card>
				<CardHeader>{periodBar}</CardHeader>
			</Card>

			{selected ? (
				<ItemView
					trail={itemQuery.data}
					loading={itemQuery.isLoading}
					error={itemQuery.error as Error | null}
					onBack={() => openItem(null)}
					onDownload={downloadItem}
				/>
			) : (
				<Card>
					<CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3 space-y-0">
						<Input
							id="audit-search"
							placeholder="Search product, code or category"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="max-w-xs"
						/>
						<Button variant="outline" onClick={downloadSummary} disabled={!summaryQuery.data || rows.length === 0}>
							<Icon icon="lucide:download" className="mr-2 h-4 w-4" />
							Download (Excel / CSV)
						</Button>
					</CardHeader>
					<CardContent>
						{summaryQuery.isLoading ? (
							<p className="py-8 text-center text-muted-foreground">Loading…</p>
						) : summaryQuery.isError && !lockedError ? (
							<p className="py-8 text-center text-destructive">{(summaryQuery.error as Error).message}</p>
						) : rows.length === 0 ? (
							<p className="py-8 text-center text-muted-foreground">No products match.</p>
						) : (
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Product</TableHead>
											<TableHead className="text-right">Added</TableHead>
											<TableHead className="text-right">Sold</TableHead>
											<TableHead className="text-right">Dispatched</TableHead>
											<TableHead className="text-right">Count corrections</TableHead>
											<TableHead className="text-right">Other corrections</TableHead>
											<TableHead className="text-right">Net change</TableHead>
											<TableHead className="text-right">Stock now</TableHead>
											<TableHead>Last movement</TableHead>
											<TableHead />
										</TableRow>
									</TableHeader>
									<TableBody>
										{rows.map((r: AuditSummaryRow) => (
											<TableRow
												key={r.itemCode}
												className="cursor-pointer hover:bg-muted/50"
												onClick={() => openItem(r.itemCode)}
											>
												<TableCell className="min-w-[180px]">
													<div className="font-medium">{r.itemName}</div>
													<div className="text-xs text-muted-foreground">
														{r.itemCode}
														{r.category ? ` · ${r.category}` : ""}
													</div>
												</TableCell>
												<TableCell className="text-right">
													<Units value={r.added} />
												</TableCell>
												<TableCell className="text-right">
													<Units value={r.sold} />
												</TableCell>
												<TableCell className="text-right">
													<Units value={r.dispatched} />
												</TableCell>
												<TableCell className="text-right">
													<Units value={r.countCorrections} />
												</TableCell>
												<TableCell className="text-right">
													<Units value={r.otherCorrections} />
												</TableCell>
												<TableCell className="text-right">
													<Units value={r.netChange} />
												</TableCell>
												<TableCell className="text-right">
													<Units value={r.currentStock} plain />
												</TableCell>
												<TableCell className="whitespace-nowrap text-xs">{when(r.lastMovementAt)}</TableCell>
												<TableCell className="text-right">
													<Button
														variant="ghost"
														size="sm"
														onClick={(e) => {
															e.stopPropagation();
															openItem(r.itemCode);
														}}
													>
														View trail
													</Button>
												</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</div>
						)}
					</CardContent>
				</Card>
			)}
		</div>
	);
}

function ItemView({
	trail,
	loading,
	error,
	onBack,
	onDownload,
}: {
	trail: ItemTrail | undefined;
	loading: boolean;
	error: Error | null;
	onBack: () => void;
	onDownload: (t: ItemTrail) => void;
}) {
	const totals = useMemo(() => {
		const t = { added: 0, sold: 0, dispatched: 0, count: 0, other: 0 };
		for (const e of trail?.events ?? []) {
			const c = e.change ?? 0;
			if (e.kind === "ADDED") t.added += c;
			else if (e.kind === "SOLD") t.sold += c;
			else if (e.kind === "DISPATCHED") t.dispatched += c;
			else if (e.kind === "COUNT_CORRECTION") t.count += c;
			else if (e.kind === "CORRECTION") t.other += c;
		}
		return t;
	}, [trail]);

	return (
		<Card>
			<CardHeader className="space-y-4">
				<div className="flex flex-wrap items-start justify-between gap-3">
					<div className="space-y-1">
						<Button variant="ghost" size="sm" className="-ml-2" onClick={onBack}>
							<Icon icon="lucide:arrow-left" className="mr-2 h-4 w-4" />
							All products
						</Button>
						<h2 className="text-xl font-bold">{trail?.itemName ?? "Loading…"}</h2>
						{trail && (
							<p className="text-sm text-muted-foreground">
								{trail.itemCode} · Stock now: <strong className="text-foreground">{trail.currentStock ?? "—"}</strong>
							</p>
						)}
					</div>
					<Button
						variant="outline"
						onClick={() => trail && onDownload(trail)}
						disabled={!trail || trail.events.length === 0}
					>
						<Icon icon="lucide:download" className="mr-2 h-4 w-4" />
						Download this product
					</Button>
				</div>
				{trail && (
					<div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
						<Stat label="Stock added" value={totals.added} />
						<Stat label="Sold" value={totals.sold} />
						<Stat label="Dispatched" value={totals.dispatched} />
						<Stat label="Count corrections" value={totals.count} />
						<Stat label="Other corrections" value={totals.other} />
					</div>
				)}
			</CardHeader>
			<CardContent>
				{loading ? (
					<p className="py-8 text-center text-muted-foreground">Loading…</p>
				) : error ? (
					<p className="py-8 text-center text-destructive">{error.message}</p>
				) : !trail || trail.events.length === 0 ? (
					<p className="py-8 text-center text-muted-foreground">No movements for this product in the period.</p>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date and time</TableHead>
									<TableHead>Movement</TableHead>
									<TableHead className="text-right">In / out</TableHead>
									<TableHead className="text-right">Stock before → after</TableHead>
									<TableHead>By</TableHead>
									<TableHead>Reference / note</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{trail.events.map((e: AuditEvent, i: number) => (
									<TableRow key={`${e.at}-${i}`}>
										<TableCell className="whitespace-nowrap text-xs">{when(e.at)}</TableCell>
										<TableCell className="min-w-[200px]">
											<Badge variant={KIND_BADGE[e.kind].variant}>{KIND_BADGE[e.kind].label}</Badge>
											<div className="mt-1 text-sm">{e.description}</div>
										</TableCell>
										<TableCell className="text-right">
											<Units value={e.change} />
										</TableCell>
										<TableCell className="whitespace-nowrap text-right tabular-nums">
											{e.stockBefore === null && e.stockAfter === null
												? "—"
												: `${e.stockBefore ?? "?"} → ${e.stockAfter ?? "?"}`}
										</TableCell>
										<TableCell className="text-sm">{e.by}</TableCell>
										<TableCell className="max-w-[280px] text-xs text-muted-foreground">
											{[e.reference, e.notes].filter(Boolean).join(" · ") || "—"}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}
