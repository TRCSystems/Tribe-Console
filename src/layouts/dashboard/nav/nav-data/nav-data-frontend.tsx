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
			// management
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
						title: "sys.nav.campaign.index", // NEW: Campaign section
						path: "/management/campaign",
						children: [
							{
								title: "sys.nav.campaign.list",
								path: "/management/campaign/list",
							},
						],
					},
					{
						title: "sys.nav.merchant.index", // NEW: Merchant section
						path: "/management/merchant",
						children: [
							{
								title: "sys.nav.merchant.list",
								path: "/management/merchant/list",
							},
						],
					},
				],
			},
		],
	},
];
