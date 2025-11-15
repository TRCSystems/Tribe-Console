// src/pages/management/system-users/list/index.tsx

import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

// Temporary mock data - you'll replace this with actual API call
const mockUsers = [
	{ id: "1", username: "admin", role: "ADMIN", status: "ACTIVE" },
	{ id: "2", username: "manager1", role: "MANAGER", status: "ACTIVE" },
	{ id: "3", username: "manager2", role: "MANAGER", status: "INACTIVE" },
];

export default function SystemUsersListPage() {
	const navigate = useNavigate();

	const { data: users = [], isLoading } = useQuery({
		queryKey: ["system-users"],
		queryFn: async () => {
			// TODO: Replace with actual API call
			// return userService.getUsers();
			return mockUsers;
		},
	});

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">System Users</h1>
					<p className="text-muted-foreground">Manage system users and their permissions</p>
				</div>
				<Button onClick={() => navigate("/management/system-users/create")}>
					<Icon icon="lucide:user-plus" className="mr-2" />
					Create User
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>User List</CardTitle>
					<CardDescription>All system users with their roles and status</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Username</TableHead>
								<TableHead>Role</TableHead>
								<TableHead>Status</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={4} className="text-center">
										<Icon icon="eos-icons:loading" className="h-6 w-6 mx-auto mb-2" />
										Loading users...
									</TableCell>
								</TableRow>
							) : (
								users?.map((user) => (
									<TableRow key={user.id}>
										<TableCell className="font-medium">{user.username}</TableCell>
										<TableCell>
											<span
												className={`px-2 py-1 rounded-full text-xs ${
													user.role === "ADMIN" ? "bg-blue-100 text-blue-800" : "bg-green-100 text-green-800"
												}`}
											>
												{user.role}
											</span>
										</TableCell>
										<TableCell>
											<span
												className={`px-2 py-1 rounded-full text-xs ${
													user.status === "ACTIVE" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
												}`}
											>
												{user.status}
											</span>
										</TableCell>
										<TableCell>
											<div className="flex gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => navigate(`/management/system-users/edit/${user.id}`)}
												>
													Edit
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>

					{!isLoading && users.length === 0 && (
						<div className="text-center py-12 text-muted-foreground">
							<Icon icon="lucide:users" className="h-16 w-16 mx-auto mb-4 opacity-50" />
							<p className="text-lg font-medium">No users found</p>
							<p className="text-sm">Get started by creating your first system user</p>
							<Button onClick={() => navigate("/management/system-users/create")} className="mt-4">
								Create First User
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
