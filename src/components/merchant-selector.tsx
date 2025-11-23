// src/components/merchant-selector.tsx
import type React from "react";
import { Icon } from "@/components/icon";
import { useMerchant } from "@/contexts/MerchantContext";
import { Button } from "@/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/ui/dropdown-menu";

const MERCHANT_OPTIONS = [
	{ id: "HTL001", name: "Hotel 001" },
	{ id: "HTL002", name: "Hotel 002" },
	{ id: "HTL003", name: "Hotel 003" },
];

export const MerchantSelector: React.FC = () => {
	const { merchantId, setMerchantId, isAdmin } = useMerchant();

	if (!isAdmin) {
		return null; // Only admins can switch merchants
	}

	return (
		<DropdownMenu>
			<DropdownMenuTrigger asChild>
				<Button variant="outline" className="flex items-center gap-2">
					<Icon icon="lucide:store" className="h-4 w-4" />
					{merchantId ? `Merchant: ${merchantId}` : "Select Merchant"}
					<Icon icon="lucide:chevron-down" className="h-4 w-4" />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="end">
				{MERCHANT_OPTIONS.map((merchant) => (
					<DropdownMenuItem
						key={merchant.id}
						onClick={() => setMerchantId(merchant.id)}
						className={merchantId === merchant.id ? "bg-accent" : ""}
					>
						{merchant.name} ({merchant.id})
					</DropdownMenuItem>
				))}
			</DropdownMenuContent>
		</DropdownMenu>
	);
};
