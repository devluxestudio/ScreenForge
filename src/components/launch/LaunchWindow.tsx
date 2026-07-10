import { ChevronDown } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { BsPauseCircle, BsPlayCircle, BsRecordCircle } from "react-icons/bs";
import { FaRegStopCircle } from "react-icons/fa";
import { FaFolderOpen } from "react-icons/fa6";
import { FiMinus, FiX } from "react-icons/fi";
import {
	MdCancel,
	MdKeyboard,
	MdMic,
	MdMicOff,
	MdMonitor,
	MdMouse,
	MdRestartAlt,
	MdVideocam,
	MdVideocamOff,
	MdVideoFile,
	MdVolumeOff,
	MdVolumeUp,
} from "react-icons/md";
import { RxDragHandleDots2 } from "react-icons/rx";
import { useScopedT } from "@/contexts/I18nContext";
import { loadUserPreferences } from "@/lib/userPreferences";
import { nativeBridgeClient } from "@/native";

import { useCameraDevices } from "../../hooks/useCameraDevices";
import { useMicrophoneDevices } from "../../hooks/useMicrophoneDevices";
import { useScreenRecorder } from "../../hooks/useScreenRecorder";
import { requestCameraAccess } from "../../lib/requestCameraAccess";
import { formatTimePadded } from "../../utils/timeUtils";
import { Button } from "../ui/button";
import { Tooltip } from "../ui/tooltip";
import styles from "./LaunchWindow.module.css";
import { openSourceSelectorWithPermissionRetry } from "./openSourceSelectorFlow";

const ICON_SIZE = 20;

// Vertical tray gap (px): bar's `bottom-5` (20px) plus an 8px gap.
const HUD_DEVICE_POPUP_GAP = 28;
// Horizontal layout: mirrors the `bottom-[68px]` class on the popup element.
const HUD_DEVICE_POPUP_HORIZONTAL_BOTTOM = 68;

const ICON_CONFIG = {
	drag: { icon: RxDragHandleDots2, size: ICON_SIZE },
	monitor: { icon: MdMonitor, size: ICON_SIZE },
	volumeOn: { icon: MdVolumeUp, size: ICON_SIZE },
	volumeOff: { icon: MdVolumeOff, size: ICON_SIZE },
	micOn: { icon: MdMic, size: ICON_SIZE },
	micOff: { icon: MdMicOff, size: ICON_SIZE },
	webcamOn: { icon: MdVideocam, size: ICON_SIZE },
	webcamOff: { icon: MdVideocamOff, size: ICON_SIZE },
	cursor: { icon: MdMouse, size: ICON_SIZE },
	keyboard: { icon: MdKeyboard, size: ICON_SIZE },
	pause: { icon: BsPauseCircle, size: ICON_SIZE },
	resume: { icon: BsPlayCircle, size: ICON_SIZE },
	stop: { icon: FaRegStopCircle, size: ICON_SIZE },
	restart: { icon: MdRestartAlt, size: ICON_SIZE },
	cancel: { icon: MdCancel, size: ICON_SIZE },
	record: { icon: BsRecordCircle, size: ICON_SIZE },
	videoFile: { icon: MdVideoFile, size: ICON_SIZE },
	folder: { icon: FaFolderOpen, size: ICON_SIZE },
	minimize: { icon: FiMinus, size: ICON_SIZE },
	close: { icon: FiX, size: ICON_SIZE },
} as const;

type IconName = keyof typeof ICON_CONFIG;

/** Renders the configured icon for a HUD control. */
function getIcon(name: IconName, className?: string) {
	const { icon: Icon, size } = ICON_CONFIG[name];
	return <Icon size={size} className={className} />;
}

const hudAuxIconBtnClasses =
	"flex h-7 w-7 items-center justify-center rounded-lg transition-colors duration-150 text-white/55 hover:bg-white/10 disabled:opacity-30 disabled:cursor-not-allowed";

/** Launches the floating recording HUD and its recorder controls. */
const SvgCamera = (props: React.SVGProps<SVGSVGElement>) => (
	<svg
		width="100%"
		height="100%"
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M8 4C8 3.44772 8.41328 3 8.92308 3H15.0769C15.5867 3 16 3.44772 16 4C16 4.55228 15.5867 5 15.0769 5H8.92308C8.41328 5 8 4.55228 8 4Z"
			fill="currentColor"
		/>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M9.77778 21H14.2222C17.3433 21 18.9038 21 20.0248 20.2777C20.51 19.965 20.9267 19.5632 21.251 19.0953C22 18.0143 22 16.5095 22 13.4999C22 10.4903 21.9998 8.9857 21.2508 7.90473C20.9266 7.43676 20.5099 7.03497 20.0246 6.72228C18.9036 6 17.3431 6 14.2221 6H9.77761C6.65659 6 5.09607 6 3.97508 6.72228C3.48979 7.03497 3.07312 7.43676 2.74886 7.90473C2 8.98547 2 10.4896 2 13.4979L2 13.4999C2 16.5095 2 18.0143 2.74902 19.0953C3.07328 19.5632 3.48995 19.965 3.97524 20.2777C5.09624 21 6.65675 21 9.77778 21ZM7.83333 13.4999C7.83333 11.2808 9.69881 9.48196 12 9.48196C14.3012 9.48196 16.1667 11.2808 16.1667 13.4999C16.1667 15.7189 14.3012 17.5178 12 17.5178C9.69881 17.5178 7.83333 15.7189 7.83333 13.4999ZM9.5 13.4999C9.5 12.1685 10.6193 11.0891 12 11.0891C13.3807 11.0891 14.5 12.1685 14.5 13.4999C14.5 14.8313 13.3807 15.9106 12 15.9106C10.6193 15.9106 9.5 14.8313 9.5 13.4999ZM18.1111 9.48196C17.6509 9.48196 17.2778 9.84174 17.2778 10.2855C17.2778 10.7294 17.6509 11.0891 18.1111 11.0891H18.6667C19.1269 11.0891 19.5 10.7294 19.5 10.2855C19.5 9.84174 19.1269 9.48196 18.6667 9.48196H18.1111Z"
			fill="currentColor"
		/>
	</svg>
);

const SvgKeyboard = (props: React.SVGProps<SVGSVGElement>) => (
	<svg
		width="100%"
		height="100%"
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M22 10L22 9.93418C22.0001 9.04769 22.0001 8.28387 21.9179 7.67221C21.8297 7.0167 21.631 6.38835 21.1213 5.87869C20.6117 5.36902 19.9833 5.17028 19.3278 5.08215C18.7161 4.99991 17.9523 4.99995 17.0658 5L17 5.00001L6.93418 5C6.04769 4.99995 5.28388 4.99991 4.67222 5.08215C4.0167 5.17028 3.38835 5.36902 2.87869 5.87868C2.36902 6.38835 2.17028 7.0167 2.08215 7.67221C1.99991 8.28387 1.99995 9.04769 2 9.93418V9.9342V14.0658V14.0658C1.99995 14.9523 1.99991 15.7161 2.08215 16.3278C2.17028 16.9833 2.36902 17.6117 2.87869 18.1213C3.38835 18.631 4.0167 18.8297 4.67222 18.9179C5.28388 19.0001 6.04769 19.0001 6.93418 19H17.0658C17.9523 19.0001 18.7161 19.0001 19.3278 18.9179C19.9833 18.8297 20.6117 18.631 21.1213 18.1213C21.631 17.6117 21.8297 16.9833 21.9179 16.3278C22.0001 15.7161 22.0001 14.9523 22 14.0658L22 10ZM14 15C14.5523 15 15 14.5523 15 14C15 13.4477 14.5523 13 14 13H10C9.44772 13 9 13.4477 9 14C9 14.5523 9.44772 15 10 15H14ZM17.5 9C18.0523 9 18.5 9.44772 18.5 10V10.01C18.5 10.5623 18.0523 11.01 17.5 11.01C16.9477 11.01 16.5 10.5623 16.5 10.01V10C16.5 9.44772 16.9477 9 17.5 9ZM15 9.99C15 9.43772 14.5523 8.99 14 8.99C13.4477 8.99 13 9.43772 13 9.99V10C13 10.5523 13.4477 11 14 11C14.5523 11 15 10.5523 15 10V9.99ZM17.5 12.99C18.0523 12.99 18.5 13.4377 18.5 13.99V14C18.5 14.5523 18.0523 15 17.5 15C16.9477 15 16.5 14.5523 16.5 14V13.99C16.5 13.4377 16.9477 12.99 17.5 12.99ZM7.5 14C7.5 13.4477 7.05229 13 6.5 13C5.94772 13 5.5 13.4477 5.5 14V14.01C5.5 14.5623 5.94772 15.01 6.5 15.01C7.05229 15.01 7.5 14.5623 7.5 14.01V14ZM10 9C10.5523 9 11 9.44772 11 10V10.01C11 10.5623 10.5523 11.01 10 11.01C9.44772 11.01 9 10.5623 9 10.01V10C9 9.44772 9.44772 9 10 9ZM7.5 10C7.5 9.44772 7.05229 9 6.5 9C5.94772 9 5.5 9.44772 5.5 10V10.01C5.5 10.5623 5.94772 11.01 6.5 11.01C7.05229 11.01 7.5 10.5623 7.5 10.01V10Z"
			fill="currentColor"
		/>
	</svg>
);

const SvgMicrophone = (props: React.SVGProps<SVGSVGElement>) => (
	<svg
		width="100%"
		height="100%"
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M4 9C4.41421 9 4.75 9.33579 4.75 9.75V10.75C4.75 14.7541 7.99594 18 12 18C16.0041 18 19.25 14.7541 19.25 10.75V9.75C19.25 9.33579 19.5858 9 20 9C20.4142 9 20.75 9.33579 20.75 9.75V10.75C20.75 15.3298 17.2314 19.0879 12.75 19.4683V21.75C12.75 22.1642 12.4142 22.5 12 22.5C11.5858 22.5 11.25 22.1642 11.25 21.75V19.4683C6.7686 19.0879 3.25 15.3298 3.25 10.75V9.75C3.25 9.33579 3.58579 9 4 9Z"
			fill="currentColor"
		/>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M12 2C8.82436 2 6.25 4.57436 6.25 7.75V10.75C6.25 13.9256 8.82436 16.5 12 16.5C15.1756 16.5 17.75 13.9256 17.75 10.75V7.75C17.75 4.57436 15.1756 2 12 2ZM14 11.5C14.4142 11.5 14.75 11.1642 14.75 10.75C14.75 10.3358 14.4142 10 14 10H10C9.58579 10 9.25 10.3358 9.25 10.75C9.25 11.1642 9.58579 11.5 10 11.5H14ZM13.75 7.75C13.75 8.16421 13.4142 8.5 13 8.5H11C10.5858 8.5 10.25 8.16421 10.25 7.75C10.25 7.33579 10.5858 7 11 7H13C13.4142 7 13.75 7.33579 13.75 7.75Z"
			fill="currentColor"
		/>
	</svg>
);

const SvgMouse = (props: React.SVGProps<SVGSVGElement>) => (
	<svg
		width="100%"
		height="100%"
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<path
			d="M19 8.97414V14.9861C19 18.8598 15.866 22 12 22C8.13401 22 5 18.8598 5 14.9861V8.97414C5 5.35433 7.73668 2.37497 11.25 2V5.38542C10.6588 5.66685 10.25 6.27067 10.25 6.97016V8.97414C10.25 9.94256 11.0335 10.7276 12 10.7276C12.9665 10.7276 13.75 9.94256 13.75 8.97414V6.97016C13.75 6.27067 13.3412 5.66685 12.75 5.38542V2C16.2633 2.37497 19 5.35433 19 8.97414Z"
			fill="currentColor"
		/>
	</svg>
);

const SvgSpeaker = (props: React.SVGProps<SVGSVGElement>) => (
	<svg
		width="100%"
		height="100%"
		viewBox="0 0 24 24"
		fill="none"
		xmlns="http://www.w3.org/2000/svg"
		{...props}
	>
		<path
			fillRule="evenodd"
			clipRule="evenodd"
			d="M8.93417 2L9 2L15.0658 2C15.9523 1.99995 16.7161 1.99991 17.3278 2.08215C17.9833 2.17028 18.6117 2.36902 19.1213 2.87868C19.631 3.38835 19.8297 4.0167 19.9179 4.67221C20.0001 5.28387 20.0001 6.04769 20 6.93417V17.0658C20.0001 17.9523 20.0001 18.7161 19.9179 19.3278C19.8297 19.9833 19.631 20.6117 19.1213 21.1213C18.6117 21.631 17.9833 21.8297 17.3278 21.9179C16.7161 22.0001 15.9523 22.0001 15.0658 22H8.9342C8.0477 22.0001 7.28388 22.0001 6.67221 21.9179C6.0167 21.8297 5.38835 21.631 4.87868 21.1213C4.36902 20.6117 4.17028 19.9833 4.08215 19.3278C3.99991 18.7161 3.99995 17.9523 4 17.0658L4 7L4 6.93417C3.99995 6.04769 3.99991 5.28387 4.08215 4.67221C4.17028 4.0167 4.36902 3.38835 4.87868 2.87868C5.38835 2.36902 6.0167 2.17028 6.67221 2.08215C7.28387 1.99991 8.04769 1.99995 8.93417 2ZM12 12C10.8954 12 10 12.8954 10 14C10 15.1046 10.8954 16 12 16C13.1046 16 14 15.1046 14 14C14 12.8954 13.1046 12 12 12ZM8 14C8 11.7909 9.79086 10 12 10C14.2091 10 16 11.7909 16 14C16 16.2091 14.2091 18 12 18C9.79086 18 8 16.2091 8 14ZM13 7C13 6.44772 12.5523 6 12 6C11.4477 6 11 6.44772 11 7V7.01123C11 7.56352 11.4477 8.01123 12 8.01123C12.5523 8.01123 13 7.56352 13 7.01123V7Z"
			fill="currentColor"
		/>
	</svg>
);

const SvgTeleprompter = (props: React.SVGProps<SVGSVGElement>) => (
	<svg
		width="100%"
		height="100%"
		viewBox="0 0 24 24"
		fill="none"
		stroke="currentColor"
		strokeWidth="2"
		strokeLinecap="round"
		strokeLinejoin="round"
		{...props}
	>
		<path d="M8 21h12a2 2 0 0 0 2-2v-2H10v2a2 2 0 1 1-4 0V5a2 2 0 1 0-4 0v3h4" />
		<path d="M19 17V5a2 2 0 0 0-2-2H4" />
		<path d="M15 8h-5" />
		<path d="M15 12h-5" />
	</svg>
);

export function LaunchWindow() {
	const t = useScopedT("launch");

	const {
		recording,
		paused,
		elapsedSeconds,
		toggleRecording,
		togglePaused,
		canPauseRecording,
		restartRecording,
		cancelRecording,
		microphoneEnabled,
		setMicrophoneEnabled,
		microphoneDeviceId,
		setMicrophoneDeviceId,
		setMicrophoneDeviceName,
		systemAudioEnabled,
		setSystemAudioEnabled,
		webcamEnabled,
		setWebcamEnabled,
		webcamDeviceId,
		setWebcamDeviceId,
		setWebcamDeviceName,
		cursorCaptureMode,
		setCursorCaptureMode,
		keystrokeCaptureEnabled,
		setKeystrokeCaptureEnabled,
	} = useScreenRecorder();

	const [trayLayout] = useState<"horizontal" | "vertical">(() => loadUserPreferences().trayLayout);
	const [isLinuxHud, setIsLinuxHud] = useState(false);
	const [isLanguageMenuOpen, setIsLanguageMenuOpen] = useState(false);
	const languageTriggerRef = useRef<HTMLButtonElement | null>(null);
	const languageMenuPanelRef = useRef<HTMLDivElement | null>(null);
	const hudBarRef = useRef<HTMLDivElement | null>(null);
	const deviceSelectorRef = useRef<HTMLDivElement | null>(null);
	const recordAfterSourceSelectionRef = useRef(false);

	const {
		devices: micDevices,
		selectedDeviceId: selectedMicId,
		setSelectedDeviceId: setSelectedMicId,
	} = useMicrophoneDevices(true);
	const {
		devices: cameraDevices,
		selectedDeviceId: selectedCameraId,
		setSelectedDeviceId: setSelectedCameraId,
		isLoading: isCameraDevicesLoading,
		error: cameraDevicesError,
	} = useCameraDevices(true);

	const selectedMicLabel =
		micDevices.find((d) => d.deviceId === (microphoneDeviceId || selectedMicId))?.label ||
		t("audio.defaultMicrophone");
	const selectedCameraDevice = cameraDevices.find(
		(d) => d.deviceId === (webcamDeviceId || selectedCameraId),
	);
	const selectedCameraLabel = isCameraDevicesLoading
		? t("webcam.searching")
		: cameraDevicesError
			? t("webcam.unavailable")
			: cameraDevices.length === 0
				? t("webcam.noneFound")
				: selectedCameraDevice?.label || t("webcam.defaultCamera");

	useEffect(() => {
		if (selectedMicId && selectedMicId !== "default") {
			setMicrophoneDeviceId(selectedMicId);
			setMicrophoneDeviceName(micDevices.find((d) => d.deviceId === selectedMicId)?.label);
		}
	}, [selectedMicId, micDevices, setMicrophoneDeviceId, setMicrophoneDeviceName]);

	useEffect(() => {
		if (selectedCameraId) {
			setWebcamDeviceId(selectedCameraId);
			setWebcamDeviceName(cameraDevices.find((d) => d.deviceId === selectedCameraId)?.label);
		}
	}, [selectedCameraId, cameraDevices, setWebcamDeviceId, setWebcamDeviceName]);

	useEffect(() => {
		let cancelled = false;
		nativeBridgeClient.system
			.getPlatform()
			.then((platform) => {
				if (!cancelled) {
					setIsLinuxHud(platform === "linux");
				}
			})
			.catch(() => {
				if (!cancelled) {
					setIsLinuxHud(false);
				}
			});

		return () => {
			cancelled = true;
		};
	}, []);

	useEffect(() => {
		if (!import.meta.env.DEV) {
			return;
		}

		void requestCameraAccess().catch((error) => {
			console.warn("Failed to trigger camera access request during development:", error);
		});
	}, []);

	useEffect(() => {
		if (!isLanguageMenuOpen) return;

		const handlePointerDown = (event: PointerEvent) => {
			const target = event.target as Node;
			const clickedTrigger = languageTriggerRef.current?.contains(target);
			const clickedMenu = languageMenuPanelRef.current?.contains(target);
			if (!clickedTrigger && !clickedMenu) {
				setIsLanguageMenuOpen(false);
			}
		};

		const handleEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") {
				setIsLanguageMenuOpen(false);
			}
		};

		window.addEventListener("pointerdown", handlePointerDown);
		window.addEventListener("keydown", handleEscape);

		return () => {
			window.removeEventListener("pointerdown", handlePointerDown);
			window.removeEventListener("keydown", handleEscape);
		};
	}, [isLanguageMenuOpen]);

	useEffect(() => {
		if (!isLanguageMenuOpen || !languageMenuPanelRef.current) return;
		const id = requestAnimationFrame(() => {
			if (languageMenuPanelRef.current) {
				languageMenuPanelRef.current.scrollTop = 0;
			}
		});
		return () => cancelAnimationFrame(id);
	}, [isLanguageMenuOpen]);

	// Resize the overlay window to fit content, else the taller vertical tray gets clipped
	// and scrolls. Measure from the window's bottom-centre (the anchor the main process
	// preserves) so fixed bottom/centre offsets keep this stable and it doesn't oscillate.
	const lastHudSizeRef = useRef({ width: 0, height: 0 });
	const measureHudSize = useCallback(() => {
		const barEl = hudBarRef.current;
		if (!barEl || !window.electronAPI?.setHudOverlaySize) return;

		const isSetupWindow = barEl.getAttribute("data-setup-window") === "true";
		if (isSetupWindow) {
			const width = 800;
			const height = 600;
			if (width === lastHudSizeRef.current.width && height === lastHudSizeRef.current.height)
				return;
			lastHudSizeRef.current = { width, height };
			window.electronAPI.setHudOverlaySize(width, height);
			return;
		}

		// Breathing room so the drop shadow isn't clipped. TOP_MARGIN must also exceed the
		// slack in the bar's `max-h: calc(100vh - 2.5rem)` cap (40px reserved - 20px bottom
		// gap = 20px) so the window stays tall enough that the cap never engages and adds a scrollbar.
		const SIDE_MARGIN = 24;
		const TOP_MARGIN = 24;
		// Wide enough that the language menu (11rem) never clips, even when the bar is narrow.
		const MIN_WIDTH = 220;

		const viewportHeight = window.innerHeight;
		const centerX = window.innerWidth / 2;

		// Use natural (scroll) size, not the clipped box: vertical mode's max-h cap is a
		// small-screen fallback, and reading clipped height would pin the window to it.
		// scrollHeight gives full content height; the cap only engages when the main process clamps to screen.
		let topFromBottom = viewportHeight - barEl.getBoundingClientRect().bottom + barEl.scrollHeight;
		let halfWidth = barEl.scrollWidth / 2;

		// Popups drive both dimensions too. Their vertical anchor depends on bar height,
		// which is fed back through React state and lags by a frame, so derive their top
		// edge from the bar's natural height instead of the stale rendered position. Keeps
		// one measurement pass authoritative and avoids a feedback re-measure.
		if (deviceSelectorRef.current) {
			const rect = deviceSelectorRef.current.getBoundingClientRect();
			if (rect.width !== 0 || rect.height !== 0) {
				const popupBottomOffset =
					trayLayout === "vertical"
						? barEl.scrollHeight + HUD_DEVICE_POPUP_GAP
						: HUD_DEVICE_POPUP_HORIZONTAL_BOTTOM;
				topFromBottom = Math.max(topFromBottom, popupBottomOffset + rect.height);
				halfWidth = Math.max(halfWidth, rect.width / 2);
			}
		}

		// The language menu scrolls within available height, so it only influences width.
		// Its presence in the DOM means it's open.
		if (languageMenuPanelRef.current) {
			const rect = languageMenuPanelRef.current.getBoundingClientRect();
			halfWidth = Math.max(halfWidth, centerX - rect.left, rect.right - centerX);
		}

		const width = Math.max(MIN_WIDTH, Math.ceil(halfWidth * 2) + SIDE_MARGIN);
		const height = Math.ceil(topFromBottom) + TOP_MARGIN;
		if (width === lastHudSizeRef.current.width && height === lastHudSizeRef.current.height) {
			return;
		}
		lastHudSizeRef.current = { width, height };
		window.electronAPI.setHudOverlaySize(width, height);
	}, [trayLayout]);

	// One persistent observer; elements wire themselves up via callback refs as they
	// mount/unmount so measurement re-runs without recreating it or threading mount state through deps.
	const hudResizeObserverRef = useRef<ResizeObserver | null>(null);
	useEffect(() => {
		const observer = new ResizeObserver(() => measureHudSize());
		hudResizeObserverRef.current = observer;
		if (hudBarRef.current) observer.observe(hudBarRef.current);
		if (deviceSelectorRef.current) observer.observe(deviceSelectorRef.current);
		measureHudSize();
		return () => {
			observer.disconnect();
			hudResizeObserverRef.current = null;
		};
	}, [measureHudSize]);

	const observeHudElement = useCallback(
		<T extends HTMLElement>(el: T | null, ref: React.MutableRefObject<T | null>) => {
			const observer = hudResizeObserverRef.current;
			if (ref.current && observer) observer.unobserve(ref.current);
			ref.current = el;
			if (el && observer) observer.observe(el);
			measureHudSize();
		},
		[measureHudSize],
	);
	const setHudBarEl = useCallback(
		(el: HTMLDivElement | null) => observeHudElement(el, hudBarRef),
		[observeHudElement],
	);
	const setDeviceSelectorEl = useCallback(
		(el: HTMLDivElement | null) => observeHudElement(el, deviceSelectorRef),
		[observeHudElement],
	);

	const hudIgnoreMouseEventsRef = useRef<boolean | undefined>(undefined);
	const setHudMouseEventsEnabled = useCallback(
		(enabled: boolean) => {
			// If not recording, we are in the large setup window, which takes up the entire bounds.
			// We should never ignore mouse events here, so they can click properly.
			const shouldIntercept = enabled || !recording;
			const shouldIgnoreMouseEvents = !shouldIntercept && !isLinuxHud;
			if (hudIgnoreMouseEventsRef.current === shouldIgnoreMouseEvents) {
				return;
			}
			hudIgnoreMouseEventsRef.current = shouldIgnoreMouseEvents;
			window.electronAPI?.setHudOverlayIgnoreMouseEvents?.(shouldIgnoreMouseEvents);
		},
		[isLinuxHud, recording],
	);

	useEffect(() => {
		setHudMouseEventsEnabled(false);
		return () => {
			window.electronAPI?.setHudOverlayIgnoreMouseEvents?.(false);
		};
	}, [setHudMouseEventsEnabled]);

	useEffect(() => {
		setHudMouseEventsEnabled(isLanguageMenuOpen);
	}, [isLanguageMenuOpen, setHudMouseEventsEnabled]);

	const defaultSourceName = t("sourceSelector.defaultSourceName");
	const [selectedSource, setSelectedSource] = useState(defaultSourceName);
	const [hasSelectedSource, setHasSelectedSource] = useState(false);
	const [activeDropdown, setActiveDropdown] = useState<"camera" | "mic" | "audio" | null>(null);

	const applySelectedSource = useCallback(
		(source: ProcessedDesktopSource | null) => {
			if (source) {
				setSelectedSource(source.name);
				setHasSelectedSource(true);
				return;
			}

			setSelectedSource(defaultSourceName);
			setHasSelectedSource(false);
		},
		[defaultSourceName],
	);

	useEffect(() => {
		const checkSelectedSource = async () => {
			if (!window.electronAPI) {
				return;
			}

			try {
				const source = await window.electronAPI.getSelectedSource();
				applySelectedSource(source);
			} catch (error) {
				console.warn("Failed to refresh selected source:", error);
			}
		};

		checkSelectedSource();

		const interval = setInterval(checkSelectedSource, 500);
		return () => clearInterval(interval);
	}, [applySelectedSource]);

	useEffect(() => {
		const cleanupSourceChanged = window.electronAPI?.onSelectedSourceChanged?.((source) => {
			applySelectedSource(source);
			if (!recordAfterSourceSelectionRef.current || recording) {
				return;
			}

			recordAfterSourceSelectionRef.current = false;
			toggleRecording();
		});
		const cleanupSelectorClosed = window.electronAPI?.onSourceSelectorClosed?.(() => {
			recordAfterSourceSelectionRef.current = false;
		});

		return () => {
			cleanupSourceChanged?.();
			cleanupSelectorClosed?.();
		};
	}, [applySelectedSource, recording, toggleRecording]);

	const openSourceSelector = async () => {
		if (window.electronAPI) {
			return await openSourceSelectorWithPermissionRetry({
				openSourceSelector: () => window.electronAPI.openSourceSelector(),
				requestScreenAccess: () => window.electronAPI.requestScreenAccess(),
			});
		}

		return { opened: false, reason: "electron-api-unavailable" };
	};

	const handleRecordButtonClick = () => {
		if (recording) {
			toggleRecording();
			return;
		}

		recordAfterSourceSelectionRef.current = true;
		void openSourceSelector()
			.then((result) => {
				if (!result.opened) {
					recordAfterSourceSelectionRef.current = false;
				}
			})
			.catch(() => {
				recordAfterSourceSelectionRef.current = false;
			});
	};

	const sendHudOverlayHide = () => {
		if (window.electronAPI && window.electronAPI.hudOverlayHide) {
			window.electronAPI.hudOverlayHide();
		}
	};
	const sendHudOverlayClose = () => {
		if (window.electronAPI?.hudOverlayClose) {
			window.electronAPI.hudOverlayClose();
		}
	};

	const dragLastPositionRef = useRef<{ x: number; y: number } | null>(null);
	const dragAnimationFrameRef = useRef<number | null>(null);
	const pendingDragDeltaRef = useRef({ x: 0, y: 0 });
	const flushHudDragMove = useCallback(() => {
		dragAnimationFrameRef.current = null;
		const { x, y } = pendingDragDeltaRef.current;
		pendingDragDeltaRef.current = { x: 0, y: 0 };
		if (x === 0 && y === 0) return;
		window.electronAPI?.moveHudOverlayBy?.(x, y);
	}, []);
	const scheduleHudDragMove = useCallback(
		(deltaX: number, deltaY: number) => {
			pendingDragDeltaRef.current = {
				x: pendingDragDeltaRef.current.x + deltaX,
				y: pendingDragDeltaRef.current.y + deltaY,
			};

			if (dragAnimationFrameRef.current === null) {
				dragAnimationFrameRef.current = window.requestAnimationFrame(flushHudDragMove);
			}
		},
		[flushHudDragMove],
	);
	const flushPendingHudDragMove = useCallback(() => {
		if (dragAnimationFrameRef.current !== null) {
			window.cancelAnimationFrame(dragAnimationFrameRef.current);
			dragAnimationFrameRef.current = null;
		}
		const { x, y } = pendingDragDeltaRef.current;
		pendingDragDeltaRef.current = { x: 0, y: 0 };
		if (x === 0 && y === 0) return;
		window.electronAPI?.moveHudOverlayBy?.(x, y);
	}, []);
	useEffect(() => {
		return () => {
			if (dragAnimationFrameRef.current !== null) {
				window.cancelAnimationFrame(dragAnimationFrameRef.current);
			}
		};
	}, []);
	const handleHudDragPointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
		event.preventDefault();
		event.stopPropagation();
		setHudMouseEventsEnabled(true);
		event.currentTarget.setPointerCapture(event.pointerId);
		dragLastPositionRef.current = { x: event.screenX, y: event.screenY };
	};
	const handleHudDragPointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
		const lastPosition = dragLastPositionRef.current;
		if (!lastPosition) return;
		const deltaX = event.screenX - lastPosition.x;
		const deltaY = event.screenY - lastPosition.y;
		dragLastPositionRef.current = { x: event.screenX, y: event.screenY };
		scheduleHudDragMove(deltaX, deltaY);
	};
	const handleHudDragPointerEnd = (event: React.PointerEvent<HTMLDivElement>) => {
		dragLastPositionRef.current = null;
		flushPendingHudDragMove();
		if (event.currentTarget.hasPointerCapture(event.pointerId)) {
			event.currentTarget.releasePointerCapture(event.pointerId);
		}
		setHudMouseEventsEnabled(false);
	};

	return (
		<div
			className={`h-full w-full min-w-0 max-w-full overflow-x-hidden overflow-y-visible bg-transparent ${styles.electronDrag}`}
			onPointerMove={(event) => {
				const target = event.target as HTMLElement | null;
				const shouldCapture = Boolean(target?.closest("[data-hud-interactive='true']"));
				setHudMouseEventsEnabled(shouldCapture);
			}}
			onPointerLeave={() => {
				setHudMouseEventsEnabled(false);
			}}
		>
			{recording ? (
				/* --- RECORDING STATE PILL --- */
				<div
					ref={setHudBarEl}
					data-hud-interactive="true"
					data-tray-layout={trayLayout}
					className={`fixed bottom-5 left-1/2 -translate-x-1/2 flex rounded-2xl border border-white/[0.10] bg-[#07080a]/90 shadow-[0_20px_60px_rgba(0,0,0,0.42),inset_0_1px_0_rgba(255,255,255,0.06)] backdrop-blur-2xl backdrop-saturate-[140%] items-center gap-1.5 px-2 py-1.5 transition-all ${styles.electronNoDrag}`}
					onPointerEnter={() => setHudMouseEventsEnabled(true)}
					onPointerDown={() => setHudMouseEventsEnabled(true)}
					onMouseEnter={() => setHudMouseEventsEnabled(true)}
					onMouseLeave={() => setHudMouseEventsEnabled(false)}
				>
					{/* Drag handle */}
					<div
						className={`flex h-8 w-7 cursor-grab items-center justify-center active:cursor-grabbing ${styles.electronNoDrag}`}
						onPointerDown={handleHudDragPointerDown}
						onPointerMove={handleHudDragPointerMove}
						onPointerUp={handleHudDragPointerEnd}
						onPointerCancel={handleHudDragPointerEnd}
					>
						{getIcon("drag", "text-white/30")}
					</div>

					<Tooltip
						content={hasSelectedSource || recording ? selectedSource : t("recording.selectSource")}
					>
						<button
							data-testid="launch-record-button"
							className={`flex items-center justify-center rounded-full p-2 transition-[min-width,background-color] duration-150 min-w-[78px] ${styles.electronNoDrag} ${
								paused
									? "bg-amber-500/10 hover:bg-amber-500/15"
									: "bg-red-500/12 hover:bg-red-500/16"
							}`}
							onClick={handleRecordButtonClick}
							title={hasSelectedSource || recording ? selectedSource : t("recording.selectSource")}
							style={{ flex: "0 0 auto" }}
						>
							<div className="flex items-center justify-center gap-1.5">
								{getIcon("stop", paused ? "text-amber-400" : "text-red-400")}
								<span
									className={`${paused ? "text-amber-400" : "text-red-400"} inline-block w-[34px] text-left text-xs font-semibold tabular-nums`}
								>
									{formatTimePadded(elapsedSeconds)}
								</span>
							</div>
						</button>
					</Tooltip>

					<div className={`flex items-center gap-0.5 ${styles.electronNoDrag}`}>
						{canPauseRecording && (
							<Tooltip
								content={paused ? t("tooltips.resumeRecording") : t("tooltips.pauseRecording")}
							>
								<button className={hudAuxIconBtnClasses} onClick={togglePaused}>
									{getIcon(
										paused ? "resume" : "pause",
										paused ? "text-amber-400" : "text-white/60",
									)}
								</button>
							</Tooltip>
						)}
						<Tooltip content={t("tooltips.restartRecording")}>
							<button className={hudAuxIconBtnClasses} onClick={restartRecording}>
								{getIcon("restart", "text-white/60")}
							</button>
						</Tooltip>
						<Tooltip content={t("tooltips.cancelRecording")}>
							<button className={hudAuxIconBtnClasses} onClick={cancelRecording}>
								{getIcon("cancel", "text-white/60")}
							</button>
						</Tooltip>
					</div>
				</div>
			) : (
				/* --- NEW SETUP RECTANGLE --- */
				<div
					ref={setHudBarEl}
					data-hud-interactive="true"
					data-setup-window="true"
					className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 flex flex-col w-[680px] bg-[#0A0C10] rounded-[18px] text-white transition-all duration-300 ${styles.electronNoDrag}`}
					onPointerEnter={() => setHudMouseEventsEnabled(true)}
					onPointerDown={() => setHudMouseEventsEnabled(true)}
					onMouseEnter={() => setHudMouseEventsEnabled(true)}
					onMouseLeave={() => setHudMouseEventsEnabled(false)}
					onClick={() => setActiveDropdown(null)}
				>
					{/* Title bar */}
					<div
						className={`h-[40px] flex items-center justify-between px-5 cursor-grab active:cursor-grabbing`}
						onPointerDown={handleHudDragPointerDown}
						onPointerMove={handleHudDragPointerMove}
						onPointerUp={handleHudDragPointerEnd}
						onPointerCancel={handleHudDragPointerEnd}
					>
						<div className="flex items-center gap-2.5 pointer-events-none">
							<img src="screenforge.png" className="w-[18px] h-[18px] rounded-[4px] opacity-90" />
							<span className="font-semibold text-[12px] text-white/90 tracking-wide">
								ScreenForge Recorder
							</span>
						</div>
						<div className="flex items-center gap-3" onPointerDown={(e) => e.stopPropagation()}>
							<button
								onClick={sendHudOverlayHide}
								className="hover:bg-white/10 p-1 rounded transition-colors text-white/70 hover:text-white"
							>
								<FiMinus size={14} />
							</button>
							<button
								onClick={sendHudOverlayClose}
								className="hover:bg-red-500/20 p-1 rounded transition-colors text-white/70 hover:text-red-400"
							>
								<FiX size={14} />
							</button>
						</div>
					</div>

					{/* Main Content */}
					<div className="flex px-5 pt-1 pb-4 gap-4" onPointerDown={(e) => e.stopPropagation()}>
						{/* Col 1: Screen Preview (Large thumbnail) */}
						<div className="w-[220px] h-[116px] flex-shrink-0">
							<button
								onClick={openSourceSelector}
								className="w-full h-full bg-[#101223] rounded-[10px] overflow-hidden relative group shadow-inner block border border-white/5"
							>
								<img
									src="the-screen.png"
									className="w-full h-full object-cover"
									alt="Screen Preview"
								/>
								<div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center backdrop-blur-[2px]">
									<span className="text-white font-semibold text-[11px] bg-white/10 px-3 py-1.5 rounded-full backdrop-blur-md">
										Change Screen
									</span>
								</div>
							</button>
						</div>

						{/* Col 2: Devices */}
						<div className="flex-1 min-w-0 flex flex-col justify-between">
							{/* Camera Row */}
							<div className="flex items-center gap-2">
								<div className="w-[34px] h-[34px] flex-shrink-0 rounded-[10px] bg-[#17181c] flex items-center justify-center">
									<SvgCamera className="w-[16px] h-[16px] text-white" />
								</div>
								<div
									className="flex-1 min-w-0 h-[34px] rounded-[8px] bg-[#17181c] px-2.5 flex flex-col justify-center relative cursor-pointer hover:bg-[#1f2025] transition-colors"
									onClick={(e) => {
										e.stopPropagation();
										setActiveDropdown(activeDropdown === "camera" ? null : "camera");
									}}
								>
									<span className="text-[7px] text-white/40 font-semibold leading-none mb-0.5">
										Camera
									</span>
									<span className="text-[10px] font-bold text-white truncate leading-none mr-3">
										{webcamEnabled ? selectedCameraLabel || "Default Camera" : "Disabled"}
									</span>
									<ChevronDown
										size={10}
										className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30"
									/>

									{activeDropdown === "camera" && (
										<div
											ref={setDeviceSelectorEl}
											className="absolute top-[100%] left-0 mt-1 w-[200px] z-50 bg-[#17181c] border border-white/10 rounded-[8px] shadow-2xl py-1 flex flex-col max-h-[160px] overflow-y-auto"
											onPointerDown={(e) => e.stopPropagation()}
										>
											<button
												onClick={(e) => {
													e.stopPropagation();
													setWebcamEnabled(false);
													setActiveDropdown(null);
												}}
												className={`text-left px-3 py-1.5 text-[10px] ${!webcamEnabled ? "bg-[#0014FF] text-white" : "text-white/70 hover:bg-white/5"}`}
											>
												Disable Camera
											</button>
											{cameraDevices.map((device) => (
												<button
													key={device.deviceId}
													onClick={(e) => {
														e.stopPropagation();
														setWebcamEnabled(true);
														setSelectedCameraId(device.deviceId);
														setWebcamDeviceId(device.deviceId);
														setWebcamDeviceName(device.label);
														setActiveDropdown(null);
													}}
													className={`text-left px-3 py-1.5 text-[10px] truncate ${webcamEnabled && selectedCameraId === device.deviceId ? "bg-[#0014FF] text-white" : "text-white/70 hover:bg-white/5"}`}
												>
													{device.label}
												</button>
											))}
										</div>
									)}
								</div>
							</div>

							{/* Mic Row */}
							<div className="flex items-center gap-2">
								<div className="w-[34px] h-[34px] flex-shrink-0 rounded-[10px] bg-[#17181c] flex items-center justify-center">
									<SvgMicrophone className="w-[16px] h-[16px] text-white" />
								</div>
								<div
									className="flex-1 min-w-0 h-[34px] rounded-[8px] bg-[#17181c] px-2.5 flex flex-col justify-center relative cursor-pointer hover:bg-[#1f2025] transition-colors"
									onClick={(e) => {
										e.stopPropagation();
										setActiveDropdown(activeDropdown === "mic" ? null : "mic");
									}}
								>
									<span className="text-[7px] text-white/40 font-semibold leading-none mb-0.5">
										Microphone
									</span>
									<span className="text-[10px] font-bold text-white truncate leading-none mr-3">
										{microphoneEnabled ? selectedMicLabel || "Default Microphone" : "Disabled"}
									</span>
									<ChevronDown
										size={10}
										className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30"
									/>

									{activeDropdown === "mic" && (
										<div
											ref={setDeviceSelectorEl}
											className="absolute top-[100%] left-0 mt-1 w-[200px] z-50 bg-[#17181c] border border-white/10 rounded-[8px] shadow-2xl py-1 flex flex-col max-h-[160px] overflow-y-auto"
											onPointerDown={(e) => e.stopPropagation()}
										>
											<button
												onClick={(e) => {
													e.stopPropagation();
													setMicrophoneEnabled(false);
													setActiveDropdown(null);
												}}
												className={`text-left px-3 py-1.5 text-[10px] ${!microphoneEnabled ? "bg-[#0014FF] text-white" : "text-white/70 hover:bg-white/5"}`}
											>
												Disable Microphone
											</button>
											{micDevices.map((device) => (
												<button
													key={device.deviceId}
													onClick={(e) => {
														e.stopPropagation();
														setMicrophoneEnabled(true);
														setSelectedMicId(device.deviceId);
														setMicrophoneDeviceId(device.deviceId);
														setMicrophoneDeviceName(device.label);
														setActiveDropdown(null);
													}}
													className={`text-left px-3 py-1.5 text-[10px] truncate ${microphoneEnabled && selectedMicId === device.deviceId ? "bg-[#0014FF] text-white" : "text-white/70 hover:bg-white/5"}`}
												>
													{device.label}
												</button>
											))}
										</div>
									)}
								</div>
							</div>

							{/* System Audio Row */}
							<div className="flex items-center gap-2">
								<div className="w-[34px] h-[34px] flex-shrink-0 rounded-[10px] bg-[#17181c] flex items-center justify-center">
									<SvgSpeaker className="w-[16px] h-[16px] text-white" />
								</div>
								<div
									className="flex-1 min-w-0 h-[34px] rounded-[8px] bg-[#17181c] px-2.5 flex flex-col justify-center relative cursor-pointer hover:bg-[#1f2025] transition-colors"
									onClick={(e) => {
										e.stopPropagation();
										setActiveDropdown(activeDropdown === "audio" ? null : "audio");
									}}
								>
									<span className="text-[7px] text-white/40 font-semibold leading-none mb-0.5">
										System Audio
									</span>
									<span className="text-[10px] font-bold text-white truncate leading-none mr-3">
										{systemAudioEnabled ? "Capture System Audio" : "Disabled"}
									</span>
									<ChevronDown
										size={10}
										className="absolute right-2 top-1/2 -translate-y-1/2 text-white/30"
									/>

									{activeDropdown === "audio" && (
										<div
											ref={setDeviceSelectorEl}
											className="absolute top-[100%] left-0 mt-1 w-[200px] z-50 bg-[#17181c] border border-white/10 rounded-[8px] shadow-2xl py-1 flex flex-col"
											onPointerDown={(e) => e.stopPropagation()}
										>
											<button
												onClick={(e) => {
													e.stopPropagation();
													setSystemAudioEnabled(true);
													setActiveDropdown(null);
												}}
												className={`text-left px-3 py-1.5 text-[10px] ${systemAudioEnabled ? "bg-[#0014FF] text-white" : "text-white/70 hover:bg-white/5"}`}
											>
												Capture Audio
											</button>
											<button
												onClick={(e) => {
													e.stopPropagation();
													setSystemAudioEnabled(false);
													setActiveDropdown(null);
												}}
												className={`text-left px-3 py-1.5 text-[10px] ${!systemAudioEnabled ? "bg-[#0014FF] text-white" : "text-white/70 hover:bg-white/5"}`}
											>
												Disable Audio
											</button>
										</div>
									)}
								</div>
							</div>
						</div>

						{/* Col 3: Options */}
						<div className="flex-1 min-w-0 flex flex-col justify-between">
							{/* Cursor */}
							<div className="flex items-center gap-2">
								<div className="w-[34px] h-[34px] flex-shrink-0 rounded-[10px] bg-[#17181c] flex items-center justify-center">
									<SvgMouse className="w-[14px] h-[14px] text-white" />
								</div>
								<div
									className="flex-1 min-w-0 h-[34px] rounded-[8px] bg-[#17181c] px-3 flex items-center justify-between cursor-pointer hover:bg-[#1f2025] transition-colors"
									onClick={() =>
										setCursorCaptureMode(
											cursorCaptureMode === "system" ? "editable-overlay" : "system",
										)
									}
								>
									<span className="text-[10px] font-bold text-white truncate mr-2">
										Use system cursor
									</span>
									<div className="w-[12px] h-[12px] rounded-full border-[1.5px] border-white/20 flex-shrink-0 flex items-center justify-center bg-[#101114]">
										{cursorCaptureMode === "system" && (
											<div className="w-[5px] h-[5px] rounded-full bg-white"></div>
										)}
									</div>
								</div>
							</div>

							{/* Keystrokes */}
							<div className="flex items-center gap-2">
								<div className="w-[34px] h-[34px] flex-shrink-0 rounded-[10px] bg-[#17181c] flex items-center justify-center">
									<SvgKeyboard className="w-[16px] h-[16px] text-white" />
								</div>
								<div
									className="flex-1 min-w-0 h-[34px] rounded-[8px] bg-[#17181c] px-3 flex items-center justify-between cursor-pointer hover:bg-[#1f2025] transition-colors"
									onClick={() => setKeystrokeCaptureEnabled(!keystrokeCaptureEnabled)}
								>
									<span className="text-[10px] font-bold text-white truncate mr-2">
										Capture Keystrokes
									</span>
									<div className="w-[12px] h-[12px] rounded-full border-[1.5px] border-white/20 flex-shrink-0 flex items-center justify-center bg-[#101114]">
										{keystrokeCaptureEnabled && (
											<div className="w-[5px] h-[5px] rounded-full bg-white"></div>
										)}
									</div>
								</div>
							</div>

							{/* Teleprompter */}
							<div className="flex items-center gap-2">
								<div className="w-[34px] h-[34px] flex-shrink-0 rounded-[10px] bg-[#17181c] flex items-center justify-center">
									<SvgTeleprompter className="w-[16px] h-[16px] text-white" />
								</div>
								<div className="flex-1 min-w-0 h-[34px] rounded-[8px] bg-[#17181c] px-3 flex items-center justify-between cursor-pointer hover:bg-[#1f2025] transition-colors">
									<span className="text-[10px] font-bold text-white truncate mr-2">
										Setup Teleprompter
									</span>
									<div className="w-[12px] h-[12px] rounded-full border-[1.5px] border-white/20 flex-shrink-0 flex items-center justify-center bg-[#101114]"></div>
								</div>
							</div>
						</div>
					</div>

					{/* Bottom Buttons */}
					<div
						className="px-5 pb-4 pt-1 flex justify-end gap-3 rounded-b-[18px]"
						onPointerDown={(e) => e.stopPropagation()}
					>
						<Button
							variant="ghost"
							className="bg-white text-black hover:bg-white/90 font-bold px-4 h-[32px] text-[11px] rounded-[6px]"
							onClick={() => window.electronAPI.switchToEditor()}
						>
							Open Studio
						</Button>
						<Button
							variant="default"
							className="bg-[#0014FF] hover:bg-[#0010cc] text-white font-bold px-4 h-[32px] text-[11px] rounded-[6px] shadow-[0_0_15px_rgba(0,20,255,0.3)] transition-all"
							onClick={handleRecordButtonClick}
						>
							Start Recording
						</Button>
					</div>
				</div>
			)}
		</div>
	);
}
