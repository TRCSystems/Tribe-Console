// Step 2: shop details the agents use in replies, and where urgent alerts go
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useEffect, useState } from "react";
import smmService, { type SellerProfile } from "@/api/services/smmService";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Textarea } from "@/ui/textarea";

type Form = Pick<
	SellerProfile,
	| "locationText"
	| "landmarkDirections"
	| "openingHours"
	| "whatsappNumber"
	| "staffContacts"
	| "tone"
	| "languages"
	| "alertLanguage"
> & { mapLat: string; mapLng: string };

const EMPTY: Form = {
	locationText: "",
	landmarkDirections: "",
	openingHours: "",
	whatsappNumber: "",
	staffContacts: "",
	tone: "",
	languages: "sw,en",
	alertLanguage: "en",
	mapLat: "",
	mapLng: "",
};

export function ShopTab({ onNext }: { onNext: () => void }) {
	const qc = useQueryClient();
	const profile = useQuery({ queryKey: ["smm-profile"], queryFn: smmService.profile });
	const [form, setForm] = useState<Form>(EMPTY);

	useEffect(() => {
		const p = profile.data;
		if (!p) return;
		setForm({
			locationText: p.locationText ?? "",
			landmarkDirections: p.landmarkDirections ?? "",
			openingHours: p.openingHours ?? "",
			whatsappNumber: p.whatsappNumber ?? "",
			staffContacts: p.staffContacts ?? "",
			tone: p.tone ?? "",
			languages: p.languages ?? "sw,en",
			alertLanguage: p.alertLanguage ?? "en",
			mapLat: p.mapLat?.toString() ?? "",
			mapLng: p.mapLng?.toString() ?? "",
		});
	}, [profile.data]);

	const save = useMutation({
		mutationFn: () =>
			smmService.saveProfile({
				...form,
				mapLat: form.mapLat ? Number(form.mapLat) : null,
				mapLng: form.mapLng ? Number(form.mapLng) : null,
			}),
		onSuccess: (p) => {
			qc.setQueryData(["smm-profile"], p);
			message.success("Saved");
			onNext();
		},
		onError: (e: Error) => message.error(e.message),
	});

	const set = (k: keyof Form) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
		setForm({ ...form, [k]: e.target.value });

	return (
		<Card>
			<CardHeader>
				<CardTitle>Shop details</CardTitle>
				<CardDescription>
					What the agents tell buyers who ask "mko wapi?", and where we reach you. Directions by landmark work better
					than "see caption".
				</CardDescription>
			</CardHeader>
			<CardContent className="grid gap-4 md:grid-cols-2">
				<Field label="Where you are" hint="e.g. Moi Avenue, Bihi Towers 6th floor, suite 2">
					<Input value={form.locationText ?? ""} onChange={set("locationText")} />
				</Field>
				<Field label="Opening hours" hint="e.g. Mon-Sat 8am-7pm, Sun closed">
					<Input value={form.openingHours ?? ""} onChange={set("openingHours")} />
				</Field>
				<Field label="Landmark directions" hint="e.g. opposite Sonford, take the lift to the 6th floor" wide>
					<Textarea rows={2} value={form.landmarkDirections ?? ""} onChange={set("landmarkDirections")} />
				</Field>
				<Field label="Map pin: latitude" hint="From Google Maps: press and hold on your shop">
					<Input value={form.mapLat} onChange={set("mapLat")} placeholder="-1.2833" />
				</Field>
				<Field label="Map pin: longitude">
					<Input value={form.mapLng} onChange={set("mapLng")} placeholder="36.8219" />
				</Field>
				<Field label="Your WhatsApp number" hint="Buyers who ask for WhatsApp get this; urgent alerts come here too">
					<Input value={form.whatsappNumber ?? ""} onChange={set("whatsappNumber")} placeholder="0712 345 678" />
				</Field>
				<Field label="Alert language">
					<select
						className="h-9 rounded-md border bg-transparent px-2"
						value={form.alertLanguage}
						onChange={(e) => setForm({ ...form, alertLanguage: e.target.value as "en" | "sw" })}
					>
						<option value="en">English</option>
						<option value="sw">Kiswahili</option>
					</select>
				</Field>
				<Field label="Staff who take over" hint="One per line: name | phone" wide>
					<Textarea
						rows={3}
						value={form.staffContacts ?? ""}
						onChange={set("staffContacts")}
						placeholder={"Wanjiku | 0712 000 000"}
					/>
				</Field>
				<Field label="How you address buyers" hint="e.g. dada, mrembo, bro, formal">
					<Input value={form.tone ?? ""} onChange={set("tone")} />
				</Field>
				<Field label="Languages" hint="sw,en or en">
					<Input value={form.languages ?? ""} onChange={set("languages")} />
				</Field>
				<div className="md:col-span-2">
					<Button onClick={() => save.mutate()} disabled={save.isPending}>
						Save and continue
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}

export function Field({
	label,
	hint,
	wide,
	children,
}: {
	label: string;
	hint?: string;
	wide?: boolean;
	children: React.ReactNode;
}) {
	return (
		// biome-ignore lint/a11y/noLabelWithoutControl: the input is passed in as children
		<label className={`flex flex-col gap-1 ${wide ? "md:col-span-2" : ""}`}>
			<span className="text-sm font-medium">{label}</span>
			{children}
			{hint && <span className="text-xs text-muted-foreground">{hint}</span>}
		</label>
	);
}
