import { UiohookKey, uIOhook } from "uiohook-napi";
import type { KeystrokeEvent, KeystrokeRecordingData } from "../../../src/native/contracts";

export class KeystrokeRecorder {
	private recordingStartMs = 0;
	private events: KeystrokeEvent[] = [];
	private activeModifiers = new Set<string>();
	private isRecording = false;

	private readonly MODIFIER_MAP: Record<number, string> = {
		[UiohookKey.Ctrl]: "Ctrl",
		[UiohookKey.CtrlRight]: "Ctrl",
		[UiohookKey.Shift]: "Shift",
		[UiohookKey.ShiftRight]: "Shift",
		[UiohookKey.Alt]: "Alt",
		[UiohookKey.AltRight]: "Alt",
		[UiohookKey.Meta]: "Win",
		[UiohookKey.MetaRight]: "Win",
	};

	private readonly SPECIAL_KEYS: Record<number, string> = {
		[UiohookKey.Space]: "Space",
		[UiohookKey.Enter]: "Enter",
		[UiohookKey.Tab]: "Tab",
		[UiohookKey.Escape]: "Esc",
		[UiohookKey.Backspace]: "Backspace",
		[UiohookKey.Delete]: "Delete",
		[UiohookKey.ArrowUp]: "Up",
		[UiohookKey.ArrowDown]: "Down",
		[UiohookKey.ArrowLeft]: "Left",
		[UiohookKey.ArrowRight]: "Right",
		[UiohookKey.F1]: "F1",
		[UiohookKey.F2]: "F2",
		[UiohookKey.F3]: "F3",
		[UiohookKey.F4]: "F4",
		[UiohookKey.F5]: "F5",
		[UiohookKey.F6]: "F6",
		[UiohookKey.F7]: "F7",
		[UiohookKey.F8]: "F8",
		[UiohookKey.F9]: "F9",
		[UiohookKey.F10]: "F10",
		[UiohookKey.F11]: "F11",
		[UiohookKey.F12]: "F12",
	};

	private getCharFromKeycode(keycode: number): string | null {
		// A-Z
		if (keycode >= UiohookKey.A && keycode <= UiohookKey.Z) {
			return String.fromCharCode(65 + (keycode - UiohookKey.A));
		}
		// 0-9
		if (keycode >= UiohookKey["0"] && keycode <= UiohookKey["9"]) {
			return keycode === UiohookKey["0"]
				? "0"
				: String.fromCharCode(49 + (keycode - UiohookKey["1"]));
		}
		return null;
	}

	constructor() {
		uIOhook.on("keydown", this.onKeyDown);
		uIOhook.on("keyup", this.onKeyUp);
	}

	start(recordingStartMs: number) {
		this.recordingStartMs = recordingStartMs;
		this.events = [];
		this.activeModifiers.clear();
		this.isRecording = true;
		try {
			uIOhook.start();
		} catch {
			// Already started or failed
		}
	}

	stop(): KeystrokeRecordingData {
		this.isRecording = false;
		try {
			uIOhook.stop();
		} catch {
			// Already stopped
		}
		const data: KeystrokeRecordingData = {
			version: 1,
			events: [...this.events],
		};
		this.events = [];
		return data;
	}

	private onKeyDown = (e: { keycode: number }) => {
		if (!this.isRecording) return;

		const modifier = this.MODIFIER_MAP[e.keycode];
		if (modifier) {
			this.activeModifiers.add(modifier);
			this.recordCurrentState();
			return;
		}

		const special = this.SPECIAL_KEYS[e.keycode];
		if (special) {
			this.recordCurrentState(special);
			return;
		}

		if (this.activeModifiers.size > 0) {
			const char = this.getCharFromKeycode(e.keycode);
			if (char) {
				this.recordCurrentState(char);
			}
		}
	};

	private onKeyUp = (e: { keycode: number }) => {
		if (!this.isRecording) return;
		const modifier = this.MODIFIER_MAP[e.keycode];
		if (modifier) {
			this.activeModifiers.delete(modifier);
		}
	};

	private recordCurrentState(extraKey?: string) {
		const keys = Array.from(this.activeModifiers);
		if (extraKey) {
			keys.push(extraKey);
		}

		if (keys.length > 0) {
			const timeMs = Date.now() - this.recordingStartMs;

			const lastEvent = this.events[this.events.length - 1];
			if (lastEvent && timeMs - lastEvent.timeMs < 100) {
				if (
					lastEvent.keys.length === keys.length &&
					lastEvent.keys.every((k, i) => k === keys[i])
				) {
					return; // Ignore rapid repeat of same combination
				}
			}

			this.events.push({
				timeMs,
				keys,
			});
		}
	}
}
