// src/pages/management/user-account/general-tab.tsx - FIXED
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { UploadAvatar } from "@/components/upload";
import { useUserInfo, useUserEmail, useUserActions } from "@/store/userStore"; // ADDED
import { Button } from "@/ui/button";
import { Card, CardContent, CardFooter } from "@/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel } from "@/ui/form";
import { Input } from "@/ui/input";
import { Switch } from "@/ui/switch";
import { Textarea } from "@/ui/textarea";
import { Text } from "@/ui/typography";

type FieldType = {
	name?: string;
	email?: string;
	phone?: string;
	address?: string;
	city?: string;
	code?: string;
	about: string;
};

export default function GeneralTab() {
	const { avatar, username } = useUserInfo();
	const userEmail = useUserEmail(); // ADDED: Get real email
	const { setUserInfo } = useUserActions(); // ADDED: To update user info
	
	const form = useForm<FieldType>({
		defaultValues: {
			name: username || "", // Use real username
			email: userEmail || "", // Use real email
			phone: "", // Remove faker data
			address: "", // Remove faker data
			city: "", // Remove faker data
			code: "", // Remove faker data
			about: "", // Remove faker data
		},
	});

	const handleClick = () => {
		// Get updated form values
		const formData = form.getValues();
		
		// Update user info in store
		setUserInfo({
			username: formData.name || username,
			email: formData.email || userEmail,
			// Add other fields as needed
		});
		
		toast.success("Update success!");
	};

	return (
		<div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<div className="col-span-1">
				<Card className="flex-col items-center px-6! pb-10! pt-20!">
					<UploadAvatar defaultAvatar={avatar} />

					<div className="flex items-center py-6 gap-2 w-40">
						<Text variant="body1">Public Profile</Text>
						<Switch />
					</div>

					<Button variant="destructive" className="w-40">
						Delete User
					</Button>
				</Card>
			</div>
			<div className="col-span-1">
				<Card>
					<CardContent>
						<Form {...form}>
							<div className="grid grid-cols-1 gap-4 md:grid-cols-2">
								<FormField
									control={form.control}
									name="name"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Username</FormLabel>
											<FormControl>
												<Input {...field} placeholder="Enter your username" />
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="email"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Email</FormLabel>
											<FormControl>
												<Input {...field} type="email" placeholder="Enter your email" />
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="phone"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Phone</FormLabel>
											<FormControl>
												<Input {...field} placeholder="Enter your phone number" />
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="address"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Address</FormLabel>
											<FormControl>
												<Input {...field} placeholder="Enter your address" />
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="city"
									render={({ field }) => (
										<FormItem>
											<FormLabel>City</FormLabel>
											<FormControl>
												<Input {...field} placeholder="Enter your city" />
											</FormControl>
										</FormItem>
									)}
								/>
								<FormField
									control={form.control}
									name="code"
									render={({ field }) => (
										<FormItem>
											<FormLabel>Postal Code</FormLabel>
											<FormControl>
												<Input {...field} placeholder="Enter postal code" />
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
							<div className="mt-4">
								<FormField
									control={form.control}
									name="about"
									render={({ field }) => (
										<FormItem>
											<FormLabel>About</FormLabel>
											<FormControl>
												<Textarea {...field} placeholder="Tell us about yourself..." />
											</FormControl>
										</FormItem>
									)}
								/>
							</div>
						</Form>
					</CardContent>
					<CardFooter className="flex justify-end">
						<Button onClick={handleClick}>Save Changes</Button>
					</CardFooter>
				</Card>
			</div>
		</div>
	);
}