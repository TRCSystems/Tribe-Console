// electron/preload.js - MINIMAL VERSION
const { contextBridge, ipcRenderer } = require("electron");

contextBridge.exposeInMainWorld("electronAPI", {
	// Only expose what you actually need
	getVersion: () => ipcRenderer.invoke("app:getVersion"),
	showNotification: (options) => ipcRenderer.invoke("notification:show", options),
	// Add any other methods you actually use
});

// Simple Electron detection
contextBridge.exposeInMainWorld("isElectron", true);
