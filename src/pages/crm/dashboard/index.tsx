// src/pages/crm/dashboard/index.tsx - Distributor CRM headline numbers and segments
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useNavigate } from "react-router";
import crmService, { type PeriodStats, SEGMENTS, type Segment } from "@/api/services/crmService";
import { formatKes } from "@/components/crm/segment-badge";
import { Icon } from "@/components/icon";
import { UserRoleIndicator } from "@/components/user-role-indicator";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";

/** Success measures agreed for the CRM: order count, basket size, frequency, self-ordering. */
const METRICS: Array<{
	key: keyof PeriodStats;
	label: string;
	format: (v: number | null) => string;
	higherIsBetter: boolean;
}> = [
	{ key: "orders", label: "Orders", format: (v) => String(v ?? 0), higherIsBetter: true },
	{ key: "activeShops", label: "Shops that ordered", format: (v) => String(v ?? 0), higherIsBetter: true },
	{
		key: "ordersPerActiveShop",
		label: "Orders per shop",
		format: (v) => (v === null ? "—" : String(v)),
		higherIsBetter: true,
	},
	{ key: "avgBasketKes", label: "Average order", format: (v) => formatKes(v), higherIsBetter: true },
	{
		key: "avgLinesPerOrder",
		label: "Products per order",
		format: (v) => (v === null ? "—" : String(v)),
		higherIsBetter: true,
	},
	{
		key: "selfOrderSharePct",
		label: "Placed by shops",
		format: (v) => (v === null ? "—" : `${v}%`),
		higherIsBetter: true,
	},
];

const SEGMENT_ORDER: Segment[] = ["CHAMPION", "ACTIVE", "DUE", "NEW", "AT_RISK", "LOST", "PROSPECT"];

function Change({ current, previous }: { current: number | null; previous: number | null }) {
	if (current === null || previous === null || previous === 0) return null;
	const pct = Math.round(((current - previous) / previous) * 100);
	return (
		<div className="flex flex-col text-xs leading-tight">
			{pct === 0 ? (
				<span className="font-medium text-muted-foreground">No change</span>
			) : (
				<span className={`font-medium ${pct > 0 ? "text-emerald-600" : "text-red-600"}`}>
					{pct > 0 ? "▲" : "▼"} {Math.abs(pct)}%
				</span>
			)}
			<span className="text-muted-foreground">vs previous 30 days</span>
		</div>
	);
}

export default function CrmDashboardPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const { data, isLoading, error, refetch } = useQuery({
		queryKey: ["crm", "dashboard"],
		queryFn: () => crmService.dashboard(),
	});

	const refresh = useMutation({
		mutationFn: () => crmService.refreshStats(),
		onSuccess: (n) => {
			message.success(`Recalculated ${n} shops`);
			queryClient.invalidateQueries({ queryKey: ["crm"] });
		},
		onError: (e: Error) => message.error(e.message),
	});

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">Customer relationships</h1>
					<p className="text-sm text-muted-foreground">
						How your shops are ordering — last 30 days compared with the 30 days before.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<UserRoleIndicator />
					<Button variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
						<Icon icon={refresh.isPending ? "eos-icons:loading" : "lucide:refresh-cw"} className="mr-2 h-4 w-4" />
						Recalculate
					</Button>
					<Button onClick={() => navigate("/crm/shops")}>
						<Icon icon="lucide:store" className="mr-2 h-4 w-4" />
						All shops
					</Button>
				</div>
			</div>

			{isLoading ? (
				<Card>
					<CardContent className="py-12 text-center">
						<Icon icon="eos-icons:loading" className="mx-auto h-8 w-8" />
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
			) : data ? (
				<>
					<div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-6">
						{METRICS.map((m) => {
							const cur = data.current[m.key] as number | null;
							const prev = data.previous[m.key] as number | null;
							return (
								<Card key={m.key}>
									<CardContent className="pt-5 space-y-1">
										<p className="text-xs font-medium text-muted-foreground">{m.label}</p>
										<p className="text-2xl font-bold">{m.format(cur)}</p>
										<Change current={cur} previous={prev} />
									</CardContent>
								</Card>
							);
						})}
					</div>

					<Card>
						<CardHeader>
							<CardTitle>Shop segments</CardTitle>
							<CardDescription>
								Worked out from each shop's own ordering rhythm
								{data.medianDaysBetweenOrders
									? ` (a typical shop orders every ${data.medianDaysBetweenOrders} days)`
									: ""}
								. Click a segment to see the shops.
							</CardDescription>
						</CardHeader>
						<CardContent>
							<div className="grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-7">
								{SEGMENT_ORDER.map((s) => (
									<button
										type="button"
										key={s}
										onClick={() => navigate(`/crm/shops?segment=${s}`)}
										className={`rounded-lg border p-3 text-left transition hover:shadow-md ${SEGMENTS[s].tone}`}
									>
										<p className="text-2xl font-bold">{data.segments[s] ?? 0}</p>
										<p className="text-sm font-semibold">{SEGMENTS[s].label}</p>
										<p className="text-xs opacity-80">{SEGMENTS[s].hint}</p>
									</button>
								))}
							</div>
						</CardContent>
					</Card>

					{(data.segments.AT_RISK > 0 || data.segments.DUE > 0) && (
						<Card className="border-amber-300">
							<CardContent className="pt-5 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
								<div>
									<p className="font-semibold">Worth a call today</p>
									<p className="text-sm text-muted-foreground">
										{data.segments.DUE ?? 0} shops are due to reorder and {data.segments.AT_RISK ?? 0} are overdue.
									</p>
								</div>
								<div className="flex gap-2">
									<Button variant="outline" onClick={() => navigate("/crm/shops?segment=DUE")}>
										Due shops
									</Button>
									<Button onClick={() => navigate("/crm/shops?segment=AT_RISK")}>At-risk shops</Button>
								</div>
							</CardContent>
						</Card>
					)}

					<p className="text-xs text-muted-foreground">
						{data.shops} shops · figures recalculated{" "}
						{data.computedAt ? new Date(data.computedAt).toLocaleString() : "—"} (automatically every night).
					</p>
				</>
			) : null}
		</div>
	);
}
