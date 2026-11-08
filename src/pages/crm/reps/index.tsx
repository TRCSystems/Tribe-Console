// src/pages/crm/reps/index.tsx - Distributor's field reps (SFA logins)
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import crmService from "@/api/services/crmService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

export default function CrmRepsPage() {
	const queryClient = useQueryClient();
	const [username, setUsername] = useState("");
	const [password, setPassword] = useState("");

	const {
		data: reps = [],
		isLoading,
		error,
	} = useQuery({ queryKey: ["crm", "reps"], queryFn: () => crmService.reps() });

	const create = useMutation({
		mutationFn: () => crmService.createRep(username.trim(), password),
		onSuccess: () => {
			message.success(`Rep ${username.trim()} created — they can now sign in to the SFA app`);
			setUsername("");
			setPassword("");
			queryClient.invalidateQueries({ queryKey: ["crm"] });
		},
		onError: (e: Error) => message.error(e.message),
	});

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-semibold tracking-tight text-foreground">Field reps</h1>
				<p className="text-sm text-muted-foreground">
					Give each rep their own login for the SFA app, so every order is credited to the right person. Assign shops
					from each shop's profile.
				</p>
			</div>

			<div className="grid gap-6 lg:grid-cols-3">
				<Card className="lg:col-span-2">
					<CardHeader>
						<CardTitle>Reps</CardTitle>
					</CardHeader>
					<CardContent>
						{isLoading ? (
							<Icon icon="eos-icons:loading" className="mx-auto h-8 w-8" />
						) : error ? (
							<p className="text-destructive">{(error as Error).message}</p>
						) : reps.length === 0 ? (
							<p className="text-sm text-muted-foreground">No field reps yet.</p>
						) : (
							<Table>
								<TableHeader>
									<TableRow>
										<TableHead>Username</TableHead>
										<TableHead>Status</TableHead>
										<TableHead className="text-right">Shops assigned</TableHead>
									</TableRow>
								</TableHeader>
								<TableBody>
									{reps.map((r) => (
										<TableRow key={r.userId}>
											<TableCell className="font-medium">{r.username}</TableCell>
											<TableCell>{r.status}</TableCell>
											<TableCell className="text-right">{r.assignedShops}</TableCell>
										</TableRow>
									))}
								</TableBody>
							</Table>
						)}
					</CardContent>
				</Card>

				<Card>
					<CardHeader>
						<CardTitle>Add a rep</CardTitle>
						<CardDescription>Share the username and password with the rep in person.</CardDescription>
					</CardHeader>
					<CardContent>
						<form
							className="space-y-3"
							onSubmit={(e) => {
								e.preventDefault();
								create.mutate();
							}}
						>
							<div className="space-y-1">
								<Label htmlFor="rep-username">Username</Label>
								<Input
									id="rep-username"
									value={username}
									onChange={(e) => setUsername(e.target.value)}
									placeholder="e.g. john.kamau"
									autoComplete="off"
								/>
							</div>
							<div className="space-y-1">
								<Label htmlFor="rep-password">Password (8+ characters)</Label>
								<Input
									id="rep-password"
									type="password"
									value={password}
									onChange={(e) => setPassword(e.target.value)}
									autoComplete="new-password"
								/>
							</div>
							<Button
								type="submit"
								className="w-full"
								disabled={create.isPending || username.trim().length < 3 || password.length < 8}
							>
								{create.isPending ? "Creating…" : "Create rep"}
							</Button>
						</form>
					</CardContent>
				</Card>
			</div>
		</div>
	);
}
