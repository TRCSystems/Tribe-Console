// src/components/electron/DesktopNotification.tsx
import { notification } from "antd";
import { ElectronFileSystem } from "@/utils/electronUtils";

interface NotificationOptions {
	title: string;
	message: string;
	type?: "info" | "success" | "warning" | "error";
	duration?: number;
}

export class DesktopNotification {
	static async show(options: NotificationOptions) {
		const { isAvailable } = await import("@/utils/electronUtils");

		if (isAvailable()) {
			// Use Electron notifications
			await ElectronFileSystem.showNotification(options.title, options.message, {
				silent: options.type === "info",
			});
		} else {
			// Use browser notifications
			if ("Notification" in window) {
				if (Notification.permission === "granted") {
					new Notification(options.title, {
						body: options.message,
						icon: "/favicon.ico",
					});
				} else if (Notification.permission !== "denied") {
					Notification.requestPermission().then((permission) => {
						if (permission === "granted") {
							new Notification(options.title, {
								body: options.message,
								icon: "/favicon.ico",
							});
						}
					});
				}
			}

			// Fallback to Ant Design notification
			notification[options.type || "info"]({
				message: options.title,
				description: options.message,
				duration: options.duration || 4.5,
			});
		}
	}

	static info(title: string, message: string, duration?: number) {
		return DesktopNotification.show({ title, message, type: "info", duration });
	}

	static success(title: string, message: string, duration?: number) {
		return DesktopNotification.show({ title, message, type: "success", duration });
	}

	static warning(title: string, message: string, duration?: number) {
		return DesktopNotification.show({ title, message, type: "warning", duration });
	}

	static error(title: string, message: string, duration?: number) {
		return DesktopNotification.show({ title, message, type: "error", duration });
	}
}
