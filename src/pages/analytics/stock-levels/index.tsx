// src/pages/analytics/stock-levels/index.tsx - Owner-only stock quantities (SMS-verified)
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import stockLevelsService, { type StockLevelItem } from "@/api/services/stockLevelsService";
import { Icon } from "@/components/icon";
import { OwnerUnlock } from "@/components/stock/owner-unlock";
import { UserRoleIndicator } from "@/components/user-role-indicator";
import { useMerchantId } from "@/store/userStore";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent } from "@/ui/card";
import { Input } from "@/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";
import {
	clearStockViewGrant,
	getStockViewExpiry,
	isStockViewLockedError,
	useCanViewStockCountResults,
} from "@/utils/stock-visibility";

const formatCurrency = (amount: number | null | undefined) =>
	`KShs ${(amount ?? 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

const STATUS_BADGE: Record<
	StockLevelItem["status"],
	{ label: string; variant: "destructive" | "warning" | "success" }
> = {
	OUT_OF_STOCK: { label: "Out of stock", variant: "destructive" },
	REORDER: { label: "Reorder", variant: "warning" },
	OK: { label: "OK", variant: "success" },
};

export default function StockLevelsPage() {
	const merchantId = useMerchantId();
	const canView = useCanViewStockCountResults();
	const queryClient = useQueryClient();
	const [search, setSearch] = useState("");

	const statusQuery = useQuery({
		queryKey: ["stock-view", "status", merchantId],
		queryFn: () => stockLevelsService.status(),
		enabled: canView,
	});
	const unlocked = statusQuery.data?.unlocked === true;

	const levelsQuery = useQuery({
		queryKey: ["stock-view", "levels", merchantId],
		queryFn: () => stockLevelsService.levels(),
		enabled: canView && unlocked,
		retry: (count, error) => !isStockViewLockedError(error) && count < 2,
	});

	const refreshAccess = () => queryClient.invalidateQueries({ queryKey: ["stock-view"] });

	const lockNow = () => {
		clearStockViewGrant();
		refreshAccess();
	};

	if (!canView) {
		return (
			<div className="p-6">
				<Card>
					<CardContent className="py-10 text-center text-muted-foreground">
						Only the shop owner can see stock quantities.
					</CardContent>
				</Card>
			</div>
		);
	}

	// Token expired between the status check and the data request
	if (levelsQuery.error && isStockViewLockedError(levelsQuery.error)) {
		clearStockViewGrant();
	}
	const locked = !statusQuery.isLoading && (!unlocked || isStockViewLockedError(levelsQuery.error));

	const expiry = statusQuery.data?.reason === "ADMIN" ? null : getStockViewExpiry();
	const data = levelsQuery.data;
	const items = (data?.items ?? []).filter((i) => !search || i.itemName.toLowerCase().includes(search.toLowerCase()));

	return (
		<div className="space-y-6">
			<div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
				<div>
					<h1 className="text-2xl font-semibold tracking-tight text-foreground">Stock levels</h1>
					<p className="text-sm text-muted-foreground">
						Real quantities in the system. Hidden everywhere else so counts stay blind.
					</p>
				</div>
				<div className="flex flex-wrap items-center gap-2">
					<UserRoleIndicator />
					{unlocked && !locked && expiry && (
						<>
							<Badge variant="info">
								Unlocked until {expiry.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
							</Badge>
							<Button variant="outline" onClick={lockNow}>
								<Icon icon="lucide:lock" className="mr-2 h-4 w-4" />
								Lock now
							</Button>
						</>
					)}
				</div>
			</div>

			{statusQuery.isLoading ? (
				<Card>
					<CardContent className="py-12 text-center">
						<Icon icon="eos-icons:loading" className="mx-auto mb-3 h-8 w-8" />
					</CardContent>
				</Card>
			) : statusQuery.error ? (
				<Card>
					<CardContent className="py-10 text-center space-y-3">
						<p className="text-destructive">{(statusQuery.error as Error).message}</p>
						<Button variant="outline" onClick={() => statusQuery.refetch()}>
							Try again
						</Button>
					</CardContent>
				</Card>
			) : locked ? (
				<OwnerUnlock what="stock levels" onUnlocked={refreshAccess} />
			) : levelsQuery.isLoading ? (
				<Card>
					<CardContent className="py-12 text-center">
						<Icon icon="eos-icons:loading" className="mx-auto mb-3 h-8 w-8" />
						<p className="text-muted-foreground">Loading stock levels…</p>
					</CardContent>
				</Card>
			) : levelsQuery.error ? (
				<Card>
					<CardContent className="py-10 text-center space-y-3">
						<p className="text-destructive">{(levelsQuery.error as Error).message}</p>
						<Button variant="outline" onClick={() => levelsQuery.refetch()}>
							Try again
						</Button>
					</CardContent>
				</Card>
			) : data ? (
				<>
					<div className="grid grid-cols-2 gap-3 md:grid-cols-3">
						{[
							{ label: "Items", value: String(data.itemCount), tone: "" },
							{ label: "Out of stock", value: String(data.outOfStock), tone: data.outOfStock ? "text-red-600" : "" },
							{
								label: "At or below reorder level",
								value: String(data.belowReorderLevel),
								tone: data.belowReorderLevel ? "text-orange-600" : "",
							},
						].map((s) => (
							<Card key={s.label}>
								<CardContent className="pt-5">
									<p className="text-xs font-medium text-muted-foreground">{s.label}</p>
									<p className={`mt-1 text-xl font-bold ${s.tone}`}>{s.value}</p>
								</CardContent>
							</Card>
						))}
					</div>

					<div>
						<p className="mb-2 text-sm font-semibold">Stock value</p>
						<div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
							{[
								{ label: "At unit cost", value: data.totalValueAtCost, note: "What the stock cost you" },
								{
									label: "At wholesale price",
									value: data.totalValueAtWholesale ?? 0,
									note: data.inStockWithoutWholesalePrice
										? `${data.inStockWithoutWholesalePrice} in-stock item(s) have no wholesale price and are not counted`
										: "If sold to shops at wholesale",
								},
								{ label: "At retail price", value: data.totalValueAtRetail, note: "If sold at the shelf price" },
							].map((s) => (
								<Card key={s.label}>
									<CardContent className="pt-5">
										<p className="text-xs font-medium text-muted-foreground">{s.label}</p>
										<p className="mt-1 text-xl font-bold text-green-600">{formatCurrency(s.value)}</p>
										<p className="mt-1 text-xs text-muted-foreground">{s.note}</p>
									</CardContent>
								</Card>
							))}
						</div>
					</div>

					<Card>
						<CardContent className="pt-6 space-y-4">
							<Input
								placeholder="Search item…"
								value={search}
								onChange={(e) => setSearch(e.target.value)}
								className="max-w-sm"
							/>
							<div className="overflow-x-auto">
								<Table>
									<TableHeader>
										<TableRow>
											<TableHead>Item</TableHead>
											<TableHead>Status</TableHead>
											<TableHead className="text-right">In stock</TableHead>
											<TableHead className="text-right">Reorder at</TableHead>
											<TableHead className="text-right">Unit cost</TableHead>
											<TableHead className="text-right">Value (cost)</TableHead>
										</TableRow>
									</TableHeader>
									<TableBody>
										{items.map((i) => (
											<TableRow key={i.id}>
												<TableCell>
													<p className="font-medium">{i.itemName}</p>
													<p className="text-xs text-muted-foreground">{i.itemCode}</p>
												</TableCell>
												<TableCell>
													<Badge variant={STATUS_BADGE[i.status].variant}>{STATUS_BADGE[i.status].label}</Badge>
												</TableCell>
												<TableCell className="text-right font-semibold">{i.availableStock}</TableCell>
												<TableCell className="text-right">{i.reorderLevel}</TableCell>
												<TableCell className="text-right">{formatCurrency(i.unitCost)}</TableCell>
												<TableCell className="text-right">{formatCurrency(i.stockValueAtCost)}</TableCell>
											</TableRow>
										))}
										{items.length === 0 && (
											<TableRow>
												<TableCell colSpan={6} className="py-8 text-center text-muted-foreground">
													No items found.
												</TableCell>
											</TableRow>
										)}
									</TableBody>
								</Table>
							</div>
						</CardContent>
					</Card>
				</>
			) : null}
		</div>
	);
}
