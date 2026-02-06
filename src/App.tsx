// src/App.tsx - UPDATED
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { Helmet, HelmetProvider } from "react-helmet-async";
import Logo from "@/assets/icons/ic-logo-badge.svg";
//import { TokenDebug } from "@/components/debug/token-debug";
import { MotionLazy } from "./components/animate/motion-lazy";
//import { DebugAuth } from "./components/debug/debug-auth";
//import { MerchantDebug } from "./components/debug/merchant-debug";
import { TokenRecovery } from "./components/debug/token-recovery";
import { RouteLoadingProgress } from "./components/loading";
import Toast from "./components/toast";
import { MerchantProvider } from "./contexts/MerchantContext";
import { GLOBAL_CONFIG } from "./global-config";
import { AntdAdapter } from "./theme/adapter/antd.adapter";
import { ThemeProvider } from "./theme/theme-provider";

function App({ children }: { children: React.ReactNode }) {
	return (
		<HelmetProvider>
			<QueryClientProvider client={new QueryClient()}>
				<ThemeProvider adapters={[AntdAdapter]}>
					<MerchantProvider>
						<VercelAnalytics debug={import.meta.env.PROD} />
						<Helmet>
							<title>{GLOBAL_CONFIG.appName}</title>
							<link rel="icon" href={Logo} />
						</Helmet>
						<Toast />
						<RouteLoadingProgress />

						<TokenRecovery />

						{
							import.meta.env.DEV && null
							/*	<DebugAuth />
							<MerchantDebug />
							<TokenDebug /> */
						}
						<MotionLazy>{children}</MotionLazy>
					</MerchantProvider>
				</ThemeProvider>
			</QueryClientProvider>
		</HelmetProvider>
	);
}

export default App;
