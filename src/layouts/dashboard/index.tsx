import { ThemeLayout } from "#/enum";
import { down, useMediaQuery } from "@/hooks";
import { useSettings } from "@/store/settingStore";
import Header from "./header";
import Main from "./main";
import { NavHorizontalLayout, NavMobileLayout, NavVerticalLayout, useFilteredNavData } from "./nav";

export default function DashboardLayout() {
	const isMobile = useMediaQuery(down("md"));

	return (
		<div data-slot="slash-layout-root" className="relative min-h-screen w-full overflow-x-clip bg-background">
			<div className="pointer-events-none absolute inset-x-0 top-0 h-48 bg-gradient-to-b from-sky-500/8 via-sky-500/4 to-transparent" />
			{isMobile ? <MobileLayout /> : <PcLayout />}
		</div>
	);
}

function MobileLayout() {
	const navData = useFilteredNavData();
	return (
		<>
			{/* Sticky Header */}
			<Header leftSlot={<NavMobileLayout data={navData} />} />
			<Main />
		</>
	);
}

function PcLayout() {
	const { themeLayout } = useSettings();

	if (themeLayout === ThemeLayout.Horizontal) return <PcHorizontalLayout />;
	return <PcVerticalLayout />;
}

function PcHorizontalLayout() {
	const navData = useFilteredNavData();
	return (
		<>
			<div className="fixed inset-x-0 top-0 z-nav bg-background px-2 pt-2 sm:px-4">
				<Header />
				<NavHorizontalLayout data={navData} />
			</div>

			<div
				style={{
					paddingTop: "calc(var(--layout-header-height) + var(--layout-nav-height-horizontal) + 20px)",
				}}
			>
				<Main />
			</div>
		</>
	);
}

function PcVerticalLayout() {
	const settings = useSettings();
	const { themeLayout } = settings;
	const navData = useFilteredNavData();

	const mainPaddingLeft =
		themeLayout === ThemeLayout.Vertical ? "var(--layout-nav-width)" : "var(--layout-nav-width-mini)";

	return (
		<>
			{/* Fixed Header */}
			<NavVerticalLayout data={navData} />

			<div
				className="relative flex min-h-screen w-full flex-col transition-[padding] duration-300 ease-in-out"
				style={{
					paddingLeft: mainPaddingLeft,
				}}
			>
				<Header />
				<Main />
			</div>
		</>
	);
}
