// src/pages/management/campaign/create/index.tsx - UPDATED VERSION

import { useMutation } from "@tanstack/react-query";
import { message } from "antd";
import { useState } from "react";
import { useNavigate } from "react-router";
import campaignService from "@/api/services/campaignService";
import { Icon } from "@/components/icon";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Label } from "@/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";
import { Textarea } from "@/ui/textarea";

export default function CreateCampaignPage() {
	const navigate = useNavigate();
	const [messages, setMessages] = useState([{ message: "" }]);

	const createMutation = useMutation({
		mutationFn: campaignService.createCampaign,
		onSuccess: () => {
			message.success("Campaign created successfully!");
			navigate("/management/campaign/list");
		},
		onError: (error: Error) => {
			message.error(`Failed to create campaign: ${error.message}`);
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

		createMutation.mutate(campaignData);
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

	return (
		<div className="space-y-6">
			<div>
				<h1 className="text-2xl font-bold">Create New Campaign</h1>
				<p className="text-muted-foreground">Set up a new marketing campaign using the Loyalty Engine</p>
			</div>

			<Card>
				<CardHeader>
					<CardTitle>Campaign Details</CardTitle>
					<CardDescription>Enter the details for your new marketing campaign</CardDescription>
				</CardHeader>
				<CardContent>
					<form onSubmit={handleSubmit} className="space-y-6">
						<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
							<div className="space-y-2">
								<Label htmlFor="name">Campaign Name *</Label>
								<Input id="name" name="name" placeholder="Enter campaign name" required />
							</div>

							<div className="space-y-2">
								<Label htmlFor="type">Campaign Type *</Label>
								<Select name="type" required>
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
									placeholder="e.g., FOOTBALL FANS, PREMIUM USERS"
									required
								/>
							</div>

							<div className="space-y-2">
								<Label htmlFor="startDate">Start Date *</Label>
								<Input id="startDate" name="startDate" type="date" required />
							</div>

							<div className="space-y-2">
								<Label htmlFor="endDate">End Date *</Label>
								<Input id="endDate" name="endDate" type="date" required />
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
							<Button type="submit" disabled={createMutation.isPending}>
								{createMutation.isPending ? (
									<>
										<Icon icon="eos-icons:loading" className="mr-2" />
										Creating Campaign...
									</>
								) : (
									"Create Campaign"
								)}
							</Button>
							<Button type="button" variant="outline" onClick={() => navigate("/management/campaign/list")}>
								Cancel
							</Button>
						</div>
					</form>
				</CardContent>
			</Card>
		</div>
	);
}
