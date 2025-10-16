// src/pages/management/merchant/list/index.tsx
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router";
import merchantService from "@/api/services/merchantService";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/ui/table";

export default function MerchantListPage() {
	const navigate = useNavigate();

	const { data: merchants, isLoading } = useQuery({
		queryKey: ["merchants"],
		queryFn: merchantService.getMerchants,
	});

	return (
		<div className="space-y-6">
			<div className="flex justify-between items-center">
				<div>
					<h1 className="text-2xl font-bold">Merchants</h1>
					<p className="text-muted-foreground">Manage your onboarded merchants</p>
				</div>
				<Button onClick={() => navigate("/management/merchant/create")}>Onboard New Merchant</Button>
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
								<TableHead>Actions</TableHead>
							</TableRow>
						</TableHeader>
						<TableBody>
							{isLoading ? (
								<TableRow>
									<TableCell colSpan={5} className="text-center">
										Loading...
									</TableCell>
								</TableRow>
							) : (
								merchants?.map((merchant) => (
									<TableRow key={merchant.id}>
										<TableCell className="font-medium">{merchant.businessName}</TableCell>
										<TableCell>{merchant.location}</TableCell>
										<TableCell>{merchant.tillNumber}</TableCell>
										<TableCell>{merchant.businessType}</TableCell>
										<TableCell>
											<Button variant="outline" size="sm">
												View Details
											</Button>
										</TableCell>
									</TableRow>
								))
							)}
						</TableBody>
					</Table>
				</CardContent>
			</Card>
		</div>
	);
}
