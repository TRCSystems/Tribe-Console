import "./global.css";
import "./theme/theme.css";
import "./locales/i18n";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import { worker } from "./_mock";
import App from "./App";
import menuService from "./api/services/menuService";
import { registerLocalIcons } from "./components/icon";
import { GLOBAL_CONFIG } from "./global-config";
import ErrorBoundary from "./routes/components/error-boundary";
import { routesSection } from "./routes/sections";

const initApp = async () => {
	await registerLocalIcons();

	// Start MSW without blocking app render
	if (import.meta.env.DEV) {
		try {
			await worker.start({
				onUnhandledRequest: "bypass",
				// Remove the custom serviceWorker URL to use default path
			});
			console.log("MSW started successfully");
		} catch (error) {
			console.warn("MSW failed to start, continuing without mocking", error);
		}
	}

	if (GLOBAL_CONFIG.routerMode === "backend") {
		await menuService.getMenuList();
	}

	const router = createBrowserRouter(
		[
			{
				Component: () => (
					<App>
						<Outlet />
					</App>
				),
				errorElement: <ErrorBoundary />,
				children: routesSection,
			},
		],
		{
			basename: GLOBAL_CONFIG.publicPath,
		},
	);

	const root = ReactDOM.createRoot(document.getElementById("root") as HTMLElement);
	root.render(<RouterProvider router={router} />);
};

initApp();
