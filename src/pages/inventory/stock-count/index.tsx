// src/pages/inventory/stock-count/index.tsx - End-of-day blind stock count
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useMemo, useState } from "react";
import { useNavigate } from "react-router";
import stockCountService, {
	type BlindCountLine,
	type CountSession,
	type FullCountLine,
	type Movement,
} from "@/api/services/stockCountService";
import { Icon } from "@/components/icon";
import { ReportRecipientsCard } from "@/components/stock/report-recipients-card";
import { UserRoleIndicator } from "@/components/user-role-indicator";
import { useMerchantId } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Progress } from "@/ui/progress";
import { Textarea } from "@/ui/textarea";
import { useCanViewStockCountResults } from "@/utils/stock-visibility";

/** One row in the count list, normalised from either the blind or the full view. */
interface CountRow {
	lineId: number;
	rank: number;
	itemName: string;
	itemCode: string;
	state: "TO_COUNT" | "RECOUNT" | "DONE" | "NOT_COUNTED";
	movement: Movement;
	/** Owner/admin only — never present for attendants. */
	full?: FullCountLine;
}

const MOVEMENT_BADGE: Record<Movement, { label: string; variant: "info" | "success" | "outline" }> = {
	SOLD: { label: "Sold today", variant: "info" },
	RECEIVED: { label: "Received today", variant: "success" },
	SPOT_CHECK: { label: "Not moved", variant: "outline" },
};

const toRow = (line: BlindCountLine | FullCountLine): CountRow => {
	if ("expectedQuantity" in line) {
		const state =
			line.status === "PENDING"
				? "TO_COUNT"
				: line.status === "RECOUNT_REQUESTED"
					? "RECOUNT"
					: line.status === "NOT_COUNTED"
						? "NOT_COUNTED"
						: "DONE";
		return {
			lineId: line.lineId,
			rank: line.rank,
			itemName: line.itemName,
			itemCode: line.itemCode,
			state,
			movement: line.trigger !== "MOVEMENT_BASED" ? "SPOT_CHECK" : (line.unitsSoldToday ?? 0) > 0 ? "SOLD" : "RECEIVED",
			full: line,
		};
	}
	return {
		lineId: line.lineId,
		rank: line.rank,
		itemName: line.itemName,
		itemCode: line.itemCode,
		state: line.status,
		movement: line.movement ?? "SPOT_CHECK",
	};
};

type Filter = "open" | "done" | "all";

export default function StockCountPage() {
	const merchantId = useMerchantId();
	const navigate = useNavigate();
	const queryClient = useQueryClient();

	const [counts, setCounts] = useState<Record<number, string>>({});
	const [filterChoice, setFilter] = useState<Filter | null>(null);
	const [search, setSearch] = useState("");
	const [finalizeOpen, setFinalizeOpen] = useState(false);
	const [finalizeNote, setFinalizeNote] = useState("");

	const {
		data: session,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["stock-count", "current", merchantId],
		queryFn: () => stockCountService.current(),
		enabled: !!merchantId,
	});

	// Before the count starts, show what moved today so staff know what's coming (no quantities)
	const { data: movedToday } = useQuery({
		queryKey: ["stock-count", "moved-today", merchantId],
		queryFn: () => stockCountService.movedToday(),
		enabled: !!merchantId && !isLoading && !session,
	});

	const setSession = (next: CountSession | null) =>
		queryClient.setQueryData(["stock-count", "current", merchantId], next);

	const startMutation = useMutation({
		mutationFn: () => stockCountService.start(),
		onSuccess: (data) => {
			setSession(data);
			message.success("Stock count started — count the items in the order shown");
		},
		onError: (err: Error) => message.error(err.message),
	});

	const countMutation = useMutation({
		mutationFn: ({ lineId, quantity }: { lineId: number; quantity: number }) =>
			stockCountService.submitCount(lineId, quantity),
		onSuccess: (result, { lineId }) => {
			setCounts((prev) => ({ ...prev, [lineId]: "" }));
			if (result.result === "RECOUNT") {
				message.warning(result.message);
				focusLine(lineId);
			} else {
				message.success(`${result.line.itemName} counted`);
				focusNext(lineId);
			}
			refetch();
		},
		onError: (err: Error) => {
			message.error(err.message);
			refetch();
		},
	});

	// Owner can send the 9 PM "time to count" SMS at any time (also handy for testing)
	const remindMutation = useMutation({
		mutationFn: () => stockCountService.remindNow(),
		onSuccess: (result) => {
			message.success(result.message);
			refetch();
		},
		onError: (err: Error) => message.error(err.message),
	});

	const finalizeMutation = useMutation({
		mutationFn: () => stockCountService.finalize(finalizeNote.trim() || undefined),
		onSuccess: () => {
			setFinalizeOpen(false);
			setFinalizeNote("");
			message.success("Stock count finalized. The owner has been sent the summary.");
			refetch();
		},
		onError: (err: Error) => message.error(err.message),
	});

	const rows: CountRow[] = useMemo(() => {
		if (!session) return [];
		const lines = session.lines as Array<BlindCountLine | FullCountLine>;
		return lines.map(toRow).sort((a, b) => a.rank - b.rank);
	}, [session]);

	// Counting is blind for everyone; owners open the discrepancy report (SMS-verified) for system figures
	const isOwnerView = useCanViewStockCountResults();
	const isClosed = session?.status === "CLOSED" || session?.status === "CLOSED_WITH_EXCEPTION";
	const doneCount = rows.filter((r) => r.state === "DONE").length;
	const remaining = rows.filter((r) => r.state === "TO_COUNT" || r.state === "RECOUNT");
	const recountCount = rows.filter((r) => r.state === "RECOUNT").length;
	const progress = rows.length ? Math.round((doneCount / rows.length) * 100) : 0;
	// While counting show what is left; once finalized show everything
	const filter: Filter = filterChoice ?? (isClosed ? "all" : "open");

	const visibleRows = rows.filter((r) => {
		if (search && !r.itemName.toLowerCase().includes(search.toLowerCase())) return false;
		if (filter === "open") return r.state === "TO_COUNT" || r.state === "RECOUNT";
		if (filter === "done") return r.state === "DONE" || r.state === "NOT_COUNTED";
		return true;
	});

	function focusNext(afterLineId: number) {
		const open = rows.filter((r) => (r.state === "TO_COUNT" || r.state === "RECOUNT") && r.lineId !== afterLineId);
		const current = rows.find((r) => r.lineId === afterLineId);
		const next = open.find((r) => current && r.rank > current.rank) ?? open[0];
		if (next) focusLine(next.lineId);
	}

	function focusLine(lineId: number) {
		setTimeout(() => document.getElementById(`count-line-${lineId}`)?.focus(), 50);
	}

	const submit = (row: CountRow) => {
		const raw = (counts[row.lineId] ?? "").trim();
		if (raw === "" || !/^\d+$/.test(raw)) {
			message.warning("Enter the number of units you counted (0 or more)");
			return;
		}
		countMutation.mutate({ lineId: row.lineId, quantity: Number(raw) });
	};

	// ───────────────────────────── render ─────────────────────────────

	if (!merchantId) {
		return (
			<div className="p-6">
				<Card>
					<CardContent className="py-10 text-center text-muted-foreground">
						Your account is not linked to a shop, so there is nothing to count.
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">End-of-day stock count</h1>
					<p className="text-sm text-muted-foreground">
						Count what is physically on the shelf. Fastest-selling items come first.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<UserRoleIndicator />
					{isOwnerView && !isClosed && (
						<Button variant="outline" onClick={() => remindMutation.mutate()} disabled={remindMutation.isPending}>
							<Icon
								icon={remindMutation.isPending ? "eos-icons:loading" : "lucide:message-square"}
								className="mr-2 h-4 w-4"
							/>
							Send count reminder
						</Button>
					)}
					{isOwnerView && (
						<Button variant="outline" onClick={() => navigate("/analytics/stock-discrepancies")}>
							<Icon icon="lucide:file-warning" className="mr-2 h-4 w-4" />
							Discrepancy report
						</Button>
					)}
				</div>
			</div>

			{isLoading ? (
				<Card>
					<CardContent className="py-12 text-center">
						<Icon icon="eos-icons:loading" className="mx-auto mb-3 h-8 w-8" />
						<p className="text-muted-foreground">Loading today's count…</p>
					</CardContent>
				</Card>
			) : error ? (
				<Card>
					<CardContent className="py-10 text-center space-y-3">
						<p className="text-destructive">{(error as Error).message}</p>
						<Button variant="outline" onClick={() => refetch()}>
							Try again
						</Button>
					</CardContent>
				</Card>
			) : !session ? (
				<Card>
					<CardHeader>
						<CardTitle>No count started today</CardTitle>
						<CardDescription>
							Start the count at the end of the day. You will get a list of items to count — enter what you physically
							see. If a figure does not match, you will be asked to count that item again.
						</CardDescription>
					</CardHeader>
					<CardContent className="space-y-4">
						{movedToday && movedToday.count > 0 ? (
							<div className="space-y-2">
								<p className="text-sm font-medium">
									{movedToday.count} item{movedToday.count === 1 ? "" : "s"} moved today — these are counted first:
								</p>
								<div className="flex flex-wrap gap-2">
									{movedToday.items.map((item) => (
										<span
											key={item.itemCode}
											className="inline-flex items-center gap-2 rounded-md border px-2 py-1 text-sm"
										>
											{item.itemName}
											<Badge variant={MOVEMENT_BADGE[item.movement].variant}>
												{MOVEMENT_BADGE[item.movement].label}
											</Badge>
										</span>
									))}
								</div>
								<p className="text-xs text-muted-foreground">Every other item is on the list too, after these.</p>
							</div>
						) : movedToday ? (
							<p className="text-sm text-muted-foreground">
								Nothing has moved today. The count lists every item, longest without a count first.
							</p>
						) : null}
						<Button size="lg" onClick={() => startMutation.mutate()} disabled={startMutation.isPending}>
							<Icon
								icon={startMutation.isPending ? "eos-icons:loading" : "lucide:clipboard-list"}
								className="mr-2 h-5 w-5"
							/>
							{startMutation.isPending ? "Preparing list…" : "Start stock count"}
						</Button>
					</CardContent>
				</Card>
			) : (
				<>
					<Card>
						<CardContent className="pt-6 space-y-4">
							<div className="flex flex-wrap items-center gap-3">
								<Badge variant={isClosed ? (session.status === "CLOSED" ? "success" : "warning") : "info"}>
									{isClosed ? (session.status === "CLOSED" ? "Finalized" : "Finalized with issues") : "Counting"}
								</Badge>
								<span className="text-sm text-muted-foreground">{session.tradingDate}</span>
								<span className="text-sm font-medium">
									{doneCount} of {rows.length} items counted
								</span>
								{recountCount > 0 && <Badge variant="warning">{recountCount} to recount</Badge>}
							</div>
							<Progress value={progress} />
							{!isClosed && (
								<div className="flex flex-wrap gap-2">
									<Button
										variant={remaining.length === 0 ? "default" : "outline"}
										onClick={() => setFinalizeOpen(true)}
										disabled={finalizeMutation.isPending}
									>
										<Icon icon="lucide:lock" className="mr-2 h-4 w-4" />
										Finish count
									</Button>
								</div>
							)}
							{isClosed && isOwnerView && (
								<Button onClick={() => navigate(`/analytics/stock-discrepancies?date=${session.tradingDate}`)}>
									View discrepancy report
								</Button>
							)}
						</CardContent>
					</Card>

					<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
						<div className="flex gap-2">
							{(
								[
									["open", `To count (${remaining.length})`],
									["done", `Done (${rows.length - remaining.length})`],
									["all", "All"],
								] as const
							).map(([key, label]) => (
								<Button
									key={key}
									size="sm"
									variant={filter === key ? "default" : "outline"}
									onClick={() => setFilter(key)}
								>
									{label}
								</Button>
							))}
						</div>
						<Input
							placeholder="Search item…"
							value={search}
							onChange={(e) => setSearch(e.target.value)}
							className="md:max-w-xs"
						/>
					</div>

					{visibleRows.length === 0 ? (
						<Card>
							<CardContent className="py-10 text-center text-muted-foreground">
								{filter === "open" && !isClosed
									? "All items counted. Press “Finish count” to close."
									: "Nothing to show."}
							</CardContent>
						</Card>
					) : (
						<div className="space-y-6">
							{(
								[
									["Moved today — count these first", visibleRows.filter((r) => r.movement !== "SPOT_CHECK")],
									["Not moved since last count", visibleRows.filter((r) => r.movement === "SPOT_CHECK")],
								] as const
							).map(([heading, sectionRows]) =>
								sectionRows.length === 0 ? null : (
									<div key={heading} className="space-y-2">
										<h2 className="text-sm font-semibold text-muted-foreground">
											{heading} ({sectionRows.length})
										</h2>
										{sectionRows.map((row) => (
											<CountRowCard
												key={row.lineId}
												row={row}
												value={counts[row.lineId] ?? ""}
												onChange={(v) => setCounts((prev) => ({ ...prev, [row.lineId]: v }))}
												onSubmit={() => submit(row)}
												submitting={countMutation.isPending && countMutation.variables?.lineId === row.lineId}
												disabled={isClosed}
											/>
										))}
									</div>
								),
							)}
						</div>
					)}
				</>
			)}

			{/* Owners choose which phones get the end-of-day report and shortage alerts */}
			{isOwnerView && <ReportRecipientsCard />}

			<Dialog open={finalizeOpen} onOpenChange={setFinalizeOpen}>
				<DialogContent>
					<DialogHeader>
						<DialogTitle>Finish today's count?</DialogTitle>
						<DialogDescription>
							{remaining.length > 0
								? `${remaining.length} item(s) have not been counted. They will be reported to the owner as NOT COUNTED.`
								: "All items have been counted. The owner will receive the day's summary."}
						</DialogDescription>
					</DialogHeader>
					<Textarea
						placeholder="Note for the owner (optional)"
						value={finalizeNote}
						onChange={(e) => setFinalizeNote(e.target.value)}
					/>
					<DialogFooter>
						<Button variant="outline" onClick={() => setFinalizeOpen(false)}>
							Keep counting
						</Button>
						<Button onClick={() => finalizeMutation.mutate()} disabled={finalizeMutation.isPending}>
							{finalizeMutation.isPending ? "Finishing…" : "Finish count"}
						</Button>
					</DialogFooter>
				</DialogContent>
			</Dialog>
		</div>
	);
}

interface CountRowCardProps {
	row: CountRow;
	value: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	submitting: boolean;
	disabled: boolean;
}

function CountRowCard({ row, value, onChange, onSubmit, submitting, disabled }: CountRowCardProps) {
	const open = row.state === "TO_COUNT" || row.state === "RECOUNT";
	const full = row.full;
	const variance = full?.varianceQuantity ?? 0;

	return (
		<Card
			className={
				row.state === "RECOUNT"
					? "border-amber-400 bg-amber-50 dark:bg-amber-950/20"
					: row.state === "NOT_COUNTED"
						? "border-red-300"
						: ""
			}
		>
			<CardContent className="py-3 flex flex-col gap-3 md:flex-row md:items-center">
				<div className="flex items-center gap-3 md:flex-1 min-w-0">
					<span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-sm font-semibold">
						{row.rank}
					</span>
					<div className="min-w-0">
						<div className="flex flex-wrap items-center gap-2">
							<p className="font-semibold truncate">{row.itemName}</p>
							<Badge variant={MOVEMENT_BADGE[row.movement].variant}>{MOVEMENT_BADGE[row.movement].label}</Badge>
						</div>
						{row.state === "RECOUNT" ? (
							<p className="text-sm text-amber-700 dark:text-amber-400">
								That figure didn't match. Please count this item again carefully.
							</p>
						) : (
							<p className="text-xs text-muted-foreground truncate">
								{row.itemCode}
								{full?.queueReason ? ` · ${full.queueReason}` : ""}
							</p>
						)}
					</div>
				</div>

				{open && !disabled ? (
					<form
						className="flex items-center gap-2"
						onSubmit={(e) => {
							e.preventDefault();
							onSubmit();
						}}
					>
						<Input
							id={`count-line-${row.lineId}`}
							type="number"
							inputMode="numeric"
							min={0}
							step={1}
							placeholder="Units counted"
							value={value}
							onChange={(e) => onChange(e.target.value)}
							className="w-36 text-lg"
						/>
						<Button type="submit" disabled={submitting}>
							{submitting ? <Icon icon="eos-icons:loading" className="h-4 w-4" /> : "Save"}
						</Button>
					</form>
				) : (
					<div className="flex flex-wrap items-center gap-2 md:justify-end">
						{row.state === "NOT_COUNTED" && <Badge variant="destructive">Not counted</Badge>}
						{row.state === "DONE" && !full && (
							<Badge variant="success">
								<Icon icon="lucide:check" className="mr-1 h-3 w-3" />
								Counted
							</Badge>
						)}
						{/* Owner/admin only: system figure and variance */}
						{full && row.state === "DONE" && (
							<>
								<span className="text-sm text-muted-foreground">
									System {full.expectedQuantity ?? "—"} · Counted {full.countedQuantity ?? "—"}
								</span>
								{variance === 0 ? (
									<Badge variant="success">Matches</Badge>
								) : (
									<Badge variant={variance < 0 ? "destructive" : "warning"}>
										{variance > 0 ? "+" : ""}
										{variance} ({variance < 0 ? "missing" : "surplus"})
									</Badge>
								)}
							</>
						)}
						{open && disabled && <Badge variant="destructive">Not counted</Badge>}
					</div>
				)}
			</CardContent>
		</Card>
	);
}
