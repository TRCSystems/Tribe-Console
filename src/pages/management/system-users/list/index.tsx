// src/pages/management/system-users/list/index.tsx

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import userManagementService from "@/api/services/userManagementService";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

export default function SystemUsersListPage() {
	const [searchTerm, setSearchTerm] = useState("");
	const [roleFilter, setRoleFilter] = useState("all");

	const {
		data: users = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["system-users"],
		queryFn: userManagementService.getUsers,
	});

	const filteredUsers = users.filter((user) => {
		const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesRole = roleFilter === "all" || user.role === roleFilter;
		return matchesSearch && matchesRole;
	});

	const getStatusVariant = (status: string) => {
		switch (status) {
			case "ACTIVE":
				return "success";
			case "INACTIVE":
				return "secondary";
			default:
				return "secondary";
		}
	};

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">System Users</h1>
						<p className="text-muted-foreground">Manage system users and permissions</p>
					</div>
				</div>
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 text-destructive mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Failed to load users</h3>
						<p className="text-muted-foreground mb-4">{(error as Error).message}</p>
						<Button onClick={() => window.location.reload()}>Retry</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div className="flex items-center justify-between">
				<div>
					<h1 className="text-2xl font-bold">System Users</h1>
					<p className="text-muted-foreground">Manage system users and permissions</p>
				</div>
				<Button asChild>
					<Link to="/management/system-users/create">
						<Icon icon="lucide:plus" className="mr-2" />
						Add User
					</Link>
				</Button>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>User Management</CardTitle>
					<CardDescription>Manage all system users and their roles</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex gap-4 mb-6">
						<div className="flex-1">
							<Input
								placeholder="Search users..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
								className="max-w-sm"
							/>
						</div>
						<Select value={roleFilter} onValueChange={setRoleFilter}>
							<SelectTrigger className="w-32">
								<SelectValue placeholder="Role" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Roles</SelectItem>
								<SelectItem value="ADMIN">Admin</SelectItem>
								<SelectItem value="USER">User</SelectItem>
								<SelectItem value="MANAGER">Manager</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{isLoading ? (
						<div className="text-center py-12">
							<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
							<p className="text-muted-foreground">Loading users...</p>
						</div>
					) : (
						<Table>
							<TableHeader>
								<TableRow>
									<TableHead>Username</TableHead>
									<TableHead>Role</TableHead>
									<TableHead>Status</TableHead>
									<TableHead>Created At</TableHead>
									<TableHead>Actions</TableHead>
								</TableRow>
							</TableHeader>
							<TableBody>
								{filteredUsers.map((user) => (
									<TableRow key={user.id}>
										<TableCell className="font-medium">{user.username}</TableCell>
										<TableCell>
											<Badge variant="outline">{user.role}</Badge>
										</TableCell>
										<TableCell>
											<Badge variant={getStatusVariant(user.status)}>{user.status}</Badge>
										</TableCell>
										<TableCell>{new Date(user.createdAt).toLocaleDateString()}</TableCell>
										<TableCell>
											<Button variant="outline" size="sm">
												<Icon icon="lucide:edit" className="h-4 w-4" />
												Edit
											</Button>
										</TableCell>
									</TableRow>
								))}
							</TableBody>
						</Table>
					)}

					{!isLoading && filteredUsers.length === 0 && (
						<div className="text-center py-12 text-muted-foreground">
							<Icon icon="lucide:users" className="h-16 w-16 mx-auto mb-4 opacity-50" />
							<p className="text-lg font-medium">No users found</p>
							<p className="text-sm">Try adjusting your search or filter criteria</p>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
