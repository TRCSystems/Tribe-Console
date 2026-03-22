//original author : Marcellas
// src/pages/management/system-users/create/index.tsx - FIXED SELECT ISSUE
import { useMutation } from "@tanstack/react-query";
import { Form, message } from "antd";
import { useNavigate } from "react-router";
import userService from "@/api/services/userService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

export default function CreateUserPage() {
	const navigate = useNavigate();
	const [form] = Form.useForm();

	const createUserMutation = useMutation({
		mutationFn: userService.createUser,
		onSuccess: (data) => {
			if (data.status === "200" || data.status === "201" || data.status === "SUCCESS") {
				message.success("✅ User created successfully!");
				form.resetFields();
				setTimeout(() => {
					navigate("/management/merchant/list");
				}, 1500);
			} else if (data.status === "500") {
				if (data.message?.includes("rowsAffected: 0")) {
					message.error("❌ User creation failed: Database error - no user was created. Please check backend logs.");
				} else {
					message.error(`❌ Backend error: ${data.message || "User creation failed"}`);
				}
			} else {
				message.error(`❌ User creation failed: ${data.message || "Unknown error"}`);
			}
		},
		onError: (error: Error) => {
			if (error.message.includes("Failed to fetch")) {
				message.error("🌐 Network error: Cannot connect to server. Please check your connection.");
			} else {
				message.error(`❌ Request failed: ${error.message}`);
			}
		},
	});

	const handleSubmit = (values: {
		username: string;
		password: string;
		role: string;
		status: string;
		merchantId?: string;
	}) => {
		console.log("🛠️ Creating user with data:", values);

		const userData = {
			username: values.username,
			password: values.password,
			role: values.role,
			status: values.status,
			merchantId: values.merchantId || "",
		};

		createUserMutation.mutate(userData);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="outline" size="icon" onClick={() => navigate("/management/merchant/list")}>
					<Icon icon="lucide:arrow-left" className="h-4 w-4" />
				</Button>
				<div>
					<h1 className="text-2xl font-bold">Create System User</h1>
					<p className="text-muted-foreground">Add a new user to the system</p>
				</div>
			</div>

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>User Information</CardTitle>
					<CardDescription>Enter the details for the new user account</CardDescription>
				</CardHeader>
				<CardContent>
					<Form
						form={form}
						layout="vertical"
						onFinish={handleSubmit}
						initialValues={{
							role: "MERCHANT",
							status: "ACTIVE",
						}}
					>
						<div className="space-y-4">
							{/* Username Field */}
							<Form.Item
								name="username"
								label="Username"
								rules={[
									{ required: true, message: "Please enter a username" },
									{ min: 3, message: "Username must be at least 3 characters" },
								]}
							>
								<Input placeholder="Enter username" />
							</Form.Item>

							{/* Password Field */}
							<Form.Item
								name="password"
								label="Password"
								rules={[
									{ required: true, message: "Please enter a password" },
									{ min: 6, message: "Password must be at least 6 characters" },
								]}
							>
								<Input type="password" placeholder="Enter password" />
							</Form.Item>

							{/* Role Field - FIXED SELECT */}
							<Form.Item name="role" label="Role" rules={[{ required: true, message: "Please select a role" }]}>
								<Select onValueChange={(value) => form.setFieldValue("role", value)} defaultValue="MERCHANT">
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select role" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ADMIN">Admin</SelectItem>
										<SelectItem value="LEAD_COLLECTOR">Lead Collector</SelectItem>
										<SelectItem value="MERCHANT">Merchant</SelectItem>
										<SelectItem value="SALES_PERSON">Sales Person</SelectItem>
									</SelectContent>
								</Select>
							</Form.Item>

							{/* Status Field - FIXED SELECT */}
							<Form.Item name="status" label="Status" rules={[{ required: true, message: "Please select a status" }]}>
								<Select onValueChange={(value) => form.setFieldValue("status", value)} defaultValue="ACTIVE">
									<SelectTrigger className="w-full">
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ACTIVE">Active</SelectItem>
										<SelectItem value="INACTIVE">Inactive</SelectItem>
									</SelectContent>
								</Select>
							</Form.Item>

							{/* Form Actions */}
							<div className="flex gap-4 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => navigate("/management/merchant/list")}
									disabled={createUserMutation.isPending}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={createUserMutation.isPending}>
									{createUserMutation.isPending ? (
										<>
											<Icon icon="eos-icons:loading" className="mr-2" />
											Creating User...
										</>
									) : (
										"Create User"
									)}
								</Button>
							</div>
						</div>
					</Form>
				</CardContent>
			</Card>
		</div>
	);
}
