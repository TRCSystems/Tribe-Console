// src/pages/welcome/index.tsx - start page after sign-in: greeting, point of sale, shortcuts
import { useNavigate } from "react-router";
import { Icon } from "@/components/icon";
import { LogoMark } from "@/components/logo";
import { useUserInfo } from "@/store/userStore";
import { Button } from "@/ui/button";

const SHORTCUTS = [
	{ icon: "lucide:shopping-bag", title: "Orders", text: "WhatsApp, rep and shop orders", path: "/orders" },
	{
		icon: "lucide:clipboard-check",
		title: "Stock count",
		text: "Today's end-of-day count",
		path: "/inventory/stock-count",
	},
	{ icon: "lucide:users", title: "Customers", text: "Shops due or at risk", path: "/crm" },
	{
		icon: "lucide:bar-chart-3",
		title: "Reports",
		text: "Sales, stock and reconciliation",
		path: "/analytics/daily-sales",
	},
];

function greeting() {
	const h = new Date().getHours();
	return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
}

export default function WelcomePage() {
	const navigate = useNavigate();
	const userInfo = useUserInfo();
	const username = userInfo?.username || "there";
	const today = new Date().toLocaleDateString(undefined, { weekday: "long", day: "numeric", month: "long" });

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center overflow-auto bg-muted p-4 sm:p-6">
			<div className="w-full max-w-3xl">
				<div className="rounded-2xl border border-border bg-background p-6 shadow-sm sm:p-10">
					<div className="flex items-center gap-3">
						<LogoMark size={40} />
						<span className="text-lg font-semibold tracking-tight">Tribe</span>
					</div>

					<div className="mt-8 space-y-1">
						<p className="text-sm text-muted-foreground">{today}</p>
						<h1 className="text-3xl font-semibold tracking-tight text-foreground">
							{greeting()}, {username}
						</h1>
						<p className="text-sm text-muted-foreground">What would you like to do first?</p>
					</div>

					<Button
						size="lg"
						className="mt-8 h-12 w-full gap-2 text-base sm:w-auto sm:px-8"
						onClick={() => navigate("/pos")}
					>
						<Icon icon="lucide:shopping-cart" size={18} />
						Open point of sale
						<Icon icon="lucide:arrow-right" size={16} />
					</Button>

					<div className="mt-8 grid grid-cols-1 gap-3 sm:grid-cols-2">
						{SHORTCUTS.map((s) => (
							<button
								key={s.path}
								type="button"
								onClick={() => navigate(s.path)}
								className="group flex items-center gap-3 rounded-xl border border-border p-4 text-left transition-colors hover:border-primary/40 hover:bg-primary/5"
							>
								<span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
									<Icon icon={s.icon} size={20} />
								</span>
								<span className="min-w-0 flex-1">
									<span className="block text-sm font-semibold text-foreground">{s.title}</span>
									<span className="block truncate text-xs text-muted-foreground">{s.text}</span>
								</span>
								<Icon
									icon="lucide:chevron-right"
									size={16}
									className="text-muted-foreground transition-transform group-hover:translate-x-0.5"
								/>
							</button>
						))}
					</div>
				</div>

				<p className="mt-6 text-center text-xs text-muted-foreground">
					Tribe by <span className="font-medium text-foreground">ASANO GROUP LIMITED</span> · ©{" "}
					{new Date().getFullYear()}
				</p>
			</div>
		</div>
	);
}
