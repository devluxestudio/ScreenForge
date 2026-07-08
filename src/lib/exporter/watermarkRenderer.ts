import type { WatermarkSettings } from "@/components/video-editor/types";

const imageCache = new Map<string, HTMLImageElement>();

async function getWatermarkImage(url: string): Promise<HTMLImageElement> {
	if (imageCache.has(url)) {
		return imageCache.get(url)!;
	}

	const img = new Image();
	if (url.startsWith("http") && !url.startsWith(window.location.origin)) {
		img.crossOrigin = "anonymous";
	}

	await new Promise<void>((resolve, reject) => {
		img.onload = () => resolve();
		img.onerror = (e) => reject(new Error("Failed to load watermark image"));
		img.src = url;
	});

	imageCache.set(url, img);
	return img;
}

export async function renderWatermark(
	ctx: CanvasRenderingContext2D,
	settings: WatermarkSettings,
	canvasWidth: number,
	canvasHeight: number,
) {
	if (!settings.imageUrl) return;

	let img: HTMLImageElement;
	try {
		img = await getWatermarkImage(settings.imageUrl);
	} catch (error) {
		console.warn("[watermarkRenderer] Failed to load watermark", error);
		return;
	}

	const padding = 16 * (canvasWidth / 800); // Scale padding based on resolution (assumes 800 is preview width)
	const sizeRatio = settings.size / 100;

	// Default to width scaling
	let drawWidth = canvasWidth * sizeRatio;
	let drawHeight = (img.height / img.width) * drawWidth;

	// If it's too tall, scale by height instead
	if (drawHeight > canvasHeight * sizeRatio) {
		drawHeight = canvasHeight * sizeRatio;
		drawWidth = (img.width / img.height) * drawHeight;
	}

	let x = 0;
	let y = 0;

	switch (settings.position) {
		case "top-left":
			x = padding;
			y = padding;
			break;
		case "top-center":
			x = (canvasWidth - drawWidth) / 2;
			y = padding;
			break;
		case "top-right":
			x = canvasWidth - drawWidth - padding;
			y = padding;
			break;
		case "center-left":
			x = padding;
			y = (canvasHeight - drawHeight) / 2;
			break;
		case "center":
			x = (canvasWidth - drawWidth) / 2;
			y = (canvasHeight - drawHeight) / 2;
			break;
		case "center-right":
			x = canvasWidth - drawWidth - padding;
			y = (canvasHeight - drawHeight) / 2;
			break;
		case "bottom-left":
			x = padding;
			y = canvasHeight - drawHeight - padding;
			break;
		case "bottom-center":
			x = (canvasWidth - drawWidth) / 2;
			y = canvasHeight - drawHeight - padding;
			break;
		case "bottom-right":
			x = canvasWidth - drawWidth - padding;
			y = canvasHeight - drawHeight - padding;
			break;
	}

	ctx.save();
	ctx.globalAlpha = settings.opacity / 100;
	ctx.shadowColor = "rgba(0, 0, 0, 0.5)";
	ctx.shadowBlur = 10 * (canvasWidth / 800);
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 4 * (canvasWidth / 800);

	ctx.drawImage(img, x, y, drawWidth, drawHeight);

	ctx.restore();
}
