// src/pages/analytics/stock-discrepancies/index.tsx - Daily stock count discrepancy report (owner/admin)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import { useLocation, useNavigate } from "react-router";
import stockCountService, {
	type CountSummary,
	type FullCountLine,
	VARIANCE_REASONS,
	type VarianceReason,
} from "@/api/services/stockCountService";
import { Icon } from "@/components/icon";
import { OwnerUnlock } from "@/components/stock/owner-unlock";
import { ReportRecipientsCard } from "@/components/stock/report-recipients-card";
import { UserRoleIndicator } from "@/components/user-role-indicator";
import { useMerchantId } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Checkbox } from "@/ui/checkbox";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/ui/dialog";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import { Textarea } from "@/ui/textarea";
import { isStockViewLockedError, useCanViewStockCountResults } from "@/utils/stock-visibility";

const todayIso = () => {
	const d = new Date();
	return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

const formatCurrency = (amount: number | null | undefined) =>
	`KShs ${Math.abs(amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const reasonLabel = (reason: VarianceReason | null) =>
	VARIANCE_REASONS.find((r) => r.value === reason)?.label ?? reason ?? "—";

export default function StockDiscrepanciesPage() {
	const merchantId = useMerchantId();
	// Finished counts are visible to everyone at the shop (they were already SMS'd to the owner).
	// Owners additionally review variances and manage who receives the SMS.
	const isOwner = useCanViewStockCountResults();
	const navigate = useNavigate();
	const location = useLocation();
	const queryClient = useQueryClient();

	const initialDate = new URLSearchParams(location.search).get("date") || todayIso();
	const [selectedDate, setSelectedDate] = useState(initialDate);
	const [reviewing, setReviewing] = useState<FullCountLine | null>(null);
	const [reviewNeedsUnlock, setReviewNeedsUnlock] = useState(false);

	const {
		data: report,
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["stock-count", "report", merchantId, selectedDate],
		queryFn: () => stockCountService.report(selectedDate),
		enabled: !!merchantId,
		retry: (count, err) => !isStockViewLockedError(err) && count < 2,
	});
	// System figures need the owner's SMS code (HTTP 423 until verified on this tab)

	const { data: history = [] } = useQuery({
		queryKey: ["stock-count", "history", merchantId],
		queryFn: () => stockCountService.history(),
		enabled: !!merchantId,
		retry: (count, err) => !isStockViewLockedError(err) && count < 2,
	});

	const handleDateChange = (date: string) => {
		if (!date) return;
		setSelectedDate(date);
		const params = new URLSearchParams(location.search);
		params.set("date", date);
		navigate(`${location.pathname}?${params.toString()}`, { replace: true });
	};

	const summary = report?.summary;
	// "outcome" is always sent; the figures are left out when quantities are hidden
	const shortages = report?.discrepancies.filter((l) => l.outcome === "MISSING") ?? [];
	const surpluses = report?.discrepancies.filter((l) => l.outcome === "EXTRA") ?? [];
	const hideQuantities = !!report?.quantitiesHidden;
	const notCounted =
		report?.discrepancies.filter((l) => l.status === "NOT_COUNTED" || l.status === "RECOUNT_REQUESTED") ?? [];

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">Stock discrepancies</h1>
					<p className="text-sm text-muted-foreground">
						Blind count results — what was counted on the shelf versus what the system expected.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<UserRoleIndicator />
					<Input
						type="date"
						value={selectedDate}
						max={todayIso()}
						onChange={(e) => handleDateChange(e.target.value)}
						className="w-44"
					/>
					<Button variant="outline" onClick={() => refetch()} title="Refresh">
						<Icon icon="lucide:refresh-cw" className="h-4 w-4" />
					</Button>
				</div>
			</div>

			{isLoading ? (
				<Card>
					<CardContent className="py-12 text-center">
						<Icon icon="eos-icons:loading" className="mx-auto mb-3 h-8 w-8" />
						<p className="text-muted-foreground">Loading report…</p>
					</CardContent>
				</Card>
			) : error && /once the stock count is finished/i.test((error as Error).message) ? (
				<Card>
					<CardContent className="py-10 text-center space-y-3 text-muted-foreground">
						<p>This day's count is still in progress. Results show here as soon as it is finished.</p>
						<Button variant="outline" onClick={() => navigate("/inventory/stock-count")}>
							Go to the count
						</Button>
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
			) : !report || !summary ? (
				<Card>
					<CardContent className="py-10 text-center space-y-3">
						<p className="text-muted-foreground">No stock count was recorded for {selectedDate}.</p>
						{selectedDate === todayIso() && (
							<Button onClick={() => navigate("/inventory/stock-count")}>Go to today's count</Button>
						)}
					</CardContent>
				</Card>
			) : (
				<>
					<SummaryCards summary={summary} />

					{report.repeatShortages.length > 0 && (
						<Card className="border-red-300">
							<CardHeader>
								<CardTitle className="flex items-center gap-2 text-red-700 dark:text-red-400">
									<Icon icon="lucide:siren" className="h-5 w-5" />
									Items going missing repeatedly
								</CardTitle>
								<CardDescription>
									Short on two or more days this week. A repeating pattern points to theft rather than a miscount.
								</CardDescription>
							</CardHeader>
							<CardContent>
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Item</TableHead>
											<TableHead className="text-right">Days short</TableHead>
											{!report.quantitiesHidden && <TableHead className="text-right">Units missing</TableHead>}
											<TableHead className="text-right">Value (cost)</TableHead>
											<TableHead>Counted by (user IDs)</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{report.repeatShortages.map((r) => (
											<TableRow key={r.itemCode}>
												<TableCell className="font-medium">{r.itemName}</TableCell>
												<TableCell className="text-right">{r.daysShort}</TableCell>
												{!report.quantitiesHidden && <TableCell className="text-right">{r.unitsMissing}</TableCell>}
												<TableCell className="text-right text-red-600">{formatCurrency(r.valueMissing)}</TableCell>
												<TableCell>{r.countedBy.join(", ")}</TableCell>
											</TableRow>
										))}
									</TableBody>
								</Table>
							</CardContent>
						</Card>
					)}

					<LinesCard
						title="Missing stock"
						description="Counted less than the system expected — worst first."
						icon="lucide:package-minus"
						lines={shortages}
						emptyText="Nothing missing. Every counted item matched or was over."
						onReview={isOwner ? setReviewing : undefined}
						hideQuantities={hideQuantities}
					/>
					<LinesCard
						title="Surplus stock"
						description="Counted more than expected — usually a delivery or return not entered."
						icon="lucide:package-plus"
						lines={surpluses}
						emptyText="No surplus items."
						onReview={isOwner ? setReviewing : undefined}
						hideQuantities={hideQuantities}
					/>
					<LinesCard
						title="Not counted"
						description="Items on today's list that were never counted."
						icon="lucide:circle-help"
						lines={notCounted}
						emptyText="Every item on the list was counted."
						hideQuantities={hideQuantities}
					/>
				</>
			)}

			{history.length > 0 && (
				<Card>
					<CardHeader>
						<CardTitle>Last 30 days</CardTitle>
						<CardDescription>Click a day to open its report.</CardDescription>
					</CardHeader>
					<CardContent>
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Date</TableHead>
									<TableHead>Status</TableHead>
									<TableHead className="text-right">Counted</TableHead>
									<TableHead className="text-right">Not counted</TableHead>
									<TableHead className="text-right">Discrepancies</TableHead>
									<TableHead className="text-right">Missing (cost)</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{history.map((d) => (
									<TableRow
										key={d.closeDayId}
										className={`cursor-pointer ${d.tradingDate === selectedDate ? "bg-muted" : ""}`}
										onClick={() => handleDateChange(d.tradingDate)}
									>
										<TableCell className="font-medium">{d.tradingDate}</TableCell>
										<TableCell>
											<StatusBadge status={d.status} />
										</TableCell>
										<TableCell className="text-right">
											{d.itemsCounted ?? 0}/{d.itemsQueued ?? 0}
										</TableCell>
										<TableCell className="text-right">{d.itemsNotCounted ?? 0}</TableCell>
										<TableCell className="text-right">{d.variances ?? 0}</TableCell>
										<TableCell className={`text-right ${(d.shortageValue ?? 0) > 0 ? "text-red-600 font-medium" : ""}`}>
											{formatCurrency(d.shortageValue)}
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					</CardContent>
				</Card>
			)}

			{isOwner && !isLoading && <ReportRecipientsCard />}

			{reviewNeedsUnlock && (
				<Dialog open onOpenChange={(open) => !open && setReviewNeedsUnlock(false)}>
					<DialogContent className="p-0 sm:max-w-md">
						<OwnerUnlock
							what="and review discrepancies"
							onUnlocked={() => {
								setReviewNeedsUnlock(false);
								queryClient.invalidateQueries({ queryKey: ["stock-count"] });
							}}
						/>
					</DialogContent>
				</Dialog>
			)}

			{reviewing && (
				<ReviewDialog
					line={reviewing}
					onClose={() => setReviewing(null)}
					onSaved={() => {
						setReviewing(null);
						queryClient.invalidateQueries({ queryKey: ["stock-count"] });
					}}
					onLocked={() => {
						// Reviewing changes the books, so it still needs the owner's SMS code
						setReviewing(null);
						setReviewNeedsUnlock(true);
					}}
				/>
			)}
		</div>
	);
}

function StatusBadge({ status }: { status: CountSummary["status"] }) {
	if (status === "CLOSED") return <Badge variant="success">Clean</Badge>;
	if (status === "CLOSED_WITH_EXCEPTION") return <Badge variant="warning">Issues found</Badge>;
	return <Badge variant="info">Counting</Badge>;
}

function SummaryCards({ summary }: { summary: CountSummary }) {
	const stats = [
		{
			label: "Items counted",
			value: `${summary.itemsCounted ?? 0} / ${summary.itemsQueued ?? 0}`,
			icon: "lucide:clipboard-check",
			tone: "",
		},
		{
			label: "Not counted",
			value: String(summary.itemsNotCounted ?? 0),
			icon: "lucide:circle-help",
			tone: (summary.itemsNotCounted ?? 0) > 0 ? "text-orange-600" : "",
		},
		{
			label: "Discrepancies",
			value: `${summary.variances ?? 0}${summary.openVariances ? ` (${summary.openVariances} to review)` : ""}`,
			icon: "lucide:triangle-alert",
			tone: (summary.variances ?? 0) > 0 ? "text-orange-600" : "",
		},
		{
			label: "Missing stock (at cost)",
			value: formatCurrency(summary.shortageValue),
			icon: "lucide:trending-down",
			tone: (summary.shortageValue ?? 0) > 0 ? "text-red-600" : "text-green-600",
		},
		{
			label: "Surplus stock (at cost)",
			value: formatCurrency(summary.overageValue),
			icon: "lucide:trending-up",
			tone: "",
		},
	];

	return (
		<div className="space-y-2">
			<div className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground">
				<StatusBadge status={summary.status} />
				<span>{summary.tradingDate}</span>
				{summary.closedBy && (
					<span>· finalized by {summary.closedBy === "SYSTEM" ? "the nightly job" : `user ${summary.closedBy}`}</span>
				)}
				{summary.note && <span>· “{summary.note}”</span>}
			</div>
			<div className="grid grid-cols-2 gap-3 md:grid-cols-5">
				{stats.map((s) => (
					<Card key={s.label}>
						<CardContent className="pt-5">
							<div className="flex items-center justify-between">
								<p className="text-xs font-medium text-muted-foreground">{s.label}</p>
								<Icon icon={s.icon} className="h-4 w-4 text-muted-foreground" />
							</div>
							<p className={`mt-1 text-xl font-bold ${s.tone}`}>{s.value}</p>
						</CardContent>
					</Card>
				))}
			</div>
		</div>
	);
}

interface LinesCardProps {
	title: string;
	description: string;
	icon: string;
	lines: FullCountLine[];
	emptyText: string;
	onReview?: (line: FullCountLine) => void;
	/** Staff (and owners who haven't unlocked) see items and values, never the figures. */
	hideQuantities?: boolean;
}

function LinesCard({ title, description, icon, lines, emptyText, onReview, hideQuantities }: LinesCardProps) {
	return (
		<Card>
			<CardHeader>
				<CardTitle className="flex items-center gap-2">
					<Icon icon={icon} className="h-5 w-5" />
					{title}
					<Badge variant="outline">{lines.length}</Badge>
				</CardTitle>
				<CardDescription>{description}</CardDescription>
			</CardHeader>
			<CardContent>
				{lines.length === 0 ? (
					<p className="py-4 text-center text-sm text-muted-foreground">{emptyText}</p>
				) : (
					<div className="overflow-x-auto">
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Item</TableHead>
									{!hideQuantities && (
										<>
											<TableHead className="text-right">Sold today</TableHead>
											<TableHead className="text-right">System</TableHead>
											<TableHead className="text-right">Counted</TableHead>
											<TableHead className="text-right">Difference</TableHead>
										</>
									)}
									<TableHead className="text-right">Value (cost)</TableHead>
									<TableHead>Counted by</TableHead>
									<TableHead>Reason</TableHead>
									{onReview && <TableHead />}
								</TableRow>
							</TableHeader>
							<TableBody>
								{lines.map((l) => {
									const diff = l.varianceQuantity ?? (l.outcome === "MISSING" ? -1 : l.outcome === "EXTRA" ? 1 : 0);
									return (
										<TableRow key={l.lineId}>
											<TableCell>
												<p className="font-medium">{l.itemName}</p>
												<p className="text-xs text-muted-foreground">{l.queueReason}</p>
												{hideQuantities && l.countedTwice && (
													<Badge variant="warning" className="mt-1">
														Counted twice
													</Badge>
												)}
											</TableCell>
											{!hideQuantities && <TableCell className="text-right">{l.unitsSoldToday ?? 0}</TableCell>}
											{!hideQuantities && (
												<>
													<TableCell className="text-right">{l.expectedQuantity ?? "—"}</TableCell>
													<TableCell className="text-right">
														{l.countedQuantity ?? "—"}
														{l.countedTwice && (
															<Badge
																variant="warning"
																className="ml-1"
																title={`First count ${l.firstCount}, recount ${l.countedQuantity}`}
															>
																Counted twice
															</Badge>
														)}
														{l.countedTwice && (
															<span className="block text-xs text-muted-foreground">
																1st {l.firstCount} → 2nd {l.countedQuantity}
															</span>
														)}
													</TableCell>
													<TableCell
														className={`text-right font-semibold ${diff < 0 ? "text-red-600" : diff > 0 ? "text-amber-600" : ""}`}
													>
														{l.varianceQuantity === null ? "—" : `${diff > 0 ? "+" : ""}${diff}`}
													</TableCell>
												</>
											)}
											<TableCell className={`text-right ${diff < 0 ? "text-red-600" : ""}`}>
												{l.varianceValue === null ? "—" : formatCurrency(l.varianceValue)}
												{l.materialVariance && (
													<Badge variant="destructive" className="ml-2">
														High
													</Badge>
												)}
											</TableCell>
											<TableCell>{l.countedBy ? `user ${l.countedBy}` : "—"}</TableCell>
											<TableCell>
												{l.status === "CLASSIFIED" ? (
													<div>
														<p>{reasonLabel(l.varianceReason)}</p>
														{l.stockAdjusted && <p className="text-xs text-muted-foreground">stock adjusted</p>}
													</div>
												) : l.status === "VARIANCE_OPEN" ? (
													<Badge variant="warning">To review</Badge>
												) : (
													"—"
												)}
											</TableCell>
											{onReview && (
												<TableCell className="text-right">
													{(l.status === "VARIANCE_OPEN" || l.status === "CLASSIFIED") && (
														<Button size="sm" variant="outline" onClick={() => onReview(l)}>
															{l.status === "CLASSIFIED" ? "Edit" : "Review"}
														</Button>
													)}
												</TableCell>
											)}
										</TableRow>
									);
								})}
							</TableBody>
						</Table>
					</div>
				)}
			</CardContent>
		</Card>
	);
}

interface ReviewDialogProps {
	line: FullCountLine;
	onClose: () => void;
	onSaved: () => void;
	onLocked: () => void;
}

function ReviewDialog({ line, onClose, onSaved, onLocked }: ReviewDialogProps) {
	const diff = line.varianceQuantity ?? 0;
	const [reason, setReason] = useState<VarianceReason | "">(
		line.varianceReason ?? (diff < 0 ? "LOSS" : "OVERAGE_INVESTIGATE"),
	);
	const [note, setNote] = useState("");
	const [adjustStock, setAdjustStock] = useState(false);

	const mutation = useMutation({
		mutationFn: () => stockCountService.classify(line.lineId, reason as VarianceReason, note.trim(), adjustStock),
		onSuccess: () => {
			message.success(adjustStock ? "Variance recorded and stock adjusted" : "Variance recorded");
			onSaved();
		},
		onError: (err: Error) => (isStockViewLockedError(err) ? onLocked() : message.error(err.message)),
	});

	return (
		<Dialog open onOpenChange={(open) => !open && onClose()}>
			<DialogContent>
				<DialogHeader>
					<DialogTitle>Review: {line.itemName}</DialogTitle>
					<DialogDescription>
						System expected {line.expectedQuantity}, counted {line.countedQuantity} —{" "}
						<span className={diff < 0 ? "text-red-600 font-semibold" : "font-semibold"}>
							{Math.abs(diff)} {diff < 0 ? "missing" : "extra"} ({formatCurrency(line.varianceValue)} at cost)
						</span>
					</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					<div className="space-y-2">
						<Label>What happened?</Label>
						<Select value={reason} onValueChange={(v) => setReason(v as VarianceReason)}>
							<SelectTrigger>
								<SelectValue placeholder="Choose a reason" />
							</SelectTrigger>
							<SelectContent>
								{VARIANCE_REASONS.map((r) => (
									<SelectItem key={r.value} value={r.value}>
										{r.label}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>
					<div className="space-y-2">
						<Label>Notes</Label>
						<Textarea
							placeholder="e.g. checked CCTV, spoke to the attendant on shift…"
							value={note}
							onChange={(e) => setNote(e.target.value)}
						/>
					</div>
					{!line.stockAdjusted && (
						<div className="flex items-start gap-2 rounded-md border p-3">
							<Checkbox id="adjust-stock" checked={adjustStock} onCheckedChange={(v) => setAdjustStock(v === true)} />
							<div className="space-y-1">
								<Label htmlFor="adjust-stock">Correct the stock figure to the counted quantity</Label>
								<p className="text-xs text-muted-foreground">
									Leave unticked to keep the discrepancy open on the books. If you don't correct it, the same difference
									will show up again at every count.
								</p>
							</div>
						</div>
					)}
				</div>

				<DialogFooter>
					<Button variant="outline" onClick={onClose}>
						Cancel
					</Button>
					<Button onClick={() => mutation.mutate()} disabled={!reason || mutation.isPending}>
						{mutation.isPending ? "Saving…" : "Save review"}
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
