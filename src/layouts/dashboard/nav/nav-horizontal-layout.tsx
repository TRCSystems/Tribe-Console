import { NavHorizontal } from "@/components/nav";
import type { NavProps } from "@/components/nav/types";
import { ScrollArea, ScrollBar } from "@/ui/scroll-area";

export function NavHorizontalLayout({ data }: NavProps) {
	return (
		<nav
			data-slot="slash-layout-nav"
			className={
				"relative z-nav mt-2 w-auto shrink-0 grow-0 overflow-hidden rounded-2xl border border-white/40 bg-background/92 shadow-[0_12px_32px_-24px_rgba(15,23,42,0.28)] backdrop-blur-xl supports-[backdrop-filter]:bg-background/82"
			}
		>
			<ScrollArea className="whitespace-nowrap bg-transparent px-2">
				<NavHorizontal data={data} />
				<ScrollBar orientation="horizontal" />
			</ScrollArea>
		</nav>
	);
}
