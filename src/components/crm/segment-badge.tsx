// src/components/crm/segment-badge.tsx
import { SEGMENTS, type Segment } from "@/api/services/crmService";

export function SegmentBadge({ segment }: { segment: Segment | null | undefined }) {
	if (!segment) return <span className="text-xs text-muted-foreground">—</span>;
	const s = SEGMENTS[segment];
	return (
		<span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${s.tone}`} title={s.hint}>
			{s.label}
		</span>
	);
}

export const formatKes = (n: number | null | undefined) =>
	n === null || n === undefined ? "—" : `KES ${Number(n).toLocaleString(undefined, { maximumFractionDigits: 0 })}`;

export const formatDate = (iso: string | null | undefined) => {
	if (!iso) return "—";
	const d = new Date(iso);
	return Number.isNaN(d.getTime()) ? "—" : d.toLocaleDateString(undefined, { day: "numeric", month: "short" });
};
