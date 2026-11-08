import { Icon } from "@/components/icon";
import Logo from "@/components/logo";
import { NavMini, NavVertical } from "@/components/nav";
import type { NavProps } from "@/components/nav/types";
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

	const mini = themeLayout === ThemeLayout.Mini;
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
				"fixed inset-y-0 left-0 z-nav flex h-full flex-col overflow-hidden border-r border-border bg-background transition-[width] duration-300 ease-in-out",
				className,
			)}
			style={{
				width: navWidth,
			}}
		>
			<div
				className={cn(
					"flex h-[var(--layout-header-height)] shrink-0 items-center gap-2 px-4",
					mini ? "justify-center px-2" : "justify-between",
				)}
			>
				{mini ? <Logo size={30} /> : <Logo size={30} withText />}
				{!mini && (
					<Button
						variant="ghost"
						size="icon"
						onClick={handleToggle}
						className="h-8 w-8 text-muted-foreground"
						aria-label="Collapse menu"
						title="Collapse menu"
					>
						<Icon icon="lucide:panel-left-close" size={18} />
					</Button>
				)}
			</div>
			{mini && (
				<div className="flex justify-center pb-1">
					<Button
						variant="ghost"
						size="icon"
						onClick={handleToggle}
						className="h-8 w-8 text-muted-foreground"
						aria-label="Expand menu"
						title="Expand menu"
					>
						<Icon icon="lucide:panel-left-open" size={18} />
					</Button>
				</div>
			)}

			<ScrollArea className={cn("h-[calc(100vh-var(--layout-header-height))] bg-transparent px-3 pb-3")}>
				{themeLayout === ThemeLayout.Mini ? <NavMini data={data} /> : <NavVertical data={data} />}
			</ScrollArea>
		</nav>
	);
}
