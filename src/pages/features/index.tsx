//original author : Marcellas
// src/pages/features/index.tsx
import { useState } from "react";
import { Icon } from "@/components/icon";
import { Badge } from "@/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";

interface FeatureImage {
	url: string;
	alt: string;
	caption?: string;
}

interface FeatureUpdate {
	id: string;
	title: string;
	description: string;
	date: string;
	category: "feature" | "improvement" | "announcement";
	images: FeatureImage[];
	details: string[];
	tags: string[];
	steps?: string[];
	status?: "done" | "in-progress" | "planned"; // Added status field
}

// Helper functions
const getCategoryColor = (category: FeatureUpdate["category"]) => {
	switch (category) {
		case "feature":
			return "bg-blue-500 text-white";
		case "improvement":
			return "bg-green-500 text-white";
		case "announcement":
			return "bg-amber-500 text-white";
		default:
			return "bg-gray-500 text-white";
	}
};

const getCategoryIcon = (category: FeatureUpdate["category"]) => {
	switch (category) {
		case "feature":
			return "lucide:sparkles";
		case "improvement":
			return "lucide:trending-up";
		case "announcement":
			return "lucide:megaphone";
		default:
			return "lucide:info";
	}
};

// Image Zoom Modal Component
const ImageZoomModal = ({
	imageUrl,
	imageAlt,
	isOpen,
	onClose,
}: {
	imageUrl: string;
	imageAlt: string;
	isOpen: boolean;
	onClose: () => void;
}) => {
	if (!isOpen) return null;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 p-4" onClick={onClose}>
			<div className="relative max-w-6xl max-h-[90vh] w-full">
				<button
					onClick={onClose}
					className="absolute -top-12 right-0 text-white hover:text-gray-300 transition-colors z-10"
				>
					<Icon icon="lucide:x" className="h-8 w-8" />
				</button>

				<div className="relative w-full h-full overflow-auto" onClick={(e) => e.stopPropagation()}>
					<img src={imageUrl} alt={imageAlt} className="w-full h-auto max-h-[85vh] object-contain" />
					<div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/60 to-transparent p-4">
						<p className="text-white text-sm text-center">{imageAlt}</p>
					</div>
				</div>
			</div>
		</div>
	);
};

const FeatureUpdateCard = ({ update }: { update: FeatureUpdate }) => {
	const [selectedImageIndex, setSelectedImageIndex] = useState(0);
	const [isZoomOpen, setIsZoomOpen] = useState(false);

	return (
		<>
			{/* Zoom Modal */}
			<ImageZoomModal
				imageUrl={update.images[selectedImageIndex]?.url}
				imageAlt={update.images[selectedImageIndex]?.alt || ""}
				isOpen={isZoomOpen}
				onClose={() => setIsZoomOpen(false)}
			/>

			<Card className="overflow-hidden hover:shadow-xl transition-shadow duration-300 border-2 border-gray-200 dark:border-gray-700">
				<CardHeader className="pb-3">
					<div className="flex items-start justify-between">
						<div className="space-y-2">
							<div className="flex items-center gap-2 flex-wrap">
								<Badge className={getCategoryColor(update.category)}>
									<Icon icon={getCategoryIcon(update.category)} className="h-3 w-3 mr-1" />
									{update.category.charAt(0).toUpperCase() + update.category.slice(1)}
								</Badge>
								{update.status && (
									<Badge
										variant={
											update.status === "done" ? "success" : update.status === "in-progress" ? "warning" : "secondary"
										}
									>
										<Icon
											icon={
												update.status === "done"
													? "lucide:check-circle"
													: update.status === "in-progress"
														? "lucide:clock"
														: "lucide:calendar"
											}
											className="h-3 w-3 mr-1"
										/>
										{update.status === "done" ? "Live" : update.status === "in-progress" ? "In Progress" : "Planned"}
									</Badge>
								)}
								{update.tags.map((tag) => (
									<Badge key={tag} variant="outline" className="text-xs">
										{tag}
									</Badge>
								))}
							</div>
							<CardTitle className="text-xl md:text-2xl">{update.title}</CardTitle>
							<CardDescription className="flex items-center gap-2">
								<Icon icon="lucide:calendar" className="h-3 w-3" />
								{new Date(update.date).toLocaleDateString("en-US", {
									year: "numeric",
									month: "long",
									day: "numeric",
								})}
							</CardDescription>
						</div>
					</div>
				</CardHeader>

				<CardContent className="space-y-8">
					{/* Main Image Display */}
					{update.images.length > 0 && (
						<div className="space-y-4">
							<div className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden bg-gray-50 dark:bg-gray-800">
								<div className="relative h-64 md:h-96 w-full overflow-hidden group">
									<img
										src={update.images[selectedImageIndex].url}
										alt={update.images[selectedImageIndex].alt}
										className="w-full h-full object-contain p-2 cursor-zoom-in transition-transform duration-300 group-hover:scale-105"
										onClick={() => setIsZoomOpen(true)}
									/>
									<div className="absolute inset-0 bg-gradient-to-t from-black/5 to-transparent"></div>

									{/* Zoom button overlay */}
									<button
										onClick={() => setIsZoomOpen(true)}
										className="absolute top-4 right-4 bg-white/90 dark:bg-gray-800/90 hover:bg-white dark:hover:bg-gray-700 p-2 rounded-full shadow-lg transition-all opacity-0 group-hover:opacity-100"
										title="Click to zoom image"
									>
										<Icon icon="lucide:zoom-in" className="h-5 w-5" />
									</button>

									{/* Image navigation buttons */}
									{update.images.length > 1 && (
										<>
											<button
												onClick={() =>
													setSelectedImageIndex((prev) => (prev === 0 ? update.images.length - 1 : prev - 1))
												}
												className="absolute left-4 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 p-2 rounded-full shadow-lg transition-colors"
											>
												<Icon icon="lucide:chevron-left" className="h-5 w-5" />
											</button>
											<button
												onClick={() =>
													setSelectedImageIndex((prev) => (prev === update.images.length - 1 ? 0 : prev + 1))
												}
												className="absolute right-4 top-1/2 -translate-y-1/2 bg-white/80 dark:bg-gray-800/80 hover:bg-white dark:hover:bg-gray-700 p-2 rounded-full shadow-lg transition-colors"
											>
												<Icon icon="lucide:chevron-right" className="h-5 w-5" />
											</button>
										</>
									)}
								</div>

								{/* Image caption */}
								<div className="p-3 text-center border-t border-gray-200 dark:border-gray-700">
									<p className="text-sm text-gray-600 dark:text-gray-400 italic">
										{update.images[selectedImageIndex].caption || update.images[selectedImageIndex].alt}
									</p>
									{update.images.length > 1 && (
										<p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
											Image {selectedImageIndex + 1} of {update.images.length} • Click image to zoom
										</p>
									)}
									{update.images.length === 1 && (
										<p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
											Click image to zoom in for detailed view
										</p>
									)}
								</div>
							</div>

							{/* Image Thumbnails (if multiple images) */}
							{update.images.length > 1 && (
								<div className="flex gap-2 overflow-x-auto pb-2">
									{update.images.map((image, index) => (
										<button
											key={index}
											onClick={() => setSelectedImageIndex(index)}
											className={`flex-shrink-0 w-20 h-20 rounded-lg border-2 overflow-hidden transition-all group/thumb ${
												selectedImageIndex === index
													? "border-blue-500 ring-2 ring-blue-200 dark:ring-blue-800"
													: "border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600"
											}`}
											title={`Click to view ${image.caption || image.alt}`}
										>
											<img
												src={image.url}
												alt={`Thumbnail ${index + 1}`}
												className="w-full h-full object-cover group-hover/thumb:scale-110 transition-transform duration-200"
											/>
										</button>
									))}
								</div>
							)}
						</div>
					)}

					<p className="text-gray-700 dark:text-gray-300 text-lg leading-relaxed">{update.description}</p>

					{/* Key Benefits */}
					{update.details.length > 0 && (
						<div className="space-y-3">
							<h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-lg">
								<Icon icon="lucide:check-circle" className="h-5 w-5 text-green-500" />
								Key Benefits
							</h4>
							<ul className="space-y-3">
								{update.details.map((detail, index) => (
									<li key={index} className="flex items-start gap-3 text-gray-700 dark:text-gray-300">
										<Icon icon="lucide:check" className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />
										<span className="text-base">{detail}</span>
									</li>
								))}
							</ul>
						</div>
					)}

					{/* How It Works Steps (if provided) */}
					{update.steps && update.steps.length > 0 && (
						<div className="space-y-4">
							<h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2 text-lg">
								<Icon icon="lucide:play-circle" className="h-5 w-5 text-blue-500" />
								How It Works
							</h4>
							<div className="space-y-3">
								{update.steps.map((step, index) => (
									<div key={index} className="flex items-start gap-4 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-lg">
										<div className="flex-shrink-0 w-8 h-8 rounded-full bg-blue-100 dark:bg-blue-900 flex items-center justify-center">
											<span className="font-bold text-blue-600 dark:text-blue-300">{index + 1}</span>
										</div>
										<p className="text-gray-700 dark:text-gray-300">{step}</p>
									</div>
								))}
							</div>
						</div>
					)}
				</CardContent>
			</Card>
		</>
	);
};

export default function FeaturesPage() {
	const [filter, setFilter] = useState<string>("all");

	// Feature data with MULTIPLE images per feature
	const featureUpdates: FeatureUpdate[] = [
		{
			id: "1",
			title: "Invoice to Inventory Automation",
			description:
				"Transform supplier invoices directly into inventory items using AI-powered automation. Upload any invoice PDF and watch as items are automatically extracted, categorized, and added to your stock.",
			date: "2024-02-10",
			category: "feature",
			status: "in-progress",
			images: [
				{
					url: "/features/invoice1.png",
					alt: "Invoice upload interface with drag and drop",
					caption: "Simple drag & drop invoice upload interface",
				},
				{
					url: "/features/invoice2.png",
					alt: "AI scanning and extracting items from invoice",
					caption: "AI scanning invoice and extracting product details",
				},
				{
					url: "/features/invoice3.png",
					alt: "Review extracted items with quantities and prices",
					caption: "Review and verify extracted items before approval",
				},
				{
					url: "/features/invoice4.jpg",
					alt: "Inventory automatically updated with new items",
					caption: "Inventory instantly updated with extracted items",
				},
			],
			details: [
				"Upload any supplier invoice PDF in any format",
				"AI-powered OCR extracts item names, quantities, and unit prices",
				"Automatic item normalization and matching to existing products",
				"Smart categorization based on product type",
				"One-click approval to add all items to inventory",
				"Total invoice value calculation and summary",
				"Duplicate detection for existing inventory items",
				"Support for multiple currencies and tax calculations",
			],
			steps: [
				"Drag and drop your supplier invoice PDF or select file",
				"AI scans the entire document and identifies all items",
				"Review the extracted data - names, quantities, prices",
				"Make adjustments if needed (optional)",
				"Click 'Approve' to add all items to inventory",
				"Items instantly appear in your stock with correct quantities",
				"Track invoice total value and update financial records",
			],
			tags: ["AI", "Automation", "Inventory", "OCR", "Productivity"],
		},
	];

	const filteredUpdates =
		filter === "all" ? featureUpdates : featureUpdates.filter((update) => update.category === filter);

	const getUpdateCount = (category: string) => {
		if (category === "all") return featureUpdates.length;
		return featureUpdates.filter((update) => update.category === category).length;
	};

	const latestUpdateDate =
		featureUpdates.length > 0
			? new Date(Math.max(...featureUpdates.map((u) => new Date(u.date).getTime())))
			: new Date();

	// Calculate development status
	const activeDevelopmentStatus = "Ongoing"; // You can change this to "Done", "In Progress", etc.

	return (
		<div className="space-y-8">
			<div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
				<div>
					<h1 className="text-2xl md:text-3xl font-bold">TRIBE _ TRC Systems</h1>
					<p className="text-muted-foreground text-lg">
						Discover powerful tools designed to streamline your business operations
					</p>
				</div>

				<div className="flex items-center gap-2">
					<Badge variant="outline" className="text-sm md:text-base">
						Latest update:{" "}
						{latestUpdateDate.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
					</Badge>
				</div>
			</div>

			{/* Overview Stats - EXACTLY AS YOU WANTED */}
			<div className="grid grid-cols-1 md:grid-cols-3 gap-4">
				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Total Features</p>
								<p className="text-2xl font-bold">{featureUpdates.length}</p>
							</div>
							<Icon icon="lucide:package" className="h-8 w-8 text-blue-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Latest Feature</p>
								<p className="text-lg font-bold truncate" title={featureUpdates[0].title}>
									{featureUpdates[0].title}
								</p>
							</div>
							<Icon icon="lucide:star" className="h-8 w-8 text-green-500 opacity-60" />
						</div>
					</CardContent>
				</Card>

				<Card>
					<CardContent className="p-6">
						<div className="flex items-center justify-between">
							<div>
								<p className="text-sm font-medium text-muted-foreground">Active Development</p>
								<p className="text-lg font-bold">{activeDevelopmentStatus}</p>
							</div>
							<Icon icon="lucide:activity" className="h-8 w-8 text-amber-500 opacity-60" />
						</div>
					</CardContent>
				</Card>
			</div>

			{/* Filter Tabs */}
			<Card>
				<CardHeader className="pb-3">
					<CardTitle>Explore Features</CardTitle>
					<CardDescription>
						Browse through all available features and improvements with step-by-step images
					</CardDescription>
				</CardHeader>
				<CardContent>
					<Tabs value={filter} onValueChange={setFilter} className="w-full">
						<TabsList className="mb-6 w-full overflow-x-auto">
							<TabsTrigger value="all" className="flex items-center gap-2">
								<Icon icon="lucide:grid" className="h-4 w-4" />
								All Features
								<Badge variant="secondary" className="ml-1">
									{getUpdateCount("all")}
								</Badge>
							</TabsTrigger>
							<TabsTrigger value="feature" className="flex items-center gap-2">
								<Icon icon="lucide:sparkles" className="h-4 w-4" />
								Core Features
								<Badge variant="secondary" className="ml-1">
									{getUpdateCount("feature")}
								</Badge>
							</TabsTrigger>
							<TabsTrigger value="improvement" className="flex items-center gap-2">
								<Icon icon="lucide:trending-up" className="h-4 w-4" />
								Improvements
								<Badge variant="secondary" className="ml-1">
									{getUpdateCount("improvement")}
								</Badge>
							</TabsTrigger>
							<TabsTrigger value="announcement" className="flex items-center gap-2">
								<Icon icon="lucide:megaphone" className="h-4 w-4" />
								Announcements
								<Badge variant="secondary" className="ml-1">
									{getUpdateCount("announcement")}
								</Badge>
							</TabsTrigger>
						</TabsList>

						<TabsContent value="all" className="space-y-8">
							{filteredUpdates.map((update) => (
								<FeatureUpdateCard key={update.id} update={update} />
							))}
						</TabsContent>

						<TabsContent value="feature" className="space-y-8">
							{featureUpdates
								.filter((update) => update.category === "feature")
								.map((update) => (
									<FeatureUpdateCard key={update.id} update={update} />
								))}
						</TabsContent>

						<TabsContent value="improvement" className="space-y-8">
							{featureUpdates
								.filter((update) => update.category === "improvement")
								.map((update) => (
									<FeatureUpdateCard key={update.id} update={update} />
								))}
						</TabsContent>

						<TabsContent value="announcement" className="space-y-8">
							{featureUpdates
								.filter((update) => update.category === "announcement")
								.map((update) => (
									<FeatureUpdateCard key={update.id} update={update} />
								))}
						</TabsContent>
					</Tabs>
				</CardContent>
			</Card>

			<footer className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-700">
				<div className="flex flex-col items-center justify-center gap-2">
					<div className="flex items-center gap-2">
						<Icon icon="lucide:camera" className="h-4 w-4 text-gray-400" />
						<span className="text-sm text-gray-500 dark:text-gray-400">
							Showing {featureUpdates.reduce((total, feature) => total + feature.images.length, 0)} step-by-step images
							• Click any image to zoom
						</span>
					</div>
					<div className="flex items-center gap-2">
						<Icon icon="lucide:shield" className="h-4 w-4 text-gray-400" />
						<span className="text-sm text-gray-500 dark:text-gray-400">Secure • Reliable • Efficient</span>
					</div>
					<p className="text-xs text-gray-400 dark:text-gray-500">
						TRIBE powered by <span className="font-bold text-gray-600 dark:text-gray-300">TRC Systems</span>
					</p>
					<p className="text-xs text-gray-400 dark:text-gray-500">© {new Date().getFullYear()} All rights reserved</p>
				</div>
			</footer>
		</div>
	);
}
