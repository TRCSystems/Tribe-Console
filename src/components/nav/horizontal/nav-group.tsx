import type { NavGroupProps } from "../types";
import { NavList } from "./nav-list";

export function NavGroup({ name, items }: NavGroupProps) {
	const isFooter = name === "sys.nav.footer";

	return (
		<li className={isFooter ? "flex items-center ml-auto" : "flex items-center"}>
			<ul className="flex flex-row gap-1">
				{items.map((item, index) => (
					<NavList key={item.title || index} data={item} depth={1} />
				))}
			</ul>
		</li>
	);
}
