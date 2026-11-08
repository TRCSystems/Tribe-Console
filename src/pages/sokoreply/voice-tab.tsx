// Step 6: the seller's voice (their own past replies) and phrases the agents must never use
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useEffect, useState } from "react";
import smmService from "@/api/services/smmService";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Textarea } from "@/ui/textarea";
import { Field } from "./shop-tab";

export function VoiceTab({ onNext }: { onNext: () => void }) {
	const qc = useQueryClient();
	const profile = useQuery({ queryKey: ["smm-profile"], queryFn: smmService.profile });
	const [voice, setVoice] = useState("");
	const [noGo, setNoGo] = useState("");

	useEffect(() => {
		setVoice(profile.data?.voiceSamples ?? "");
		setNoGo(profile.data?.noGoPhrases ?? "");
	}, [profile.data]);

	const importVoice = useMutation({
		mutationFn: smmService.importVoice,
		onSuccess: ({ data, message: msg }) => {
			qc.setQueryData(["smm-profile"], data);
			message.info(msg);
		},
		onError: (e: Error) => message.error(e.message),
	});
	const save = useMutation({
		mutationFn: () => smmService.saveProfile({ voiceSamples: voice, noGoPhrases: noGo }),
		onSuccess: (p) => {
			qc.setQueryData(["smm-profile"], p);
			message.success("Saved");
			onNext();
		},
		onError: (e: Error) => message.error(e.message),
	});

	const count = voice.split("\n").filter((l) => l.trim()).length;

	return (
		<Card>
			<CardHeader>
				<CardTitle>Your voice</CardTitle>
				<CardDescription>
					About 20 of your own past replies, one per line. The agents write every reply fresh in your style; they copy
					how you sound, not your words. We can pull them from your Page.
				</CardDescription>
			</CardHeader>
			<CardContent className="flex flex-col gap-4">
				<div>
					<Button variant="outline" onClick={() => importVoice.mutate()} disabled={importVoice.isPending}>
						{importVoice.isPending ? "Reading your Page…" : "Import my past replies from Facebook"}
					</Button>
				</div>
				<Field label={`Voice samples (${count})`} hint="One reply per line">
					<Textarea rows={10} value={voice} onChange={(e) => setVoice(e.target.value)} />
				</Field>
				<Field label="Never say" hint='One per line, e.g. "free delivery", "original", "100% cotton"'>
					<Textarea rows={4} value={noGo} onChange={(e) => setNoGo(e.target.value)} />
				</Field>
				<div>
					<Button onClick={() => save.mutate()} disabled={save.isPending}>
						Save and see comments
					</Button>
				</div>
			</CardContent>
		</Card>
	);
}
