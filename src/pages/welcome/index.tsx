import {
	ArrowRight,
	BarChart3,
	Boxes,
	Check,
	ChevronDown,
	ClipboardList,
	Play,
	Sparkles,
	Store,
	TrendingUp,
} from "lucide-react";
import { Link } from "react-router";
import logo from "@/assets/logo.png";
import { Icon } from "@/components/icon";
import { useUserToken } from "@/store/userStore";
import "@fontsource-variable/plus-jakarta-sans";
import "./welcome.css";

const navLinks = [
	{ label: "Features", href: "#features" },
	{ label: "Platforms", href: "#platforms" },
	{ label: "Plans", href: "#plans" },
	{ label: "FAQ", href: "#faq" },
];

const platforms = [
	{ name: "Instagram", icon: "simple-icons:instagram" },
	{ name: "Facebook", icon: "simple-icons:facebook" },
	{ name: "TikTok", icon: "simple-icons:tiktok" },
	{ name: "WhatsApp", icon: "simple-icons:whatsapp" },
	{ name: "X", icon: "simple-icons:x" },
	{ name: "YouTube", icon: "simple-icons:youtube" },
];

const kpis = [
	{ label: "Sales today", value: "KSh 184,500", delta: "+12.4%", up: true },
	{ label: "Orders", value: "238", delta: "+8.1%", up: true },
	{ label: "New messages", value: "1,204", delta: "+21%", up: true },
	{ label: "Low stock", value: "14", delta: "-3", up: false },
];

const chartSeries = [22, 30, 26, 41, 36, 52, 47, 63, 58, 74, 69, 88];
const chartSeries2 = [14, 18, 22, 20, 29, 27, 35, 33, 42, 40, 51, 55];

const conversations = [
	{ name: "Wanjiku", platform: "Instagram", message: "Hizi zimerudi in stock? Nataka mbili!" },
	{ name: "Otieno", platform: "Facebook", message: "Nilipita jana. Mko open Sunday?" },
	{ name: "Akinyi", platform: "TikTok", message: "Hii colour ni kali! How much?" },
];

const checkoutLines = [
	{ item: "Kitenge wrap dress", qty: 1, price: "3,200" },
	{ item: "Beaded sandals", qty: 2, price: "2,400" },
	{ item: "Gift wrapping", qty: 1, price: "150" },
];

const plans = [
	{
		name: "Single shop",
		blurb: "One counter, one team, every channel in one place.",
		features: ["Point of sale and receipts", "Stock tracking", "Daily sales reports", "Social inbox for your pages"],
		featured: false,
	},
	{
		name: "Growing business",
		blurb: "For shops adding staff, products and followers.",
		features: [
			"Everything in Single shop",
			"Staff roles and permissions",
			"Reconciliation and order history",
			"Restock insights from sales",
			"Priority onboarding help",
		],
		featured: true,
	},
	{
		name: "Multi-branch",
		blurb: "Run several shops with one clear picture.",
		features: [
			"Everything in Growing business",
			"Stock across branches",
			"Branch-by-branch reports",
			"Dedicated account support",
		],
		featured: false,
	},
];

const faqs = [
	{
		q: "What is Tribe Console?",
		a: "Tribe Console puts your point of sale, inventory, orders and social conversations in one place, so you can sell, restock and reply to customers without switching tools.",
	},
	{
		q: "Which social platforms does Tribe cover?",
		a: "Tribe is built around the places Kenyan shoppers talk to shops: Instagram, Facebook, TikTok, WhatsApp, X and YouTube.",
	},
	{
		q: "Can my staff use it at the counter?",
		a: "Yes. Staff sign in with their own accounts and see only what their role allows, from ringing up sales to checking stock.",
	},
	{
		q: "How do I decide what to restock?",
		a: "Sales reports show what sold and when. Pair that with your stock levels and you can see which favourites are about to run out.",
	},
	{
		q: "How do I get started?",
		a: "Sign in with the account your team lead set up. If you don't have one yet, ask them to invite you.",
	},
];

const footerColumns = [
	{
		title: "Product",
		links: [
			{ label: "Features", href: "#features" },
			{ label: "Platforms", href: "#platforms" },
			{ label: "Plans", href: "#plans" },
			{ label: "FAQ", href: "#faq" },
		],
	},
	{
		title: "Console",
		links: [
			{ label: "Point of sale", to: "/pos" },
			{ label: "Orders", to: "/orders" },
			{ label: "Inventory", to: "/inventory/stock" },
			{ label: "Sales reports", to: "/analytics/daily-sales" },
		],
	},
];

const W = 560;
const H = 190;

function smooth(series: number[], max: number) {
	const step = W / (series.length - 1);
	const pts = series.map((v, i) => [i * step, H - (v / max) * (H - 16) - 8]);
	let d = `M${pts[0][0]} ${pts[0][1]}`;
	for (let i = 1; i < pts.length; i++) {
		const [x0, y0] = pts[i - 1];
		const [x1, y1] = pts[i];
		const cx = (x0 + x1) / 2;
		d += ` C${cx.toFixed(1)} ${y0.toFixed(1)} ${cx.toFixed(1)} ${y1.toFixed(1)} ${x1.toFixed(1)} ${y1.toFixed(1)}`;
	}
	return d;
}

function DashboardMock({ detailed = false }: { detailed?: boolean }) {
	const max = 100;
	const line = smooth(chartSeries, max);
	const line2 = smooth(chartSeries2, max);
	return (
		<div className="tw-dash" aria-hidden="true">
			<div className="tw-dash__bar">
				<span />
				<span />
				<span />
				<div className="tw-dash__url">tribe.console/dashboard</div>
			</div>
			<div className="tw-dash__body">
				<aside className="tw-dash__side">
					<img src={logo} alt="" />
					<i className="is-on" />
					<i />
					<i />
					<i />
				</aside>
				<div className="tw-dash__main">
					<div className="tw-dash__title">
						<strong>Dashboard</strong>
						<span>This week</span>
					</div>
					<div className="tw-dash__big">
						KSh 1,284,300 <em>+14.2%</em>
					</div>
					<div className="tw-dash__kpis">
						{kpis.map((k) => (
							<div key={k.label}>
								<small>{k.label}</small>
								<b>{k.value}</b>
								<em className={k.up ? "up" : "down"}>{k.delta}</em>
							</div>
						))}
					</div>
					<div className="tw-dash__grid">
						<div className="tw-dash__card tw-dash__chart">
							<div className="tw-dash__card-head">
								<strong>Sales and conversations</strong>
								<span>Last 12 days</span>
							</div>
							<svg viewBox={`0 0 ${W} ${H}`} preserveAspectRatio="none" role="presentation">
								<defs>
									<linearGradient id="tw-area" x1="0" x2="0" y1="0" y2="1">
										<stop offset="0" stopColor="#f26a2e" stopOpacity=".28" />
										<stop offset="1" stopColor="#f26a2e" stopOpacity="0" />
									</linearGradient>
								</defs>
								{[0.2, 0.4, 0.6, 0.8].map((g) => (
									<line key={g} x1="0" x2={W} y1={H * g} y2={H * g} className="tw-dash__gridline" />
								))}
								<path d={`${line} L${W} ${H} L0 ${H} Z`} fill="url(#tw-area)" />
								<path d={line} className="tw-dash__line" />
								<path d={line2} className="tw-dash__line tw-dash__line--alt" />
							</svg>
						</div>
						<div className="tw-dash__card">
							<div className="tw-dash__card-head">
								<strong>Today’s activity</strong>
							</div>
							<div className="tw-dash__bars">
								{[34, 52, 40, 70, 58, 86, 64, 48, 76, 92, 60, 44, 68, 80].map((h, i) => (
									<span key={`${h}-${i}`} style={{ height: `${h}%` }} />
								))}
							</div>
						</div>
					</div>
					{detailed && (
						<div className="tw-dash__card tw-dash__table">
							<div className="tw-dash__card-head">
								<strong>Latest orders</strong>
							</div>
							{[
								["#4821", "Wanjiku M.", "Instagram", "KSh 5,750"],
								["#4820", "Otieno K.", "WhatsApp", "KSh 2,300"],
								["#4819", "Akinyi A.", "TikTok", "KSh 8,900"],
							].map(([id, who, via, amt]) => (
								<div key={id} className="tw-dash__row">
									<span>{id}</span>
									<span>{who}</span>
									<span>{via}</span>
									<span>{amt}</span>
								</div>
							))}
						</div>
					)}
				</div>
			</div>
		</div>
	);
}

export default function WelcomePage() {
	const { accessToken } = useUserToken();
	const primaryTo = accessToken ? "/pos" : "/auth/login";
	const primaryLabel = accessToken ? "Open console" : "Sign in";

	return (
		<main className="tribe-welcome">
			<header className="tw-header">
				<Link to="/welcome" className="tw-brand">
					<img src={logo} alt="" />
					<span>
						TRIBE <small>CONSOLE</small>
					</span>
				</Link>
				<nav aria-label="Sections" className="tw-nav">
					{navLinks.map((l) => (
						<a key={l.href} href={l.href}>
							{l.label}
						</a>
					))}
				</nav>
				<Link className="tw-btn tw-btn--primary tw-btn--sm" to={primaryTo}>
					{primaryLabel}
				</Link>
			</header>

			<section className="tw-hero" aria-labelledby="welcome-title">
				<div className="tw-hero__glow" aria-hidden="true" />
				<h1 id="welcome-title">
					Smart <span>Solutions</span> for Seamless
					<br />
					Social <span>Selling</span>
				</h1>
				<p>
					Ring up sales, keep favourites in stock and answer customers from every social platform, all from one console
					built for Kenyan shops.
				</p>
				<div className="tw-hero__actions">
					<Link className="tw-btn tw-btn--primary" to={primaryTo}>
						{accessToken ? "Open point of sale" : "Sign in to Tribe"} <ArrowRight size={16} aria-hidden="true" />
					</Link>
					<a className="tw-btn tw-btn--ghost" href="#features">
						<Play size={14} aria-hidden="true" /> See how it works
					</a>
				</div>
				<div className="tw-hero__shot">
					<DashboardMock />
					<span className="tw-caption">Illustrative data</span>
				</div>
			</section>

			<section id="platforms" className="tw-platforms" aria-label="Supported platforms">
				<p>Meet customers wherever they already talk to you</p>
				<ul>
					{platforms.map((p) => (
						<li key={p.name}>
							<Icon icon={p.icon} size={22} aria-hidden="true" />
							<span>{p.name}</span>
						</li>
					))}
				</ul>
			</section>

			<section className="tw-quote" aria-label="What Tribe is about">
				<span className="tw-quote__mark">
					<img src={logo} alt="" />
				</span>
				<blockquote>
					“We simplify shop management. Our console helps you <em>serve customers</em>, <em>track stock</em> and
					<em> read your sales</em> effortlessly. Run one shop or several with ease and reliability.”
				</blockquote>
			</section>

			<section className="tw-strategy" aria-labelledby="strategy-title">
				<span className="tw-badge">
					<i /> About Tribe
				</span>
				<h2 id="strategy-title">
					Visualize Your <span>Strategy</span>
				</h2>
				<p>See real-time sales and conversations side by side, and spot what to restock before it runs out.</p>
				<div className="tw-strategy__panel">
					<DashboardMock detailed />
				</div>
			</section>

			<section id="features" className="tw-features" aria-labelledby="features-title">
				<div className="tw-features__head">
					<span className="tw-badge">
						<i /> Our Highlights
					</span>
					<h2 id="features-title">
						Simplify Management to
						<br />
						Achieve <span>Greater Results</span>
					</h2>
					<p>
						Streamline how you sell and reply, so you can focus on what matters: your customers and the products they
						love.
					</p>
					<div className="tw-features__actions">
						<Link className="tw-btn tw-btn--primary tw-btn--sm" to={primaryTo}>
							{accessToken ? "Open console" : "Try for free"}
						</Link>
						<a className="tw-btn tw-btn--ghost tw-btn--sm" href="#plans">
							View plans
						</a>
					</div>
				</div>

				<div className="tw-cards">
					<article className="tw-card tw-card--pos">
						<div className="tw-card__art">
							<div className="tw-ticket">
								<div className="tw-ticket__head">
									<Store size={14} aria-hidden="true" /> Counter 1
								</div>
								{checkoutLines.map((l) => (
									<div key={l.item} className="tw-ticket__line">
										<span>
											{l.qty}× {l.item}
										</span>
										<b>{l.price}</b>
									</div>
								))}
								<div className="tw-ticket__total">
									<span>Total</span>
									<b>KSh 5,750</b>
								</div>
								<div className="tw-ticket__pay">Take payment</div>
							</div>
						</div>
						<h3>Point of sale</h3>
						<p>Ring up sales fast, print receipts and keep every order tied to the customer who placed it.</p>
					</article>

					<article className="tw-card tw-card--inbox">
						<div className="tw-card__art">
							<ul className="tw-chat">
								{conversations.map((c) => (
									<li key={c.platform}>
										<span className="tw-avatar" aria-hidden="true">
											{c.name[0]}
										</span>
										<div>
											<strong>
												{c.name} <small>{c.platform}</small>
											</strong>
											<p>{c.message}</p>
										</div>
									</li>
								))}
							</ul>
						</div>
						<h3>Social inbox</h3>
						<p>Stay ahead of the conversation. Catch questions from every platform before a sale slips away.</p>
					</article>

					<article className="tw-card tw-card--stock">
						<div className="tw-card__art">
							<div className="tw-stock">
								{[
									["Kitenge dress", 82],
									["Beaded sandals", 46],
									["Leather tote", 18],
									["Maasai shuka", 64],
								].map(([n, v]) => (
									<div key={n} className="tw-stock__row">
										<span>{n}</span>
										<div>
											<i style={{ width: `${v}%` }} data-low={Number(v) < 25 || undefined} />
										</div>
									</div>
								))}
								<div className="tw-stock__note">
									<TrendingUp size={13} aria-hidden="true" /> Leather tote is running low
								</div>
							</div>
						</div>
						<h3>Stock and reports</h3>
						<p>Know what sold, what is left and what to reorder, with daily reports that make restocking simple.</p>
					</article>
				</div>

				<ul className="tw-tools">
					{[
						{ title: "Point of sale", to: "/pos", icon: Store },
						{ title: "Orders", to: "/orders", icon: ClipboardList },
						{ title: "Inventory", to: "/inventory/stock", icon: Boxes },
						{ title: "Sales reports", to: "/analytics/daily-sales", icon: BarChart3 },
					].map(({ title, to, icon: ToolIcon }) => (
						<li key={to}>
							{accessToken ? (
								<Link to={to}>
									<ToolIcon size={17} aria-hidden="true" />
									{title}
									<ArrowRight size={14} aria-hidden="true" />
								</Link>
							) : (
								<span>
									<ToolIcon size={17} aria-hidden="true" />
									{title}
								</span>
							)}
						</li>
					))}
				</ul>
			</section>

			<section id="plans" className="tw-plans" aria-labelledby="plans-title">
				<span className="tw-badge">
					<i /> Built For You
				</span>
				<h2 id="plans-title">
					Flexible Setups to Suit
					<br />
					<span>Every Shop</span>
				</h2>
				<p>Whether you run one counter or a chain of branches, Tribe grows with you.</p>
				<div className="tw-plans__grid">
					{plans.map((p) => (
						<article key={p.name} className={`tw-plan${p.featured ? " is-featured" : ""}`}>
							<header>
								<h3>{p.name}</h3>
								{p.featured && (
									<span className="tw-plan__tag">
										<Sparkles size={11} aria-hidden="true" /> Popular
									</span>
								)}
							</header>
							<p>{p.blurb}</p>
							<Link className={`tw-btn tw-btn--sm ${p.featured ? "tw-btn--primary" : "tw-btn--ghost"}`} to={primaryTo}>
								{accessToken ? "Open console" : "Get started"}
							</Link>
							<ul>
								{p.features.map((f) => (
									<li key={f}>
										<Check size={15} aria-hidden="true" />
										{f}
									</li>
								))}
							</ul>
						</article>
					))}
				</div>
			</section>

			<section id="faq" className="tw-faq" aria-labelledby="faq-title">
				<span className="tw-badge">
					<i /> FAQ
				</span>
				<h2 id="faq-title">
					Frequently Asked <span>Questions</span>
				</h2>
				<p>Quick answers to the things shop teams ask us most.</p>
				<div className="tw-faq__list">
					{faqs.map((f, i) => (
						<details key={f.q} open={i === 0}>
							<summary>
								{f.q}
								<ChevronDown size={17} aria-hidden="true" />
							</summary>
							<p>{f.a}</p>
						</details>
					))}
				</div>
			</section>

			<footer className="tw-footer">
				<div className="tw-footer__top">
					<div className="tw-footer__about">
						<Link to="/welcome" className="tw-brand">
							<img src={logo} alt="" />
							<span>
								TRIBE <small>CONSOLE</small>
							</span>
						</Link>
						<p>Sales, stock and social conversations for Kenyan shops, powered by TRC Systems.</p>
						<ul className="tw-footer__social" aria-label="Platforms">
							{platforms.slice(0, 4).map((p) => (
								<li key={p.name} title={p.name}>
									<Icon icon={p.icon} size={15} aria-hidden="true" />
								</li>
							))}
						</ul>
					</div>
					{footerColumns.map((col) => (
						<nav key={col.title} aria-label={col.title}>
							<h4>{col.title}</h4>
							<ul>
								{col.links.map((l) => (
									<li key={l.label}>
										{"to" in l && l.to ? (
											accessToken ? (
												<Link to={l.to}>{l.label}</Link>
											) : (
												<Link to="/auth/login">{l.label}</Link>
											)
										) : (
											<a href={"href" in l ? l.href : "#"}>{l.label}</a>
										)}
									</li>
								))}
							</ul>
						</nav>
					))}
				</div>
				<div className="tw-footer__mark" aria-hidden="true">
					Tribe
				</div>
				<div className="tw-footer__bottom">
					<span>© {new Date().getFullYear()} Tribe Console. All rights reserved.</span>
					<span>Powered by TRC Systems</span>
				</div>
			</footer>
		</main>
	);
}
