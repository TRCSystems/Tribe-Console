import { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Textarea } from "@/ui/textarea";

interface Merchant {
	id: string;
	name: string;
	businessType: string;
	contactEmail: string;
	phoneNumber: string;
	address: string;
	status: "active" | "inactive" | "pending";
	registrationDate: string;
}

export default function EditMerchantPage() {
	const navigate = useNavigate();
	const { id } = useParams();
	const [loading, setLoading] = useState(false);
	const [merchant, setMerchant] = useState<Merchant | null>(null);

	// Mock data - replace with actual API call
	useEffect(() => {
		const fetchMerchant = async () => {
			// Simulate API call
			await new Promise((resolve) => setTimeout(resolve, 500));

			const mockMerchant: Merchant = {
				id: id || "1",
				name: "Tech Solutions Ltd",
				businessType: "Technology",
				contactEmail: "contact@techsolutions.com",
				phoneNumber: "+1-555-0101",
				address: "123 Tech Street, Silicon Valley, CA",
				status: "active",
				registrationDate: "2024-01-15",
			};

			setMerchant(mockMerchant);
		};

		if (id) {
			fetchMerchant();
		}
	}, [id]);

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();
		setLoading(true);

		const formData = new FormData(event.currentTarget);
		const merchantData = {
			name: formData.get("name") as string,
			businessType: formData.get("businessType") as string,
			contactEmail: formData.get("contactEmail") as string,
			phoneNumber: formData.get("phoneNumber") as string,
			address: formData.get("address") as string,
			status: formData.get("status") as string,
		};

		// TODO: Replace with actual API call
		await new Promise((resolve) => setTimeout(resolve, 1000));
		console.log("Merchant updated:", merchantData);

		setLoading(false);
		navigate("/management/merchant/list");
	};

	if (!merchant) {
		return (
			<div className="flex items-center justify-center min-h-64">
				<Icon icon="eos-icons:loading" className="h-8 w-8" />
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
								<Label htmlFor="name">Merchant Name *</Label>
								<Input
									id="name"
									name="name"
									defaultValue={merchant.name}
									placeholder="Enter merchant business name"
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
										<SelectItem value="Technology">Technology</SelectItem>
										<SelectItem value="Retail">Retail</SelectItem>
										<SelectItem value="Food & Beverage">Food & Beverage</SelectItem>
										<SelectItem value="Healthcare">Healthcare</SelectItem>
										<SelectItem value="Education">Education</SelectItem>
										<SelectItem value="Finance">Finance</SelectItem>
										<SelectItem value="Manufacturing">Manufacturing</SelectItem>
										<SelectItem value="Services">Services</SelectItem>
										<SelectItem value="Other">Other</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="contactEmail">Contact Email *</Label>
								<Input
									id="contactEmail"
									name="contactEmail"
									type="email"
									defaultValue={merchant.contactEmail}
									placeholder="merchant@example.com"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="phoneNumber">Phone Number *</Label>
								<Input
									id="phoneNumber"
									name="phoneNumber"
									defaultValue={merchant.phoneNumber}
									placeholder="+1-555-0123"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="status">Account Status *</Label>
								<Select name="status" required defaultValue={merchant.status}>
									<SelectTrigger>
										<SelectValue placeholder="Select status" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="active">Active</SelectItem>
										<SelectItem value="inactive">Inactive</SelectItem>
										<SelectItem value="pending">Pending Review</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="registrationDate">Registration Date</Label>
								<Input
									id="registrationDate"
									type="text"
									value={new Date(merchant.registrationDate).toLocaleDateString()}
									disabled
									className="bg-muted"
								/>
							</div>
						</div>

						<div className="space-y-2">
							<Label htmlFor="address">Business Address *</Label>
							<Textarea
								id="address"
								name="address"
								defaultValue={merchant.address}
								placeholder="Enter full business address including street, city, state, and zip code"
								rows={3}
								required
							/>
						</div>

						<div className="flex gap-4">
							<Button type="submit" disabled={loading}>
								{loading ? (
									<>
										<Icon icon="eos-icons:loading" className="mr-2" />
										Updating Merchant...
									</>
								) : (
									"Update Merchant"
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
