// Step 4: mark goods vs services and give each colour/size its own row under one product
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useMemo, useState } from "react";
import smmService, { type CatalogueItem } from "@/api/services/smmService";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";

export function CatalogueTab({ onNext }: { onNext: () => void }) {
	const qc = useQueryClient();
	const catalogue = useQuery({ queryKey: ["smm-catalogue"], queryFn: smmService.catalogue });
	const [filter, setFilter] = useState("");

	const save = useMutation({
		mutationFn: ({ id, changes }: { id: number; changes: Partial<CatalogueItem> }) => smmService.saveItem(id, changes),
		onSuccess: (item) => {
			qc.setQueryData<CatalogueItem[]>(["smm-catalogue"], (old) =>
				(old ?? []).map((i) => (i.id === item.id ? item : i)),
			);
		},
		onError: (e: Error) => message.error(e.message),
	});

	const rows = useMemo(() => {
		const f = filter.trim().toLowerCase();
		return (catalogue.data ?? []).filter(
			(i) => !f || i.itemName.toLowerCase().includes(f) || i.itemCode.toLowerCase().includes(f),
		);
	}, [catalogue.data, filter]);

	return (
		<Card>
			<CardHeader>
				<CardTitle>Catalogue check</CardTitle>
				<CardDescription>
					The agents only quote prices and stock from here, never made up. Mark salon treatments and nail sets as
					services (no stock count). For a dress in several colours or sizes, give each row its colour and size and the
					same parent product code, so "hio ya green iko?" is answered from real stock.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-3">
				<Input
					placeholder="Search products"
					value={filter}
					onChange={(e) => setFilter(e.target.value)}
					className="max-w-xs"
				/>
				<div className="overflow-x-auto">
					<table className="w-full text-sm">
						<thead>
							<tr className="text-left text-muted-foreground">
								<th className="p-2">Product</th>
								<th className="p-2">Price</th>
								<th className="p-2">Stock</th>
								<th className="p-2">Type</th>
								<th className="p-2">Colour</th>
								<th className="p-2">Size</th>
								<th className="p-2">Parent product code</th>
							</tr>
						</thead>
						<tbody>
							{rows.map((i) => (
								<tr key={i.id} className="border-t">
									<td className="p-2">
										<div className="font-medium">{i.itemName}</div>
										<div className="text-xs text-muted-foreground">{i.itemCode}</div>
									</td>
									<td className="p-2">{i.unitPrice != null ? `KES ${i.unitPrice}` : "-"}</td>
									<td className="p-2">{i.itemType === "SERVICE" ? "-" : i.availableStock}</td>
									<td className="p-2">
										<select
											className="h-8 rounded-md border bg-transparent px-1"
											value={i.itemType}
											onChange={(e) =>
												save.mutate({ id: i.id, changes: { itemType: e.target.value as "GOOD" | "SERVICE" } })
											}
										>
											<option value="GOOD">Product</option>
											<option value="SERVICE">Service</option>
										</select>
									</td>
									<td className="p-2">
										<CellInput value={i.colour} onSave={(v) => save.mutate({ id: i.id, changes: { colour: v } })} />
									</td>
									<td className="p-2">
										<CellInput value={i.size} onSave={(v) => save.mutate({ id: i.id, changes: { size: v } })} />
									</td>
									<td className="p-2">
										<CellInput
											value={i.parentCode}
											onSave={(v) => save.mutate({ id: i.id, changes: { parentCode: v } })}
										/>
									</td>
								</tr>
							))}
						</tbody>
					</table>
				</div>
				<div>
					<Button variant="outline" onClick={onNext}>
						Next: tag your Reels
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

/** Saves when the field loses focus, only if it changed. */
function CellInput({ value, onSave }: { value: string | null; onSave: (v: string | null) => void }) {
	const [v, setV] = useState(value ?? "");
	return (
		<Input
			className="h-8 w-28"
			value={v}
			onChange={(e) => setV(e.target.value)}
			onBlur={() => {
				if ((value ?? "") !== v) onSave(v.trim() || null);
			}}
		/>
	);
}
