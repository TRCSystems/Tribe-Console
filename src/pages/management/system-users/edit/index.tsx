//original author : Marcellas
// src/pages/management/system-users/edit/index.tsx - NEW FILE
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Form, message } from "antd";
import { useNavigate, useParams } from "react-router";
import userService from "@/api/services/userService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

export default function EditUserPage() {
	const navigate = useNavigate();
	const { id } = useParams();
	const [form] = Form.useForm();
	const queryClient = useQueryClient();

	// Fetch user data
	const { data: userData, isLoading } = useQuery({
		queryKey: ["user", id],
		queryFn: async () => {
			if (!id) throw new Error("User ID is required");

			// API expects numeric ID but our routes use string
			const numericId = parseInt(id);
			if (Number.isNaN(numericId)) {
				throw new Error("Invalid user ID");
			}

			const response = await userService.getUserById(numericId);
			return response?.respObject || response;
		},
		enabled: !!id,
	});

	// Update user mutation
	const updateMutation = useMutation({
		mutationFn: (data: { attributeName: string; attributeValue: string }) =>
			userService.updateUser({
				id: id!,
				...data,
			}),
		onSuccess: (data) => {
			if (data.status === "200" || data.status === "SUCCESS") {
				message.success("✅ User updated successfully!");
				queryClient.invalidateQueries({ queryKey: ["system-users"] });
				setTimeout(() => {
					navigate("/management/system-users/list");
				}, 1500);
			} else {
				message.error(`❌ Update failed: ${data.message || "Unknown error"}`);
			}
		},
		onError: (error: Error) => {
			message.error(`❌ Request failed: ${error.message}`);
		},
	});

	const handleSubmit = (values: { attributeName: string; attributeValue: string }) => {
		console.log("🛠️ Updating user with data:", values);
		updateMutation.mutate(values);
	};

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div className="flex items-center gap-4">
					<Button variant="outline" size="icon" onClick={() => navigate("/management/system-users/list")}>
						<Icon icon="lucide:arrow-left" className="h-4 w-4" />
					</Button>
					<div>
						<h1 className="text-2xl font-bold">Edit User</h1>
						<p className="text-muted-foreground">Loading user information...</p>
					</div>
				</div>
				<div className="flex items-center justify-center min-h-64">
					<Icon icon="eos-icons:loading" className="h-8 w-8" />
				</div>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center gap-4">
				<Button variant="outline" size="icon" onClick={() => navigate("/management/system-users/list")}>
					<Icon icon="lucide:arrow-left" className="h-4 w-4" />
				</Button>
				<div>
					<h1 className="text-2xl font-bold">Edit User</h1>
					<p className="text-muted-foreground">Update user information</p>
				</div>
			</div>

			<Card className="max-w-2xl">
				<CardHeader>
					<CardTitle>User Information</CardTitle>
					<CardDescription>Update the user account details</CardDescription>
				</CardHeader>
				<CardContent>
					<Form
						form={form}
						layout="vertical"
						onFinish={handleSubmit}
						initialValues={{
							attributeName: "status",
							attributeValue: userData?.status || "ACTIVE",
						}}
					>
						<div className="space-y-4">
							{/* Display current user info */}
							<div className="grid grid-cols-2 gap-4 p-4 bg-muted rounded-lg">
								<div>
									<label className="text-sm font-medium">Username</label>
									<p className="text-lg">{userData?.username}</p>
								</div>
								<div>
									<label className="text-sm font-medium">Role</label>
									<p className="text-lg">{userData?.role}</p>
								</div>
								<div>
									<label className="text-sm font-medium">Current Status</label>
									<p className="text-lg">{userData?.status}</p>
								</div>
								<div>
									<label className="text-sm font-medium">User ID</label>
									<p className="text-lg">{userData?.id}</p>
								</div>
							</div>

							{/* Field to update */}
							<Form.Item
								name="attributeName"
								label="Field to Update"
								rules={[{ required: true, message: "Please select a field to update" }]}
							>
								<Select>
									<SelectTrigger>
										<SelectValue placeholder="Select field" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="status">Status</SelectItem>
										<SelectItem value="role">Role</SelectItem>
										<SelectItem value="password">Password</SelectItem>
									</SelectContent>
								</Select>
							</Form.Item>

							{/* Dynamic value field based on selected attribute */}
							<Form.Item
								noStyle
								shouldUpdate={(prevValues, currentValues) => prevValues.attributeName !== currentValues.attributeName}
							>
								{({ getFieldValue }) => {
									const fieldName = getFieldValue("attributeName");

									if (fieldName === "status") {
										return (
											<Form.Item
												name="attributeValue"
												label="Status"
												rules={[{ required: true, message: "Please select a status" }]}
											>
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
										);
									}

									if (fieldName === "role") {
										return (
											<Form.Item
												name="attributeValue"
												label="Role"
												rules={[{ required: true, message: "Please select a role" }]}
											>
												<Select>
													<SelectTrigger>
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
										);
									}

									return (
										<Form.Item
											name="attributeValue"
											label="New Password"
											rules={[
												{ required: true, message: "Please enter a new password" },
												{ min: 6, message: "Password must be at least 6 characters" },
											]}
										>
											<Input type="password" placeholder="Enter new password" />
										</Form.Item>
									);
								}}
							</Form.Item>

							{/* Form Actions */}
							<div className="flex gap-4 pt-4">
								<Button
									type="button"
									variant="outline"
									onClick={() => navigate("/management/system-users/list")}
									disabled={updateMutation.isPending}
								>
									Cancel
								</Button>
								<Button type="submit" disabled={updateMutation.isPending}>
									{updateMutation.isPending ? (
										<>
											<Icon icon="eos-icons:loading" className="mr-2" />
											Updating User...
										</>
									) : (
										"Update User"
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
