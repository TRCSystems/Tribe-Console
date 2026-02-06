import { cn } from "@/utils";
import type { NavProps } from "../types";
import { NavGroup } from "./nav-group";

export const NavMini = ({ data, className, ...props }: NavProps) => {
	return (
		<nav className={cn("flex h-full flex-col", className)} {...props}>
			<ul className="flex flex-1 flex-col gap-1">
				{data.map((item, index) => (
					<NavGroup key={item.name || index} name={item.name} items={item.items} />
				))}
			</ul>
		</nav>
	);
};
