// Daily view: what is waiting for the seller (urgent first), every comment with what the agents did, and buyers
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import smmService, {
	type CommentFilters,
	type CommentRow,
	type LeadFilters,
	type SmmComment,
} from "@/api/services/smmService";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

const REASONS: Record<string, string> = {
	NEGATIVE: "Harmful comment (hidden)",
	COMPLAINT: "Complaint",
	AFTER_SALES: "Customer needs help",
	BUSINESS_LEAD: "Business lead",
	QUALITY_DOUBT: "Asks about quality",
	ADVICE: "Wants your advice",
	SET: "Set price to confirm",
	UNSURE: "Agents were unsure",
};

// What the Reader can say a comment is about, in the seller's words
const INTENTS: [string, string][] = [
	["PRICE", "Price"],
	["AVAILABILITY", "In stock?"],
	["VARIANT", "Colour or size"],
	["READY_TO_BUY", "Ready to buy"],
	["LOCATION", "Location or delivery"],
	["BOOKING", "Booking"],
	["CONTACT", "Contact or WhatsApp"],
	["SET", "Full set or outfit"],
	["ADVICE", "Wants advice"],
	["QUALITY_DOUBT", "Doubts quality"],
	["BUSINESS_LEAD", "Business lead"],
	["AFTER_SALES", "After a purchase"],
	["COMPLAINT", "Complaint"],
	["COMPLIMENT", "Compliment"],
	["SPAM", "Spam"],
	["OTHER", "Other"],
];

const ALL = "all";

export function CommentsTab() {
	const [commentFilters, setCommentFilters] = useState<CommentFilters>({});
	const [leadFilters, setLeadFilters] = useState<LeadFilters>({});

	const handovers = useQuery({ queryKey: ["smm-handovers"], queryFn: smmService.handovers, refetchInterval: 30000 });
	const comments = useQuery({
		queryKey: ["smm-comments", commentFilters],
		queryFn: () => smmService.comments(0, commentFilters),
		refetchInterval: 30000,
	});
	const leads = useQuery({
		queryKey: ["smm-leads", leadFilters],
		queryFn: () => smmService.leads(0, leadFilters),
		refetchInterval: 60000,
	});
	const posts = useQuery({ queryKey: ["smm-comment-posts"], queryFn: smmService.commentPosts, refetchInterval: 60000 });
	const rate = useQuery({
		queryKey: ["smm-reply-rate"],
		queryFn: () => smmService.replyRate(30),
		refetchInterval: 300000,
	});

	const postOptions = (posts.data ?? []).map((p, i) => ({
		value: p.postId,
		label: `Post ${i + 1} · ${p.comments} comment${p.comments === 1 ? "" : "s"}`,
	}));

	return (
		<div className="flex flex-col gap-4">
			<Card>
				<CardHeader>
					<CardTitle>Waiting for you</CardTitle>
					<CardDescription>
						Comments a person should handle. Harmful ones are already hidden from the public.
					</CardDescription>
				</CardHeader>
				<CardContent className="flex flex-col gap-2">
					{handovers.data?.length === 0 && <p className="text-sm text-muted-foreground">Nothing waiting. 🎉</p>}
					{(handovers.data ?? []).map((h) => (
						<HandoverRow
							key={h.handover.id}
							id={h.handover.id}
							urgent={h.handover.urgent}
							reason={h.handover.reason}
							comment={h.comment}
						/>
					))}
				</CardContent>
			</Card>

			{rate.data && rate.data.sent > 0 && (
				<Card>
					<CardContent className="flex flex-wrap items-center gap-6 py-4 text-sm">
						<div>
							<div className="text-2xl font-semibold">{rate.data.rate}%</div>
							<div className="text-muted-foreground">answered or ordered (last 30 days)</div>
						</div>
						<div>{rate.data.sent} private messages sent</div>
						<div>{rate.data.answered} answered</div>
						<div>{rate.data.ordered} ordered</div>
					</CardContent>
				</Card>
			)}

			<div className="grid gap-4 xl:grid-cols-2">
				<Card>
					<CardHeader>
						<CardTitle>Comments</CardTitle>
						<CardDescription>{comments.data ? `${comments.data.total} found` : "Loading…"}</CardDescription>
						<div className="flex flex-wrap gap-2 pt-2">
							<Filter
								placeholder="All posts"
								value={commentFilters.postId}
								options={postOptions}
								onChange={(postId) => setCommentFilters((f) => ({ ...f, postId }))}
							/>
							<Filter
								placeholder="Any question"
								value={commentFilters.intent}
								options={INTENTS.map(([value, label]) => ({ value, label }))}
								onChange={(intent) => setCommentFilters((f) => ({ ...f, intent }))}
							/>
							<Filter
								placeholder="Everyone"
								value={commentFilters.show}
								options={[
									{ value: "buyers", label: "Buyers" },
									{ value: "not-buyers", label: "Not buyers" },
									{ value: "harmful", label: "Harmful (hidden)" },
								]}
								onChange={(show) => setCommentFilters((f) => ({ ...f, show: show as CommentFilters["show"] }))}
							/>
						</div>
					</CardHeader>
					<CardContent className="flex flex-col gap-2">
						{comments.data?.rows.length === 0 && <p className="text-sm text-muted-foreground">No comments match.</p>}
						{(comments.data?.rows ?? []).map((r) => (
							<CommentCard key={r.comment.id} row={r} />
						))}
					</CardContent>
				</Card>
				<Card>
					<CardHeader>
						<CardTitle>Buyers</CardTitle>
						<CardDescription>
							HOT: wants it now, left a number or answered our message · WARM: asked price, size or place
						</CardDescription>
						<div className="flex flex-wrap gap-2 pt-2">
							<Filter
								placeholder="Any temperature"
								value={leadFilters.temperature}
								options={[
									{ value: "HOT", label: "Hot" },
									{ value: "WARM", label: "Warm" },
									{ value: "COLD", label: "Cold" },
								]}
								onChange={(t) => setLeadFilters((f) => ({ ...f, temperature: t as LeadFilters["temperature"] }))}
							/>
							<Filter
								placeholder="All posts"
								value={leadFilters.postId}
								options={postOptions}
								onChange={(postId) => setLeadFilters((f) => ({ ...f, postId }))}
							/>
						</div>
					</CardHeader>
					<CardContent className="flex flex-col gap-2 text-sm">
						{leads.data?.rows.length === 0 && <p className="text-muted-foreground">No buyers match.</p>}
						{(leads.data?.rows ?? []).map((l) => (
							<div key={l.id} className="flex items-start justify-between gap-2 rounded-md border p-2">
								<div className="min-w-0">
									<div className="font-medium">
										{l.senderName ?? "Buyer"}{" "}
										{l.phoneNumber && <span className="text-muted-foreground">· {l.phoneNumber}</span>}
									</div>
									<div className="truncate text-xs text-muted-foreground">{l.latestMessage}</div>
								</div>
								<Badge variant={l.temperature === "HOT" ? "error" : l.temperature === "WARM" ? "warning" : "outline"}>
									{l.temperature ?? "COLD"}
								</Badge>
							</div>
						))}
					</CardContent>
				</Card>
			</div>
		</div>
	);
}

/** A dropdown filter with an "all" choice; undefined means no filter. */
function Filter({
	placeholder,
	value,
	options,
	onChange,
}: {
	placeholder: string;
	value: string | undefined;
	options: { value: string; label: string }[];
	onChange: (value: string | undefined) => void;
}) {
	return (
		<Select value={value ?? ALL} onValueChange={(v) => onChange(v === ALL ? undefined : v)}>
			<SelectTrigger className="h-8 w-auto min-w-36">
				<SelectValue placeholder={placeholder} />
			</SelectTrigger>
			<SelectContent>
				<SelectItem value={ALL}>{placeholder}</SelectItem>
				{options.map((o) => (
					<SelectItem key={o.value} value={o.value}>
						{o.label}
					</SelectItem>
				))}
			</SelectContent>
		</Select>
	);
}

function HandoverRow({
	id,
	urgent,
	reason,
	comment,
}: {
	id: number;
	urgent: boolean;
	reason: string;
	comment: SmmComment | null;
}) {
	const qc = useQueryClient();
	const [outcome, setOutcome] = useState("");
	const done = useMutation({
		mutationFn: () => smmService.handoverDone(id, outcome),
		onSuccess: () => {
			message.success("Marked as dealt with");
			qc.invalidateQueries({ queryKey: ["smm-handovers"] });
		},
		onError: (e: Error) => message.error(e.message),
	});
	return (
		<div className={`flex flex-col gap-2 rounded-md border p-2 ${urgent ? "border-red-400" : ""}`}>
			<div className="flex items-center gap-2 text-sm">
				{urgent && <Badge variant="error">Urgent</Badge>}
				<span className="font-medium">{REASONS[reason] ?? reason}</span>
				<span className="text-xs text-muted-foreground">
					{comment?.platform === "INSTAGRAM" ? "Instagram" : "Facebook"} · {comment?.commenterName ?? ""}
				</span>
			</div>
			<p className="text-sm">"{comment?.text}"</p>
			<div className="flex gap-2">
				<Input
					className="h-8"
					placeholder="What did you do? (optional)"
					value={outcome}
					onChange={(e) => setOutcome(e.target.value)}
				/>
				<Button size="sm" onClick={() => done.mutate()} disabled={done.isPending}>
					Done
				</Button>
			</div>
		</div>
	);
}

function CommentCard({ row }: { row: CommentRow }) {
	const c = row.comment;
	return (
		<div className="flex flex-col gap-1 rounded-md border p-2 text-sm">
			<div className="flex flex-wrap items-center gap-1 text-xs text-muted-foreground">
				<span>{c.platform === "INSTAGRAM" ? "Instagram" : "Facebook"}</span>
				<span>· {c.commenterName ?? "someone"}</span>
				<span>· {new Date(c.receivedAt).toLocaleString()}</span>
				{c.intent && <Badge variant="outline">{INTENTS.find(([v]) => v === c.intent)?.[1] ?? c.intent}</Badge>}
				{c.buyer && <Badge variant="info">Buyer</Badge>}
				{c.negative && <Badge variant="error">Harmful</Badge>}
				{c.criticism && <Badge variant="warning">Criticism</Badge>}
				{c.backfilled && <Badge variant="outline">Older comment</Badge>}
				{c.sellerAnswered && <Badge variant="outline">You answered it</Badge>}
			</div>
			<p>"{c.text}"</p>
			{row.actions.map((a) => (
				<div key={a.id} className="rounded bg-muted/50 p-1 text-xs">
					<span className="font-medium">
						{a.kind === "PUBLIC" ? "Public reply" : a.kind === "PRIVATE" ? "Private message" : "Hidden"}
						{a.status === "LOGGED" ? " (would send: shadow mode)" : a.status === "FAILED" ? " (failed)" : ""}:
					</span>{" "}
					{a.kind === "HIDE" ? (a.status === "SENT" ? "hidden from the public" : a.error) : a.text}
					{a.buyerRepliedAt && <div className="pt-1 text-green-700">↩ They answered: "{a.buyerReplyText}"</div>}
				</div>
			))}
			{c.state === "FAILED" && <div className="text-xs text-red-600">Could not be read: {c.error}</div>}
		</div>
	);
}
