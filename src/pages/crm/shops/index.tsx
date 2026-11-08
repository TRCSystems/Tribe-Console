// src/pages/crm/shops/index.tsx - Distributor's shops with segments and buying rhythm
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import crmService, { type CrmShop, SEGMENTS, type Segment } from "@/api/services/crmService";
import { formatDate, formatKes, SegmentBadge } from "@/components/crm/segment-badge";
import { Icon } from "@/components/icon";
import { UserRoleIndicator } from "@/components/user-role-indicator";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

const FILTERS: Array<Segment | "ALL"> = ["ALL", "CHAMPION", "ACTIVE", "DUE", "NEW", "AT_RISK", "LOST", "PROSPECT"];

/** Most urgent first: overdue shops, then due, then the rest by value. */
const URGENCY: Record<Segment, number> = { AT_RISK: 0, DUE: 1, LOST: 2, NEW: 3, CHAMPION: 4, ACTIVE: 5, PROSPECT: 6 };

export default function CrmShopsPage() {
	const navigate = useNavigate();
	const location = useLocation();
	const initial = (new URLSearchParams(location.search).get("segment") as Segment | null) ?? "ALL";
	const [filter, setFilter] = useState<Segment | "ALL">(initial);
	const [search, setSearch] = useState("");

	const {
		data: shops = [],
		isLoading,
		error,
		refetch,
	} = useQuery({
		queryKey: ["crm", "shops"],
		queryFn: () => crmService.shops(),
	});

	const counts = useMemo(() => {
		const c: Record<string, number> = { ALL: shops.length };
		for (const s of shops) if (s.segment) c[s.segment] = (c[s.segment] ?? 0) + 1;
		return c;
	}, [shops]);

	const visible = shops
		.filter((s) => filter === "ALL" || s.segment === filter)
		.filter((s) => !search || s.name.toLowerCase().includes(search.toLowerCase()))
		.sort(
			(a: CrmShop, b: CrmShop) =>
				(URGENCY[a.segment ?? "PROSPECT"] ?? 9) - (URGENCY[b.segment ?? "PROSPECT"] ?? 9) ||
				Number(b.totalOrderedKes ?? 0) - Number(a.totalOrderedKes ?? 0),
		);

	const changeFilter = (f: Segment | "ALL") => {
		setFilter(f);
		navigate(f === "ALL" ? "/crm/shops" : `/crm/shops?segment=${f}`, { replace: true });
	};

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">Shops</h1>
					<p className="text-sm text-muted-foreground">Overdue and due shops first. Click a shop for its profile.</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<UserRoleIndicator />
					<Button variant="outline" onClick={() => navigate("/crm")}>
						<Icon icon="lucide:layout-dashboard" className="mr-2 h-4 w-4" />
						Dashboard
					</Button>
				</div>
			</div>

			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div className="flex flex-wrap gap-2">
					{FILTERS.map((f) => (
						<Button key={f} size="sm" variant={filter === f ? "default" : "outline"} onClick={() => changeFilter(f)}>
							{f === "ALL" ? "All" : SEGMENTS[f].label} ({counts[f] ?? 0})
						</Button>
					))}
				</div>
				<Input
					placeholder="Search shop…"
					value={search}
					onChange={(e) => setSearch(e.target.value)}
					className="md:max-w-xs"
				/>
			</div>

			<Card>
				<CardContent className="pt-6">
					{isLoading ? (
						<div className="py-10 text-center">
							<Icon icon="eos-icons:loading" className="mx-auto h-8 w-8" />
						</div>
					) : error ? (
						<div className="py-10 text-center space-y-3">
							<p className="text-destructive">{(error as Error).message}</p>
							<Button variant="outline" onClick={() => refetch()}>
								Try again
							</Button>
						</div>
					) : visible.length === 0 ? (
						<p className="py-10 text-center text-muted-foreground">No shops in this view.</p>
					) : (
						<div className="overflow-x-auto">
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Shop</TableHead>
										<TableHead>Segment</TableHead>
										<TableHead>Last order</TableHead>
										<TableHead className="text-right">Usually every</TableHead>
										<TableHead>Next expected</TableHead>
										<TableHead className="text-right">Orders (30d)</TableHead>
										<TableHead className="text-right">Average order</TableHead>
										<TableHead>Rep</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{visible.map((s) => (
										<TableRow
											key={s.shopId}
											className="cursor-pointer"
											onClick={() => navigate(`/crm/shops/${s.shopId}`)}
										>
											<TableCell>
												<p className="font-medium">{s.name}</p>
												<p className="text-xs text-muted-foreground">
													{s.location || "—"}
													{s.marketingOptOut ? " · opted out" : ""}
												</p>
											</TableCell>
											<TableCell>
												<SegmentBadge segment={s.segment} />
											</TableCell>
											<TableCell>
												{s.daysSinceLastOrder === null ? (
													<span className="text-muted-foreground">Never</span>
												) : (
													<span className={s.daysSinceLastOrder > 14 ? "text-red-600 font-medium" : ""}>
														{s.daysSinceLastOrder === 0 ? "Today" : `${s.daysSinceLastOrder} days ago`}
													</span>
												)}
											</TableCell>
											<TableCell className="text-right">{s.usualGapDays ? `${s.usualGapDays} days` : "—"}</TableCell>
											<TableCell>{formatDate(s.nextExpectedOrderDate)}</TableCell>
											<TableCell className="text-right">{s.orders30d ?? 0}</TableCell>
											<TableCell className="text-right">
												{formatKes(s.avgBasketKes)}
												{s.basketTrendPct !== null && s.basketTrendPct !== undefined && (
													<span
														className={`block text-xs ${s.basketTrendPct >= 0 ? "text-emerald-600" : "text-red-600"}`}
													>
														{s.basketTrendPct >= 0 ? "▲" : "▼"} {Math.abs(s.basketTrendPct)}%
													</span>
												)}
											</TableCell>
											<TableCell>{s.repName ?? <span className="text-muted-foreground">Unassigned</span>}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
