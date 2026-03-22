// vite.config.ts - CORRECTED FINAL VERSION

import path from "node:path";
import tailwindcss from "@tailwindcss/vite";
import { vanillaExtractPlugin } from "@vanilla-extract/vite-plugin";
import react from "@vitejs/plugin-react";
import { visualizer } from "rollup-plugin-visualizer";
import { defineConfig, loadEnv } from "vite";
import { viteStaticCopy } from "vite-plugin-static-copy";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig(({ mode }) => {
	const env = loadEnv(mode, process.cwd(), "");
	const base = env.VITE_APP_PUBLIC_PATH || "/";
	const isProduction = mode === "production";

	// Check if we're building for Electron
	const isElectron = env.VITE_ELECTRON === "true" || mode === "electron";

	return {
		base: isElectron ? "./" : base,

		plugins: [
			react({
				// Remove babel-plugin-react-compiler if you don't need it
				// babel: {
				// 	plugins: ["babel-plugin-react-compiler"],
				// },
			}),
			vanillaExtractPlugin({
				identifiers: ({ debugId }) => `${debugId}`,
			}),
			tailwindcss(),
			tsconfigPaths(),

			// Copy Electron resources
			isElectron &&
				isProduction &&
				viteStaticCopy({
					targets: [
						{
							src: "electron/build-resources/*",
							dest: "build-resources",
						},
					],
				}),

			isProduction &&
				visualizer({
					open: false,
					gzipSize: true,
					brotliSize: true,
					template: "treemap",
					filename: "stats.html",
				}),
		].filter(Boolean),

		// Path resolution
		resolve: {
			alias: {
				"@": path.resolve(__dirname, "./src"),
				"@components": path.resolve(__dirname, "./src/components"),
				"@pages": path.resolve(__dirname, "./src/pages"),
				"@utils": path.resolve(__dirname, "./src/utils"),
				"@hooks": path.resolve(__dirname, "./src/hooks"),
				"@store": path.resolve(__dirname, "./src/store"),
				"@services": path.resolve(__dirname, "./src/services"),
				"@assets": path.resolve(__dirname, "./src/assets"),
			},
		},

		// Development server configuration
		server: {
			open: !isElectron,
			host: true,
			port: 3000,
			strictPort: true,
			proxy: !isElectron
				? {
						"/api": {
							target: "http://38.242.155.236:8085",
							changeOrigin: true,
							rewrite: (path) => path.replace(/^\/api/, "/api/v1"),
							secure: false,
						},
					}
				: undefined,
			headers: {
				"Access-Control-Allow-Origin": "*",
			},
		},

		// Build configuration
		build: {
			target: "es2020",
			minify: isProduction ? "esbuild" : false,
			sourcemap: !isProduction,
			cssCodeSplit: true,
			cssMinify: isProduction,
			chunkSizeWarningLimit: 1600,
			outDir: isElectron ? "dist-electron/web" : "dist",

			// Rollup configuration
			rollupOptions: {
				output: {
					manualChunks: {
						"vendor-react": ["react", "react-dom", "react-router"],
						"vendor-antd": ["antd", "@ant-design/cssinjs", "@ant-design/icons"],
						"vendor-ui": ["styled-components", "framer-motion", "radix-ui"],
						"vendor-utils": ["axios", "dayjs", "i18next", "zustand", "@tanstack/react-query"],
						"vendor-charts": ["apexcharts", "react-apexcharts", "recharts"],
						"vendor-icons": ["@iconify/react", "lucide-react"],
					},
					// Ensure consistent file naming
					entryFileNames: "assets/[name].[hash].js",
					chunkFileNames: "assets/[name].[hash].js",
					assetFileNames: "assets/[name].[hash].[ext]",
				},
			},

			// Empty output directory before building
			emptyOutDir: true,
		},

		// Dependency optimization
		optimizeDeps: {
			include: [
				"react",
				"react-dom",
				"react-router",
				"radix-ui",
				"antd",
				"axios",
				"dayjs",
				"i18next",
				"@iconify/react",
				"lucide-react",
				"zustand",
				"@tanstack/react-query",
			],
			exclude: ["electron", "electron-builder"],
		},

		// ESBuild configuration
		esbuild: {
			drop: isProduction ? ["console", "debugger"] : [],
			legalComments: "none",
			target: "es2020",
		},

		// Global variables
		define: {
			"process.env.ELECTRON": JSON.stringify(isElectron),
			"process.env.NODE_ENV": JSON.stringify(mode),
			global: "globalThis",
		},

		// CSS configuration
		css: {
			devSourcemap: !isProduction,
		},
	};
});
