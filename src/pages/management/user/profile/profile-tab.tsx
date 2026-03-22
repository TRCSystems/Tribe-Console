//original author : Marcellas
// src/pages/management/user-profile/profile-tab.tsx - FIXED
import { Icon } from "@/components/icon";
import { useMerchantId, useUserEmail, useUserInfo, useUserRole } from "@/store/userStore"; // ADDED
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Text } from "@/ui/typography";

export default function ProfileTab() {
	const { username } = useUserInfo();
	const userEmail = useUserEmail(); // ADDED
	const userRole = useUserRole(); // ADDED
	const merchantId = useMerchantId(); // ADDED

	const AboutItems = [
		{
			icon: <Icon icon="fa-solid:user" size={18} />,
			label: "Full Name",
			val: username || "Not set",
		},
		{
			icon: <Icon icon="eos-icons:role-binding" size={18} />,
			label: "Role",
			val: userRole || "Not set",
		},
		{
			icon: <Icon icon="tabler:building-store" size={18} />,
			label: "Merchant ID", // ADDED: Show merchant ID
			val: merchantId || "Not set",
		},
		{
			icon: <Icon icon="tabler:location-filled" size={18} />,
			label: "Country",
			val: "Kenya", // You can make this dynamic if you have the data
		},
		{
			icon: <Icon icon="ion:language" size={18} />,
			label: "Language",
			val: "English",
		},
		{
			icon: <Icon icon="ph:phone-fill" size={18} />,
			label: "Contact",
			val: "254712656502", // You can add this to user info
		},
		{
			icon: <Icon icon="ic:baseline-email" size={18} />,
			label: "Email",
			val: userEmail || username || "Not set", // Use real email
		},
	];

	return (
		<div className="flex flex-col gap-2">
			<div className="grid grid-cols-1 gap-2 md:grid-cols-3">
				<Card className="col-span-1">
					<CardHeader>
						<CardTitle>About</CardTitle>
						<CardDescription>
							{userRole === "ADMIN"
								? "Administrator account with full system access"
								: userRole === "MERCHANT"
									? "Merchant account for business operations"
									: "User account"}
						</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="flex flex-col gap-4">
							{AboutItems.map((item) => (
								<div className="flex items-center" key={item.label}>
									<div className="mr-3 text-muted-foreground">{item.icon}</div>
									<div className="mr-3 font-medium">{item.label}:</div>
									<div className="opacity-70">{item.val}</div>
								</div>
							))}
						</div>
					</CardContent>
				</Card>

				{/* Additional cards can be added here with real data */}
				<Card className="col-span-2">
					<CardHeader>
						<CardTitle>Account Summary</CardTitle>
						<CardDescription>Your account information and status</CardDescription>
					</CardHeader>
					<CardContent>
						<div className="space-y-4">
							<div className="flex justify-between items-center">
								<Text variant="body1">Account Status</Text>
								<Badge variant="default">Active</Badge>
							</div>
							<div className="flex justify-between items-center">
								<Text variant="body1">Member Since</Text>
								<Text variant="body2">{new Date().toLocaleDateString()}</Text>
							</div>
							<div className="flex justify-between items-center">
								<Text variant="body1">Last Login</Text>
								<Text variant="body2">{new Date().toLocaleString()}</Text>
							</div>
						</div>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
