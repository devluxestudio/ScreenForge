import { useEffect, useState } from "react";
import { nativeBridgeClient } from "../client";
import type { KeystrokeEvent } from "../contracts";

interface UseKeystrokeTelemetryResult {
	events: KeystrokeEvent[];
	loading: boolean;
	error: string | null;
}

export function useKeystrokeTelemetry(videoPath: string | null): UseKeystrokeTelemetryResult {
	const [events, setEvents] = useState<KeystrokeEvent[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);

	useEffect(() => {
		let cancelled = false;

		async function loadKeystrokeTelemetry() {
			if (!videoPath) {
				setEvents([]);
				setLoading(false);
				setError(null);
				return;
			}

			setLoading(true);
			setError(null);

			try {
				const data = await nativeBridgeClient.keystroke.getTelemetry(videoPath);
				if (!cancelled) {
					setEvents(data.events);
				}
			} catch (nextError) {
				if (!cancelled) {
					setEvents([]);
					setError(
						nextError instanceof Error ? nextError.message : "Failed to load keystroke telemetry",
					);
				}
			} finally {
				if (!cancelled) {
					setLoading(false);
				}
			}
		}

		loadKeystrokeTelemetry();

		return () => {
			cancelled = true;
		};
	}, [videoPath]);

	return { events, loading, error };
}
