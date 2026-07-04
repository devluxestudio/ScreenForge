import { useMemo } from "react";
import type { KeystrokeEvent } from "@/native/contracts";
import type { KeystrokeDesign, KeystrokePosition } from "./types";

interface KeystrokeOverlayProps {
	events: KeystrokeEvent[];
	currentTime: number;
	position?: KeystrokePosition;
	design?: KeystrokeDesign;
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
		positionStyle.bottom = "10%";
		positionStyle.left = "50%";
		positionStyle.transform = "translateX(-50%)";
		positionStyle.alignItems = "center";
	} else if (position === "bottom-left") {
		positionStyle.bottom = "10%";
		positionStyle.left = "5%";
		positionStyle.alignItems = "flex-start";
	} else if (position === "bottom-right") {
		positionStyle.bottom = "10%";
		positionStyle.right = "5%";
		positionStyle.alignItems = "flex-end";
	} else if (position === "top-center") {
		positionStyle.top = "10%";
		positionStyle.left = "50%";
		positionStyle.transform = "translateX(-50%)";
		positionStyle.alignItems = "center";
	} else if (position === "top-left") {
		positionStyle.top = "10%";
		positionStyle.left = "5%";
		positionStyle.alignItems = "flex-start";
	} else if (position === "top-right") {
		positionStyle.top = "10%";
		positionStyle.right = "5%";
		positionStyle.alignItems = "flex-end";
	}

	return (
		<div style={positionStyle}>
			{activeGroups.map((group, groupIdx) => {
				const isMacos = design === "macos";
				const isClassic = design === "classic";
				const isModern = design === "modern";

				return (
					<div
						key={groupIdx}
						style={{
							display: "flex",
							alignItems: "center",
							gap: 6,
							padding: isClassic ? "8px 12px" : "10px 18px",
							borderRadius: isClassic ? 8 : isMacos ? 12 : 14,
							background: isClassic
								? "rgba(0,0,0,0.85)"
								: isMacos
									? "transparent"
									: "rgba(0,0,0,0.72)",
							border: isModern ? "1px solid rgba(255,255,255,0.12)" : "none",
							boxShadow: isModern
								? "0 8px 32px rgba(0,0,0,0.4)"
								: isClassic
									? "0 4px 12px rgba(0,0,0,0.3)"
									: "none",
							backdropFilter: isModern ? "blur(10px)" : "none",
							WebkitBackdropFilter: isModern ? "blur(10px)" : "none",
						}}
					>
						{/* Show the most recent event in the group */}
						{group[group.length - 1].keys.map((key, keyIdx) => (
							<div key={keyIdx} style={{ display: "flex", alignItems: "center", gap: 4 }}>
								{keyIdx > 0 && !isClassic && (
									<span
										style={{
											color: isMacos ? "rgba(0,0,0,0.4)" : "rgba(255,255,255,0.4)",
											fontSize: 13,
											fontFamily: "system-ui, sans-serif",
											margin: "0 2px",
											fontWeight: 500,
										}}
									>
										+
									</span>
								)}
								{keyIdx > 0 && isClassic && (
									<span
										style={{
											width: 4, // subtle gap for classic
										}}
									/>
								)}
								<span
									style={{
										display: "inline-flex",
										alignItems: "center",
										justifyContent: "center",
										minWidth: 32,
										padding: isClassic ? "4px 8px" : isMacos ? "8px 14px" : "4px 10px",
										borderRadius: isClassic ? 4 : isMacos ? 6 : 8,
										background: isClassic
											? "transparent"
											: isMacos
												? "white"
												: "rgba(255,255,255,0.13)",
										border: isClassic
											? "none"
											: isMacos
												? "1px solid #d1d1d1"
												: "1px solid rgba(255,255,255,0.2)",
										borderBottomWidth: isMacos ? 3 : 1, // subtle 3D keycap effect for macos
										color: isClassic ? "white" : isMacos ? "#333" : "white",
										fontSize: isMacos ? 16 : 15,
										fontWeight: isMacos ? 500 : 600,
										fontFamily: isMacos
											? "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif"
											: "Inter, system-ui, sans-serif",
										letterSpacing: isClassic ? "0.05em" : "0.01em",
										boxShadow: isMacos ? "0 2px 4px rgba(0,0,0,0.05)" : "none",
									}}
								>
									{key}
								</span>
							</div>
						))}
					</div>
				);
			})}
		</div>
	);
}
