// src/routes/sections/dashboard/nav-data-frontend.tsx - FINAL UPDATED
import { Icon } from "@/components/icon";
import type { NavProps } from "@/components/nav";

export const frontendNavData: NavProps["data"] = [
	{
		name: "sys.nav.dashboard",
		items: [
			{
				title: "sys.nav.workbench",
				path: "/workbench",
				icon: <Icon icon="local:ic-workbench" size="24" />,
			},
			{
				title: "sys.nav.analysis",
				path: "/analysis",
				icon: <Icon icon="local:ic-analysis" size="24" />,
			},
		],
	},
	{
		name: "sys.nav.pages",
		items: [
			// POS - Standalone
			{
				title: "sys.nav.pos",
				path: "/pos",
				icon: <Icon icon="lucide:shopping-cart" size="24" />,
			},
			// Management Section
			{
				title: "sys.nav.management",
				path: "/management",
				icon: <Icon icon="local:ic-management" size="24" />,
				children: [
					{
						title: "sys.nav.user.index",
						path: "/management/user",
						children: [
							{
								title: "sys.nav.user.profile",
								path: "/management/user/profile",
							},
							{
								title: "sys.nav.user.account",
								path: "/management/user/account",
							},
						],
					},
					{
						title: "sys.nav.campaign.index",
						path: "/management/campaign",
						children: [
							{
								title: "sys.nav.campaign.list",
								path: "/management/campaign/list",
							},
						],
					},
					{
						title: "sys.nav.merchant.index",
						path: "/management/merchant",
						children: [
							{
								title: "sys.nav.merchant.list",
								path: "/management/merchant/list",
							},
						],
					},
					// NEW: Inventory Management
					{
						title: "sys.nav.inventory.index",
						path: "/management/inventory",
						children: [
							{
								title: "sys.nav.inventory.stock",
								path: "/management/inventory/stock",
							},
							{
								title: "sys.nav.inventory.expenses",
								path: "/management/inventory/expenses",
							},
							{
								title: "sys.nav.inventory.import",
								path: "/management/inventory/import",
							},
							{
								title: "sys.nav.inventory.closeDay",
								path: "/management/inventory/close-day",
							},
						],
					},
				],
			},
			// NEW: Analytics Section
			{
				title: "sys.nav.analytics.index",
				path: "/analytics",
				icon: <Icon icon="lucide:bar-chart" size="24" />,
				children: [
					{
						title: "sys.nav.analytics.dailySales",
						path: "/analytics/daily-sales",
					},
					{
						title: "sys.nav.analytics.weekly",
						path: "/analytics/weekly",
					},
				],
			},
		],
	},
];
