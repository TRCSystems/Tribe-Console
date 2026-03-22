//original author : Marcellas
// src/pages/management/user-profile/index.tsx - FIXED

import type { CSSProperties } from "react";
import bannerImage from "@/assets/images/background/banner-1.png";
import { Icon } from "@/components/icon";
import { useUserEmail, useUserInfo, useUserRole } from "@/store/userStore"; // ADDED
import { themeVars } from "@/theme/theme.css";
import { Avatar, AvatarImage } from "@/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { Text, Title } from "@/ui/typography";
import ProfileTab from "./profile-tab";

function UserProfile() {
	const { avatar, username } = useUserInfo();
	const userRole = useUserRole(); // ADDED
	const userEmail = useUserEmail(); // ADDED

	const bgStyle: CSSProperties = {
		position: "absolute",
		inset: 0,
		background: `url(${bannerImage})`,
		backgroundSize: "cover",
		backgroundPosition: "50%",
		backgroundRepeat: "no-repeat",
	};

	const tabs = [
		{
			icon: <Icon icon="solar:user-id-bold" size={24} className="mr-2" />,
			title: "Profile",
			content: <ProfileTab />,
		},
	];

	// Get role display name
	const getRoleDisplayName = (role: string | null) => {
		switch (role) {
			case "ADMIN":
				return "Administrator";
			case "MERCHANT":
				return "Merchant";
			case "SALES_PERSON":
				return "Sales Person";
			case "LEAD_COLLECTOR":
				return "Lead Collector";
			default:
				return "User";
		}
	};

	return (
		<Tabs defaultValue={tabs[0].title} className="w-full">
			<div className="relative flex flex-col justify-center items-center gap-4 p-4">
				<div style={bgStyle} className="h-full w-full z-1" />
				<div className="flex flex-col items-center justify-center gap-2 z-2">
					<Avatar className="h-24 w-24">
						<AvatarImage src={avatar} className="rounded-full" />
					</Avatar>
					<div className="flex flex-col justify-center items-center gap-2">
						<div className="flex items-center gap-2">
							<Title as="h5" className="text-xl">
								{username || "User"}
							</Title>
							<Icon icon="heroicons:check-badge-solid" size={20} color={themeVars.colors.palette.primary.default} />
						</div>
						<Text variant="body2">{getRoleDisplayName(userRole)}</Text>
						{userEmail && (
							<Text variant="body2" className="text-muted-foreground">
								{userEmail}
							</Text>
						)}
					</div>
				</div>
				<TabsList className="z-5">
					{tabs.map((tab) => (
						<TabsTrigger key={tab.title} value={tab.title}>
							{tab.icon}
							{tab.title}
						</TabsTrigger>
					))}
				</TabsList>
			</div>

			{tabs.map((tab) => (
				<TabsContent key={tab.title} value={tab.title}>
					{tab.content}
				</TabsContent>
			))}
		</Tabs>
	);
}

export default UserProfile;
