//original author : Marcellas
import type { CSSProperties } from "react";
import bgImg from "@/assets/images/background/banner-1.png";
import Character from "@/assets/images/characters/character_3.png";
import { GLOBAL_CONFIG } from "@/global-config";
import { Text, Title } from "@/ui/typography";

export default function BannerCard() {
	const bgStyle: CSSProperties = {
		position: "absolute",
		top: 0,
		left: 0,
		right: 0,
		bottom: 0,
		backgroundImage: `url("${bgImg}")`,
		backgroundSize: "100%",
		backgroundPosition: "50%",
		backgroundRepeat: "no-repeat",
		opacity: 0.5,
	};
	return (
		<div className="relative bg-primary/90">
			<div className="p-6 z-2 relative">
				<div className="grid grid-cols-2 gap-4">
					<div className="col-span-2 md:col-span-1">
						<div className="flex flex-col gap-4">
							<Title as="h2" className="text-white">
								{GLOBAL_CONFIG.appName} Your Growth Partner.
							</Title>
							<Text className="text-white">Boost sales with {GLOBAL_CONFIG.appName}.</Text>
						</div>
					</div>

					<div className="col-span-2 md:col-span-1">
						<div className="w-full h-full flex items-center justify-end">
							<img src={Character} className="w-56 h-56" alt="character" />
						</div>
					</div>
				</div>
			</div>
			<div style={bgStyle} className="z-1" />
		</div>
	);
}
