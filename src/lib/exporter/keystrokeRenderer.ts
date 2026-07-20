import type { KeystrokeDesign, KeystrokePosition } from "@/components/video-editor/types";
import type { KeystrokeEvent } from "@/native/contracts";

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

/**
 * Simulates CSS `backdrop-filter: blur(blurRadius)` for a rounded-rect region on a Canvas 2D ctx.
 * Reads the pixels behind the shape, blurs them on an offscreen canvas,
 * then composites the blurred result back clipped to the pill shape.
 */
function applyCanvasBackdropBlur(
	ctx: CanvasRenderingContext2D,
	x: number,
	y: number,
	w: number,
	h: number,
	r: number,
	blurRadius: number,
) {
	const canvas = ctx.canvas;

	// Expand sampling area slightly to avoid edge artifacts from the CSS blur
	const pad = Math.ceil(blurRadius * 2);
	const sx = Math.max(0, Math.floor(x) - pad);
	const sy = Math.max(0, Math.floor(y) - pad);
	const sw = Math.min(canvas.width - sx, Math.ceil(w) + pad * 2);
	const sh = Math.min(canvas.height - sy, Math.ceil(h) + pad * 2);

	if (sw <= 0 || sh <= 0) return false;

	// Grab pixels from the composite canvas
	let imageData: ImageData;
	try {
		imageData = ctx.getImageData(sx, sy, sw, sh);
	} catch {
		// If cross-origin or other issue, bail gracefully
		return false;
	}

	const offscreen = document.createElement("canvas");
	offscreen.width = sw;
	offscreen.height = sh;
	const offCtx = offscreen.getContext("2d");
	if (!offCtx) return false;

	offCtx.putImageData(imageData, 0, 0);

	// Apply the blur using CSS filter (supported in all browsers used by Electron)
	const blurCanvas = document.createElement("canvas");
	blurCanvas.width = sw;
	blurCanvas.height = sh;
	const blurCtx = blurCanvas.getContext("2d");
	if (!blurCtx) return false;

	blurCtx.filter = `blur(${blurRadius}px)`;
	blurCtx.drawImage(offscreen, 0, 0);
	blurCtx.filter = "none";

	ctx.save();
	drawRoundRect(ctx, x, y, w, h, r);
	ctx.clip();
	ctx.drawImage(blurCanvas, sx, sy, sw, sh);
	ctx.restore();

	return true;
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
	const isMinimal = design === "minimal";
	const isGlass = design === "glass";
	const isNeon = design === "neon";
	const isRetro = design === "retro";

	ctx.save();

	// Measurements
	const paddingY =
		(isRetro ? 12 : isClassic ? 8 : isMinimal ? 6 : isGlass ? 0 : 10) * scaleFactor * size;
	const paddingX =
		(isRetro ? 16 : isClassic || isMinimal ? 12 : isNeon ? 16 : isModern ? 20 : isGlass ? 0 : 18) *
		scaleFactor *
		size;
	const borderRadius =
		(isRetro ? 0 : isClassic ? 8 : isMinimal ? 6 : isNeon || isMacos ? 12 : 100) *
		scaleFactor *
		size;
	const keyGap = (isGlass ? 8 : 6) * scaleFactor * size;

	const keyPaddingY = (isMacos ? 8 : isGlass ? 10 : isModern ? 0 : 4) * scaleFactor * size;
	const keyPaddingX =
		(isMacos ? 14 : isGlass ? 20 : isModern ? 0 : isClassic || isMinimal ? 8 : 10) *
		scaleFactor *
		size;
	const keyBorderRadius =
		(isRetro || isModern ? 0 : isClassic || isMinimal ? 4 : isMacos || isNeon ? 6 : 100) *
		scaleFactor *
		size;

	const fontSize = (isClassic || isMinimal || isNeon ? 15 : 16) * scaleFactor * size;
	const fontFamily = isMacos
		? "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif"
		: isNeon
			? "'Courier New', Courier, monospace"
			: isRetro
				? "'Comic Sans MS', 'Chalkboard SE', sans-serif"
				: "Inter, system-ui, sans-serif";
	const fontWeight = isRetro ? 900 : isNeon ? 700 : isClassic || isModern || isGlass ? 600 : 500;

	ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
	ctx.textBaseline = "middle";
	ctx.textAlign = "center";

	// Calculate widths
	let totalWidth = paddingX * 2;
	const keyWidths = keysToRender.map((key) => {
		const textToMeasure = isRetro ? key.toUpperCase() : key;
		const metrics = ctx.measureText(textToMeasure);
		return Math.max(32 * scaleFactor * size, metrics.width + keyPaddingX * 2);
	});

	for (let i = 0; i < keysToRender.length; i++) {
		if (i > 0) {
			totalWidth += keyGap;
			if (!isClassic) {
				const plusMetrics = ctx.measureText("+");
				totalWidth += plusMetrics.width + (isGlass ? 8 : 4) * scaleFactor * size;
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

	// For the Glass design, we need to apply backdrop blur BEFORE translating,
	// because getImageData works in canvas (not translated) coordinates.
	// Calculate key positions in canvas space so we can sample + blur each pill.
	if (isGlass) {
		const glassKeyHeight = fontSize + keyPaddingY * 2;
		const glassBlurRadius = 2 * scaleFactor * size;

		let preX = startX + paddingX;
		const preY = startY + paddingY;

		for (let i = 0; i < keysToRender.length; i++) {
			if (i > 0) {
				preX += keyGap;
				if (!isClassic) {
					ctx.font = `600 ${16 * scaleFactor * size}px system-ui, sans-serif`;
					const plusWidth = ctx.measureText("+").width;
					preX += plusWidth + 8 * scaleFactor * size;
					ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
				}
			}

			const kw = keyWidths[i];

			// === Step 1: Sample + blur the background pixels behind this pill ===
			const blurSuccess = applyCanvasBackdropBlur(
				ctx,
				preX,
				preY,
				kw,
				glassKeyHeight,
				keyBorderRadius,
				glassBlurRadius,
			);

			// If canvas is tainted and blur fails, fallback to a semi-transparent dark background
			if (!blurSuccess) {
				ctx.fillStyle = "rgba(0, 0, 0, 0.2)";
				drawRoundRect(ctx, preX, preY, kw, glassKeyHeight, keyBorderRadius);
				ctx.fill();
			}

			// === Step 2: Draw the outer border of the pill ===
			drawRoundRect(ctx, preX, preY, kw, glassKeyHeight, keyBorderRadius);
			ctx.lineWidth = 1 * scaleFactor * size;
			ctx.strokeStyle = "rgba(255, 255, 255, 0.05)";
			ctx.stroke();

			// === Step 3: Draw inset shadows ===
			ctx.save();
			// Clip to the pill bounds
			drawRoundRect(ctx, preX, preY, kw, glassKeyHeight, keyBorderRadius);
			ctx.clip();

			// Create a path with the pill as a hole inside a massive outer rectangle
			ctx.beginPath();
			ctx.rect(preX - 1000, preY - 1000, kw + 2000, glassKeyHeight + 2000);
			ctx.roundRect(preX, preY, kw, glassKeyHeight, keyBorderRadius);

			// Fill the outer region (outside the pill). The shadow will fall INSIDE the pill.
			// Because we are clipped to the pill, ONLY the shadow is visible!
			ctx.fillStyle = "black";

			// 1. Top-left bright inner shadow
			ctx.shadowColor = "rgba(255, 255, 255, 0.15)";
			ctx.shadowOffsetX = 1 * scaleFactor * size;
			ctx.shadowOffsetY = 1 * scaleFactor * size;
			ctx.shadowBlur = 1 * scaleFactor * size;
			ctx.fill("evenodd");

			// 2. Bottom-right dark inner shadow
			ctx.shadowColor = "rgba(0, 0, 0, 0.05)";
			ctx.shadowOffsetX = -1 * scaleFactor * size;
			ctx.shadowOffsetY = -1 * scaleFactor * size;
			ctx.shadowBlur = 1 * scaleFactor * size;
			ctx.fill("evenodd");

			ctx.restore();

			preX += kw;
		}

		// Now translate and draw the text + "+" separators on top
		ctx.translate(startX, startY);

		let currentX = paddingX;
		const currentY = paddingY;
		const textKeyHeight = fontSize + keyPaddingY * 2;

		for (let i = 0; i < keysToRender.length; i++) {
			const keyText = keysToRender[i];
			const w = keyWidths[i];

			if (i > 0) {
				currentX += keyGap;
				ctx.fillStyle = "rgba(255,255,255,0.9)";
				ctx.font = `600 ${16 * scaleFactor * size}px system-ui, sans-serif`;
				ctx.shadowColor = "rgba(0,0,0,0.3)";
				ctx.shadowOffsetY = 2 * scaleFactor * size;
				ctx.shadowBlur = 4 * scaleFactor * size;
				const plusWidth = ctx.measureText("+").width;
				ctx.fillText("+", currentX + plusWidth / 2, currentY + textKeyHeight / 2);
				ctx.shadowColor = "transparent";
				ctx.shadowOffsetY = 0;
				ctx.shadowBlur = 0;
				currentX += plusWidth + 8 * scaleFactor * size;
				ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
			}

			// Text with drop shadow for legibility on any background
			ctx.fillStyle = "white";
			ctx.shadowColor = "rgba(0,0,0,0.6)";
			ctx.shadowOffsetY = 2 * scaleFactor * size;
			ctx.shadowBlur = 4 * scaleFactor * size;
			ctx.fillText(keyText, currentX + w / 2, currentY + textKeyHeight / 2);
			ctx.shadowColor = "transparent";
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = 0;

			currentX += w;
		}

		ctx.restore();
		return; // Glass path done — skip the rest
	}

	// ─── All non-Glass designs ───────────────────────────────────────────────

	ctx.translate(startX, startY);

	// Container shadow & fill
	if (isClassic) {
		ctx.fillStyle = "rgba(0,0,0,0.85)";
		ctx.shadowColor = "rgba(0,0,0,0.3)";
		ctx.shadowBlur = 12 * scaleFactor * size;
		ctx.shadowOffsetY = 4 * scaleFactor * size;
	} else if (isModern) {
		ctx.fillStyle = "rgba(10,10,10,0.95)";
		ctx.shadowColor = "rgba(0,0,0,0.4)";
		ctx.shadowBlur = 32 * scaleFactor * size;
		ctx.shadowOffsetY = 8 * scaleFactor * size;
	} else if (isMinimal) {
		ctx.fillStyle = "rgba(10,10,10,0.9)";
		ctx.shadowColor = "transparent";
	} else if (isNeon) {
		ctx.fillStyle = "rgba(5,5,10,0.8)";
		ctx.shadowColor = "rgba(200,0,255,0.4)";
		ctx.shadowBlur = 15 * scaleFactor * size;
	} else if (isRetro) {
		ctx.fillStyle = "#ff9900";
		ctx.shadowColor = "#000";
		ctx.shadowBlur = 0;
		ctx.shadowOffsetX = 4 * scaleFactor * size;
		ctx.shadowOffsetY = 4 * scaleFactor * size;
	} else if (isMacos) {
		ctx.fillStyle = "rgba(0,0,0,0.3)";
		ctx.shadowColor = "transparent";
	}

	drawRoundRect(ctx, 0, 0, totalWidth, totalHeight, borderRadius);
	ctx.fill();
	ctx.shadowColor = "transparent";
	ctx.shadowOffsetX = 0;
	ctx.shadowOffsetY = 0;

	// Container border
	if (isModern) {
		ctx.lineWidth = 1 * scaleFactor * size;
		ctx.strokeStyle = "rgba(255,255,255,0.2)";
		ctx.stroke();
	} else if (isMinimal) {
		ctx.lineWidth = 1 * scaleFactor * size;
		ctx.strokeStyle = "rgba(255,255,255,0.05)";
		ctx.stroke();
	} else if (isNeon) {
		ctx.lineWidth = 1 * scaleFactor * size;
		ctx.strokeStyle = "rgba(200,0,255,0.4)";
		ctx.stroke();
	} else if (isRetro) {
		ctx.lineWidth = 3 * scaleFactor * size;
		ctx.strokeStyle = "#000";
		ctx.stroke();
	} else if (isMacos) {
		ctx.lineWidth = 1 * scaleFactor * size;
		ctx.strokeStyle = "rgba(255,255,255,0.1)";
		ctx.stroke();
	}

	// Draw Keys
	let currentX = paddingX;
	const currentY = paddingY;
	const keyHeight = fontSize + keyPaddingY * 2;

	for (let i = 0; i < keysToRender.length; i++) {
		const keyText = isRetro ? keysToRender[i].toUpperCase() : keysToRender[i];
		const w = keyWidths[i];

		if (i > 0) {
			currentX += keyGap;
			if (!isClassic) {
				ctx.fillStyle = isMacos
					? "rgba(255,255,255,0.9)"
					: isNeon
						? "#c800ff"
						: isRetro
							? "#000"
							: "rgba(255,255,255,0.4)";
				ctx.font = `${isNeon || isRetro ? "700" : "600"} ${
					(isRetro || isMacos ? 16 : isModern ? 15 : 14) * scaleFactor * size
				}px system-ui, sans-serif`;
				if (isNeon) {
					ctx.shadowColor = "rgba(200,0,255,0.8)";
					ctx.shadowBlur = 8 * scaleFactor * size;
				} else if (isMacos) {
					ctx.shadowColor = "rgba(0,0,0,0.6)";
					ctx.shadowOffsetY = 1 * scaleFactor * size;
					ctx.shadowBlur = 3 * scaleFactor * size;
				}
				const plusWidth = ctx.measureText("+").width;
				ctx.fillText("+", currentX + plusWidth / 2, currentY + keyHeight / 2);
				ctx.shadowColor = "transparent";
				ctx.shadowOffsetY = 0;
				ctx.shadowBlur = 0;
				currentX += plusWidth + 4 * scaleFactor * size;
				ctx.font = `${fontWeight} ${fontSize}px ${fontFamily}`;
			} else {
				currentX += 4 * scaleFactor * size;
			}
		}

		// Key background
		ctx.fillStyle =
			isClassic || isModern
				? "transparent"
				: isMacos || isRetro
					? "#fff"
					: isMinimal
						? "transparent"
						: isNeon
							? "rgba(0,255,200,0.1)"
							: "rgba(255,255,255,0.13)";

		if (!isClassic && !isModern && !isMinimal) {
			drawRoundRect(ctx, currentX, currentY, w, keyHeight, keyBorderRadius);

			if (isMacos) {
				ctx.shadowColor = "rgba(0,0,0,0.2)";
				ctx.shadowOffsetY = 4 * scaleFactor * size;
				ctx.shadowBlur = 12 * scaleFactor * size;
			}
			ctx.fill();
			ctx.shadowColor = "transparent";
			ctx.shadowOffsetX = 0;
			ctx.shadowOffsetY = 0;
			ctx.shadowBlur = 0;

			ctx.lineWidth = (isRetro ? 2 : 1) * scaleFactor * size;
			ctx.strokeStyle = isMacos
				? "#e0e0e0"
				: isRetro
					? "#000"
					: isNeon
						? "rgba(0,255,200,0.5)"
						: "rgba(255,255,255,0.2)";
			ctx.stroke();

			if (isMacos || isRetro) {
				ctx.lineWidth = (isRetro ? 4 : 3) * scaleFactor * size;
				ctx.strokeStyle = isMacos ? "#c1c1c1" : "#000";
				ctx.beginPath();
				const r = keyBorderRadius;
				ctx.moveTo(currentX + r, currentY + keyHeight);
				ctx.lineTo(currentX + w - r, currentY + keyHeight);
				ctx.stroke();
			}
		}

		// Key text
		ctx.fillStyle = isMacos ? "#222" : isRetro ? "#000" : isNeon ? "#00ffc8" : "white";
		const cx = currentX + w / 2;
		const cy = currentY + keyHeight / 2;

		if (isNeon) {
			ctx.shadowColor = "rgba(0,255,200,0.8)";
			ctx.shadowBlur = 8 * scaleFactor * size;
		}

		ctx.fillText(keyText, cx, cy);

		ctx.shadowColor = "transparent";
		ctx.shadowOffsetY = 0;
		ctx.shadowBlur = 0;

		currentX += w;
	}

	ctx.restore();
}
