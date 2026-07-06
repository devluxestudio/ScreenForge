import type { KeystrokeEvent } from "@/native/contracts";
import type { KeystrokeDesign, KeystrokePosition } from "@/components/video-editor/types";

const DISPLAY_DURATION_MS = 2000;
const COMBO_GAP_MS = 600;

function drawRoundRect(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
) {
	ctx.beginPath();
	ctx.roundRect(x, y, w, h, r);
}

export function renderKeystrokes(
	ctx: CanvasRenderingContext2D,
	events: KeystrokeEvent[],
	currentTimeMs: number,
	canvasWidth: number,
	canvasHeight: number,
	scaleFactor: number,
	position: KeystrokePosition = "bottom-center",
	design: KeystrokeDesign = "modern",
	size: number = 1,
) {
	if (!events || events.length === 0) return;

	const visible = events.filter(
		(e) => e.timeMs <= currentTimeMs && e.timeMs > currentTimeMs - DISPLAY_DURATION_MS,
	);

	if (visible.length === 0) return;

	const groups: KeystrokeEvent[][] = [];
	let currentGroup: KeystrokeEvent[] = [];

	for (const event of visible) {
		if (
			currentGroup.length === 0 ||
			event.timeMs - currentGroup[currentGroup.length - 1].timeMs < COMBO_GAP_MS
		) {
			currentGroup.push(event);
		} else {
			groups.push(currentGroup);
			currentGroup = [event];
		}
	}
	if (currentGroup.length > 0) {
		groups.push(currentGroup);
	}

	const activeGroups = groups.slice(-1);
	if (activeGroups.length === 0) return;

	const group = activeGroups[0];
	const keysToRender = group[group.length - 1].keys;

	const isMacos = design === "macos";
	const isClassic = design === "classic";
	const isModern = design === "modern";

	ctx.save();

	// Measurements
	const paddingY = (isClassic ? 8 : 10) * scaleFactor * size;
	const paddingX = (isClassic ? 12 : 18) * scaleFactor * size;
	const borderRadius = (isClassic ? 8 : isMacos ? 12 : 14) * scaleFactor * size;
	const keyGap = 6 * scaleFactor * size;

	const keyPaddingY = (isClassic ? 4 : isMacos ? 8 : 4) * scaleFactor * size;
	const keyPaddingX = (isClassic ? 8 : isMacos ? 14 : 10) * scaleFactor * size;
	const keyBorderRadius = (isClassic ? 4 : isMacos ? 6 : 8) * scaleFactor * size;

	const fontSize = (isMacos ? 16 : 15) * scaleFactor * size;
	const fontFamily = isMacos
		? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
		: "Inter, system-ui, sans-serif";
	const fontWeight = isMacos ? 500 : 600;

	ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
	ctx.textBaseline = "middle";
	ctx.textAlign = "center";

	// Calculate widths
	let totalWidth = paddingX * 2;
	const keyWidths = keysToRender.map((key) => {
		const metrics = ctx.measureText(key);
		return Math.max(32 * scaleFactor * size, metrics.width + keyPaddingX * 2);
	});

	for (let i = 0; i < keysToRender.length; i++) {
		if (i > 0) {
			totalWidth += keyGap;
			if (!isClassic) {
				const plusMetrics = ctx.measureText("+");
				totalWidth += plusMetrics.width + 4 * scaleFactor * size;
			} else {
				totalWidth += 4 * scaleFactor * size;
			}
		}
		totalWidth += keyWidths[i];
	}

	const totalHeight = paddingY * 2 + fontSize + keyPaddingY * 2;

	// Positioning
	let startX = 0;
	let startY = 0;
	const marginY = 12 * scaleFactor;
	const marginX = 12 * scaleFactor;

	if (position.includes("bottom")) {
		startY = canvasHeight - marginY - totalHeight;
	} else if (position.includes("top")) {
		startY = marginY;
	}

	if (position.includes("left")) {
		startX = marginX;
	} else if (position.includes("right")) {
		startX = canvasWidth - marginX - totalWidth;
	} else if (position.includes("center")) {
		startX = (canvasWidth - totalWidth) / 2;
	}

	// Draw Container Background
	ctx.translate(startX, startY);

	if (isClassic) {
		ctx.fillStyle = "rgba(0,0,0,0.85)";
		ctx.shadowColor = "rgba(0,0,0,0.3)";
		ctx.shadowBlur = 12 * scaleFactor * size;
		ctx.shadowOffsetY = 4 * scaleFactor * size;
	} else if (isMacos) {
		ctx.fillStyle = "transparent";
		ctx.shadowColor = "transparent";
	} else if (isModern) {
		ctx.fillStyle = "rgba(0,0,0,0.72)";
		ctx.shadowColor = "rgba(0,0,0,0.4)";
		ctx.shadowBlur = 32 * scaleFactor * size;
		ctx.shadowOffsetY = 8 * scaleFactor * size;
		// Not a real blur filter, just a semi-transparent background on canvas.
		// If we want real blur we'd need to copy canvas, but it's hard here.
	}

	if (!isMacos) {
		drawRoundRect(ctx, 0, 0, totalWidth, totalHeight, borderRadius);
		ctx.fill();

		if (isModern) {
			ctx.lineWidth = 1 * scaleFactor * size;
			ctx.strokeStyle = "rgba(255,255,255,0.12)";
			ctx.stroke();
		}
	}
	ctx.shadowColor = "transparent";

	// Draw Keys
	let currentX = paddingX;
	const currentY = paddingY;
	const keyHeight = fontSize + keyPaddingY * 2;

	for (let i = 0; i < keysToRender.length; i++) {
		const keyText = keysToRender[i];
		const w = keyWidths[i];

		if (i > 0) {
			currentX += keyGap;
			if (!isClassic) {
				ctx.fillStyle = isMacos ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)";
				ctx.font = `500 ${13 * scaleFactor * size}px system-ui, sans-serif`;
				const plusWidth = ctx.measureText("+").width;
				ctx.fillText("+", currentX + plusWidth / 2, currentY + keyHeight / 2);
				currentX += plusWidth + 4 * scaleFactor * size;
				ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`; // restore font
			} else {
				currentX += 4 * scaleFactor * size;
			}
		}

		// Key background
		ctx.fillStyle = isClassic ? "transparent" : isMacos ? "white" : "rgba(255,255,255,0.13)";

		if (!isClassic) {
			drawRoundRect(ctx, currentX, currentY, w, keyHeight, keyBorderRadius);

			if (isMacos) {
				ctx.shadowColor = "rgba(0,0,0,0.05)";
				ctx.shadowOffsetY = 2 * scaleFactor * size;
				ctx.shadowBlur = 4 * scaleFactor * size;
			}
			ctx.fill();
			ctx.shadowColor = "transparent";

			ctx.lineWidth = 1 * scaleFactor * size;
			ctx.strokeStyle = isMacos ? "#d1d1d1" : "rgba(255,255,255,0.2)";
			ctx.stroke();

			if (isMacos) {
				// Bottom border for 3D effect
				ctx.lineWidth = 3 * scaleFactor * size;
				ctx.beginPath();
				ctx.moveTo(currentX + keyBorderRadius, currentY + keyHeight);
				ctx.lineTo(currentX + w - keyBorderRadius, currentY + keyHeight);
				ctx.stroke();
			}
		}

		// Key text
		ctx.fillStyle = isClassic ? "white" : isMacos ? "#333" : "white";
		const cx = currentX + w / 2;
		const cy = currentY + keyHeight / 2;

		// Very basic letter spacing approximation via normal fillText
		ctx.fillText(keyText, cx, cy);

		currentX += w;
	}

	ctx.restore();
}
