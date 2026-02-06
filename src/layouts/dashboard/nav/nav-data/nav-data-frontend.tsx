import { Icon } from "@/components/icon";
import type { NavProps } from "@/components/nav";

export const frontendNavData: NavProps["data"] = [
	/*{
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
	},*/
	{
		name: "sys.nav.pages",
		items: [
			{
				title: "sys.nav.pos",
				path: "/pos",
				icon: <Icon icon="lucide:shopping-cart" size="24" />,
			},
			/*	{
				title: "sys.nav.management",
				path: "/management",
				icon: <Icon icon="local:ic-management" size="24" />,
				children: [ 
					/*{
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
					},*/
			/*	{
						title: "sys.nav.campaign.index",
						path: "/management/campaign",
						children: [
							{
								title: "sys.nav.campaign.list",
								path: "/management/campaign/list",
							},
						],
					}, */
			/*{
						title: "sys.nav.merchant.index",
						path: "/management/merchant",
						children: [
							{
								title: "sys.nav.merchant.list",
								path: "/management/merchant/list",
							},
						],
					}, */

			/*	{
						title: "System Users",
						path: "/management/system-users",
						children: [
							{
								title: "Create User",
								path: "/management/system-users/create",
							},
							{ title: "TRIBE_Users", path: "/management/system-users/list" },
						],
					},
				],
			}, */
			{
				title: "sys.nav.inventory.index",
				path: "/inventory",
				icon: <Icon icon="lucide:package" size="24" />,
				children: [
					{
						title: "sys.nav.inventory.stock",
						path: "/inventory/stock",
					},
					{
						title: "sys.nav.inventory.expenses",
						path: "/inventory/expenses",
					},
				],
			},
			//	{ title: "marketing", path: "/marketing", icon: <Icon icon="lucide:megaphone" size="24" /> },
			{ title: "Stock_Finance", path: "/finance", icon: <Icon icon="lucide:coins" size="24" /> },
			//{ title: "Features..?", path: "/features", icon: <Icon icon="lucide:help-circle" size="24" /> },
		],
	},
	{
		name: "sys.nav.footer",
		items: [
			{
				title: "sys.nav.features",
				path: "/features",
				icon: <Icon icon="lucide:help-circle" size="24" />,
			},
		],
	},
];
