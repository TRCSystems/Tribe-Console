// src/pages/management/merchant/create/index.tsx - UPDATED VERSION

import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router";
import merchantService from "@/api/services/merchantService";
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
		onSuccess: () => {
			message.success("Merchant onboarded successfully!");
			navigate("/management/merchant/list");
		},
		onError: (error: Error) => {
			message.error(`Failed to create merchant: ${error.message}`);
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
		};

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
								<Input id="tillNumber" name="tillNumber" placeholder="Enter till number" required />
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
							<Button type="button" variant="outline" onClick={() => navigate("/management/merchant/list")}>
								Cancel
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
