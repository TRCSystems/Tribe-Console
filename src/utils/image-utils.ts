// utils/image-utils.ts

/**
 * Convert a Blob to Base64 string
 */
export const blobToBase64 = (blob: Blob): Promise<string> => {
	return new Promise((resolve, reject) => {
		const reader = new FileReader();
		reader.onloadend = () => {
			// Remove the data URL prefix (e.g., "data:image/jpeg;base64,")
			const base64 = reader.result as string;
			const base64Data = base64.split(",")[1] || base64;
			resolve(base64Data);
		};
		reader.onerror = reject;
		reader.readAsDataURL(blob);
	});
};

/**
 * Convert Canvas to Blob
 */
export const canvasToBlob = (
	canvas: HTMLCanvasElement,
	type: string = "image/jpeg",
	quality: number = 0.9,
): Promise<Blob> => {
	return new Promise((resolve, reject) => {
		canvas.toBlob(
			(blob) => {
				if (blob) resolve(blob);
				else reject(new Error("Canvas to blob conversion failed"));
			},
			type,
			quality,
		);
	});
};

/**
 * Check if device has camera support
 */
export const hasCameraSupport = (): boolean => {
	return !!navigator.mediaDevices?.getUserMedia;
};

/**
 * Check if device is mobile
 */
export const isMobileDevice = (): boolean => {
	return /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
};

/**
 * Simple image compression
 */
export const compressImage = async (imageBlob: Blob, maxWidth: number = 1200, quality: number = 0.8): Promise<Blob> => {
	return new Promise((resolve, reject) => {
		const img = new Image();
		const url = URL.createObjectURL(imageBlob);

		img.onload = () => {
			URL.revokeObjectURL(url);

			const canvas = document.createElement("canvas");
			let width = img.width;
			let height = img.height;

			// Resize if larger than maxWidth
			if (width > maxWidth) {
				height = (height * maxWidth) / width;
				width = maxWidth;
			}

			canvas.width = width;
			canvas.height = height;

			const ctx = canvas.getContext("2d");
			if (!ctx) {
				reject(new Error("Could not get canvas context"));
				return;
			}

			ctx.drawImage(img, 0, 0, width, height);

			canvas.toBlob(
				(compressedBlob) => {
					if (compressedBlob) resolve(compressedBlob);
					else reject(new Error("Compression failed"));
				},
				"image/jpeg",
				quality,
			);
		};

		img.onerror = () => {
			URL.revokeObjectURL(url);
			reject(new Error("Failed to load image"));
		};

		img.src = url;
	});
};
