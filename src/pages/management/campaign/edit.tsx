//original author : Marcellas
// src/pages/management/campaign/edit/index.tsx - COMPLETE REAL DATA VERSION
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import { useNavigate, useParams } from "react-router";
import campaignService from "@/api/services/campaignService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Textarea } from "@/ui/textarea";

export default function CampaignEditPage() {
	const navigate = useNavigate();
	const { id } = useParams();
	const queryClient = useQueryClient();
	const [messages, setMessages] = useState([{ message: "" }]);

	// Fetch campaign data
	const {
		data: campaign,
		isLoading,
		error,
	} = useQuery({
		queryKey: ["campaign", id],
		queryFn: () => campaignService.getCampaignById(Number(id)),
		enabled: !!id,
		onSuccess: (data) => {
			if (data.messages && data.messages.length > 0) {
				setMessages(data.messages);
			}
		},
	});

	// Update campaign mutation
	const updateMutation = useMutation({
		mutationFn: (data: any) => campaignService.updateCampaign(Number(id)!, data),
		onSuccess: () => {
			message.success("Campaign updated successfully!");
			queryClient.invalidateQueries({ queryKey: ["campaigns"] });
			queryClient.invalidateQueries({ queryKey: ["campaign", id] });
			navigate("/management/campaign/list");
		},
		onError: (error: Error) => {
			message.error(`Failed to update campaign: ${error.message}`);
		},
	});

	const handleSubmit = async (event: React.FormEvent<HTMLFormElement>) => {
		event.preventDefault();

		const formData = new FormData(event.currentTarget);
		const campaignData = {
			campaignName: formData.get("name") as string,
			campaignType: formData.get("type") as string,
			targetAudience: formData.get("targetAudience") as string,
			startDate: formData.get("startDate") as string,
			endDate: formData.get("endDate") as string,
			messages: messages.filter((msg) => msg.message.trim() !== ""),
		};

		updateMutation.mutate(campaignData);
	};

	const addMessage = () => {
		setMessages([...messages, { message: "" }]);
	};

	const updateMessage = (index: number, value: string) => {
		const newMessages = [...messages];
		newMessages[index].message = value;
		setMessages(newMessages);
	};

	const removeMessage = (index: number) => {
		setMessages(messages.filter((_, i) => i !== index));
	};

	if (isLoading) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold">Edit Campaign</h1>
					<p className="text-muted-foreground">Loading campaign information...</p>
				</div>
				<div className="text-center py-12">
					<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
					<p className="text-muted-foreground">Loading campaign data</p>
				</div>
			</div>
		);
	}

	if (error || !campaign) {
		return (
			<div className="space-y-6">
				<div>
					<h1 className="text-2xl font-bold">Edit Campaign</h1>
					<p className="text-muted-foreground">Campaign not found</p>
				</div>
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 mx-auto mb-4 text-red-500" />
						<p className="text-red-500">Failed to load campaign data</p>
						<Button onClick={() => navigate("/management/campaign/list")} className="mt-4">
							Back to Campaigns
						</Button>
					</CardContent>
				</Card>
			</div>
		);
	}

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Edit Campaign</h1>
				<p className="text-muted-foreground">Update your marketing campaign details</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Campaign Details</CardTitle>
					<CardDescription>Update the details for your marketing campaign</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<Label htmlFor="name">Campaign Name *</Label>
								<Input
									id="name"
									name="name"
									defaultValue={campaign.campaignName}
									placeholder="Enter campaign name"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="type">Campaign Type *</Label>
								<Select name="type" required defaultValue={campaign.campaignType}>
									<SelectTrigger>
										<SelectValue placeholder="Select type" />
									</SelectTrigger>
									<SelectContent>
										<SelectItem value="EVENT">Event</SelectItem>
										<SelectItem value="PROMOTION">Promotion</SelectItem>
										<SelectItem value="SEASONAL">Seasonal</SelectItem>
										<SelectItem value="LOYALTY">Loyalty</SelectItem>
									</SelectContent>
								</Select>
							</div>

							<div className="space-y-2">
								<Label htmlFor="targetAudience">Target Audience *</Label>
								<Input
									id="targetAudience"
									name="targetAudience"
									defaultValue={campaign.targetAudience}
									placeholder="e.g., FOOTBALL FANS, PREMIUM USERS"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="startDate">Start Date *</Label>
								<Input
									id="startDate"
									name="startDate"
									type="date"
									defaultValue={campaign.startDate.split("T")[0]}
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="endDate">End Date *</Label>
								<Input id="endDate" name="endDate" type="date" defaultValue={campaign.endDate.split("T")[0]} required />
							</div>
						</div>

						{/* Campaign Messages */}
						<div className="space-y-4">
							<div className="flex items-center justify-between">
								<Label>Campaign Messages *</Label>
								<Button type="button" variant="outline" size="sm" onClick={addMessage}>
									<Icon icon="lucide:plus" className="mr-2" />
									Add Message
								</Button>
							</div>

							{messages.map((message, index) => (
								<div key={index} className="flex gap-2">
									<Textarea
										placeholder="Enter campaign message"
										value={message.message}
										onChange={(e) => updateMessage(index, e.target.value)}
										rows={2}
										required={index === 0}
									/>
									{messages.length > 1 && (
										<Button type="button" variant="outline" size="sm" onClick={() => removeMessage(index)}>
											<Icon icon="lucide:trash-2" />
										</Button>
									)}
								</div>
							))}
						</div>

						<div className="flex gap-4">
							<Button type="submit" disabled={updateMutation.isPending}>
								{updateMutation.isPending ? (
									<>
										<Icon icon="eos-icons:loading" className="mr-2" />
										Updating Campaign...
									</>
								) : (
									"Update Campaign"
								)}
							</Button>
							<Button
								type="button"
								variant="outline"
								onClick={() => navigate("/management/campaign/list")}
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
