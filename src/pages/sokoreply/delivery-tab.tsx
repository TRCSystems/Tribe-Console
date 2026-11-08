// Step 3: delivery zones (what "niko Kisumu" gets answered with) and sets sold together
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import smmService, { type DeliveryMethod, type DeliveryZone } from "@/api/services/smmService";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Field } from "./shop-tab";

const METHODS: { value: DeliveryMethod; label: string }[] = [
	{ value: "RIDER", label: "Rider" },
	{ value: "BUS_PARCEL", label: "Bus parcel" },
	{ value: "COURIER", label: "Courier" },
	{ value: "PICKUP", label: "Pick up at the shop" },
];

const NEW_ZONE: DeliveryZone = { name: "", places: "", fee: null, days: "", method: "RIDER" };

export function DeliveryTab({ onNext }: { onNext: () => void }) {
	const qc = useQueryClient();
	const zones = useQuery({ queryKey: ["smm-zones"], queryFn: smmService.zones });
	const sets = useQuery({ queryKey: ["smm-sets"], queryFn: smmService.sets });
	const [zone, setZone] = useState<DeliveryZone>(NEW_ZONE);
	const [set, setSet] = useState({ name: "", itemCodes: "", setPrice: "", optionalItemCodes: "" });

	const done = (key: string, text: string) => () => {
		message.success(text);
		qc.invalidateQueries({ queryKey: [key] });
	};
	const fail = (e: Error) => message.error(e.message);

	const saveZone = useMutation({
		mutationFn: () => smmService.saveZone(zone),
		onSuccess: () => {
			setZone(NEW_ZONE);
			done("smm-zones", "Zone saved")();
		},
		onError: fail,
	});
	const removeZone = useMutation({
		mutationFn: smmService.removeZone,
		onSuccess: done("smm-zones", "Removed"),
		onError: fail,
	});
	const saveSet = useMutation({
		mutationFn: () =>
			smmService.saveSet({
				name: set.name,
				itemCodes: split(set.itemCodes),
				setPrice: Number(set.setPrice),
				optionalItemCodes: split(set.optionalItemCodes),
			}),
		onSuccess: () => {
			setSet({ name: "", itemCodes: "", setPrice: "", optionalItemCodes: "" });
			done("smm-sets", "Set saved")();
		},
		onError: fail,
	});
	const removeSet = useMutation({
		mutationFn: smmService.removeSet,
		onSuccess: done("smm-sets", "Removed"),
		onError: fail,
	});

	return (
		<div className="grid gap-4 md:grid-cols-2">
			<Card>
				<CardHeader>
					<CardTitle>Delivery zones</CardTitle>
					<CardDescription>
						Where you deliver and what it costs. A buyer outside every zone gets a polite answer, not a promise you
						cannot keep.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{(zones.data ?? []).map((z) => (
						<div key={z.id} className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm">
							<div>
								<div className="font-medium">
									{z.name} · {METHODS.find((m) => m.value === z.method)?.label}
									{z.fee != null ? ` · KES ${z.fee}` : ""}
									{z.days ? ` · ${z.days}` : ""}
								</div>
								{z.places && <div className="text-xs text-muted-foreground">{z.places}</div>}
							</div>
							<Button size="sm" variant="outline" onClick={() => z.id && removeZone.mutate(z.id)}>
								Remove
							</Button>
						</div>
					))}
					<div className="grid gap-2 rounded-md border p-2 md:grid-cols-2">
						<Field label="Zone name" hint="e.g. Nairobi CBD, Upcountry, East Africa">
							<Input value={zone.name} onChange={(e) => setZone({ ...zone, name: e.target.value })} />
						</Field>
						<Field label="How">
							<select
								className="h-9 rounded-md border bg-transparent px-2"
								value={zone.method}
								onChange={(e) => setZone({ ...zone, method: e.target.value as DeliveryMethod })}
							>
								{METHODS.map((m) => (
									<option key={m.value} value={m.value}>
										{m.label}
									</option>
								))}
							</select>
						</Field>
						<Field label="Places" hint="Comma separated: CBD, Ngara, Upper Hill" wide>
							<Input value={zone.places ?? ""} onChange={(e) => setZone({ ...zone, places: e.target.value })} />
						</Field>
						<Field label="Fee (KES)">
							<Input
								value={zone.fee ?? ""}
								onChange={(e) => setZone({ ...zone, fee: e.target.value ? Number(e.target.value) : null })}
								inputMode="numeric"
							/>
						</Field>
						<Field label="How long" hint="e.g. same day, 1-2 days">
							<Input value={zone.days ?? ""} onChange={(e) => setZone({ ...zone, days: e.target.value })} />
						</Field>
						<div className="md:col-span-2">
							<Button size="sm" onClick={() => saveZone.mutate()} disabled={!zone.name || saveZone.isPending}>
								Add zone
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>

			<Card>
				<CardHeader>
					<CardTitle>Sets and outfits</CardTitle>
					<CardDescription>
						Items sold together at one price, e.g. a full outfit or a 3-in-1 suitcase set. Use the item codes from your
						catalogue.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-3">
					{(sets.data ?? []).map((s) => (
						<div key={s.id} className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm">
							<div>
								<div className="font-medium">
									{s.name} · KES {s.setPrice}
								</div>
								<div className="text-xs text-muted-foreground">{s.itemCodes}</div>
							</div>
							<Button size="sm" variant="outline" onClick={() => s.id && removeSet.mutate(s.id)}>
								Remove
							</Button>
						</div>
					))}
					<div className="grid gap-2 rounded-md border p-2 md:grid-cols-2">
						<Field label="Set name">
							<Input value={set.name} onChange={(e) => setSet({ ...set, name: e.target.value })} />
						</Field>
						<Field label="Set price (KES)">
							<Input
								value={set.setPrice}
								onChange={(e) => setSet({ ...set, setPrice: e.target.value })}
								inputMode="numeric"
							/>
						</Field>
						<Field label="Item codes in the set" hint="Comma separated" wide>
							<Input value={set.itemCodes} onChange={(e) => setSet({ ...set, itemCodes: e.target.value })} />
						</Field>
						<Field label="Optional items" hint="Pieces a buyer may leave out" wide>
							<Input
								value={set.optionalItemCodes}
								onChange={(e) => setSet({ ...set, optionalItemCodes: e.target.value })}
							/>
						</Field>
						<div className="md:col-span-2">
							<Button size="sm" onClick={() => saveSet.mutate()} disabled={!set.name || saveSet.isPending}>
								Add set
							</Button>
						</div>
					</div>
				</CardContent>
			</Card>
			<div className="md:col-span-2">
				<Button variant="outline" onClick={onNext}>
					Next: catalogue
				</Button>
			</div>
		</div>
	);
}

const split = (s: string) =>
	s
		.split(",")
		.map((x) => x.trim())
		.filter(Boolean);
