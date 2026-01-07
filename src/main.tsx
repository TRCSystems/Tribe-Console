import "./global.css";
import "./theme/theme.css";
import "./locales/i18n";
import ReactDOM from "react-dom/client";
import { createBrowserRouter, Outlet, RouterProvider } from "react-router";
import App from "./App";
import menuService from "./api/services/menuService";
import { registerLocalIcons } from "./components/icon";
import { GLOBAL_CONFIG } from "./global-config";
import ErrorBoundary from "./routes/components/error-boundary";
import { RoleRouteGuard } from "./routes/components/role-route-guard"; // ADDED
import { routesSection } from "./routes/sections";

const initApp = async () => {
	await registerLocalIcons();

	if (GLOBAL_CONFIG.routerMode === "backend") {
		await menuService.getMenuList();
	}

	const router = createBrowserRouter(
		[
			{
				Component: () => (
					<App>
						<RoleRouteGuard>
							{" "}
							<Outlet />
						</RoleRouteGuard>
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
