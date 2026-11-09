/**
 * Original Author: Marcellas
 * src/routes/sections/main.tsx - Main Application Routes Configuration
 */

import { lazy, Suspense } from "react";
import { Outlet, type RouteObject } from "react-router";
import { LineLoading } from "@/components/loading";
import SimpleLayout from "@/layouts/simple";

const Page403 = lazy(() => import("@/pages/sys/error/Page403"));
const Page404 = lazy(() => import("@/pages/sys/error/Page404"));
const Page500 = lazy(() => import("@/pages/sys/error/Page500"));
const ShopOrderPage = lazy(() => import("@/pages/shop-order"));
const LegalPage = lazy(() => import("@/pages/legal"));

/** Privacy, terms and data deletion: public, linked from Meta's app settings. */
const legalRoutes: RouteObject[] = (["privacy", "terms", "data-deletion"] as const).map((kind) => ({
	path: `/${kind}`,
	element: (
		<Suspense fallback={<LineLoading />}>
			<LegalPage kind={kind} />
		</Suspense>
	),
}));

export const mainRoutes: RouteObject[] = [
	...legalRoutes,
	// Public shop order page, opened from an SMS/WhatsApp link (no login, own layout)
	{
		path: "/o/:token",
		element: (
			<Suspense fallback={<LineLoading />}>
				<ShopOrderPage />
			</Suspense>
		),
	},
	{
		path: "/",
		element: (
			<SimpleLayout>
				<Suspense fallback={<LineLoading />}>
					<Outlet />
				</Suspense>
			</SimpleLayout>
		),
		children: [
			{ path: "500", element: <Page500 /> },
			{ path: "404", element: <Page404 /> },
			{ path: "403", element: <Page403 /> },
		],
	},
];
