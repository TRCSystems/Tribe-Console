// src/pages/legal/index.tsx - Public privacy policy, terms and data deletion pages (no login). Meta's app settings link
// here, so they must load without signing in and describe what Tribe and SokoReply really collect.
import type React from "react";
import { Link } from "react-router";

/** Who people contact about their data. Change here and every page follows. */
export const LEGAL = {
	company: "ASANO GROUP LIMITED",
	product: "Tribe",
	email: "musularonald17@gmail.com",
	place: "Nairobi, Kenya",
	updated: "9 November 2026",
};

export type LegalPageKind = "privacy" | "terms" | "data-deletion";

const TITLES: Record<LegalPageKind, string> = {
	privacy: "Privacy policy",
	terms: "Terms of service",
	"data-deletion": "Deleting your data",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<section className="mt-8">
			<h2 className="text-lg font-semibold">{title}</h2>
			<div className="mt-2 space-y-3 leading-relaxed">{children}</div>
		</section>
	);
}

function Mail() {
	return (
		<a className="text-primary underline" href={`mailto:${LEGAL.email}`}>
			{LEGAL.email}
		</a>
	);
}

function Privacy() {
	return (
		<>
			<p>
				{LEGAL.company} ("we") runs {LEGAL.product}, a sales and loyalty platform for businesses in Kenya, and
				SokoReply, the part of {LEGAL.product} whose agents answer buyers in the comments of a business's Facebook and
				Instagram posts. This policy explains what we collect, why, and how to have it deleted.
			</p>
			<Section title="Who this covers">
				<p>
					Businesses that use {LEGAL.product} ("sellers"), and people who comment on a seller's posts, message a seller,
					or order from a seller through {LEGAL.product} ("buyers").
				</p>
			</Section>
			<Section title="What we collect from sellers">
				<ul className="list-disc space-y-1 pl-6">
					<li>Account details: business name, contact name, phone number, email and the users who sign in.</li>
					<li>
						When a seller connects Facebook or Instagram: the Page and Instagram account names and IDs, and the access
						token Meta gives us for them. Tokens are stored encrypted and are used only to read and answer comments and
						messages on that seller's own Page and account.
					</li>
					<li>
						What the seller tells us to answer buyers with: products, prices, stock, location, opening hours, delivery
						areas and FAQs.
					</li>
				</ul>
			</Section>
			<Section title="What we collect about buyers">
				<ul className="list-disc space-y-1 pl-6">
					<li>
						Comments on the seller's posts: the text, the time, the post, and the commenter's name and ID as Meta
						provides them.
					</li>
					<li>
						Phone numbers written in a comment. We hide such a comment from public view to protect the buyer, and pass
						the number to the seller only, so they can call back.
					</li>
					<li>Replies a buyer sends to the seller's private message, so the conversation can continue.</li>
					<li>
						When a buyer orders through WhatsApp or an order link: name, phone number, delivery details, what was
						ordered and payment status.
					</li>
				</ul>
			</Section>
			<Section title="How we use it">
				<ul className="list-disc space-y-1 pl-6">
					<li>
						To read each comment, understand what the buyer is asking, and reply on the seller's behalf with the
						seller's own information.
					</li>
					<li>To show the seller their comments, buyers and orders, and to alert them when a buyer needs a person.</li>
					<li>To process orders and payments the buyer starts.</li>
				</ul>
				<p>We do not sell personal data and we do not use it for advertising.</p>
			</Section>
			<Section title="Who we share it with">
				<ul className="list-disc space-y-1 pl-6">
					<li>The seller whose post or shop the buyer interacted with.</li>
					<li>Meta (Facebook, Instagram and WhatsApp), to read and send comments and messages.</li>
					<li>
						Anthropic, whose AI models read comments and help write replies. They process the text for us and do not use
						it to train their models.
					</li>
					<li>Payment providers such as M-Pesa, when a buyer pays.</li>
					<li>Authorities, where Kenyan law requires it.</li>
				</ul>
			</Section>
			<Section title="How long we keep it">
				<p>
					We keep data while the seller uses {LEGAL.product}. When a seller disconnects a Page or closes their account,
					we delete that Page's access token at once and its comments and buyer details within 30 days, unless the law
					requires us to keep records longer (for example, payment records).
				</p>
			</Section>
			<Section title="Security">
				<p>
					Data is stored on servers we control, access is limited to staff who need it, and access tokens are encrypted.
					No system is perfectly secure, and we will tell affected sellers promptly if a breach affects their data.
				</p>
			</Section>
			<Section title="Your rights">
				<p>
					Under Kenya's Data Protection Act, 2019 you may ask to see, correct or delete your data, or object to how we
					use it. Email <Mail />. See{" "}
					<Link className="text-primary underline" to="/data-deletion">
						Deleting your data
					</Link>{" "}
					for the steps.
				</p>
			</Section>
			<Section title="Changes">
				<p>We will update this page when what we collect changes, and change the date at the top.</p>
			</Section>
		</>
	);
}

function Terms() {
	return (
		<>
			<p>
				These terms apply to businesses using {LEGAL.product}, provided by {LEGAL.company}. By signing in you agree to
				them.
			</p>
			<Section title="The service">
				<p>
					{LEGAL.product} helps businesses sell: point of sale, orders, stock, customers, and SokoReply, whose agents
					answer buyers in the comments and messages of the business's own Facebook and Instagram accounts. We only
					provide the modules the business has signed up for.
				</p>
			</Section>
			<Section title="Your responsibilities">
				<ul className="list-disc space-y-1 pl-6">
					<li>Connect only Pages and accounts you own or are allowed to manage.</li>
					<li>Keep your products, prices, stock and location up to date. The agents answer from what you give them.</li>
					<li>Follow Meta's terms and the law when selling, including consumer protection and data protection law.</li>
					<li>Keep your sign-in details private and tell us if you think someone else has them.</li>
				</ul>
			</Section>
			<Section title="Replies sent for you">
				<p>
					SokoReply's agents reply in your name using your information. You can pause them, change what they say, or
					take over any conversation at any time. You remain responsible for the products you sell and the promises made
					about them.
				</p>
			</Section>
			<Section title="Data">
				<p>
					You own your business data. We process it to run the service as described in our{" "}
					<Link className="text-primary underline" to="/privacy">
						privacy policy
					</Link>
					.
				</p>
			</Section>
			<Section title="Availability and liability">
				<p>
					We work to keep {LEGAL.product} running but cannot promise it will never be interrupted, including when Meta
					or a payment provider is unavailable. To the extent the law allows, we are not liable for lost sales or
					indirect losses.
				</p>
			</Section>
			<Section title="Ending the service">
				<p>
					You can disconnect your accounts or stop using {LEGAL.product} at any time. We may suspend accounts that break
					these terms or the law. These terms are governed by the laws of Kenya.
				</p>
			</Section>
			<Section title="Contact">
				<p>
					{LEGAL.company}, {LEGAL.place}. <Mail />
				</p>
			</Section>
		</>
	);
}

function DataDeletion() {
	return (
		<>
			<p>You can have the data {LEGAL.product} holds about you deleted at any time.</p>
			<Section title="If you are a business using Tribe">
				<ol className="list-decimal space-y-1 pl-6">
					<li>In {LEGAL.product}, open SokoReply and disconnect your Page. We delete its access token at once.</li>
					<li>
						To remove our access on Facebook too: Facebook Settings, then Business integrations, then remove the{" "}
						{LEGAL.product} app.
					</li>
					<li>
						To delete everything (comments, buyers, orders and your account), email <Mail /> from your account's email
						with your business name. We confirm within 7 days and delete within 30 days, except records the law requires
						us to keep.
					</li>
				</ol>
			</Section>
			<Section title="If you commented on or messaged a business">
				<p>
					Email <Mail /> with your name as it appears on Facebook or Instagram, the business you commented on, and (if
					you can) a link to the comment. We delete your comments, messages and details from {LEGAL.product} within 30
					days and confirm by email. Deleting a comment on Facebook or Instagram itself is done there.
				</p>
			</Section>
		</>
	);
}

export default function LegalPage({ kind }: { kind: LegalPageKind }) {
	return (
		<div className="min-h-screen bg-background text-foreground">
			<main className="mx-auto max-w-3xl px-4 py-10 sm:py-14">
				<p className="text-sm text-muted-foreground">
					{LEGAL.company} · {LEGAL.product}
				</p>
				<h1 className="mt-1 text-3xl font-bold">{TITLES[kind]}</h1>
				<p className="mt-1 text-sm text-muted-foreground">Last updated {LEGAL.updated}</p>
				<div className="mt-6">
					{kind === "privacy" && <Privacy />}
					{kind === "terms" && <Terms />}
					{kind === "data-deletion" && <DataDeletion />}
				</div>
				<nav className="mt-12 flex flex-wrap gap-4 border-t pt-6 text-sm text-muted-foreground">
					<Link to="/privacy">Privacy policy</Link>
					<Link to="/terms">Terms of service</Link>
					<Link to="/data-deletion">Deleting your data</Link>
				</nav>
			</main>
		</div>
	);
}
