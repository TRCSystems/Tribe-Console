//original author : Marcellas
// src/pages/management/merchant/edit/index.tsx - FINAL CORRECTED VERSION

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useNavigate, useParams } from "react-router";
import merchantService from "@/api/services/merchantService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

export default function EditMerchantPage() {
	const navigate = useNavigate();
	const { id } = useParams();
	const queryClient = useQueryClient();

	// Fetch merchant data
	const {
		data: merchant,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["merchant", id],
		queryFn: () => {
			if (!id) throw new Error("Merchant ID is required");
			return merchantService.getMerchantById(id);
		},
		enabled: !!id,
	});

	// Update merchant mutation
	const updateMutation = useMutation({
		mutationFn: (data: any) => {
			if (!id) throw new Error("Merchant ID is required");
			return merchantService.updateMerchant(id, data);
		},
		onSuccess: () => {
			queryClient.invalidateQueries({ queryKey: ["merchants"] });
			queryClient.invalidateQueries({ queryKey: ["merchant", id] });
			navigate("/management/merchant/list");
		},
		onError: (error: Error) => {
			console.error("❌ Update merchant error:", error);
		},
	});

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);
		const merchantData = {
			businessName: formData.get("businessName") as string,
			location: formData.get("location") as string,
			tillNumber: formData.get("tillNumber") as string,
			businessType: formData.get("businessType") as string,
			businessPhone: formData.get("businessPhone") as string,
		};

		updateMutation.mutate(merchantData);
	};

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold">Edit Merchant</h1>
					<p className="text-muted-foreground">Loading merchant information...</p>
				</div>
				<div className="flex items-center justify-center min-h-64">
					<Icon icon="eos-icons:loading" className="h-8 w-8" />
				</div>
			</div>
		);
	}

	if (error || !merchant) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold">Edit Merchant</h1>
					<p className="text-muted-foreground">Merchant not found</p>
				</div>
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 mx-auto mb-4 text-red-500" />
						<p className="text-red-500">Failed to load merchant data</p>
						<Button onClick={() => navigate("/management/merchant/list")} className="mt-4">
							Back to Merchants
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Edit Merchant</h1>
				<p className="text-muted-foreground">Update merchant information</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Merchant Details</CardTitle>
					<CardDescription>Update the merchant information below</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<Label htmlFor="businessName">Business Name *</Label>
								<Input
									id="businessName"
									name="businessName"
									defaultValue={merchant.businessName}
									placeholder="Enter business name"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="businessType">Business Type *</Label>
								<Select name="businessType" required defaultValue={merchant.businessType}>
									<SelectTrigger>
										<SelectValue placeholder="Select business type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="PHARMA">Pharma</SelectItem>
										<SelectItem value="RETAIL">Retail</SelectItem>
										<SelectItem value="RESTAURANT">Restaurant</SelectItem>
										<SelectItem value="HOSPITALITY">Hospitality</SelectItem>
										<SelectItem value="SERVICES">Services</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="location">Location *</Label>
								<Input
									id="location"
									name="location"
									defaultValue={merchant.location}
									placeholder="e.g., KILIMANI, Nairobi"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="tillNumber">Till Number *</Label>
								<Input
									id="tillNumber"
									name="tillNumber"
									defaultValue={merchant.tillNumber}
									placeholder="Enter till number"
									required
									pattern="\d{5,10}"
									title="Till number must be 5-10 digits"
								/>
							</div>

							{/* ADDED BUSINESS PHONE FIELD */}
							<div className="space-y-2">
								<Label htmlFor="businessPhone">Business Phone *</Label>
								<Input
									id="businessPhone"
									name="businessPhone"
									defaultValue={merchant.businessPhone}
									placeholder="e.g., +254712345678"
									required
								/>
							</div>
						</div>

						<div className="flex gap-4">
							<Button type="submit" disabled={updateMutation.isPending}>
								{updateMutation.isPending ? (
									<>
										<Icon icon="eos-icons:loading" className="mr-2" />
										Updating Merchant...
									</>
								) : (
									"Update Merchant"
								)}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate("/management/merchant/list")}
								disabled={updateMutation.isPending}
							>
								Cancel
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
