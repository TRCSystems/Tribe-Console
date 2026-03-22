//original author : Marcellas
// src/pages/management/campaign/templates/index.tsx

import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import campaignTemplateService from "@/api/services/campaignTemplateService";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Button } from "@/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Input } from "@/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/ui/select";

export default function CampaignTemplatesPage() {
	const [searchTerm, setSearchTerm] = useState("");
	const [categoryFilter, setCategoryFilter] = useState("all");
	const [selectedTag, setSelectedTag] = useState("");

	const {
		data: templates = [],
		isLoading,
		error,
	} = useQuery({
		queryKey: ["campaign-templates"],
		queryFn: campaignTemplateService.getCampaignTemplates,
	});

	// Extract unique categories and tags
	const categories = Array.from(new Set(templates.map((t) => t.category))).filter(Boolean);
	const allTags = Array.from(new Set(templates.flatMap((t) => t.tags || []))).filter(Boolean);

	const filteredTemplates = templates.filter((template) => {
		const matchesSearch =
			template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
			template.description.toLowerCase().includes(searchTerm.toLowerCase());
		const matchesCategory = categoryFilter === "all" || template.category === categoryFilter;
		const matchesTag = !selectedTag || template.tags?.includes(selectedTag);

		return matchesSearch && matchesCategory && matchesTag;
	});

	if (error) {
		return (
			<div className="space-y-6">
				<div className="flex items-center justify-between">
					<div>
						<h1 className="text-2xl font-bold">Campaign Templates</h1>
						<p className="text-muted-foreground">Browse and use pre-built campaign templates</p>
					</div>
				</div>
				<Card>
					<CardContent className="p-6 text-center">
						<Icon icon="lucide:alert-circle" className="h-12 w-12 text-destructive mx-auto mb-4" />
						<h3 className="text-lg font-semibold mb-2">Failed to load templates</h3>
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
					<h1 className="text-2xl font-bold">Campaign Templates</h1>
					<p className="text-muted-foreground">Browse and use pre-built campaign templates</p>
				</div>
			</div>

			{/* Filters */}
			<Card>
				<CardHeader>
					<CardTitle>Browse Templates</CardTitle>
					<CardDescription>Find the perfect template for your campaign</CardDescription>
				</CardHeader>
				<CardContent>
					<div className="flex flex-col sm:flex-row gap-4 mb-6">
						<div className="flex-1">
							<Input
								placeholder="Search templates..."
								value={searchTerm}
								onChange={(e) => setSearchTerm(e.target.value)}
							/>
						</div>
						<Select value={categoryFilter} onValueChange={setCategoryFilter}>
							<SelectTrigger className="w-40">
								<SelectValue placeholder="Category" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="all">All Categories</SelectItem>
								{categories.map((category) => (
									<SelectItem key={category} value={category}>
										{category}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
						<Select value={selectedTag} onValueChange={setSelectedTag}>
							<SelectTrigger className="w-40">
								<SelectValue placeholder="Tag" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="">All Tags</SelectItem>
								{allTags.map((tag) => (
									<SelectItem key={tag} value={tag}>
										{tag}
									</SelectItem>
								))}
							</SelectContent>
						</Select>
					</div>

					{/* Popular Tags */}
					<div className="flex flex-wrap gap-2 mb-6">
						<Button variant={selectedTag === "" ? "default" : "outline"} size="sm" onClick={() => setSelectedTag("")}>
							All Tags
						</Button>
						{allTags.slice(0, 8).map((tag) => (
							<Button
								key={tag}
								variant={selectedTag === tag ? "default" : "outline"}
								size="sm"
								onClick={() => setSelectedTag(tag)}
							>
								{tag}
							</Button>
						))}
					</div>
				</CardContent>
			</Card>

			{/* Templates Grid */}
			{isLoading ? (
				<div className="text-center py-12">
					<Icon icon="eos-icons:loading" className="h-8 w-8 mx-auto mb-4" />
					<p className="text-muted-foreground">Loading templates...</p>
				</div>
			) : (
				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
					{filteredTemplates.map((template) => (
						<Card key={template.id} className="hover:shadow-lg transition-shadow">
							<CardHeader>
								<CardTitle className="text-lg">{template.name}</CardTitle>
								<CardDescription>{template.description}</CardDescription>
							</CardHeader>
							<CardContent className="space-y-4">
								<div>
									<p className="text-sm text-muted-foreground mb-2">Category</p>
									<Badge variant="outline">{template.category}</Badge>
								</div>

								{template.tags && template.tags.length > 0 && (
									<div>
										<p className="text-sm text-muted-foreground mb-2">Tags</p>
										<div className="flex flex-wrap gap-1">
											{template.tags.map((tag) => (
												<Badge key={tag} variant="secondary" className="text-xs">
													{tag}
												</Badge>
											))}
										</div>
									</div>
								)}

								<div className="pt-4">
									<p className="text-sm text-muted-foreground mb-2">Template Content</p>
									<p className="text-sm bg-muted p-3 rounded-md">{template.content}</p>
								</div>

								<Button className="w-full" variant="outline">
									<Icon icon="lucide:copy" className="h-4 w-4 mr-2" />
									Use Template
								</Button>
							</CardContent>
						</Card>
					))}
				</div>
			)}

			{!isLoading && filteredTemplates.length === 0 && (
				<Card>
					<CardContent className="p-12 text-center">
						<Icon icon="lucide:file-search" className="h-16 w-16 mx-auto mb-4 opacity-50" />
						<h3 className="text-lg font-semibold mb-2">No templates found</h3>
						<p className="text-muted-foreground">Try adjusting your search criteria or filters</p>
					</CardContent>
				</Card>
			)}
		</div>
	);
}
