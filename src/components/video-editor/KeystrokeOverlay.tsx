import { useMemo } from "react";
import type { KeystrokeEvent } from "@/native/contracts";
import type { KeystrokeDesign, KeystrokePosition } from "./types";

interface KeystrokeOverlayProps {
	events: KeystrokeEvent[];
	currentTime: number;
	position?: KeystrokePosition;
	design?: KeystrokeDesign;
	size?: number;
}

/** Duration (ms) a keystroke combo bubble stays on screen */
const DISPLAY_DURATION_MS = 2000;
/** Gap between events to be treated as a new combo group (ms) */
const COMBO_GAP_MS = 600;

export function KeystrokeOverlay({
	events,
	currentTime,
	position = "bottom-center",
	design = "modern",
	size = 1,
}: KeystrokeOverlayProps) {
	const currentMs = currentTime * 1000;

	const activeGroups = useMemo(() => {
		if (events.length === 0) return [];

		// Find events within the display window
		const visible = events.filter(
			(e) => e.timeMs <= currentMs && e.timeMs > currentMs - DISPLAY_DURATION_MS,
		);

		if (visible.length === 0) return [];

		// Group nearby events together into "combo" bubbles
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

		// Return only the most recent group
		return groups.slice(-1);
	}, [events, currentMs]);

	if (activeGroups.length === 0) return null;

	const positionStyle: React.CSSProperties = {
		position: "absolute",
		zIndex: 20,
		display: "flex",
		flexDirection: "column",
		gap: 8,
		pointerEvents: "none",
	};

	if (position === "bottom-center") {
		positionStyle.bottom = "12px";
		positionStyle.left = "50%";
		positionStyle.transform = `translateX(-50%) scale(${size})`;
		positionStyle.transformOrigin = "bottom center";
		positionStyle.alignItems = "center";
	} else if (position === "bottom-left") {
		positionStyle.bottom = "12px";
		positionStyle.left = "12px";
		positionStyle.transform = `scale(${size})`;
		positionStyle.transformOrigin = "bottom left";
		positionStyle.alignItems = "flex-start";
	} else if (position === "bottom-right") {
		positionStyle.bottom = "12px";
		positionStyle.right = "12px";
		positionStyle.transform = `scale(${size})`;
		positionStyle.transformOrigin = "bottom right";
		positionStyle.alignItems = "flex-end";
	} else if (position === "top-center") {
		positionStyle.top = "12px";
		positionStyle.left = "50%";
		positionStyle.transform = `translateX(-50%) scale(${size})`;
		positionStyle.transformOrigin = "top center";
		positionStyle.alignItems = "center";
	} else if (position === "top-left") {
		positionStyle.top = "12px";
		positionStyle.left = "12px";
		positionStyle.transform = `scale(${size})`;
		positionStyle.transformOrigin = "top left";
		positionStyle.alignItems = "flex-start";
	} else if (position === "top-right") {
		positionStyle.top = "12px";
		positionStyle.right = "12px";
		positionStyle.transform = `scale(${size})`;
		positionStyle.transformOrigin = "top right";
		positionStyle.alignItems = "flex-end";
	}

	return (
		<div style={positionStyle}>
			{activeGroups.map((group, groupIdx) => {
				const isMacos = design === "macos";
				const isClassic = design === "classic";
				const isMinimal = design === "minimal";
				const isGlass = design === "glass";
				const isNeon = design === "neon";
				const isRetro = design === "retro";

				let containerStyle: React.CSSProperties = {
					display: "flex",
					alignItems: "center",
					gap: 6,
					pointerEvents: "none",
				};

				let keyStyle: React.CSSProperties = {
					display: "inline-flex",
					alignItems: "center",
					justifyContent: "center",
					minWidth: 32,
				};

				let plusStyle: React.CSSProperties = {
					margin: "0 2px",
				};

				if (isMacos) {
					containerStyle = {
						...containerStyle,
						padding: "10px 18px",
						borderRadius: 12,
						background: "rgba(0,0,0,0.3)",
						backdropFilter: "blur(12px)",
						WebkitBackdropFilter: "blur(12px)",
						border: "1px solid rgba(255,255,255,0.1)",
					};
					keyStyle = {
						...keyStyle,
						padding: "8px 14px",
						borderRadius: 8,
						background: "white",
						border: "1px solid #e0e0e0",
						borderBottomWidth: 3,
						borderBottomColor: "#c1c1c1",
						color: "#222",
						fontSize: 16,
						fontWeight: 500,
						fontFamily: "-apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
						boxShadow: "0 4px 12px rgba(0,0,0,0.2)",
					};
					plusStyle = {
						...plusStyle,
						color: "rgba(255,255,255,0.9)",
						textShadow: "0 1px 3px rgba(0,0,0,0.6)",
						fontSize: 16,
						fontWeight: 500,
						fontFamily: "system-ui, sans-serif",
					};
				} else if (isClassic) {
					containerStyle = {
						...containerStyle,
						padding: "8px 12px",
						borderRadius: 8,
						background: "rgba(0,0,0,0.85)",
						boxShadow: "0 4px 12px rgba(0,0,0,0.3)",
					};
					keyStyle = {
						...keyStyle,
						padding: "4px 8px",
						borderRadius: 4,
						background: "transparent",
						color: "white",
						fontSize: 15,
						fontWeight: 600,
						fontFamily: "Inter, system-ui, sans-serif",
						letterSpacing: "0.05em",
					};
					plusStyle = { ...plusStyle, width: 4 };
				} else if (isMinimal) {
					containerStyle = {
						...containerStyle,
						padding: "6px 12px",
						borderRadius: 6,
						background: "rgba(10, 10, 10, 0.9)",
						border: "1px solid rgba(255,255,255,0.05)",
					};
					keyStyle = {
						...keyStyle,
						padding: "4px 8px",
						borderRadius: 4,
						background: "transparent",
						color: "white",
						fontSize: 15,
						fontWeight: 500,
						fontFamily: "Inter, system-ui, sans-serif",
					};
					plusStyle = {
						...plusStyle,
						color: "rgba(255,255,255,0.4)",
						fontSize: 14,
						fontFamily: "system-ui, sans-serif",
					};
				} else if (isGlass) {
					// Liquid Glass style based on Callstack blog reference
					containerStyle = {
						...containerStyle,
						padding: 0,
						background: "transparent",
						border: "none",
						boxShadow: "none",
					};
					keyStyle = {
						...keyStyle,
						padding: "10px 20px",
						borderRadius: 9999,
						background: "transparent",
						backdropFilter: "blur(2px)",
						WebkitBackdropFilter: "blur(2px)",
						border: "1px solid rgba(255, 255, 255, 0.05)",
						color: "white",
						fontSize: 16,
						fontWeight: 600,
						fontFamily: "Inter, system-ui, sans-serif",
						textShadow: "0 2px 4px rgba(0,0,0,0.6)",
						boxShadow:
							"inset 1px 1px 1px rgba(255, 255, 255, 0.15), inset -1px -1px 1px rgba(0, 0, 0, 0.05)",
					};
					plusStyle = {
						...plusStyle,
						color: "rgba(255,255,255,0.9)",
						fontSize: 16,
						fontWeight: 600,
						fontFamily: "system-ui, sans-serif",
						textShadow: "0 2px 4px rgba(0,0,0,0.3)",
					};
				} else if (isNeon) {
					containerStyle = {
						...containerStyle,
						padding: "10px 16px",
						borderRadius: 12,
						background: "rgba(5, 5, 10, 0.8)",
						border: "1px solid rgba(200, 0, 255, 0.4)",
						boxShadow: "0 0 15px rgba(200,0,255,0.4)",
					};
					keyStyle = {
						...keyStyle,
						padding: "4px 10px",
						borderRadius: 6,
						background: "rgba(0, 255, 200, 0.1)",
						border: "1px solid rgba(0, 255, 200, 0.5)",
						color: "#00ffc8",
						fontSize: 15,
						fontWeight: 700,
						fontFamily: "'Courier New', Courier, monospace",
						textShadow: "0 0 8px rgba(0,255,200,0.8)",
						boxShadow: "inset 0 0 8px rgba(0,255,200,0.2)",
					};
					plusStyle = {
						...plusStyle,
						color: "#c800ff",
						fontSize: 15,
						fontWeight: 700,
						fontFamily: "system-ui, sans-serif",
						textShadow: "0 0 8px rgba(200,0,255,0.8)",
					};
				} else if (isRetro) {
					containerStyle = {
						...containerStyle,
						padding: "12px 16px",
						borderRadius: 0,
						background: "#ff9900",
						border: "3px solid #000",
						boxShadow: "4px 4px 0px #000",
					};
					keyStyle = {
						...keyStyle,
						padding: "4px 10px",
						borderRadius: 0,
						background: "#fff",
						border: "2px solid #000",
						borderBottomWidth: 4,
						color: "#000",
						fontSize: 16,
						fontWeight: 900,
						fontFamily: "'Comic Sans MS', 'Chalkboard SE', sans-serif",
						textTransform: "uppercase",
					};
					plusStyle = {
						...plusStyle,
						color: "#000",
						fontSize: 16,
						fontWeight: 900,
						fontFamily: "system-ui, sans-serif",
					};
				} else {
					// modern (Clean continuous pill style)
					containerStyle = {
						...containerStyle,
						padding: "10px 20px",
						borderRadius: 9999,
						background: "rgba(10, 10, 10, 0.95)",
						backdropFilter: "blur(12px)",
						WebkitBackdropFilter: "blur(12px)",
						border: "1px solid rgba(255,255,255,0.2)",
						boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
					};
					keyStyle = {
						...keyStyle,
						padding: 0,
						background: "transparent",
						color: "white",
						fontSize: 16,
						fontWeight: 600,
						fontFamily: "Inter, system-ui, sans-serif",
						letterSpacing: "0.02em",
					};
					plusStyle = {
						...plusStyle,
						color: "rgba(255,255,255,0.4)",
						fontSize: 15,
						fontWeight: 600,
						fontFamily: "system-ui, sans-serif",
					};
				}

				return (
					<div key={groupIdx} style={containerStyle}>
						{group[group.length - 1].keys.map((key, keyIdx) => (
							<div key={keyIdx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
								{keyIdx > 0 && !isClassic && <span style={plusStyle}>+</span>}
								{keyIdx > 0 && isClassic && <span style={plusStyle} />}
								<span style={keyStyle}>{key}</span>
							</div>
						))}
					</div>
				);
			})}
		</div>
	);
}
