import type { ReactNode } from "react";
import { useMemo } from "react";
import { useLocation } from "react-router";
import type { NavItemDataProps } from "@/components/nav/types";
import useLocale from "@/locales/use-locale";
import { cn } from "@/utils";
import AccountDropdown from "../components/account-dropdown";
import SearchBar from "../components/search-bar";
import SettingButton from "../components/setting-button";
import { useFilteredNavData } from "./nav";

interface HeaderProps {
	leftSlot?: ReactNode;
}

/** "Inventory › Prices" for the page we're on, from the menu (longest matching path wins). */
function useCurrentSection(): { section?: string; page?: string } {
	const { pathname } = useLocation();
	const navData = useFilteredNavData();
	const { t } = useLocale();
	return useMemo(() => {
		let best: { section?: string; page?: string; len: number } = { len: 0 };
		const visit = (items: NavItemDataProps[], parent?: string) => {
			for (const item of items) {
				const path = item.path;
				if (path && (pathname === path || pathname.startsWith(`${path}/`)) && path.length >= best.len) {
					const title = t(item.title);
					best =
						parent && parent !== title
							? { section: parent, page: title, len: path.length }
							: { page: title, len: path.length };
				}
				if (item.children?.length) visit(item.children, t(item.title));
			}
		};
		navData.forEach((group) => visit(group.items));
		return { section: best.section, page: best.page };
	}, [pathname, navData, t]);
}

export default function Header({ leftSlot }: HeaderProps) {
	const { section, page } = useCurrentSection();
	return (
		<header
			data-slot="slash-layout-header"
			className={cn(
				"sticky top-0 z-app-bar flex h-[var(--layout-header-height)] shrink-0 items-center justify-between gap-3",
				"border-b border-border bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:px-6 md:px-8",
			)}
		>
			<div className="flex min-w-0 items-center gap-2">
				{leftSlot}
				<nav aria-label="Breadcrumb" className="flex min-w-0 items-center gap-1.5 text-sm">
					{section && (
						<>
							<span className="truncate text-muted-foreground">{section}</span>
							<span className="text-muted-foreground/60" aria-hidden="true">
								/
							</span>
						</>
					)}
					{page && <span className="truncate font-medium text-foreground">{page}</span>}
				</nav>
			</div>

			<div className="flex shrink-0 items-center gap-1 sm:gap-2">
				<SearchBar />
				<SettingButton />
				<AccountDropdown />
			</div>
		</header>
	);
}
