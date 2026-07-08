import type React from "react";
import type { WatermarkSettings } from "./types";

interface WatermarkOverlayProps {
	settings: WatermarkSettings;
}

export const WatermarkOverlay: React.FC<WatermarkOverlayProps> = ({ settings }) => {
	if (!settings.imageUrl) return null;

	const { imageUrl, position, size, opacity } = settings;

	// Convert position string to absolute positioning classes
	let positionClasses = "";
	switch (position) {
		case "top-left":
			positionClasses = "top-4 left-4";
			break;
		case "top-center":
			positionClasses = "top-4 left-1/2 -translate-x-1/2";
			break;
		case "top-right":
			positionClasses = "top-4 right-4";
			break;
		case "center-left":
			positionClasses = "top-1/2 left-4 -translate-y-1/2";
			break;
		case "center":
			positionClasses = "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2";
			break;
		case "center-right":
			positionClasses = "top-1/2 right-4 -translate-y-1/2";
			break;
		case "bottom-left":
			positionClasses = "bottom-4 left-4";
			break;
		case "bottom-center":
			positionClasses = "bottom-4 left-1/2 -translate-x-1/2";
			break;
		case "bottom-right":
			positionClasses = "bottom-4 right-4";
			break;
	}

	return (
		<div
			className={`absolute pointer-events-none ${positionClasses}`}
			style={{
				width: `${size}%`,
				opacity: opacity / 100,
				zIndex: 40,
			}}
		>
			<img src={imageUrl} alt="Watermark" className="w-full h-auto object-contain drop-shadow-md" />
		</div>
	);
};
