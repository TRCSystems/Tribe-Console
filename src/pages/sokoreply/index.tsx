// src/pages/sokoreply/index.tsx - SokoReply: sales agents for Facebook & Instagram comments (onboarding + daily view)

import { message } from "antd";
import { useEffect, useState } from "react";
import { useSearchParams } from "react-router";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/ui/tabs";
import { CatalogueTab } from "./catalogue-tab";
import { CommentsTab } from "./comments-tab";
import { ConnectTab } from "./connect-tab";
import { DeliveryTab } from "./delivery-tab";
import { ReelsTab } from "./reels-tab";
import { ShopTab } from "./shop-tab";
import { VoiceTab } from "./voice-tab";

const TABS = [
	{ key: "connect", label: "1. Connect" },
	{ key: "shop", label: "2. Shop details" },
	{ key: "delivery", label: "3. Delivery & sets" },
	{ key: "catalogue", label: "4. Catalogue" },
	{ key: "reels", label: "5. Tag Reels" },
	{ key: "voice", label: "6. Voice" },
	{ key: "comments", label: "Comments & leads" },
] as const;

export default function SokoReplyPage() {
	const [params, setParams] = useSearchParams();
	const [tab, setTab] = useState<string>(params.get("tab") || "connect");

	// Facebook sends the seller back here after connecting
	useEffect(() => {
		const connected = params.get("connected");
		const error = params.get("error");
		const skipped = params.get("skipped");
		if (connected !== null) message.success(`Connected ${connected} account(s). Next: your shop details.`);
		if (skipped) message.warning(skipped);
		if (error) message.error(error);
		if (connected !== null || error) {
			setParams({}, { replace: true });
			setTab(connected !== null && connected !== "0" ? "shop" : "connect");
		}
	}, [params, setParams]);

	return (
		<div className="flex flex-col gap-4 p-2">
			<div>
				<h2 className="text-xl font-semibold">SokoReply</h2>
				<p className="text-sm text-muted-foreground">
					Sales agents that answer buyers in your Facebook and Instagram comments, day and night. Set it up once; the
					agents work alone and you see everything here.
				</p>
			</div>
			<Tabs value={tab} onValueChange={setTab}>
				<TabsList className="flex-wrap h-auto">
					{TABS.map((t) => (
						<TabsTrigger key={t.key} value={t.key}>
							{t.label}
						</TabsTrigger>
					))}
				</TabsList>
				<TabsContent value="connect">
					<ConnectTab onNext={() => setTab("shop")} />
				</TabsContent>
				<TabsContent value="shop">
					<ShopTab onNext={() => setTab("delivery")} />
				</TabsContent>
				<TabsContent value="delivery">
					<DeliveryTab onNext={() => setTab("catalogue")} />
				</TabsContent>
				<TabsContent value="catalogue">
					<CatalogueTab onNext={() => setTab("reels")} />
				</TabsContent>
				<TabsContent value="reels">
					<ReelsTab onNext={() => setTab("voice")} />
				</TabsContent>
				<TabsContent value="voice">
					<VoiceTab onNext={() => setTab("comments")} />
				</TabsContent>
				<TabsContent value="comments">
					<CommentsTab />
				</TabsContent>
			</Tabs>
		</div>
	);
}
