//original author : Marcellas
// src/pages/management/merchant/list/index.tsx - FINAL VERSION

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router";
import merchantService from "@/api/services/merchantService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

export default function MerchantListPage() {
	const navigate = useNavigate();
	const queryClient = useQueryClient();
	const [merchantToDelete, setMerchantToDelete] = useState<string | null>(null);

	const { data: merchants = [], isLoading } = useQuery({
		queryKey: ["merchants"],
		queryFn: merchantService.getMerchants,
	});

	// Delete merchant mutation
	const deleteMutation = useMutation({
		mutationFn: merchantService.deleteMerchant,
		onSuccess: () => {
			message.success("Merchant deleted successfully!");
			queryClient.invalidateQueries({ queryKey: ["merchants"] });
			setMerchantToDelete(null);
		},
		onError: (error: Error) => {
			message.error(`Failed to delete merchant: ${error.message}`);
			setMerchantToDelete(null);
		},
	});

	const handleDeleteClick = (merchantId: string) => {
		setMerchantToDelete(merchantId.toString());
	};

	const confirmDelete = () => {
		if (merchantToDelete) {
			deleteMutation.mutate(merchantToDelete);
		}
	};

	const cancelDelete = () => {
		setMerchantToDelete(null);
	};

	return (
		<div className="space-y-6">
			{/* Delete Confirmation Modal */}
			{merchantToDelete && (
				<div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
					<Card className="w-full max-w-md">
						<CardHeader>
							<CardTitle className="text-destructive">Delete Merchant</CardTitle>
							<CardDescription>
								Are you sure you want to delete this merchant? This action cannot be undone.
							</CardDescription>
						</CardHeader>
						<CardContent className="flex gap-4 justify-end">
							<Button variant="outline" onClick={cancelDelete} disabled={deleteMutation.isPending}>
								Cancel
							</Button>
							<Button variant="destructive" onClick={confirmDelete} disabled={deleteMutation.isPending}>
								{deleteMutation.isPending ? (
									<>
										<Icon icon="eos-icons:loading" className="mr-2" />
										Deleting...
									</>
								) : (
									"Delete Merchant"
								)}
							</Button>
						</CardContent>
					</Card>
				</div>
			)}

			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">Merchants</h1>
					<p className="text-muted-foreground">Manage your onboarded merchants</p>
				</div>
				<div className="flex gap-2">
					<Button variant="outline" onClick={() => navigate("/management/system-users/create")}>
						<Icon icon="lucide:user-plus" className="mr-2" />
						Create User
					</Button>
					<Button onClick={() => navigate("/management/merchant/create")}>Onboard New Merchant</Button>
				</div>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Merchant List</CardTitle>
					<CardDescription>All merchants registered with the Loyalty Engine</CardDescription>
				</CardHeader>
				<CardContent>
					<Table>
						<TableHeader>
							<TableRow>
								<TableHead>Business Name</TableHead>
								<TableHead>Location</TableHead>
								<TableHead>Till Number</TableHead>
								<TableHead>Business Type</TableHead>
								<TableHead>Business Phone</TableHead>
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={6} className="text-center">
										<Icon icon="eos-icons:loading" className="h-6 w-6 mx-auto mb-2" />
										Loading merchants...
									</TableCell>
								</TableRow>
							) : (
								merchants?.map((merchant) => (
									<TableRow key={merchant.id}>
										<TableCell className="font-medium">{merchant.businessName}</TableCell>
										<TableCell>{merchant.location}</TableCell>
										<TableCell>{merchant.tillNumber}</TableCell>
										<TableCell>{merchant.businessType}</TableCell>
										<TableCell>{merchant.businessPhone}</TableCell>
										<TableCell>
											<div className="flex gap-2">
												<Button
													variant="outline"
													size="sm"
													onClick={() => navigate(`/management/merchant/edit/${merchant.id}`)}
												>
													Edit
												</Button>
												<Button
													variant="outline"
													size="sm"
													className="text-destructive hover:text-destructive"
													onClick={() => handleDeleteClick(merchant.id.toString())}
													disabled={deleteMutation.isPending}
												>
													Delete
												</Button>
											</div>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>

					{!isLoading && merchants.length === 0 && (
						<div className="text-center py-12 text-muted-foreground">
							<Icon icon="lucide:store" className="h-16 w-16 mx-auto mb-4 opacity-50" />
							<p className="text-lg font-medium">No merchants found</p>
							<p className="text-sm">Get started by onboarding your first merchant</p>
							<Button onClick={() => navigate("/management/merchant/create")} className="mt-4">
								Onboard First Merchant
							</Button>
						</div>
					)}
				</CardContent>
			</Card>
		</div>
	);
}
