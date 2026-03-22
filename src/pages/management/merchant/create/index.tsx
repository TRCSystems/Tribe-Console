//original author : Marcellas
// src/pages/management/merchant/create/index.tsx - FINAL CORRECTED VERSION

import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import { useNavigate } from "react-router";
import merchantService, { type CreateMerchantRequest } from "@/api/services/merchantService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

export default function CreateMerchantPage() {
	const navigate = useNavigate();

	const createMutation = useMutation({
		mutationFn: merchantService.createMerchant,
		onSuccess: (data) => {
			if (data.status === "200" || data.status === "SUCCESS") {
				message.success("✅ Merchant onboarded successfully!");
				navigate("/management/merchant/list");
			} else {
				message.error(`❌ Failed to create merchant: ${data.message || "Unknown error"}`);
			}
		},
		onError: (error: Error) => {
			message.error(`❌ Request failed: ${error.message}`);
		},
	});

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);
		const merchantData: CreateMerchantRequest = {
			businessName: formData.get("businessName") as string,
			location: formData.get("location") as string,
			tillNumber: formData.get("tillNumber") as string,
			businessType: formData.get("businessType") as string,
			businessPhone: formData.get("businessPhone") as string, // ADDED REQUIRED FIELD
		};

		console.log("🛠️ Creating merchant with data:", merchantData);
		createMutation.mutate(merchantData);
	};

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Onboard New Merchant</h1>
				<p className="text-muted-foreground">Register a new merchant with the Loyalty Engine</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Merchant Information</CardTitle>
					<CardDescription>Enter the details for the new merchant account</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<Label htmlFor="businessName">Business Name *</Label>
								<Input id="businessName" name="businessName" placeholder="Enter business name" required />
							</div>

							<div className="space-y-2">
								<Label htmlFor="businessType">Business Type *</Label>
								<Select name="businessType" required>
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
								<Input id="location" name="location" placeholder="e.g., KILIMANI, Nairobi" required />
							</div>

							<div className="space-y-2">
								<Label htmlFor="tillNumber">Till Number *</Label>
								<Input
									id="tillNumber"
									name="tillNumber"
									placeholder="Enter till number"
									required
									pattern="\d{5,10}"
									title="Till number must be 5-10 digits"
								/>
							</div>

							{/* ADDED BUSINESS PHONE FIELD */}
							<div className="space-y-2">
								<Label htmlFor="businessPhone">Business Phone *</Label>
								<Input id="businessPhone" name="businessPhone" placeholder="e.g., +254712345678" required />
							</div>
						</div>

						<div className="flex gap-4">
							<Button type="submit" disabled={createMutation.isPending}>
								{createMutation.isPending ? (
									<>
										<Icon icon="eos-icons:loading" className="mr-2" />
										Onboarding Merchant...
									</>
								) : (
									"Onboard Merchant"
								)}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate("/management/merchant/list")}
								disabled={createMutation.isPending}
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
