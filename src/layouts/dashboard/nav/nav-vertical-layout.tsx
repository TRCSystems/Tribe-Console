import { Icon } from "@/components/icon";
import Logo from "@/components/logo";
import { NavMini, NavVertical } from "@/components/nav";
import type { NavProps } from "@/components/nav/types";
import { GLOBAL_CONFIG } from "@/global-config";
import { useSettingActions, useSettings } from "@/store/settingStore";
import { ThemeLayout } from "@/types/enum";
import { Button } from "@/ui/button";
import { ScrollArea } from "@/ui/scroll-area";
import { cn } from "@/utils";

type Props = {
	data: NavProps["data"];
	className?: string;
};

export function NavVerticalLayout({ data, className }: Props) {
	const settings = useSettings();
	const { themeLayout } = settings;
	const { setSettings } = useSettingActions();

	const navWidth = themeLayout === ThemeLayout.Vertical ? "var(--layout-nav-width)" : "var(--layout-nav-width-mini)";
	const handleToggle = () => {
		setSettings({
			...settings,
			themeLayout: themeLayout === ThemeLayout.Mini ? ThemeLayout.Vertical : ThemeLayout.Mini,
		});
	};
	return (
		<nav
			data-slot="slash-layout-nav"
			className={cn(
				"fixed inset-y-0 left-0 z-nav flex h-full flex-col overflow-hidden border-r border-white/50 bg-background/94 shadow-[14px_0_40px_-28px_rgba(15,23,42,0.35)] backdrop-blur-xl transition-[width] duration-300 ease-in-out",
				className,
			)}
			style={{
				width: navWidth,
			}}
		>
			<div
				className={cn(
					"relative flex h-[var(--layout-header-height)] items-center border-b border-border/60 px-3 py-4",
					{
						"justify-center": themeLayout === ThemeLayout.Mini,
					},
				)}
			>
				<div className="flex items-center justify-center">
					<Logo />
					<span
						className="text-xl font-bold transition-all duration-300 ease-in-out"
						style={{
							opacity: themeLayout === ThemeLayout.Mini ? 0 : 1,
							maxWidth: themeLayout === ThemeLayout.Mini ? 0 : "auto",
							whiteSpace: "nowrap",
							marginLeft: themeLayout === ThemeLayout.Mini ? 0 : "8px",
						}}
					>
						{GLOBAL_CONFIG.appName}
					</span>
				</div>

				<Button
					variant="outline"
					size="icon"
					onClick={handleToggle}
					className="absolute right-0 h-8 w-8 translate-x-1/2 rounded-full border-border/70 bg-background shadow-sm"
				>
					{themeLayout === ThemeLayout.Mini ? (
						<Icon icon="lucide:arrow-right-to-line" size={12} />
					) : (
						<Icon icon="lucide:arrow-left-to-line" size={12} />
					)}
				</Button>
			</div>

			<ScrollArea className={cn("h-[calc(100vh-var(--layout-header-height))] bg-transparent px-3 py-3")}>
				{themeLayout === ThemeLayout.Mini ? <NavMini data={data} /> : <NavVertical data={data} />}
			</ScrollArea>
		</nav>
	);
}
