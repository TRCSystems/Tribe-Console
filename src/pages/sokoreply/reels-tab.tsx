// Step 5: tag which products are on each Reel, so "how much?" gets the right price
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import smmService, { type SocialPost } from "@/api/services/smmService";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";

export function ReelsTab({ onNext }: { onNext: () => void }) {
	const posts = useQuery({ queryKey: ["smm-posts"], queryFn: smmService.posts });
	const catalogue = useQuery({ queryKey: ["smm-catalogue"], queryFn: smmService.catalogue });
	const names = new Map((catalogue.data ?? []).map((i) => [i.itemCode, i.itemName]));

	return (
		<div className="flex flex-col gap-3">
			<Card>
				<CardHeader>
					<CardTitle>Tag your Reels</CardTitle>
					<CardDescription>
						Tell the agents what is in each Reel. Suggestions come from the caption; tap to confirm. Reels without
						products get a reply that asks which item the buyer means.
					</CardDescription>
				</CardHeader>
				{posts.data?.message && posts.data.message !== "Posts" && (
					<CardContent className="text-sm text-amber-600">{posts.data.message}</CardContent>
				)}
			</Card>
			{posts.isLoading && <p className="text-sm text-muted-foreground">Reading your recent Reels…</p>}
			{posts.isError && <p className="text-sm text-red-600">{(posts.error as Error).message}</p>}
			{posts.data?.data.length === 0 && (
				<p className="text-sm text-muted-foreground">No Reels found. Connect a Page first.</p>
			)}
			<div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
				{(posts.data?.data ?? []).map((p) => (
					<PostCard key={p.postId} post={p} names={names} />
				))}
			</div>
			<div>
				<Button variant="outline" onClick={onNext}>
					Next: your voice
				</Button>
			</div>
		</div>
	);
}

function PostCard({ post, names }: { post: SocialPost; names: Map<string, string> }) {
	const qc = useQueryClient();
	const [codes, setCodes] = useState<string[]>(post.tagged);
	const [add, setAdd] = useState("");
	const dirty = codes.join(",") !== post.tagged.join(",");

	const save = useMutation({
		mutationFn: () => smmService.tagPost(post.postId, codes),
		onSuccess: () => {
			message.success("Saved");
			qc.invalidateQueries({ queryKey: ["smm-posts"] });
		},
		onError: (e: Error) => message.error(e.message),
	});

	const toggle = (code: string) => setCodes(codes.includes(code) ? codes.filter((c) => c !== code) : [...codes, code]);

	return (
		<Card>
			<CardContent className="flex flex-col gap-2 pt-4">
				<div className="flex gap-3">
					{post.thumbnail && <img src={post.thumbnail} alt="" className="h-24 w-16 rounded object-cover" />}
					<div className="min-w-0 text-sm">
						<div className="text-xs text-muted-foreground">
							{post.platform === "INSTAGRAM" ? "Instagram" : "Facebook"} · {post.account}
							{post.createdAt ? ` · ${new Date(post.createdAt).toLocaleDateString()}` : ""}
						</div>
						<p className="line-clamp-3">{post.caption || "(no caption)"}</p>
						{post.link && (
							<a href={post.link} target="_blank" rel="noreferrer" className="text-xs text-primary underline">
								Open
							</a>
						)}
					</div>
				</div>
				<div className="flex flex-wrap gap-1">
					{codes.map((c) => (
						<Badge key={c} variant="info" className="cursor-pointer" onClick={() => toggle(c)}>
							{names.get(c) ?? c} ✕
						</Badge>
					))}
					{post.suggested
						.filter((c) => !codes.includes(c))
						.map((c) => (
							<Badge key={c} variant="outline" className="cursor-pointer" onClick={() => toggle(c)}>
								+ {names.get(c) ?? c}
							</Badge>
						))}
				</div>
				<div className="flex gap-2">
					<Input
						className="h-8"
						placeholder="Add item code"
						value={add}
						list="smm-item-codes"
						onChange={(e) => setAdd(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter" && add.trim()) {
								toggle(add.trim());
								setAdd("");
							}
						}}
					/>
					<Button size="sm" disabled={!dirty || save.isPending} onClick={() => save.mutate()}>
						Save
					</Button>
				</div>
				<datalist id="smm-item-codes">
					{[...names.entries()].map(([code, name]) => (
						<option key={code} value={code}>
							{name}
						</option>
					))}
				</datalist>
			</CardContent>
		</Card>
	);
}
