import type { ReactNode } from "react";
import { cn } from "@/utils";
import Logo from "@/components/logo";
import AccountDropdown from "../components/account-dropdown";
import SearchBar from "../components/search-bar";
import SettingButton from "../components/setting-button";

interface HeaderProps {
	leftSlot?: ReactNode;
}

export default function Header({ leftSlot }: HeaderProps) {
	return (
		<header
			data-slot="slash-layout-header"
			className={cn(
				"relative z-app-bar",
				"flex h-[var(--layout-header-height)] shrink-0 grow-0 items-center justify-between overflow-hidden rounded-2xl px-3 sm:px-4",
				"border border-white/50 bg-background/92 shadow-[0_18px_50px_-30px_rgba(15,23,42,0.35)] backdrop-blur-xl",
				"supports-[backdrop-filter]:bg-background/84",
			)}
		>
			<div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-sky-400/70 to-transparent" />
			<div className="pointer-events-none absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-sky-500/8 to-transparent" />

			<div className="relative flex min-w-0 items-center gap-3">
				{leftSlot}
				<div className="flex min-w-0 items-center gap-2">
					<Logo size={35} />
					<div className="hidden min-w-0 flex-col sm:flex">
						<span className="truncate text-sm font-semibold tracking-[0.18em] text-foreground">TRIBE</span>
					</div>
				</div>
			</div>

			<div className="relative flex items-center gap-2 rounded-2xl border border-border/70 bg-background/72 px-2 py-1 shadow-sm">
				<SearchBar />

				{/*<NoticeButton />*/}
				<SettingButton />
				<AccountDropdown />
			</div>
		</header>
	);
}
