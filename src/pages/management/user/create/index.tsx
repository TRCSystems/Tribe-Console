//original author : Marcellas
import { useMutation } from "@tanstack/react-query";
import { Form, message } from "antd";
import { useNavigate } from "react-router";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

const userService = {
	createUser: async (userData: { username: string; password: string; role: string; status: string }) => {
		const response = await fetch(`${import.meta.env.VITE_APP_LOYALTY_ENGINE_URL}/api/v1/user/add`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(userData),
		});

		if (!response.ok) {
			throw new Error(`Failed to create user: ${response.statusText}`);
		}

		return response.json();
	},
};

export default function CreateUserPage() {
	const navigate = useNavigate();
	const [form] = Form.useForm();

	const createUserMutation = useMutation({
		mutationFn: userService.createUser,
		onSuccess: () => {
			message.success("User created successfully!");
			form.resetFields();
			navigate("/management/merchant/list");
		},
		onError: (error: Error) => {
			message.error(`Failed to create user: ${error.message}`);
		},
	});

	const handleSubmit = (values: { username: string; password: string; role: string; status: string }) => {
		createUserMutation.mutate(values);
	};

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="outline" size="icon" onClick={() => navigate("/management/merchant/list")}>
					<Icon icon="lucide:arrow-left" className="h-4 w-4" />
				</Button>
				<div>
					<h1 className="text-2xl font-bold">Create User</h1>
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
							role: "MANAGER",
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

							{/* Role Field */}
							<Form.Item name="role" label="Role" rules={[{ required: true, message: "Please select a role" }]}>
								<Select>
									<SelectTrigger>
										<SelectValue placeholder="Select role" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ADMIN">Admin</SelectItem>
										<SelectItem value="MANAGER">Manager</SelectItem>
									</SelectContent>
								</Select>
							</Form.Item>

							{/* Status Field */}
							<Form.Item name="status" label="Status" rules={[{ required: true, message: "Please select a status" }]}>
								<Select>
									<SelectTrigger>
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
