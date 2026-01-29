// src/utils/electronUtils.ts
export interface ElectronAPI {
	openFileDialog: (options?: any) => Promise<any>;
	saveFileDialog: (options?: any) => Promise<any>;
	showMessageBox: (options: any) => Promise<any>;

	readFile: (filePath: string) => Promise<any>;
	writeFile: (filePath: string, content: string) => Promise<any>;
	readDirectory: (dirPath: string) => Promise<any>;

	showNotification: (options: any) => Promise<boolean>;

	getAppPath: (name: string) => Promise<string>;
	getAppVersion: () => Promise<string>;
	restartApp: () => Promise<void>;

	minimizeWindow: () => void;
	maximizeWindow: () => void;
	closeWindow: () => void;

	platform: NodeJS.Platform;
	isElectron: boolean;

	onFileSelected: (callback: (filePath: string) => void) => void;
	onSaveFile: (callback: (filePath: string) => void) => void;
	onDeepLink: (callback: (url: string) => void) => void;

	removeFileSelectedListener: () => void;
	removeSaveFileListener: () => void;
	removeDeepLinkListener: () => void;

	joinPath: (...paths: string[]) => string;
	basename: (filePath: string, ext?: string) => string;
	dirname: (filePath: string) => string;
	extname: (filePath: string) => string;
	isAbsolute: (filePath: string) => boolean;

	isDevelopment: boolean;
	isProduction: boolean;
}

export const isElectron = () => {
	return !!(window as any).electronAPI;
};

export const getElectronAPI = (): ElectronAPI | null => {
	if (isElectron()) {
		return (window as any).electronAPI;
	}
	return null;
};

export class ElectronFileSystem {
	private static api = getElectronAPI();

	static async importCSV(filePath?: string): Promise<string> {
		if (!ElectronFileSystem.api) {
			throw new Error("Not running in Electron");
		}

		if (!filePath) {
			const result = await ElectronFileSystem.api.openFileDialog({
				title: "Import CSV File",
				filters: [
					{ name: "CSV Files", extensions: ["csv", "txt"] },
					{ name: "All Files", extensions: ["*"] },
				],
				properties: ["openFile"],
			});

			if (result.canceled || result.filePaths.length === 0) {
				throw new Error("No file selected");
			}

			filePath = result.filePaths[0];
		}

		const readResult = await ElectronFileSystem.api.readFile(filePath);
		if (!readResult.success) {
			throw new Error(`Failed to read file: ${readResult.error}`);
		}

		return readResult.content || "";
	}

	static async exportCSV(content: string, defaultName: string = "export.csv"): Promise<string> {
		if (!ElectronFileSystem.api) {
			throw new Error("Not running in Electron");
		}

		const result = await ElectronFileSystem.api.saveFileDialog({
			title: "Export CSV File",
			defaultPath: defaultName,
			filters: [
				{ name: "CSV Files", extensions: ["csv"] },
				{ name: "Text Files", extensions: ["txt"] },
			],
		});

		if (result.canceled || !result.filePath) {
			throw new Error("Export cancelled");
		}

		const writeResult = await ElectronFileSystem.api.writeFile(result.filePath, content);
		if (!writeResult.success) {
			throw new Error(`Failed to write file: ${writeResult.error}`);
		}

		return result.filePath;
	}

	static async showNotification(title: string, body: string) {
		if (!ElectronFileSystem.api) {
			if ("Notification" in window && Notification.permission === "granted") {
				new Notification(title, { body });
			}
			return;
		}

		await ElectronFileSystem.api.showNotification({
			title,
			body,
		});
	}
}

import { useEffect, useState } from "react";

export const useElectron = () => {
	const [isAvailable, setIsAvailable] = useState(false);
	const [api, setApi] = useState<ElectronAPI | null>(null);

	useEffect(() => {
		const checkElectron = () => {
			const available = isElectron();
			setIsAvailable(available);
			if (available) {
				setApi(getElectronAPI());
			}
		};

		checkElectron();

		const timer = setTimeout(checkElectron, 1000);

		return () => clearTimeout(timer);
	}, []);

	return { isAvailable, api };
};
