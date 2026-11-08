// Step 4: mark goods vs services and give each colour/size its own row under one product
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useMemo, useState } from "react";
import smmService, { type CatalogueItem, type NewCatalogueItem } from "@/api/services/smmService";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { useIsSokoReplyOnly } from "@/utils/plan";

export function CatalogueTab({ onNext }: { onNext: () => void }) {
	const qc = useQueryClient();
	const catalogue = useQuery({ queryKey: ["smm-catalogue"], queryFn: smmService.catalogue });
	const [filter, setFilter] = useState("");
	// SokoReply-only sellers keep their products here; shop-system merchants change names, prices and stock in Inventory
	const ownsCatalogue = useIsSokoReplyOnly();

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
				{ownsCatalogue && <AddProduct />}
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
										{ownsCatalogue ? (
											<CellInput
												wide
												value={i.itemName}
												onSave={(v) => v && save.mutate({ id: i.id, changes: { itemName: v } })}
											/>
										) : (
											<div className="font-medium">{i.itemName}</div>
										)}
										<div className="text-xs text-muted-foreground">{i.itemCode}</div>
									</td>
									<td className="p-2">
										{ownsCatalogue ? (
											<CellInput
												value={i.unitPrice != null ? String(i.unitPrice) : null}
												onSave={(v) => v && save.mutate({ id: i.id, changes: { unitPrice: Number(v) } })}
											/>
										) : i.unitPrice != null ? (
											`KES ${i.unitPrice}`
										) : (
											"-"
										)}
									</td>
									<td className="p-2">
										{i.itemType === "SERVICE" ? (
											"-"
										) : ownsCatalogue ? (
											<CellInput
												value={i.availableStock != null ? String(i.availableStock) : null}
												onSave={(v) => v && save.mutate({ id: i.id, changes: { availableStock: Number(v) } })}
											/>
										) : (
											i.availableStock
										)}
									</td>
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
function CellInput({
	value,
	onSave,
	wide,
}: {
	value: string | null;
	onSave: (v: string | null) => void;
	wide?: boolean;
}) {
	const [v, setV] = useState(value ?? "");
	return (
		<Input
			className={`h-8 ${wide ? "w-48" : "w-28"}`}
			value={v}
			onChange={(e) => setV(e.target.value)}
			onBlur={() => {
				if ((value ?? "") !== v) onSave(v.trim() || null);
			}}
		/>
	);
}

const EMPTY: NewCatalogueItem = {
	itemName: "",
	unitPrice: 0,
	availableStock: 0,
	itemType: "GOOD",
	colour: "",
	size: "",
};

/** SokoReply-only plan: add a product. A dress in three colours is three rows, one per colour. */
function AddProduct() {
	const qc = useQueryClient();
	const [item, setItem] = useState<NewCatalogueItem>(EMPTY);
	const [price, setPrice] = useState("");
	const [stock, setStock] = useState("");
	const add = useMutation({
		mutationFn: smmService.addItem,
		onSuccess: (saved) => {
			qc.setQueryData<CatalogueItem[]>(["smm-catalogue"], (old) => [...(old ?? []), saved]);
			message.success(`${saved.itemName} added`);
			setItem(EMPTY);
			setPrice("");
			setStock("");
		},
		onError: (e: Error) => message.error(e.message),
	});
	const service = item.itemType === "SERVICE";
	const ready = item.itemName.trim() !== "" && price.trim() !== "" && (service || stock.trim() !== "");

	return (
		<form
			className="flex flex-wrap items-end gap-2 rounded-md border p-3"
			onSubmit={(e) => {
				e.preventDefault();
				if (!ready) return;
				add.mutate({
					...item,
					unitPrice: Number(price),
					availableStock: service ? 0 : Number(stock),
					colour: item.colour || null,
					size: item.size || null,
				});
			}}
		>
			<Input
				className="h-9 w-48"
				placeholder="Product or service name"
				value={item.itemName}
				onChange={(e) => setItem({ ...item, itemName: e.target.value })}
			/>
			<Input
				className="h-9 w-28"
				placeholder="Price (KES)"
				inputMode="decimal"
				value={price}
				onChange={(e) => setPrice(e.target.value)}
			/>
			<select
				aria-label="Type"
				className="h-9 rounded-md border bg-transparent px-2 text-sm"
				value={item.itemType}
				onChange={(e) => setItem({ ...item, itemType: e.target.value as "GOOD" | "SERVICE" })}
			>
				<option value="GOOD">Product</option>
				<option value="SERVICE">Service</option>
			</select>
			{!service && (
				<>
					<Input
						className="h-9 w-24"
						placeholder="Stock"
						inputMode="numeric"
						value={stock}
						onChange={(e) => setStock(e.target.value)}
					/>
					<Input
						className="h-9 w-28"
						placeholder="Colour"
						value={item.colour ?? ""}
						onChange={(e) => setItem({ ...item, colour: e.target.value })}
					/>
					<Input
						className="h-9 w-20"
						placeholder="Size"
						value={item.size ?? ""}
						onChange={(e) => setItem({ ...item, size: e.target.value })}
					/>
				</>
			)}
			<Button type="submit" disabled={!ready || add.isPending}>
				Add
			</Button>
		</form>
	);
}
