import { cn } from "@/utils";
import type { NavGroupProps } from "../types";
import { NavList } from "./nav-list";

export function NavGroup({ name, items }: NavGroupProps) {
	// detect footer group
	const isFooter = name === "sys.nav.footer";

	return (
		<li className={cn(isFooter && "mt-auto")}>
			<ul className="flex flex-col gap-1">
				{items.map((item, index) => (
					<NavList key={item.title || index} data={item} depth={1} />
				))}
			</ul>
		</li>
	);
}
