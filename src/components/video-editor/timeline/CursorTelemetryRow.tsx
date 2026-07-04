import { useTimelineContext } from "dnd-timeline";
import { useMemo } from "react";
import type { CursorTelemetryPoint } from "@/components/video-editor/types";

interface CursorTelemetryRowProps {
	samples: CursorTelemetryPoint[];
	videoDurationMs: number;
}

/**
 * A non-interactive read-only row that renders cursor activity as a series of
 * green activity segments from cursor telemetry data. Sits between the video row
 * and the switchable overlay row.
 */
export default function CursorTelemetryRow({ samples, videoDurationMs }: CursorTelemetryRowProps) {
	const { sidebarWidth, direction, range, valueToPixels } = useTimelineContext();
	const sideProperty = direction === "rtl" ? "right" : "left";

	// Build activity segments: merge nearby cursor samples into contiguous segments
	const segments = useMemo(() => {
		if (!samples.length || videoDurationMs <= 0) return [];

		// Cluster samples into activity windows (max 500ms gap = same segment)
		const GAP_THRESHOLD_MS = 500;
		const MIN_SEGMENT_MS = 100;

		const sorted = [...samples].sort((a, b) => a.timeMs - b.timeMs);
		const segs: { start: number; end: number; hasClick: boolean }[] = [];
		let segStart = sorted[0].timeMs;
		let segEnd = sorted[0].timeMs;
		let hasClick =
			sorted[0].interactionType === "click" || sorted[0].interactionType === "double-click";

		for (let i = 1; i < sorted.length; i++) {
			const sample = sorted[i];
			if (sample.timeMs - segEnd > GAP_THRESHOLD_MS) {
				if (segEnd - segStart >= MIN_SEGMENT_MS) {
					segs.push({ start: segStart, end: segEnd, hasClick });
				}
				segStart = sample.timeMs;
				hasClick = false;
			}
			segEnd = sample.timeMs;
			if (sample.interactionType === "click" || sample.interactionType === "double-click") {
				hasClick = true;
			}
		}
		if (segEnd - segStart >= MIN_SEGMENT_MS) {
			segs.push({ start: segStart, end: segEnd, hasClick });
		}
		return segs;
	}, [samples, videoDurationMs]);

	// Click timestamps for dot markers
	const clickTimestamps = useMemo(
		() =>
			samples
				.filter(
					(s) =>
						s.interactionType === "click" ||
						s.interactionType === "double-click" ||
						s.interactionType === "right-click",
				)
				.map((s) => s.timeMs),
		[samples],
	);

	const isEmpty = samples.length === 0;

	return (
		<div className="absolute inset-0 pointer-events-none z-0">
			{isEmpty && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none select-none z-10">
					<span className="text-[11px] text-white/[0.12] font-medium">No cursor data</span>
				</div>
			)}
			{/* Row label */}
			<div
				className="absolute top-0 bottom-0 left-0 flex items-center justify-end pr-1 text-[9px] font-semibold uppercase tracking-widest text-emerald-500/50 pointer-events-none z-10 select-none"
				style={{ width: sidebarWidth }}
			/>
			{/* Activity segments */}
			<div
				className="absolute inset-y-0 pointer-events-none"
				style={{
					[sideProperty === "right" ? "marginRight" : "marginLeft"]: `${sidebarWidth}px`,
					right: 0,
					left: sidebarWidth,
				}}
			>
				{segments.map((seg, i) => {
					const startClamped = Math.max(seg.start, range.start);
					const endClamped = Math.min(seg.end, range.end);
					if (startClamped >= endClamped) return null;

					const leftPx = valueToPixels(startClamped - range.start);
					const widthPx = valueToPixels(endClamped - range.start) - leftPx;
					if (widthPx <= 0) return null;

					// biome-ignore lint/suspicious/noArrayIndexKey: stable ordered segments
					return (
						<div
							key={i}
							className="absolute inset-y-1 rounded-sm"
							style={{
								[sideProperty]: `${leftPx}px`,
								width: `${Math.max(widthPx, 2)}px`,
								background: seg.hasClick ? "rgba(52, 211, 153, 0.55)" : "rgba(52, 211, 153, 0.30)",
								border: "1px solid rgba(52, 211, 153, 0.6)",
							}}
						/>
					);
				})}
				{/* Click dots */}
				{clickTimestamps.map((t, i) => {
					if (t < range.start || t > range.end) return null;
					const xPx = valueToPixels(t - range.start);
					// biome-ignore lint/suspicious/noArrayIndexKey: stable ordered clicks
					return (
						<div
							key={i}
							className="absolute top-1/2 -translate-y-1/2 rounded-full pointer-events-none"
							style={{
								[sideProperty]: `${xPx - 3}px`,
								width: 6,
								height: 6,
								background: "#34d399",
								boxShadow: "0 0 6px rgba(52, 211, 153, 0.8)",
							}}
						/>
					);
				})}
			</div>
		</div>
	);
}
