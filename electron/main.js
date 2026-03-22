// electron/main.js - FINAL PRODUCTION VERSION

import fs from "node:fs";
// ✅ FIX: Use require() for electron-updater with ES modules
import { createRequire } from "node:module";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { app, BrowserWindow, dialog, ipcMain, Menu, Notification, shell, Tray } from "electron";

const require = createRequire(import.meta.url);
const { autoUpdater } = require("electron-updater");

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

let mainWindow = null;
let tray = null;
const isDev = process.env.NODE_ENV === "development";

// Handle creating/removing shortcuts on Windows when installing/uninstalling
let squirrelStartup = null;
if (process.platform === "win32") {
	try {
		squirrelStartup = (await import("electron-squirrel-startup")).default;
	} catch (_error) {
		console.log("electron-squirrel-startup not available, continuing...");
	}
}

if (squirrelStartup) {
	app.quit();
}

function createWindow() {
	mainWindow = new BrowserWindow({
		width: 1400,
		height: 900,
		minWidth: 1024,
		minHeight: 768,
		show: false,
		icon: path.join(__dirname, "build-resources", "icon.png"),
		webPreferences: {
			nodeIntegration: false,
			contextIsolation: true,
			preload: path.join(__dirname, "preload.js"),
			webSecurity: true,
			allowRunningInsecureContent: false,
			devTools: isDev,
			spellcheck: false,
			sandbox: false,
			enablePreferredSizeMode: true,
			nativeWindowOpen: true,
			backgroundThrottling: false,
			webgl: true,
			plugins: true,
			enableClipboard: true,
			disableHtmlFullscreenWindowResize: false,
			safeDialogs: true,
			safeDialogsMessage: "OTP Verification",
			experimentalFeatures: false,
			scrollBounce: false,
			nodeIntegrationInWorker: false,
			nodeIntegrationInSubFrames: false,
		},
		autoHideMenuBar: true,
		frame: true,
		titleBarStyle: "hiddenInset",
		backgroundColor: "#ffffff",
		center: true,
		focusable: true,
		alwaysOnTop: false,
		skipTaskbar: false,
		acceptFirstMouse: true,
		hasShadow: true,
		thickFrame: true,
		resizable: true,
		minimizable: true,
		maximizable: true,
	});

	// ✅ ALWAYS LOAD THE REMOTE URL
	const REMOTE_URL = "http://38.242.155.236/auth/login";
	console.log("Loading TRIBE application from:", REMOTE_URL);

	mainWindow.loadURL(REMOTE_URL).catch((err) => {
		console.error("Failed to load application:", err);

		const errorHtml = `
      <html>
        <head><title>TRIBE - Connection Error</title></head>
        <body style="font-family: Arial, sans-serif; padding: 40px; text-align: center;">
          <h1 style="color: #dc2626;">Connection Error</h1>
          <p style="font-size: 16px; margin: 20px 0;">
            Unable to connect to TRIBE server.<br>
            Please check your internet connection.
          </p>
          <p style="color: #6b7280; font-size: 14px;">
            Error: ${err.message}
          </p>
          <button onclick="location.reload()" style="
            background: #3b82f6; 
            color: white; 
            border: none; 
            padding: 10px 20px; 
            border-radius: 5px; 
            cursor: pointer;
            margin-top: 20px;
          ">
            Retry Connection
          </button>
        </body>
      </html>
    `;

		mainWindow.loadURL(`data:text/html;charset=utf-8,${encodeURIComponent(errorHtml)}`);
	});

	// Show when ready
	mainWindow.once("ready-to-show", () => {
		mainWindow.show();
		mainWindow.focus();

		// ✅ Check for updates (only in production)
		if (!isDev) {
			autoUpdater.checkForUpdatesAndNotify();
		}
	});

	// Handle window focus events
	mainWindow.on("focus", () => {
		console.log("Electron Window gained focus");
		if (mainWindow.webContents) {
			mainWindow.webContents.send("window-focused");
		}
	});

	// Handle external links
	mainWindow.webContents.setWindowOpenHandler(({ url }) => {
		if (url.includes("38.242.155.236")) {
			return { action: "allow" };
		}
		shell.openExternal(url);
		return { action: "deny" };
	});

	mainWindow.webContents.on("new-window", (event, url) => {
		event.preventDefault();
		shell.openExternal(url);
	});

	// Log navigation for debugging
	mainWindow.webContents.on("did-navigate", (_event, url) => {
		console.log("Navigated to:", url);
	});

	// Log failed loads
	mainWindow.webContents.on("did-fail-load", (_event, errorCode, errorDescription, validatedURL) => {
		console.error("Failed to load:", validatedURL, errorCode, errorDescription);
	});

	createApplicationMenu();

	// Create system tray for Windows/Linux
	if (process.platform !== "darwin") {
		createSystemTray();
	}

	mainWindow.on("closed", () => {
		mainWindow = null;
	});

	// On macOS, hide instead of close
	mainWindow.on("close", (event) => {
		if (process.platform === "darwin") {
			event.preventDefault();
			mainWindow.hide();
		}
	});
}

function createSystemTray() {
	try {
		const iconPath = path.join(__dirname, "build-resources", "tray-icon.png");
		const defaultIconPath = path.join(__dirname, "build-resources", "icon.ico");

		let actualIconPath = defaultIconPath;
		if (fs.existsSync(iconPath)) {
			actualIconPath = iconPath;
		}

		tray = new Tray(actualIconPath);

		const contextMenu = Menu.buildFromTemplate([
			{
				label: "Show TRIBE",
				click: () => {
					if (mainWindow) {
						mainWindow.show();
						mainWindow.focus();
					}
				},
			},
			{ type: "separator" },
			{
				label: "Quit",
				click: () => {
					app.quit();
				},
			},
		]);

		tray.setToolTip("TRIBE Loyalty Engine");
		tray.setContextMenu(contextMenu);

		tray.on("click", () => {
			if (mainWindow) {
				if (mainWindow.isVisible()) {
					mainWindow.hide();
				} else {
					mainWindow.show();
					mainWindow.focus();
				}
			}
		});
	} catch (error) {
		console.error("Failed to create system tray:", error);
	}
}

function createApplicationMenu() {
	const isMac = process.platform === "darwin";

	const template = [
		...(isMac
			? [
					{
						label: app.name,
						submenu: [
							{ role: "about" },
							{ type: "separator" },
							{ role: "services" },
							{ type: "separator" },
							{ role: "hide" },
							{ role: "hideOthers" },
							{ role: "unhide" },
							{ type: "separator" },
							{ role: "quit" },
						],
					},
				]
			: []),

		{
			label: "File",
			submenu: [
				{
					label: "Open File...",
					accelerator: "CmdOrCtrl+O",
					click: async () => {
						const result = await dialog.showOpenDialog(mainWindow, {
							properties: ["openFile"],
							filters: [
								{ name: "CSV Files", extensions: ["csv", "txt"] },
								{ name: "Excel Files", extensions: ["xlsx", "xls"] },
								{ name: "JSON Files", extensions: ["json"] },
								{ name: "All Files", extensions: ["*"] },
							],
						});
						if (!result.canceled && result.filePaths.length > 0) {
							mainWindow.webContents.send("file-selected", result.filePaths[0]);
						}
					},
				},
				{
					label: "Save As...",
					accelerator: "CmdOrCtrl+Shift+S",
					click: async () => {
						const result = await dialog.showSaveDialog(mainWindow, {
							filters: [
								{ name: "CSV Files", extensions: ["csv"] },
								{ name: "Excel Files", extensions: ["xlsx"] },
								{ name: "JSON Files", extensions: ["json"] },
								{ name: "All Files", extensions: ["*"] },
							],
						});
						if (!result.canceled && result.filePath) {
							mainWindow.webContents.send("save-file", result.filePath);
						}
					},
				},
				{ type: "separator" },
				{
					label: "Print",
					accelerator: "CmdOrCtrl+P",
					click: () => {
						mainWindow.webContents.print();
					},
				},
				{ type: "separator" },
				isMac ? { role: "close" } : { role: "quit" },
			],
		},

		{
			label: "Edit",
			submenu: [
				{ role: "undo" },
				{ role: "redo" },
				{ type: "separator" },
				{ role: "cut" },
				{ role: "copy" },
				{ role: "paste" },
				...(isMac
					? [{ role: "pasteAndMatchStyle" }, { role: "delete" }, { role: "selectAll" }]
					: [{ role: "delete" }, { type: "separator" }, { role: "selectAll" }]),
			],
		},

		{
			label: "View",
			submenu: [
				{ role: "reload" },
				{ role: "forceReload" },
				{ role: "toggleDevTools" },
				{ type: "separator" },
				{ role: "resetZoom" },
				{ role: "zoomIn" },
				{ role: "zoomOut" },
				{ type: "separator" },
				{ role: "togglefullscreen" },
			],
		},

		{
			label: "Window",
			submenu: [
				{ role: "minimize" },
				{ role: "zoom" },
				...(isMac ? [{ type: "separator" }, { role: "front" }] : [{ role: "close" }]),
			],
		},

		{
			label: "Help",
			submenu: [
				{
					label: "Documentation",
					click: () => {
						shell.openExternal("https://docs.tribeloyalty.com");
					},
				},
				{
					label: "Report Issue",
					click: () => {
						shell.openExternal("mailto:support@tribeloyalty.com");
					},
				},
				{ type: "separator" },
				{
					label: "About TRIBE",
					click: () => {
						dialog.showMessageBox(mainWindow, {
							type: "info",
							title: "About TRIBE Engine",
							message: "TRIBE Engine Desktop",
							detail: `Version ${app.getVersion()}\n\nA powerful loyalty management system.\n© 2025 TRIBE`,
							buttons: ["OK"],
						});
					},
				},
			],
		},
	];

	const menu = Menu.buildFromTemplate(template);
	Menu.setApplicationMenu(menu);
}

// IPC Handlers
ipcMain.handle("dialog:openFile", async (_event, options) => {
	const result = await dialog.showOpenDialog(mainWindow, options);
	return result;
});

ipcMain.handle("dialog:saveFile", async (_event, options) => {
	const result = await dialog.showSaveDialog(mainWindow, options);
	return result;
});

ipcMain.handle("dialog:showMessageBox", async (_event, options) => {
	const result = await dialog.showMessageBox(mainWindow, options);
	return result;
});

ipcMain.handle("fs:readFile", async (_event, filePath) => {
	try {
		const content = await fs.promises.readFile(filePath, "utf-8");
		return { success: true, content };
	} catch (error) {
		return { success: false, error: error.message };
	}
});

ipcMain.handle("fs:writeFile", async (_event, filePath, content) => {
	try {
		await fs.promises.writeFile(filePath, content, "utf-8");
		return { success: true };
	} catch (error) {
		return { success: false, error: error.message };
	}
});

ipcMain.handle("fs:readDir", async (_event, dirPath) => {
	try {
		const files = await fs.promises.readdir(dirPath, { withFileTypes: true });
		return {
			success: true,
			files: files.map((file) => ({
				name: file.name,
				isDirectory: file.isDirectory(),
				path: path.join(dirPath, file.name),
			})),
		};
	} catch (error) {
		return { success: false, error: error.message };
	}
});

ipcMain.handle("notification:show", async (_event, options) => {
	const notification = new Notification({
		title: options.title || "TRIBE Notification",
		body: options.body || "",
		silent: options.silent || false,
	});
	notification.show();
	return true;
});

ipcMain.handle("app:getPath", async (_event, name) => {
	return app.getPath(name);
});

ipcMain.handle("app:getVersion", async () => {
	return app.getVersion();
});

ipcMain.handle("app:restart", async () => {
	app.relaunch();
	app.exit(0);
});

ipcMain.handle("window:minimize", () => {
	if (mainWindow) mainWindow.minimize();
});

ipcMain.handle("window:maximize", () => {
	if (mainWindow) {
		if (mainWindow.isMaximized()) {
			mainWindow.unmaximize();
		} else {
			mainWindow.maximize();
		}
	}
});

ipcMain.handle("window:close", () => {
	if (mainWindow) mainWindow.close();
});

ipcMain.handle("window:requestFocus", () => {
	if (mainWindow) {
		mainWindow.focus();
		mainWindow.setAlwaysOnTop(true, "normal");
		setTimeout(() => {
			mainWindow.setAlwaysOnTop(false);
		}, 100);
		return true;
	}
	return false;
});

ipcMain.handle("window:sendFocusEvent", () => {
	if (mainWindow?.webContents) {
		mainWindow.webContents.send("window-focused");
		return true;
	}
	return false;
});

// App lifecycle
app.whenReady().then(() => {
	createWindow();

	app.on("activate", () => {
		if (BrowserWindow.getAllWindows().length === 0) {
			createWindow();
		}
	});
});

app.on("window-all-closed", () => {
	if (process.platform !== "darwin") {
		app.quit();
	}
});

// Deep linking
app.setAsDefaultProtocolClient("tribe-loyalty");

app.on("open-url", (event, url) => {
	event.preventDefault();
	if (mainWindow?.webContents) {
		mainWindow.webContents.send("deep-link", url);
	}
});

// Prevent multiple instances
const gotTheLock = app.requestSingleInstanceLock();

if (!gotTheLock) {
	app.quit();
} else {
	app.on("second-instance", (_event, _commandLine, _workingDirectory) => {
		if (mainWindow) {
			if (mainWindow.isMinimized()) mainWindow.restore();
			mainWindow.focus();
		}
	});
}

// Auto-updater events
autoUpdater.on("update-available", (info) => {
	if (mainWindow?.webContents) {
		mainWindow.webContents.send("update-available", info);
	}
});

autoUpdater.on("update-downloaded", (info) => {
	if (mainWindow?.webContents) {
		mainWindow.webContents.send("update-downloaded", info);
	}
});

autoUpdater.on("error", (error) => {
	if (mainWindow?.webContents) {
		mainWindow.webContents.send("update-error", error);
	}
});

// Error handling
process.on("uncaughtException", (error) => {
	console.error("Uncaught Exception:", error);
});

process.on("unhandledRejection", (error) => {
	console.error("Unhandled Rejection:", error);
});
