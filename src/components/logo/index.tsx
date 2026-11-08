import { NavLink } from "react-router";
import { cn } from "@/utils";

interface Props {
	/** Size of the square mark, in px or any CSS length. */
	size?: number | string;
	/** Show the "Tribe" name next to the mark. */
	withText?: boolean;
	className?: string;
}

/** The Tribe mark: three linked points (distributor, shops, finance) on the brand purple. */
export function LogoMark({ size = 32, className }: { size?: number | string; className?: string }) {
	const s = typeof size === "number" ? `${size}px` : size;
	return (
		<svg viewBox="0 0 40 40" width={s} height={s} className={cn("shrink-0", className)} aria-hidden="true">
			<rect width="40" height="40" rx="10" fill="#534AB7" />
			<path d="M20 11 L11 27 L29 27 Z" fill="none" stroke="#CECBF6" strokeWidth="2" strokeLinejoin="round" />
			<circle cx="20" cy="11" r="4" fill="#fff" />
			<circle cx="11" cy="27" r="4" fill="#fff" />
			<circle cx="29" cy="27" r="4" fill="#fff" />
		</svg>
	);
}

function Logo({ size = 32, withText = false, className }: Props) {
	return (
		<NavLink to="/" className={cn("inline-flex items-center gap-2.5", className)} aria-label="Tribe home">
			<LogoMark size={size} />
			{withText && <span className="text-lg font-semibold tracking-tight text-foreground">Tribe</span>}
		</NavLink>
	);
}

export default Logo;
