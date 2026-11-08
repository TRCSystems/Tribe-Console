// Module choice when onboarding or editing a merchant: the merchant sees and can use only these.
import { type MerchantModule, MODULE_LABELS, MODULES } from "@/utils/plan";

const HINTS: Record<MerchantModule, string> = {
	POS: "Sell at the counter",
	ORDERS: "Orders and payments",
	INVENTORY: "Stock, prices, stock counts",
	CUSTOMERS: "Shops, field reps, campaigns",
	REPORTS: "Sales and stock reports",
	FINANCE: "Stock finance and credit",
	SOKOREPLY: "Sales agents in Reel comments",
};

/** The modules a merchant record has: its own choice, else its plan (SOKOREPLY = SokoReply only), else all. */
export const merchantModules = (m?: { modules?: string | null; plan?: string | null }): MerchantModule[] => {
	const chosen = (m?.modules ?? "")
		.split(",")
		.map((s) => s.trim().toUpperCase())
		.filter((s): s is MerchantModule => (MODULES as readonly string[]).includes(s));
	if (chosen.length > 0) return chosen;
	return m?.plan === "SOKOREPLY" ? ["SOKOREPLY"] : [...MODULES];
};

/** Checked modules from the form, as the comma list the backend stores. */
export const modulesFromForm = (form: FormData): string =>
	MODULES.filter((m) => form.getAll("modules").includes(m)).join(",");

export function ModulePicker({ defaultValue }: { defaultValue: MerchantModule[] }) {
	return (
		<fieldset className="space-y-2 md:col-span-2">
			<legend className="text-sm font-medium">Modules *</legend>
			<p className="text-xs text-muted-foreground">
				The merchant sees and can use only what is ticked. Online sellers usually take SokoReply only.
			</p>
			<div className="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-4">
				{MODULES.map((m) => (
					<label key={m} htmlFor={`module-${m}`} className="flex items-start gap-2 rounded-md border p-2 text-sm">
						<input
							id={`module-${m}`}
							type="checkbox"
							name="modules"
							value={m}
							defaultChecked={defaultValue.includes(m)}
							className="mt-0.5"
						/>
						<span>
							<span className="font-medium">{MODULE_LABELS[m]}</span>
							<span className="block text-xs text-muted-foreground">{HINTS[m]}</span>
						</span>
					</label>
				))}
			</div>
		</fieldset>
	);
}
