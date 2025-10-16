// src/pages/management/system-users/create/index.tsx - UPDATED WITH ROLES

import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router";
import userManagementService, { USER_ROLES } from "@/api/services/userManagementService";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

export default function CreateSystemUserPage() {
	const navigate = useNavigate();
	const [selectedRole, setSelectedRole] = useState<string>("USER");

	const createMutation = useMutation({
		mutationFn: userManagementService.createUser,
		onSuccess: () => {
			message.success("User created successfully!");
			navigate("/management/system-users/list");
		},
		onError: (error: Error) => {
			message.error(`Failed to create user: ${error.message}`);
		},
	});

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);
		const userData = {
			username: formData.get("username") as string,
			password: formData.get("password") as string,
			role: selectedRole,
			status: formData.get("status") as string,
		};

		createMutation.mutate(userData);
	};

	const getRolePermissions = (role: string) => {
		return USER_ROLES[role as keyof typeof USER_ROLES]?.permissions || [];
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Add System User</h1>
				<p className="text-muted-foreground">Create a new system user account with specific role and permissions</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>User Information</CardTitle>
					<CardDescription>Enter the details for the new system user</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<Label htmlFor="username">Username *</Label>
								<Input id="username" name="username" placeholder="Enter username" required />
							</div>

							<div className="space-y-2">
								<Label htmlFor="password">Password *</Label>
								<Input id="password" name="password" type="password" placeholder="Enter password" required />
							</div>

							<div className="space-y-2">
								<Label htmlFor="role">Role *</Label>
								<Select value={selectedRole} onValueChange={setSelectedRole} name="role" required>
									<SelectTrigger>
										<SelectValue placeholder="Select role" />
									</SelectTrigger>
									<SelectContent>
										{Object.entries(USER_ROLES).map(([key, role]) => (
											<SelectItem key={key} value={role.value}>
												<div className="flex items-center gap-2">
													<span>{role.label}</span>
													<Badge variant="outline" className="text-xs">
														{role.value}
													</Badge>
												</div>
											</SelectItem>
										))}
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="status">Status *</Label>
								<Select name="status" required defaultValue="ACTIVE">
									<SelectTrigger>
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="ACTIVE">Active</SelectItem>
										<SelectItem value="INACTIVE">Inactive</SelectItem>
									</SelectContent>
								</Select>
							</div>
						</div>

						{/* Role Permissions Display */}
						<div className="space-y-3 p-4 bg-muted/50 rounded-lg">
							<Label>Role Permissions</Label>
							<div className="flex flex-wrap gap-2">
								{getRolePermissions(selectedRole).map((permission, index) => (
									<Badge key={index} variant="secondary" className="text-xs">
										{permission === "*" ? "All Permissions" : permission}
									</Badge>
								))}
							</div>
							<p className="text-sm text-muted-foreground">
								This role has {getRolePermissions(selectedRole).length} permission(s)
							</p>
						</div>

						<div className="flex gap-4">
							<Button type="submit" disabled={createMutation.isPending}>
								{createMutation.isPending ? (
									<>
										<Icon icon="eos-icons:loading" className="mr-2" />
										Creating User...
									</>
								) : (
									"Create User"
								)}
							</Button>
							<Button type="button" variant="outline" onClick={() => navigate("/management/system-users/list")}>
								Cancel
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
