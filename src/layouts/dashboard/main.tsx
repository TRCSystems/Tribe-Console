import { clone, concat } from "ramda";
import { Suspense } from "react";
import { Outlet, ScrollRestoration, useLocation } from "react-router";
import { AuthGuard } from "@/components/auth/auth-guard";
import { LineLoading } from "@/components/loading";
import { GLOBAL_CONFIG } from "@/global-config";
import Page403 from "@/pages/sys/error/Page403";
import { useSettings } from "@/store/settingStore";
import { cn } from "@/utils";
import { flattenTrees } from "@/utils/tree";
import { backendNavData } from "./nav/nav-data/nav-data-backend";
import { frontendNavData } from "./nav/nav-data/nav-data-frontend";

/**
 * find auth by path
 * @param path
 * @returns
 */
function findAuthByPath(path: string): string[] {
	const foundItem = allItems.find((item) => item.path === path);
	return foundItem?.auth || [];
}

const navData = GLOBAL_CONFIG.routerMode === "frontend" ? clone(frontendNavData) : backendNavData;
const allItems = navData.reduce((acc: any[], group) => {
	const flattenedItems = flattenTrees(group.items);
	return concat(acc, flattenedItems);
}, []);

const Main = () => {
	const { themeStretch } = useSettings();

	const { pathname } = useLocation();
	const currentNavAuth = findAuthByPath(pathname);

	return (
		<AuthGuard checkAny={currentNavAuth} fallback={<Page403 />}>
			<main
				data-slot="slash-layout-main"
				className={cn(
					"relative flex w-full flex-auto flex-col",
					"transition-[max-width] duration-300 ease-in-out",
					"mx-auto px-4 py-5 sm:px-6 sm:py-6 md:px-8",
					{
						"max-w-full": themeStretch,
						"xl:max-w-[1480px]": !themeStretch,
					},
				)}
				style={{
					willChange: "max-width",
				}}
			>
				<div className="relative min-h-[calc(100vh-var(--layout-header-height)-2rem)]">
					<Suspense fallback={<LineLoading />}>
						<Outlet />
						<ScrollRestoration />
					</Suspense>
				</div>
			</main>
		</AuthGuard>
	);
};

export default Main;
