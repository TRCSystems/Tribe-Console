// src/pages/inventory/prices/index.tsx - Unit cost, selling price and wholesale price for every item (owner only)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import pricesService, { type PriceChangeEntry, type PriceRow, type PriceUpdate } from "@/api/services/pricesService";
import { Icon } from "@/components/icon";
import { OwnerUnlock } from "@/components/stock/owner-unlock";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardHeader } from "@/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { isStockViewLockedError, useOwnerUnlock } from "@/utils/stock-visibility";

type Field = "unitCost" | "unitPrice" | "wholesalePrice";
/** Typed but unsaved values, per item id. Empty string = cleared. */
type Drafts = Record<number, Partial<Record<Field, string>>>;
type Filter = "ALL" | "NO_WHOLESALE" | "BELOW_COST" | "NO_COST";

const FILTERS: Array<{ key: Filter; label: string }> = [
	{ key: "ALL", label: "All items" },
	{ key: "NO_WHOLESALE", label: "No wholesale price" },
	{ key: "BELOW_COST", label: "Priced below cost" },
	{ key: "NO_COST", label: "No unit cost" },
];

const FIELD_LABEL: Record<PriceChangeEntry["field"], string> = {
	UNIT_COST: "Unit cost",
	UNIT_PRICE: "Selling price",
	WHOLESALE_PRICE: "Wholesale price",
};

const kes = (v: number | null | undefined) =>
	v === null || v === undefined ? "—" : `KES ${Number(v).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;

const parse = (text: string | undefined): number | null => {
	if (text === undefined || text.trim() === "") return null;
	const v = Number(text);
	return Number.isFinite(v) ? v : Number.NaN;
};

const margin = (price: number | null, cost: number | null): number | null =>
	price === null || cost === null || Number.isNaN(price) || Number.isNaN(cost) || price <= 0 || cost <= 0
		? null
		: ((price - cost) / price) * 100;

function MarginCell({ pct }: { pct: number | null }) {
	if (pct === null) return <span className="text-muted-foreground">—</span>;
	const tone =
		pct < 0
			? "text-red-600 dark:text-red-400"
			: pct < 5
				? "text-amber-600 dark:text-amber-400"
				: "text-emerald-700 dark:text-emerald-400";
	return <span className={`font-medium tabular-nums ${tone}`}>{pct.toFixed(1)}%</span>;
}

export default function PricesPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { unlocked, markUnlocked, relock } = useOwnerUnlock();

	const [search, setSearch] = useState("");
	const [filter, setFilter] = useState<Filter>("ALL");
	const [drafts, setDrafts] = useState<Drafts>({});
	const [markup, setMarkup] = useState("10");
	const [historyFor, setHistoryFor] = useState<PriceRow | null>(null);

	const pricesQuery = useQuery({
		queryKey: ["prices"],
		queryFn: () => pricesService.list(),
		enabled: unlocked,
	});
	const rows = pricesQuery.data ?? [];

	const historyQuery = useQuery({
		queryKey: ["prices", "history", historyFor?.id],
		queryFn: () => (historyFor ? pricesService.history(historyFor.id) : Promise.resolve([])),
		enabled: unlocked && !!historyFor,
	});

	// Effective value of a cell: the typed draft if any, else the saved value
	const value = (row: PriceRow, field: Field): number | null => {
		const d = drafts[row.id]?.[field];
		return d === undefined ? (row[field] ?? null) : parse(d);
	};
	const text = (row: PriceRow, field: Field): string => {
		const d = drafts[row.id]?.[field];
		if (d !== undefined) return d;
		const v = row[field];
		return v === null || v === undefined ? "" : String(v);
	};
	const setDraft = (row: PriceRow, field: Field, v: string) =>
		setDrafts((prev) => ({ ...prev, [row.id]: { ...prev[row.id], [field]: v } }));

	// Turn drafts into updates, skipping cells that ended up equal to what is saved
	const { updates, errors } = useMemo(() => {
		const out: PriceUpdate[] = [];
		const errs: string[] = [];
		for (const row of rows) {
			const d = drafts[row.id];
			if (!d) continue;
			const u: PriceUpdate = { id: row.id };
			let changed = false;
			for (const field of ["unitCost", "unitPrice", "wholesalePrice"] as Field[]) {
				if (d[field] === undefined) continue;
				const v = parse(d[field]);
				const saved = row[field] ?? null;
				if (v === null) {
					if (field === "wholesalePrice" && saved !== null) {
						u.clearWholesalePrice = true;
						changed = true;
					} else if (field !== "wholesalePrice" && saved !== null) {
						errs.push(`${row.itemName}: ${field === "unitCost" ? "unit cost" : "selling price"} can't be empty`);
					}
					continue;
				}
				if (Number.isNaN(v) || v < 0 || (field === "wholesalePrice" && v === 0)) {
					errs.push(
						`${row.itemName}: check the ${field === "wholesalePrice" ? "wholesale price" : field === "unitCost" ? "unit cost" : "selling price"}`,
					);
					continue;
				}
				if (saved !== null && Math.abs(v - saved) < 0.005) continue;
				u[field] = v;
				changed = true;
			}
			if (changed) out.push(u);
		}
		return { updates: out, errors: errs };
	}, [drafts, rows]);

	const save = useMutation({
		mutationFn: () => pricesService.update(updates),
		onSuccess: (res) => {
			message.success(res.message);
			setDrafts({});
			queryClient.invalidateQueries({ queryKey: ["prices"] });
			queryClient.invalidateQueries({ queryKey: ["inventory"] });
		},
		onError: (err: Error) => {
			if (isStockViewLockedError(err)) {
				message.warning("Your 30 minutes are up. Unlock again — your typed prices are kept.");
				relock();
				return;
			}
			message.error(err.message);
		},
	});

	const counts = useMemo(() => {
		let noWholesale = 0;
		let belowCost = 0;
		let noCost = 0;
		for (const r of rows) {
			if (r.wholesalePrice === null) noWholesale++;
			if (r.unitCost === null || r.unitCost <= 0) noCost++;
			if ((r.retailMarginPct ?? 0) < 0 || (r.wholesaleMarginPct ?? 0) < 0) belowCost++;
		}
		return { noWholesale, belowCost, noCost };
	}, [rows]);

	const visible = useMemo(() => {
		const q = search.trim().toLowerCase();
		return rows.filter((r) => {
			if (q && !`${r.itemName} ${r.itemCode} ${r.category ?? ""}`.toLowerCase().includes(q)) return false;
			if (filter === "NO_WHOLESALE") return r.wholesalePrice === null;
			if (filter === "NO_COST") return r.unitCost === null || r.unitCost <= 0;
			if (filter === "BELOW_COST") return (r.retailMarginPct ?? 0) < 0 || (r.wholesaleMarginPct ?? 0) < 0;
			return true;
		});
	}, [rows, search, filter]);

	/** Fills empty wholesale prices on the visible rows with unit cost + markup. Nothing is saved until Save. */
	const fillWholesale = () => {
		const pct = Number(markup);
		if (!Number.isFinite(pct) || pct < 0 || pct > 500) {
			message.warning("Enter a markup between 0 and 500%");
			return;
		}
		let filled = 0;
		setDrafts((prev) => {
			const next = { ...prev };
			for (const r of visible) {
				const cost = value(r, "unitCost");
				const current = value(r, "wholesalePrice");
				if (current !== null || cost === null || Number.isNaN(cost) || cost <= 0) continue;
				next[r.id] = { ...next[r.id], wholesalePrice: (Math.ceil(cost * (1 + pct / 100) * 100) / 100).toFixed(2) };
				filled++;
			}
			return next;
		});
		message.info(
			filled > 0
				? `Filled ${filled} wholesale price${filled === 1 ? "" : "s"}. Check them, then save.`
				: "No visible items have a unit cost and an empty wholesale price.",
		);
	};

	if (!unlocked) {
		return (
			<div className="p-4 md:p-8">
				<OwnerUnlock
					what="Prices"
					reason="Prices shows what you pay for each item and your margins, so only the owner can open it."
					onUnlocked={markUnlocked}
					onCancel={() => navigate("/inventory/stock")}
					cancelLabel="Back to Stock"
				/>
			</div>
		);
	}

	const changedCount = updates.length;
	const cellInput = (row: PriceRow, field: Field, placeholder: string) => {
		const draft = drafts[row.id]?.[field];
		const saved = row[field] === null || row[field] === undefined ? "" : String(row[field]);
		const dirty = draft !== undefined && draft !== saved;
		const v = value(row, field);
		const bad = v !== null && (Number.isNaN(v) || v < 0 || (field === "wholesalePrice" && v === 0));
		return (
			<Input
				id={`price-${row.id}-${field}`}
				aria-label={`${row.itemName} ${field === "unitCost" ? "unit cost" : field === "unitPrice" ? "selling price" : "wholesale price"}`}
				type="number"
				inputMode="decimal"
				min="0"
				step="0.01"
				value={text(row, field)}
				placeholder={placeholder}
				onChange={(e) => setDraft(row, field, e.target.value)}
				className={`h-9 w-28 text-right tabular-nums ${bad ? "border-red-500" : dirty ? "border-amber-500 bg-amber-50 dark:bg-amber-950/30" : ""}`}
			/>
		);
	};

	return (
		<div className="space-y-6 pb-28">
			<div className="flex flex-wrap items-start justify-between gap-4">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">Prices</h1>
					<p className="text-sm text-muted-foreground">
						Unit cost, selling price and wholesale price for every item. Shops can only order items that have a
						wholesale price. Every change is recorded.
					</p>
				</div>
				<Button
					variant="outline"
					size="sm"
					onClick={() => {
						relock();
						navigate("/inventory/stock");
					}}
				>
					<Icon icon="lucide:lock" className="mr-2 h-4 w-4" />
					Lock
				</Button>
			</div>

			<div className="grid gap-3 sm:grid-cols-3">
				{[
					{
						key: "NO_WHOLESALE" as Filter,
						n: counts.noWholesale,
						label: "No wholesale price",
						hint: "Shops can't order these",
					},
					{
						key: "BELOW_COST" as Filter,
						n: counts.belowCost,
						label: "Priced below cost",
						hint: "Selling or wholesale under cost",
					},
					{ key: "NO_COST" as Filter, n: counts.noCost, label: "No unit cost", hint: "Margins can't be worked out" },
				].map((c) => (
					<button
						type="button"
						key={c.key}
						onClick={() => setFilter(filter === c.key ? "ALL" : c.key)}
						className={`rounded-lg border p-4 text-left transition-colors hover:bg-muted ${filter === c.key ? "border-primary ring-1 ring-primary" : ""}`}
					>
						<div className="text-2xl font-bold tabular-nums">{pricesQuery.isLoading ? "…" : c.n}</div>
						<div className="font-medium">{c.label}</div>
						<div className="text-xs text-muted-foreground">{c.hint}</div>
					</button>
				))}
			</div>

			<Card>
				<CardHeader className="gap-4">
					<div className="flex flex-wrap items-center gap-3">
						<Input
							id="prices-search"
							placeholder="Search item, code or category"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="max-w-xs"
						/>
						<div className="flex flex-wrap gap-2">
							{FILTERS.map((f) => (
								<Button
									key={f.key}
									size="sm"
									variant={filter === f.key ? "default" : "outline"}
									onClick={() => setFilter(f.key)}
								>
									{f.label}
								</Button>
							))}
						</div>
					</div>
					<div className="flex flex-wrap items-center gap-2 rounded-md bg-muted/50 p-3 text-sm">
						<span>Fill empty wholesale prices on the items shown with unit cost +</span>
						<Input
							id="prices-markup"
							type="number"
							inputMode="decimal"
							min="0"
							max="500"
							value={markup}
							onChange={(e) => setMarkup(e.target.value)}
							className="h-8 w-20 text-right"
							aria-label="Markup percent"
						/>
						<span>%</span>
						<Button size="sm" variant="secondary" onClick={fillWholesale}>
							Fill
						</Button>
						<span className="text-xs text-muted-foreground">Nothing is saved until you press Save.</span>
					</div>
				</CardHeader>
				<CardContent>
					{pricesQuery.isLoading ? (
						<p className="py-8 text-center text-muted-foreground">Loading prices…</p>
					) : pricesQuery.isError ? (
						<p className="py-8 text-center text-destructive">{(pricesQuery.error as Error).message}</p>
					) : visible.length === 0 ? (
						<p className="py-8 text-center text-muted-foreground">No items match.</p>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Item</TableHead>
										<TableHead className="text-right">Unit cost</TableHead>
										<TableHead className="text-right">Selling price</TableHead>
										<TableHead className="text-right">Margin</TableHead>
										<TableHead className="text-right">Wholesale price</TableHead>
										<TableHead className="text-right">Margin</TableHead>
										<TableHead />
									</TableRow>
								</TableHeader>
								<TableBody>
									{visible.map((row) => {
										const cost = value(row, "unitCost");
										return (
											<TableRow key={row.id}>
												<TableCell className="min-w-[180px]">
													<div className="font-medium">{row.itemName}</div>
													<div className="text-xs text-muted-foreground">
														{row.itemCode}
														{row.category ? ` · ${row.category}` : ""}
													</div>
												</TableCell>
												<TableCell className="text-right">{cellInput(row, "unitCost", "Cost")}</TableCell>
												<TableCell className="text-right">{cellInput(row, "unitPrice", "Price")}</TableCell>
												<TableCell className="text-right">
													<MarginCell pct={margin(value(row, "unitPrice"), cost)} />
												</TableCell>
												<TableCell className="text-right">
													{cellInput(row, "wholesalePrice", "Not sold")}
													{row.wholesalePrice === null && drafts[row.id]?.wholesalePrice === undefined && (
														<Badge variant="outline" className="mt-1">
															Not offered
														</Badge>
													)}
												</TableCell>
												<TableCell className="text-right">
													<MarginCell pct={margin(value(row, "wholesalePrice"), cost)} />
												</TableCell>
												<TableCell className="text-right">
													<Button
														variant="ghost"
														size="sm"
														onClick={() => setHistoryFor(row)}
														aria-label={`Price history for ${row.itemName}`}
													>
														<Icon icon="lucide:history" className="h-4 w-4" />
													</Button>
												</TableCell>
											</TableRow>
										);
									})}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>

			{(changedCount > 0 || errors.length > 0) && (
				<div
					className="fixed inset-x-0 bottom-0 z-40 border-t bg-background/95 p-4 backdrop-blur"
					style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom, 0px))" }}
				>
					<div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
						<div className="text-sm">
							{errors.length > 0 ? (
								<span className="text-red-600 dark:text-red-400">
									{errors[0]}
									{errors.length > 1 ? ` (+${errors.length - 1} more)` : ""}
								</span>
							) : (
								<span>
									{changedCount} item{changedCount === 1 ? "" : "s"} changed
								</span>
							)}
						</div>
						<div className="flex gap-2">
							<Button variant="outline" onClick={() => setDrafts({})} disabled={save.isPending}>
								Discard
							</Button>
							<Button
								onClick={() => save.mutate()}
								disabled={save.isPending || errors.length > 0 || changedCount === 0}
							>
								{save.isPending ? "Saving…" : `Save ${changedCount} change${changedCount === 1 ? "" : "s"}`}
							</Button>
						</div>
					</div>
				</div>
			)}

			<Dialog open={!!historyFor} onOpenChange={(o) => !o && setHistoryFor(null)}>
				<DialogContent className="max-w-lg">
					<DialogHeader>
						<DialogTitle>Price history</DialogTitle>
						<DialogDescription>{historyFor?.itemName}</DialogDescription>
					</DialogHeader>
					{historyQuery.isLoading ? (
						<p className="text-sm text-muted-foreground">Loading…</p>
					) : (historyQuery.data ?? []).length === 0 ? (
						<p className="text-sm text-muted-foreground">
							No price changes recorded yet. Changes made from now on show here.
						</p>
					) : (
						<div className="max-h-[60vh] overflow-y-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>When</TableHead>
										<TableHead>What</TableHead>
										<TableHead className="text-right">From</TableHead>
										<TableHead className="text-right">To</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{(historyQuery.data ?? []).map((h, i) => (
										<TableRow key={`${h.changedAt}-${i}`}>
											<TableCell className="whitespace-nowrap text-xs">
												{new Date(h.changedAt).toLocaleString()}
											</TableCell>
											<TableCell>{FIELD_LABEL[h.field]}</TableCell>
											<TableCell className="text-right tabular-nums">{kes(h.oldValue)}</TableCell>
											<TableCell className="text-right tabular-nums">
												{h.newValue === null ? "Removed" : kes(h.newValue)}
											</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</DialogContent>
			</Dialog>
		</div>
	);
}
