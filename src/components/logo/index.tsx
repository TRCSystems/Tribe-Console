import { NavLink } from "react-router";
import { cn } from "@/utils";

interface Props {
	size?: number | string;
	className?: string;
}
function Logo({ size = 50, className }: Props) {
	const resolvedSize = typeof size === "number" ? `${size}px` : size;
	return (
		<NavLink to="/" className={cn("inline-flex items-center", className)} aria-label="TRIBE">
			<img
				src="/logo.png"
				alt="TRIBE logo"
				style={{ width: resolvedSize, height: resolvedSize }}
				className="shrink-0 object-contain"
			/>
		</NavLink>
	);
}

export default Logo;
