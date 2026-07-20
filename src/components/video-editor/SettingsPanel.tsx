import * as SliderPrimitive from "@radix-ui/react-slider";
import {
	Film,
	Info,
	Keyboard,
	Layers,
	Lock,
	MousePointerClick,
	Palette,
	PenLine,
	Scissors,
	SlidersHorizontal,
	Stamp,
	Trash2,
	Unlock,
	Upload,
	Video,
	Wand2,
	X,
} from "lucide-react";
import { useCallback, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import defaultCursorPreviewUrl from "@/assets/cursors/Cursor=Default.svg";
import { Button } from "@/components/ui/button";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip } from "@/components/ui/tooltip";
import { useScopedT } from "@/contexts/I18nContext";
import { getAssetPath } from "@/lib/assetPath";
import { WEBCAM_LAYOUT_PRESETS } from "@/lib/compositeLayout";
import { CURSOR_THEMES, DEFAULT_CURSOR_THEME_ID } from "@/lib/cursor/cursorThemes";
import type { ExportFormat, ExportQuality, GifFrameRate, GifSizePreset } from "@/lib/exporter";
import { cn } from "@/lib/utils";
import { resolveImageWallpaperUrl, WALLPAPER_PATHS } from "@/lib/wallpaper";
import { type AspectRatio, isPortraitAspectRatio } from "@/utils/aspectRatioUtils";
import ColorPicker from "../ui/color-picker";
import { AnnotationSettingsPanel } from "./AnnotationSettingsPanel";
import { BlurSettingsPanel } from "./BlurSettingsPanel";
import { BACKGROUND_IMAGE_ACCEPT, isSupportedBackgroundImageType } from "./backgroundImageUpload";
import { CropControl } from "./CropControl";
import { parseCustomPlaybackSpeedInput } from "./customPlaybackSpeed";
import {
	DEFAULT_CURSOR_SETTINGS,
	DEFAULT_EDITOR_LAYOUT_SETTINGS,
	DEFAULT_KEYSTROKE_SETTINGS,
	DEFAULT_SOURCE_DIMENSIONS,
	DEFAULT_WEBCAM_SETTINGS,
} from "./editorDefaults";
import { BLUR_REGIONS_ENABLED } from "./featureFlags";
import { KeyboardShortcutsHelp } from "./KeyboardShortcutsHelp";
import type {
	AnnotationRegion,
	AnnotationType,
	BlurData,
	CropRegion,
	FigureData,
	PlaybackSpeed,
	Rotation3DPreset,
	WebcamLayoutPreset,
	WebcamMaskShape,
	WebcamSizePreset,
	ZoomDepth,
	ZoomFocus,
	ZoomFocusMode,
} from "./types";
import {
	DEFAULT_WEBCAM_MIRRORED,
	DEFAULT_WEBCAM_REACTIVE_ZOOM,
	MAX_ZOOM_SCALE,
	MIN_ZOOM_SCALE,
	ROTATION_3D_PRESET_ORDER,
	SPEED_OPTIONS,
	ZOOM_DEPTH_SCALES,
} from "./types";
import { getFocusBoundsForScale } from "./videoPlayback/focusUtils";

function CustomSpeedInput({
	value,
	onChange,
	onError,
}: {
	value: number;
	onChange: (val: number) => void;
	onError: () => void;
}) {
	const isPreset = SPEED_OPTIONS.some((o) => o.speed === value);
	const [draft, setDraft] = useState(isPreset ? "" : String(value));
	const [isFocused, setIsFocused] = useState(false);

	const prevValue = useRef(value);
	if (!isFocused && prevValue.current !== value) {
		prevValue.current = value;
		setDraft(isPreset ? "" : String(value));
	}

	const handleChange = useCallback(
		(e: React.ChangeEvent<HTMLInputElement>) => {
			const result = parseCustomPlaybackSpeedInput(e.target.value);
			if (result.status === "too-fast") {
				onError();
				return;
			}

			setDraft(result.draft);
			if (result.status === "valid") {
				onChange(result.speed);
			}
		},
		[onChange, onError],
	);

	const handleBlur = useCallback(() => {
		setIsFocused(false);
		const result = parseCustomPlaybackSpeedInput(draft);
		if (result.status === "valid") {
			setDraft(String(result.speed));
		} else {
			setDraft(isPreset ? "" : String(value));
		}
	}, [draft, isPreset, value]);

	return (
		<div className="flex items-center gap-1">
			<input
				type="text"
				inputMode="decimal"
				pattern="[0-9]*[.]?[0-9]*"
				placeholder="--"
				value={draft}
				onFocus={() => setIsFocused(true)}
				onChange={handleChange}
				onBlur={handleBlur}
				onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
				className="w-12 bg-white/5 border border-white/10 rounded-md px-1 py-0.5 text-[11px] font-semibold text-[#d97706] text-center focus:outline-none focus:border-[#d97706]/40"
			/>
			<span className="text-[11px] font-semibold text-slate-500">×</span>
		</div>
	);
}

function ZoomFocusCoordInput({
	percent,
	onChange,
	onCommit,
	disabled,
	ariaLabel,
}: {
	percent: number;
	onChange: (nextPercent: number) => void;
	onCommit?: () => void;
	disabled?: boolean;
	ariaLabel: string;
}) {
	// While focused, show the draft so partial entries like "5" or "" survive re-renders.
	// While not focused, mirror the live prop so overlay drags update the number live.
	const [draft, setDraft] = useState<string | null>(null);
	const display = percent.toFixed(1);

	return (
		<input
			type="number"
			inputMode="decimal"
			min={0}
			max={100}
			step={0.1}
			value={draft ?? display}
			disabled={disabled}
			aria-label={ariaLabel}
			onFocus={() => setDraft(display)}
			onChange={(e) => {
				const next = e.target.value;
				setDraft(next);
				const parsed = Number(next);
				if (next !== "" && Number.isFinite(parsed)) {
					const clamped = Math.min(100, Math.max(0, parsed));
					onChange(clamped);
				}
			}}
			onBlur={() => {
				setDraft(null);
				onCommit?.();
			}}
			onKeyDown={(e) => {
				if (e.key === "Enter") (e.target as HTMLInputElement).blur();
			}}
			className="h-7 w-full rounded-md border border-white/10 bg-white/5 px-2 text-[11px] text-slate-200 outline-none focus:border-[#000AF2]/50 focus:ring-1 focus:ring-[#000AF2]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none disabled:opacity-50 disabled:cursor-not-allowed"
		/>
	);
}

const GRADIENTS = [
	"linear-gradient( 111.6deg,  rgba(114,167,232,1) 9.4%, rgba(253,129,82,1) 43.9%, rgba(253,129,82,1) 54.8%, rgba(249,202,86,1) 86.3% )",
	"linear-gradient(120deg, #d4fc79 0%, #96e6a1 100%)",
	"radial-gradient( circle farthest-corner at 3.2% 49.6%,  rgba(80,12,139,0.87) 0%, rgba(161,10,144,0.72) 83.6% )",
	"linear-gradient( 111.6deg,  rgba(0,56,68,1) 0%, rgba(163,217,185,1) 51.5%, rgba(231, 148, 6, 1) 88.6% )",
	"linear-gradient( 107.7deg,  rgba(235,230,44,0.55) 8.4%, rgba(252,152,15,1) 90.3% )",
	"linear-gradient( 91deg,  rgba(72,154,78,1) 5.2%, rgba(251,206,70,1) 95.9% )",
	"radial-gradient( circle farthest-corner at 10% 20%,  rgba(2,37,78,1) 0%, rgba(4,56,126,1) 19.7%, rgba(85,245,221,1) 100.2% )",
	"linear-gradient( 109.6deg,  rgba(15,2,2,1) 11.2%, rgba(36,163,190,1) 91.1% )",
	"linear-gradient(135deg, #FBC8B4, #2447B1)",
	"linear-gradient(109.6deg, #F635A6, #36D860)",
	"linear-gradient(90deg, #FF0101, #4DFF01)",
	"linear-gradient(315deg, #EC0101, #5044A9)",
	"linear-gradient(45deg, #ff9a9e 0%, #fad0c4 99%, #fad0c4 100%)",
	"linear-gradient(to top, #a18cd1 0%, #fbc2eb 100%)",
	"linear-gradient(to right, #ff8177 0%, #ff867a 0%, #ff8c7f 21%, #f99185 52%, #cf556c 78%, #b12a5b 100%)",
	"linear-gradient(120deg, #84fab0 0%, #8fd3f4 100%)",
	"linear-gradient(to right, #4facfe 0%, #00f2fe 100%)",
	"linear-gradient(to top, #fcc5e4 0%, #fda34b 15%, #ff7882 35%, #c8699e 52%, #7046aa 71%, #0c1db8 87%, #020f75 100%)",
	"linear-gradient(to right, #fa709a 0%, #fee140 100%)",
	"linear-gradient(to top, #30cfd0 0%, #330867 100%)",
	"linear-gradient(to top, #c471f5 0%, #fa71cd 100%)",
	"linear-gradient(to right, #f78ca0 0%, #f9748f 19%, #fd868c 60%, #fe9a8b 100%)",
	"linear-gradient(to top, #48c6ef 0%, #6f86d6 100%)",
	"linear-gradient(to right, #0acffe 0%, #495aff 100%)",
];

interface SettingsPanelProps {
	selected: string;
	onWallpaperChange: (path: string) => void;
	selectedZoomDepth?: ZoomDepth | null;
	onZoomDepthChange?: (depth: ZoomDepth) => void;
	selectedZoomCustomScale?: number | null;
	onZoomCustomScaleChange?: (scale: number) => void;
	onZoomCustomScaleCommit?: () => void;
	onZoomPreviewStart?: () => void;
	onZoomPreviewEnd?: () => void;
	selectedZoomFocusMode?: ZoomFocusMode | null;
	onZoomFocusModeChange?: (mode: ZoomFocusMode) => void;
	/** When the global Auto-Focus toggle is on, the per-zoom selector is locked. */
	focusModeLocked?: boolean;
	selectedZoomFocus?: ZoomFocus | null;
	onZoomFocusCoordinateChange?: (focus: ZoomFocus) => void;
	onZoomFocusCoordinateCommit?: () => void;
	hasCursorTelemetry?: boolean;
	selectedZoomId?: string | null;
	onZoomDelete?: (id: string) => void;
	selectedZoomRotationPreset?: Rotation3DPreset | null;
	onZoomRotationPresetChange?: (preset: Rotation3DPreset | null) => void;
	selectedTrimId?: string | null;
	onTrimDelete?: (id: string) => void;
	shadowIntensity?: number;
	onShadowChange?: (intensity: number) => void;
	onShadowCommit?: () => void;
	showBlur?: boolean;
	onBlurChange?: (showBlur: boolean) => void;
	showTrimWaveform?: boolean;
	onTrimWaveformChange?: (show: boolean) => void;
	motionBlurAmount?: number;
	onMotionBlurChange?: (amount: number) => void;
	onMotionBlurCommit?: () => void;
	borderRadius?: number;
	onBorderRadiusChange?: (radius: number) => void;
	onBorderRadiusCommit?: () => void;
	padding?: number;
	onPaddingChange?: (padding: number) => void;
	onPaddingCommit?: () => void;
	cropRegion?: CropRegion;
	onCropChange?: (region: CropRegion) => void;
	aspectRatio: AspectRatio;
	videoElement?: HTMLVideoElement | null;
	exportQuality?: ExportQuality;
	onExportQualityChange?: (quality: ExportQuality) => void;
	// Export format settings
	exportFormat?: ExportFormat;
	onExportFormatChange?: (format: ExportFormat) => void;
	gifFrameRate?: GifFrameRate;
	onGifFrameRateChange?: (rate: GifFrameRate) => void;
	gifLoop?: boolean;
	onGifLoopChange?: (loop: boolean) => void;
	gifSizePreset?: GifSizePreset;
	onGifSizePresetChange?: (preset: GifSizePreset) => void;
	gifOutputDimensions?: { width: number; height: number };
	onExport?: () => void;
	unsavedExport?: {
		arrayBuffer: ArrayBuffer;
		fileName: string;
		format: string;
	} | null;
	onSaveUnsavedExport?: () => void;
	selectedAnnotationId?: string | null;
	annotationRegions?: AnnotationRegion[];
	onAnnotationContentChange?: (id: string, content: string) => void;
	onAnnotationTypeChange?: (id: string, type: AnnotationType) => void;
	onAnnotationStyleChange?: (id: string, style: Partial<AnnotationRegion["style"]>) => void;
	onAnnotationFigureDataChange?: (id: string, figureData: FigureData) => void;
	onAnnotationDuplicate?: (id: string) => void;
	onAnnotationDelete?: (id: string) => void;
	selectedBlurId?: string | null;
	blurRegions?: AnnotationRegion[];
	onBlurDataChange?: (id: string, blurData: BlurData) => void;
	onBlurDataCommit?: () => void;
	onBlurDelete?: (id: string) => void;
	selectedSpeedId?: string | null;
	selectedSpeedValue?: PlaybackSpeed | null;
	onSpeedChange?: (speed: PlaybackSpeed) => void;
	onSpeedDelete?: (id: string) => void;
	hasWebcam?: boolean;
	webcamLayoutPreset?: WebcamLayoutPreset;
	onWebcamLayoutPresetChange?: (preset: WebcamLayoutPreset) => void;
	webcamMaskShape?: import("./types").WebcamMaskShape;
	onWebcamMaskShapeChange?: (shape: import("./types").WebcamMaskShape) => void;
	webcamMirrored?: boolean;
	onWebcamMirroredChange?: (mirrored: boolean) => void;
	webcamReactiveZoom?: boolean;
	onWebcamReactiveZoomChange?: (reactive: boolean) => void;
	webcamSizePreset?: WebcamSizePreset;
	onWebcamSizePresetChange?: (size: WebcamSizePreset) => void;
	onWebcamSizePresetCommit?: () => void;
	showCursor?: boolean;
	onShowCursorChange?: (show: boolean) => void;
	cursorSize?: number;
	onCursorSizeChange?: (size: number) => void;
	cursorSmoothing?: number;
	onCursorSmoothingChange?: (smoothing: number) => void;
	cursorMotionBlur?: number;
	onCursorMotionBlurChange?: (blur: number) => void;
	cursorClickBounce?: number;
	onCursorClickBounceChange?: (bounce: number) => void;
	cursorClipToBounds?: boolean;
	onCursorClipToBoundsChange?: (clip: boolean) => void;
	cursorTheme?: string;
	onCursorThemeChange?: (theme: string) => void;
	keystrokePosition?: import("./types").KeystrokePosition;
	onKeystrokePositionChange?: (pos: import("./types").KeystrokePosition) => void;
	keystrokeDesign?: import("./types").KeystrokeDesign;
	onKeystrokeDesignChange?: (design: import("./types").KeystrokeDesign) => void;
	keystrokeSize?: number;
	onKeystrokeSizeChange?: (size: number) => void;
	hasCursorData?: boolean;
	showCursorSettings?: boolean;
	activePanelMode?: SettingsPanelMode;
	currentProjectPath?: string | null;
	watermarkSettings?: import("./types").WatermarkSettings;
	onWatermarkSettingsChange?: (settings: import("./types").WatermarkSettings) => void;
	onWatermarkSettingsCommit?: () => void;
}

export default SettingsPanel;

const ZOOM_DEPTH_OPTIONS: Array<{ depth: ZoomDepth; label: string }> = [
	{ depth: 0, label: "1.0×" },
	{ depth: 1, label: "1.25×" },
	{ depth: 2, label: "1.5×" },
	{ depth: 3, label: "1.8×" },
	{ depth: 4, label: "2.2×" },
	{ depth: 5, label: "3.5×" },
	{ depth: 6, label: "5×" },
];

export type SettingsPanelMode =
	| "canvas"
	| "overlay"
	| "trim"
	| "webcam"
	| "watermark"
	| "annotation"
	| "tools";

// const MP4_EXPORT_SHORT_SIDES = {
// 	medium: 720,
// 	good: 1080,
// } as const;

export function SettingsPanel({
	selected,
	onWallpaperChange,
	selectedZoomDepth,
	onZoomDepthChange,
	selectedZoomCustomScale,
	onZoomCustomScaleChange,
	onZoomCustomScaleCommit,
	onZoomPreviewStart,
	onZoomPreviewEnd,
	selectedZoomFocusMode,
	onZoomFocusModeChange,
	focusModeLocked = false,
	selectedZoomFocus,
	onZoomFocusCoordinateChange,
	onZoomFocusCoordinateCommit,
	hasCursorTelemetry = false,
	selectedZoomId,
	onZoomDelete,
	selectedZoomRotationPreset,
	onZoomRotationPresetChange,
	selectedTrimId,
	onTrimDelete,
	shadowIntensity = 0,
	onShadowChange,
	onShadowCommit,
	showBlur,
	onBlurChange,
	showTrimWaveform = false,
	onTrimWaveformChange,
	motionBlurAmount = 0,
	onMotionBlurChange,
	onMotionBlurCommit,
	borderRadius = 0,
	onBorderRadiusChange,
	onBorderRadiusCommit,
	padding = DEFAULT_EDITOR_LAYOUT_SETTINGS.padding,
	onPaddingChange,
	onPaddingCommit,
	cropRegion,
	onCropChange,
	aspectRatio,
	videoElement,
	selectedAnnotationId,
	annotationRegions = [],
	onAnnotationContentChange,
	onAnnotationTypeChange,
	onAnnotationStyleChange,
	onAnnotationFigureDataChange,
	onAnnotationDuplicate,
	onAnnotationDelete,
	selectedBlurId,
	blurRegions = [],
	onBlurDataChange,
	onBlurDataCommit,
	onBlurDelete,
	selectedSpeedId,
	selectedSpeedValue,
	onSpeedChange,
	onSpeedDelete,
	hasWebcam = false,
	webcamLayoutPreset = DEFAULT_WEBCAM_SETTINGS.layoutPreset,
	onWebcamLayoutPresetChange,
	webcamMaskShape = DEFAULT_WEBCAM_SETTINGS.maskShape,
	onWebcamMaskShapeChange,
	webcamMirrored = DEFAULT_WEBCAM_MIRRORED,
	onWebcamMirroredChange,
	webcamReactiveZoom = DEFAULT_WEBCAM_REACTIVE_ZOOM,
	onWebcamReactiveZoomChange,
	webcamSizePreset = DEFAULT_WEBCAM_SETTINGS.sizePreset,
	onWebcamSizePresetChange,
	onWebcamSizePresetCommit,
	showCursor = DEFAULT_CURSOR_SETTINGS.show,
	onShowCursorChange,
	cursorSize = DEFAULT_CURSOR_SETTINGS.size,
	onCursorSizeChange,
	cursorSmoothing = DEFAULT_CURSOR_SETTINGS.smoothing,
	onCursorSmoothingChange,
	cursorMotionBlur = DEFAULT_CURSOR_SETTINGS.motionBlur,
	onCursorMotionBlurChange,
	cursorClickBounce = DEFAULT_CURSOR_SETTINGS.clickBounce,
	onCursorClickBounceChange,
	cursorClipToBounds = DEFAULT_CURSOR_SETTINGS.clipToBounds,
	onCursorClipToBoundsChange,
	cursorTheme = DEFAULT_CURSOR_SETTINGS.theme,
	onCursorThemeChange,
	keystrokePosition = DEFAULT_KEYSTROKE_SETTINGS.position,
	onKeystrokePositionChange,
	keystrokeDesign = DEFAULT_KEYSTROKE_SETTINGS.design,
	onKeystrokeDesignChange,
	keystrokeSize = DEFAULT_KEYSTROKE_SETTINGS.size,
	onKeystrokeSizeChange,
	hasCursorData = false,
	showCursorSettings = true,
	activePanelMode: externalActivePanelMode,
	currentProjectPath,
	watermarkSettings,
	onWatermarkSettingsChange,
	onWatermarkSettingsCommit,
}: SettingsPanelProps) {
	const t = useScopedT("settings");

	const activePanelMode = externalActivePanelMode ?? "canvas";
	// Resolved URLs are for DOM rendering only. We persist the canonical
	// `/wallpapers/wallpaperN.jpg` form from WALLPAPER_PATHS, never the file:// URL.
	const wallpaperPreviewUrls = useMemo(() => WALLPAPER_PATHS.map(resolveImageWallpaperUrl), []);
	// Built-in "Default" plus each bundled theme. Thumbnails use the theme's arrow asset;
	// the persisted value is the theme id.
	const cursorThemeOptions = useMemo(
		() => [
			{
				id: DEFAULT_CURSOR_THEME_ID,
				name: t("cursor.themeDefault"),
				previewUrl: defaultCursorPreviewUrl,
			},
			...CURSOR_THEMES.map((theme) => {
				const previewPath = (theme.assets.arrow ?? theme.assets.pointer)?.assetPath;
				return {
					id: theme.id,
					name: theme.name,
					previewUrl: previewPath ? getAssetPath(previewPath) : defaultCursorPreviewUrl,
				};
			}),
		],
		[t],
	);
	const [customImages, setCustomImages] = useState<string[]>([]);
	const fileInputRef = useRef<HTMLInputElement>(null);
	const colorPalette = [
		"#FF0000",
		"#FFD700",
		"#00FF00",
		"#FFFFFF",
		"#0000FF",
		"#FF6B00",
		"#9B59B6",
		"#E91E63",
		"#00BCD4",
		"#FF5722",
		"#8BC34A",
		"#FFC107",
		"#000AF2",
		"#000000",
		"#607D8B",
		"#795548",
	];

	const [selectedColor, setSelectedColor] = useState("#ADADAD");
	const [gradient, setGradient] = useState<string>(GRADIENTS[0]);
	const [cropAspectLocked, setCropAspectLocked] = useState(false);
	const [cropAspectRatio, setCropAspectRatio] = useState("");
	const isPortraitCanvas = isPortraitAspectRatio(aspectRatio);

	const videoWidth = videoElement?.videoWidth || DEFAULT_SOURCE_DIMENSIONS.width;
	const videoHeight = videoElement?.videoHeight || DEFAULT_SOURCE_DIMENSIONS.height;

	const handleCropNumericChange = useCallback(
		(field: "x" | "y" | "width" | "height", pixelValue: number) => {
			if (!cropRegion || !onCropChange) return;

			const next = { ...cropRegion };
			switch (field) {
				case "x":
					next.x = Math.max(0, Math.min(pixelValue / videoWidth, 1 - next.width));
					break;
				case "y":
					next.y = Math.max(0, Math.min(pixelValue / videoHeight, 1 - next.height));
					break;
				case "width": {
					const newWidth = Math.max(0.05, Math.min(pixelValue / videoWidth, 1 - next.x));
					if (cropAspectLocked && next.width > 0 && next.height > 0) {
						const ratio = next.width / next.height;
						const newHeight = newWidth / ratio;
						if (next.y + newHeight <= 1) {
							next.width = newWidth;
							next.height = newHeight;
						}
					} else {
						next.width = newWidth;
					}
					break;
				}
				case "height": {
					const newHeight = Math.max(0.05, Math.min(pixelValue / videoHeight, 1 - next.y));
					if (cropAspectLocked && next.width > 0 && next.height > 0) {
						const ratio = next.width / next.height;
						const newWidth = newHeight * ratio;
						if (next.x + newWidth <= 1) {
							next.height = newHeight;
							next.width = newWidth;
						}
					} else {
						next.height = newHeight;
					}
					break;
				}
			}

			onCropChange(next);
		},
		[cropRegion, onCropChange, videoWidth, videoHeight, cropAspectLocked],
	);

	const applyCropAspectPreset = useCallback(
		(preset: string) => {
			if (!cropRegion || !onCropChange) return;

			setCropAspectRatio(preset);
			if (preset === "") {
				setCropAspectLocked(false);
				return;
			}

			const [wStr, hStr] = preset.split(":");
			const targetRatio = Number(wStr) / Number(hStr);
			const next = { ...cropRegion };

			const nextHeight = (next.width * videoWidth) / (targetRatio * videoHeight);
			if (next.y + nextHeight <= 1 && nextHeight >= 0.05) {
				next.height = nextHeight;
			} else {
				const nextWidth = (next.height * videoHeight * targetRatio) / videoWidth;
				if (next.x + nextWidth <= 1 && nextWidth >= 0.05) {
					next.width = nextWidth;
				}
			}

			onCropChange(next);
			setCropAspectLocked(true);
		},
		[cropRegion, onCropChange, videoWidth, videoHeight],
	);

	const getCropPixelValue = useCallback(
		(field: "x" | "y" | "width" | "height"): number => {
			if (!cropRegion) return 0;
			switch (field) {
				case "x":
					return Math.round(cropRegion.x * videoWidth);
				case "y":
					return Math.round(cropRegion.y * videoHeight);
				case "width":
					return Math.round(cropRegion.width * videoWidth);
				case "height":
					return Math.round(cropRegion.height * videoHeight);
			}
		},
		[cropRegion, videoWidth, videoHeight],
	);
	const [showCropDropdown, setShowCropDropdown] = useState(false);

	const zoomEnabled = Boolean(selectedZoomDepth);
	// const trimEnabled = Boolean(selectedTrimId);
	// const hasTimelineSelection = Boolean(selectedZoomId || selectedTrimId || selectedSpeedId);
	// const hasCursorPanel = showCursorSettings && hasCursorData;
	const selectedAnnotation = selectedAnnotationId
		? annotationRegions.find((a) => a.id === selectedAnnotationId)
		: null;
	const selectedBlur = selectedBlurId
		? blurRegions.find((region) => region.id === selectedBlurId)
		: null;

	const getTabLabel = (mode: SettingsPanelMode) => {
		switch (mode) {
			case "canvas":
				return "Canvas Properties";
			case "overlay":
				return "Overlay Properties";
			case "trim":
				return "Trim Properties";
			case "webcam":
				return "Webcam Properties";
			case "watermark":
				return "Watermark Properties";
			case "annotation":
				return "Annotation Properties";
			case "tools":
				return "Tools Properties";
			default:
				return "";
		}
	};

	const handleDeleteClick = () => {
		if (selectedZoomId && onZoomDelete) {
			onZoomDelete(selectedZoomId);
		}
	};

	const handleTrimDeleteClick = () => {
		if (selectedTrimId && onTrimDelete) {
			onTrimDelete(selectedTrimId);
		}
	};

	const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (!files || files.length === 0) return;

		const file = files[0];

		if (!isSupportedBackgroundImageType(file.type, file.name)) {
			toast.error(t("imageUpload.invalidFileType"), {
				description: t("imageUpload.jpgOnly"),
			});
			event.target.value = "";
			return;
		}

		const filePath = (file as any).path;

		if (currentProjectPath && window.electronAPI?.copyAssetToProject && filePath) {
			try {
				const projectDir = currentProjectPath.replace(/\\/g, "/").split("/").slice(0, -1).join("/");
				const result = await window.electronAPI.copyAssetToProject(
					projectDir,
					filePath,
					"background",
				);
				if (result.success && result.path) {
					const finalUrl = `file://${result.path.replace(/\\/g, "/")}`;
					setCustomImages((prev) => [...prev, finalUrl]);
					onWallpaperChange(finalUrl);
					toast.success(t("imageUpload.uploadSuccess"));
				} else {
					throw new Error(result.error || "Unknown IPC error");
				}
			} catch (e: any) {
				console.error("Failed to copy background to project:", e);
				toast.error(`Failed to copy background: ${e.message || String(e)}`);
			}
		} else {
			const reader = new FileReader();
			reader.onload = (e) => {
				const dataUrl = e.target?.result as string;
				if (dataUrl) {
					setCustomImages((prev) => [...prev, dataUrl]);
					onWallpaperChange(dataUrl);
					toast.success(t("imageUpload.uploadSuccess"));
				}
			};
			reader.onerror = () => {
				toast.error(t("imageUpload.failedToUpload"), {
					description: t("imageUpload.errorReading"),
				});
			};
			reader.readAsDataURL(file);
		}

		event.target.value = "";
	};

	const handleWatermarkUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const files = event.target.files;
		if (!files || files.length === 0 || !onWatermarkSettingsChange || !watermarkSettings) return;

		const file = files[0];

		const filePath = (file as any).path;

		if (currentProjectPath && window.electronAPI?.copyAssetToProject && filePath) {
			try {
				const projectDir = currentProjectPath.replace(/\\/g, "/").split("/").slice(0, -1).join("/");
				const result = await window.electronAPI.copyAssetToProject(
					projectDir,
					filePath,
					"watermark",
				);
				if (result.success && result.path) {
					const finalUrl = `file://${result.path.replace(/\\/g, "/")}`;
					onWatermarkSettingsChange({ ...watermarkSettings, imageUrl: finalUrl });
					toast.success("Watermark saved to project assets");
				} else {
					throw new Error(result.error || "Unknown IPC error");
				}
			} catch (e: any) {
				console.error("Failed to copy watermark to project:", e);
				toast.error(`Failed to save watermark: ${e.message || String(e)}`);
			}
		} else {
			const reader = new FileReader();
			reader.onload = (e) => {
				const dataUrl = e.target?.result as string;
				if (dataUrl) {
					onWatermarkSettingsChange({ ...watermarkSettings, imageUrl: dataUrl });
				}
			};
			reader.onerror = () => {
				toast.error("Failed to load watermark image");
			};
			reader.readAsDataURL(file);
		}

		event.target.value = "";
	};

	const handleRemoveCustomImage = (imageUrl: string, event: React.MouseEvent) => {
		event.stopPropagation();
		setCustomImages((prev) => prev.filter((img) => img !== imageUrl));
		// If the removed image was selected, reset to the first wallpaper.
		if (selected === imageUrl) {
			onWallpaperChange(WALLPAPER_PATHS[0]);
		}
	};

	return (
		<div className="editor-inspector-shell flex min-w-0 flex-col h-full overflow-hidden bg-[#0A0D0F]">
			<div className="flex flex-col min-h-0 flex-1">
				<div className="flex-1 overflow-y-auto custom-scrollbar p-2 pb-0">
					<div className="mb-3 flex items-center justify-between px-1 uppercase tracking-[0.1em] text-[11px]">
						<span className="text-[11px] font-semibold text-slate-400">
							{getTabLabel(activePanelMode)}
						</span>
						<KeyboardShortcutsHelp />
					</div>

					{/* ── CANVAS TAB ── */}
					{activePanelMode === "canvas" && (
						<div className="space-y-4">
							{/* Video Styling / Effects Section */}
							<div className="editor-panel-section p-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] space-y-3">
								<div className="flex items-center gap-2 mb-1">
									<SlidersHorizontal className="w-4 h-4 text-slate-200" />
									<span className="text-xs font-semibold text-slate-200">{t("effects.title")}</span>
								</div>

								<div className="flex items-center justify-between p-2 rounded-lg editor-control-surface">
									<div className="text-[10px] font-medium text-slate-300">
										{t("effects.blurBg")}
									</div>
									<Switch
										checked={showBlur}
										onCheckedChange={onBlurChange}
										className="data-[state=checked]:bg-[#000AF2] scale-90"
									/>
								</div>

								<div className="grid grid-cols-2 gap-2">
									<div className="p-2 rounded-lg editor-control-surface">
										<div className="flex items-center justify-between mb-1">
											<div className="text-[10px] font-medium text-slate-300">
												{t("effects.motionBlur")}
											</div>
											<span className="text-[10px] text-slate-500 font-mono">
												{motionBlurAmount === 0 ? t("effects.off") : motionBlurAmount.toFixed(2)}
											</span>
										</div>
										<Slider
											value={[motionBlurAmount]}
											onValueChange={(values) => onMotionBlurChange?.(values[0])}
											onValueCommit={() => onMotionBlurCommit?.()}
											min={0}
											max={1}
											step={0.01}
											className="w-full"
										/>
									</div>
									<div className="p-2 rounded-lg editor-control-surface">
										<div className="flex items-center justify-between mb-1">
											<div className="text-[10px] font-medium text-slate-300">
												{t("effects.shadow")}
											</div>
											<span className="text-[10px] text-slate-500 font-mono">
												{Math.round(shadowIntensity * 100)}%
											</span>
										</div>
										<Slider
											value={[shadowIntensity]}
											onValueChange={(values) => onShadowChange?.(values[0])}
											onValueCommit={() => onShadowCommit?.()}
											min={0}
											max={1}
											step={0.01}
											className="w-full"
										/>
									</div>
									<div className="p-2 rounded-lg editor-control-surface">
										<div className="flex items-center justify-between mb-1">
											<div className="text-[10px] font-medium text-slate-300">
												{t("effects.roundness")}
											</div>
											<span className="text-[10px] text-slate-500 font-mono">{borderRadius}px</span>
										</div>
										<Slider
											value={[borderRadius]}
											onValueChange={(values) => onBorderRadiusChange?.(values[0])}
											onValueCommit={() => onBorderRadiusCommit?.()}
											min={0}
											max={64}
											step={0.5}
											className="w-full"
										/>
									</div>
									<div
										className={`p-2 rounded-lg editor-control-surface ${webcamLayoutPreset === "vertical-stack" ? "opacity-40 pointer-events-none" : ""}`}
									>
										<div className="flex items-center justify-between mb-1">
											<div className="text-[10px] font-medium text-slate-300">
												{t("effects.padding")}
											</div>
											<span className="text-[10px] text-slate-500 font-mono">
												{webcamLayoutPreset === "vertical-stack" ? "—" : `${padding}%`}
											</span>
										</div>
										<Slider
											value={[webcamLayoutPreset === "vertical-stack" ? 0 : padding]}
											onValueChange={(values) => onPaddingChange?.(values[0])}
											onValueCommit={() => onPaddingCommit?.()}
											min={0}
											max={100}
											step={1}
											disabled={webcamLayoutPreset === "vertical-stack"}
											className="w-full"
										/>
									</div>
								</div>
							</div>

							{/* Crop Button Section */}
							{cropRegion && onCropChange && (
								<div className="flex px-1">
									<Button
										onClick={() => setShowCropDropdown(true)}
										variant="outline"
										className="gap-2 bg-white/5 text-slate-200 border-white/10 hover:bg-[#000AF2] hover:text-white hover:border-[#000AF2] transition-all h-8 text-[11px]"
									>
										<Film className="w-3.5 h-3.5" />
										{t("crop.cropVideo")}
									</Button>
								</div>
							)}

							{/* Background Section */}
							<div className="editor-panel-section p-2 rounded-2xl border border-white/[0.05] bg-white/[0.02]">
								<div className="flex items-center gap-2 mb-3">
									<Palette className="w-4 h-4 text-slate-200" />
									<span className="text-xs font-semibold text-slate-200">
										{t("background.title")}
									</span>
								</div>

								<Tabs defaultValue="image" className="w-full">
									<TabsList className="mb-2 grid h-7 w-full grid-cols-3 rounded-lg border border-white/5 bg-white/5 p-0.5">
										<TabsTrigger
											value="image"
											className="h-full min-w-0 rounded-md px-1 py-0 text-[10px] leading-none text-slate-400 transition-colors data-[state=active]:bg-[#000AF2] data-[state=active]:text-white data-[state=active]:shadow-none"
										>
											{t("background.image")}
										</TabsTrigger>
										<TabsTrigger
											value="color"
											className="h-full min-w-0 rounded-md px-1 py-0 text-[10px] leading-none text-slate-400 transition-colors data-[state=active]:bg-[#000AF2] data-[state=active]:text-white data-[state=active]:shadow-none"
										>
											{t("background.color")}
										</TabsTrigger>
										<TabsTrigger
											value="gradient"
											className="h-full min-w-0 rounded-md px-1 py-0 text-[10px] leading-none text-slate-400 transition-colors data-[state=active]:bg-[#000AF2] data-[state=active]:text-white data-[state=active]:shadow-none"
										>
											{t("background.gradient")}
										</TabsTrigger>
									</TabsList>

									<div className="overflow-y-auto custom-scrollbar">
										<TabsContent value="image" className="mt-0 space-y-2">
											<input
												type="file"
												ref={fileInputRef}
												onChange={handleImageUpload}
												accept={BACKGROUND_IMAGE_ACCEPT}
												className="hidden"
											/>
											<div className="flex">
												<Button
													onClick={() => fileInputRef.current?.click()}
													variant="outline"
													className="gap-2 bg-white/5 text-slate-200 border-white/10 hover:bg-[#000AF2] hover:text-white hover:border-[#000AF2] transition-all h-8 text-[11px]"
												>
													<Upload className="w-3 h-3" />
													{t("background.uploadCustom")}
												</Button>
											</div>

											<div className="grid grid-cols-4 gap-2 mt-2">
												{customImages.map((imageUrl, idx) => {
													const isSelected = selected === imageUrl;
													return (
														<div
															key={`custom-${idx}`}
															className={cn(
																"aspect-[16/9] w-full h-auto rounded-lg border overflow-hidden cursor-pointer transition-all duration-150 relative group shadow-sm",
																isSelected
																	? "border-[#000AF2] ring-1 ring-[#000AF2]/30"
																	: "border-white/10 hover:border-[#000AF2]/40 opacity-80 hover:opacity-100 bg-white/5",
															)}
															style={{
																backgroundImage: `url(${imageUrl})`,
																backgroundSize: "cover",
																backgroundPosition: "center",
															}}
															onClick={() => onWallpaperChange(imageUrl)}
															role="button"
														>
															<button
																onClick={(e) => handleRemoveCustomImage(imageUrl, e)}
																className="absolute top-0.5 right-0.5 w-3 h-3 bg-red-500/90 hover:bg-red-500 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10"
															>
																<X className="w-2 h-2 text-white" />
															</button>
														</div>
													);
												})}

												{WALLPAPER_PATHS.map((canonicalPath, i) => {
													const previewUrl = wallpaperPreviewUrls[i] ?? canonicalPath;
													const isSelected = selected === canonicalPath;
													return (
														<div
															key={canonicalPath}
															className={cn(
																"aspect-[16/9] w-full h-auto rounded-lg border overflow-hidden cursor-pointer transition-all duration-150 shadow-sm",
																isSelected
																	? "border-[#000AF2] ring-1 ring-[#000AF2]/30"
																	: "border-white/10 hover:border-[#000AF2]/40 opacity-80 hover:opacity-100 bg-white/5",
															)}
															style={{
																backgroundImage: `url(${previewUrl})`,
																backgroundSize: "cover",
																backgroundPosition: "center",
															}}
															onClick={() => onWallpaperChange(canonicalPath)}
															role="button"
														/>
													);
												})}
											</div>
										</TabsContent>

										<TabsContent value="color" className="mt-0">
											<ColorPicker
												selectedColor={selectedColor}
												colorPalette={colorPalette}
												translations={{
													colorWheel: t("background.colorWheel"),
													colorPalette: t("background.colorPalette"),
												}}
												onUpdateColor={(color) => {
													setSelectedColor(color);
													onWallpaperChange(color);
												}}
											/>
										</TabsContent>

										<TabsContent value="gradient" className="mt-0">
											<div className="grid grid-cols-4 gap-2 mt-2">
												{GRADIENTS.map((g, idx) => (
													<div
														key={g}
														className={cn(
															"aspect-[16/9] w-full h-auto rounded-lg border overflow-hidden cursor-pointer transition-all duration-150 shadow-sm",
															gradient === g
																? "border-[#000AF2] ring-1 ring-[#000AF2]/30"
																: "border-white/10 hover:border-[#000AF2]/40 opacity-80 hover:opacity-100 bg-white/5",
														)}
														style={{ background: g }}
														aria-label={t("background.gradientLabel", {
															index: idx + 1,
														})}
														onClick={() => {
															setGradient(g);
															onWallpaperChange(g);
														}}
														role="button"
													/>
												))}
											</div>
										</TabsContent>
									</div>
								</Tabs>
							</div>
						</div>
					)}

					{/* ── OVERLAY TAB ── */}
					{activePanelMode === "overlay" && (
						<div className="space-y-4">
							{/* Cursor Settings */}
							<div
								className={cn(
									"editor-panel-section p-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] space-y-3",
									(!showCursorSettings || !hasCursorData) &&
										"opacity-40 pointer-events-none select-none",
								)}
							>
								<div className="flex items-center justify-between mb-1">
									<div className="flex items-center gap-2">
										<MousePointerClick className="w-4 h-4 text-slate-200" />
										<span className="text-xs font-semibold text-slate-200">{t("cursor.show")}</span>
									</div>
									<Switch
										checked={showCursor}
										onCheckedChange={onShowCursorChange}
										className="data-[state=checked]:bg-[#000AF2] scale-90"
										disabled={!showCursorSettings || !hasCursorData}
									/>
								</div>

								{(!showCursorSettings || !hasCursorData) && (
									<div className="text-[10px] text-slate-500 italic px-1">
										No cursor telemetry data available to overlay.
									</div>
								)}

								{showCursorSettings && hasCursorData && showCursor && (
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-1 text-[10px] font-medium text-slate-300">
												<span>{t("cursor.clipToBounds")}</span>
												<Tooltip
													content={t("cursor.clipToBoundsDescription")}
													className="max-w-[220px] leading-snug whitespace-normal"
												>
													<button
														type="button"
														className="text-slate-400 transition-colors hover:text-slate-200"
														aria-label={t("cursor.clipToBoundsDescription")}
													>
														<Info size={11} />
													</button>
												</Tooltip>
											</div>
											<Switch
												checked={cursorClipToBounds}
												onCheckedChange={onCursorClipToBoundsChange}
												className="data-[state=checked]:bg-[#000AF2] scale-90"
												aria-label={t("cursor.clipToBounds")}
											/>
										</div>

										{cursorThemeOptions.length > 1 && (
											<div className="space-y-1.5">
												<div className="text-[10px] font-medium text-slate-300">
													{t("cursor.theme")}
												</div>
												<div className="flex flex-wrap gap-1.5">
													{cursorThemeOptions.map((option) => {
														const isSelected = cursorTheme === option.id;
														return (
															<button
																type="button"
																key={option.id}
																title={option.name}
																aria-label={option.name}
																aria-pressed={isSelected}
																onClick={() => onCursorThemeChange?.(option.id)}
																className={cn(
																	"flex items-center justify-center w-8 h-8 rounded-lg border overflow-hidden transition-all duration-150 shadow-sm bg-white/5",
																	isSelected
																		? "border-[#000AF2] ring-1 ring-[#000AF2]/30"
																		: "border-white/10 hover:border-[#000AF2]/40 opacity-80 hover:opacity-100 bg-white/5",
																)}
															>
																<img
																	src={option.previewUrl}
																	alt=""
																	className="w-5 h-5 object-contain"
																	draggable={false}
																/>
															</button>
														);
													})}
												</div>
											</div>
										)}

										<div className="grid grid-cols-2 gap-2">
											<div className="p-2 rounded-lg bg-white/5 border border-white/5">
												<div className="flex items-center justify-between mb-1">
													<div className="text-[10px] font-medium text-slate-300">
														{t("cursor.size")}
													</div>
													<span className="text-[10px] text-slate-500 font-mono">
														{cursorSize.toFixed(1)}
													</span>
												</div>
												<Slider
													value={[cursorSize]}
													onValueChange={(values) => onCursorSizeChange?.(values[0])}
													min={0.5}
													max={10}
													step={0.1}
													className="w-full"
												/>
											</div>
											<div className="p-2 rounded-lg bg-white/5 border border-white/5">
												<div className="flex items-center justify-between mb-1">
													<div className="text-[10px] font-medium text-slate-300">
														{t("cursor.smoothing")}
													</div>
													<span className="text-[10px] text-slate-500 font-mono">
														{Math.round(cursorSmoothing * 100)}%
													</span>
												</div>
												<Slider
													value={[cursorSmoothing]}
													onValueChange={(values) => onCursorSmoothingChange?.(values[0])}
													min={0}
													max={1}
													step={0.01}
													className="w-full"
												/>
											</div>
											<div className="p-2 rounded-lg bg-white/5 border border-white/5">
												<div className="flex items-center justify-between mb-1">
													<div className="text-[10px] font-medium text-slate-300">
														{t("cursor.motionBlur")}
													</div>
													<span className="text-[10px] text-slate-500 font-mono">
														{Math.round(cursorMotionBlur * 100)}%
													</span>
												</div>
												<Slider
													value={[cursorMotionBlur]}
													onValueChange={(values) => onCursorMotionBlurChange?.(values[0])}
													min={0}
													max={1}
													step={0.01}
													className="w-full"
												/>
											</div>
											<div className="p-2 rounded-lg bg-white/5 border border-white/5">
												<div className="flex items-center justify-between mb-1">
													<div className="text-[10px] font-medium text-slate-300">
														{t("cursor.clickBounce")}
													</div>
													<span className="text-[10px] text-slate-500 font-mono">
														{cursorClickBounce.toFixed(1)}
													</span>
												</div>
												<Slider
													value={[cursorClickBounce]}
													onValueChange={(values) => onCursorClickBounceChange?.(values[0])}
													min={0}
													max={5}
													step={0.1}
													className="w-full"
												/>
											</div>
										</div>
									</div>
								)}
							</div>

							{/* Keystrokes Section */}
							<div className="editor-panel-section p-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] space-y-3">
								<div className="flex items-center gap-2 mb-1">
									<Keyboard className="w-4 h-4 text-slate-200" />
									<span className="text-xs font-semibold text-slate-200">
										{t("keystrokes.title")}
									</span>
								</div>

								<div className="space-y-3">
									<div className="space-y-1.5">
										<div className="text-[10px] font-medium text-slate-400">Size</div>
										<div className="flex items-center justify-between">
											<div className="flex items-center gap-3 w-full">
												<Slider
													value={[keystrokeSize * 100]}
													min={50}
													max={150}
													step={1}
													onValueChange={([val]) => onKeystrokeSizeChange?.(val / 100)}
													className="flex-1"
												/>
												<div className="w-12 text-right text-[11px] font-medium text-slate-300 tabular-nums">
													{Math.round(keystrokeSize * 100)}%
												</div>
											</div>
										</div>
									</div>

									<div className="space-y-1.5">
										<div className="text-[10px] font-medium text-slate-400">
											{t("keystrokes.position")}
										</div>
										<div className="grid grid-cols-3 gap-1">
											{(
												[
													{ value: "top-left" },
													{ value: "top-center" },
													{ value: "top-right" },
													{ value: "bottom-left" },
													{ value: "bottom-center" },
													{ value: "bottom-right" },
												] as Array<{ value: import("./types").KeystrokePosition }>
											).map((pos) => (
												<button
													key={pos.value}
													type="button"
													onClick={() => onKeystrokePositionChange?.(pos.value)}
													className={cn(
														"h-8 text-[10px] rounded-lg border transition-all duration-150 relative flex items-center justify-center font-medium",
														keystrokePosition === pos.value
															? "bg-[#000AF2] border-[#000AF2] shadow-sm"
															: "bg-black/20 border-white/10 hover:bg-white/10",
													)}
												>
													<div className="absolute inset-1 border border-white/20 rounded-[4px] pointer-events-none" />
													<div
														className={cn(
															"absolute w-2 h-2 rounded-full",
															keystrokePosition === pos.value ? "bg-white" : "bg-slate-400",
															pos.value.includes("top") ? "top-1.5" : "bottom-1.5",
															pos.value.includes("left")
																? "left-1.5"
																: pos.value.includes("right")
																	? "right-1.5"
																	: "left-1/2 -translate-x-1/2",
														)}
													/>
												</button>
											))}
										</div>
									</div>

									<div className="space-y-1.5">
										<div className="text-[10px] font-medium text-slate-400">
											{t("keystrokes.design")}
										</div>
										<div className="flex flex-wrap gap-1.5">
											{(
												[
													{ value: "macos", label: "macOS" },
													{ value: "modern", label: "Modern" },
													{ value: "classic", label: "Classic" },
													{ value: "minimal", label: "Minimal" },
													{ value: "glass", label: "Glass" },
													{ value: "neon", label: "Neon" },
													{ value: "retro", label: "Retro" },
												] as Array<{ value: import("./types").KeystrokeDesign; label: string }>
											).map((design) => (
												<button
													key={design.value}
													type="button"
													onClick={() => onKeystrokeDesignChange?.(design.value)}
													className={cn(
														"px-3 py-1.5 text-[10px] rounded-md transition-all duration-200 font-medium border",
														keystrokeDesign === design.value
															? "bg-[#000AF2] border-[#000AF2] text-white shadow-md shadow-[#000AF2]/20"
															: "bg-white/[0.02] border-white/10 text-slate-400 hover:text-white hover:bg-white/[0.06] hover:border-white/20",
													)}
												>
													{design.label}
												</button>
											))}
										</div>
									</div>
								</div>
							</div>

							{/* Blur Regions Section */}
							{BLUR_REGIONS_ENABLED && (
								<div className="editor-panel-section p-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] space-y-3">
									<div className="flex items-center gap-2 mb-1">
										<Layers className="w-4 h-4 text-slate-200" />
										<span className="text-xs font-semibold text-slate-200">
											Blur Region Settings
										</span>
									</div>

									{selectedBlur ? (
										<BlurSettingsPanel
											blurRegion={selectedBlur}
											onBlurDataChange={(blurData) => onBlurDataChange?.(selectedBlur.id, blurData)}
											onBlurDataCommit={onBlurDataCommit}
											onDelete={() => onBlurDelete?.(selectedBlur.id)}
										/>
									) : (
										<div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-4 flex flex-col items-center justify-center text-center text-slate-500 opacity-60">
											<span className="text-[11px] font-medium">No Blur Region Selected</span>
											<span className="text-[9px] text-slate-600 mt-1 max-w-[180px]">
												Select a blur region on the timeline to adjust position and blur type.
											</span>
										</div>
									)}
								</div>
							)}
						</div>
					)}

					{/* ── TRIM TAB ── */}
					{activePanelMode === "trim" && (
						<div className="space-y-4">
							<div className="editor-panel-section p-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] space-y-3">
								<div className="flex items-center gap-2 mb-1">
									<Scissors className="w-4 h-4 text-slate-200" />
									<span className="text-xs font-semibold text-slate-200">
										{t("timeline.title")}
									</span>
								</div>

								<div className="flex items-center justify-between p-2 rounded-lg editor-control-surface">
									<div className="text-[10px] font-medium text-slate-300">
										{t("timeline.waveform")}
									</div>
									<Switch
										checked={showTrimWaveform}
										onCheckedChange={onTrimWaveformChange}
										className="data-[state=checked]:bg-[#000AF2] scale-90 ml-2 shrink-0"
									/>
								</div>

								{selectedTrimId ? (
									<div className="space-y-2 pt-2">
										<div className="text-[10px] font-medium text-slate-400">
											Active Region Action:
										</div>
										<Button
											onClick={handleTrimDeleteClick}
											variant="destructive"
											size="sm"
											className="w-full gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all h-8 text-xs cursor-pointer"
										>
											<Trash2 className="w-3 h-3" />
											{t("trim.deleteRegion")}
										</Button>
									</div>
								) : (
									<div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-4 flex flex-col items-center justify-center text-center text-slate-500 opacity-60">
										<span className="text-[11px] font-medium">No Trim Region Selected</span>
										<span className="text-[9px] text-slate-600 mt-1 max-w-[180px]">
											Click or select a trim region on the timeline to delete it.
										</span>
									</div>
								)}
							</div>
						</div>
					)}

					{/* ── WEBCAM TAB ── */}
					{activePanelMode === "webcam" && (
						<div className="space-y-4">
							<div
								className={cn(
									"editor-panel-section p-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] space-y-3",
									!hasWebcam && "opacity-40 pointer-events-none select-none",
								)}
							>
								<div className="flex items-center gap-2 mb-1">
									<Video className="w-4 h-4 text-slate-200" />
									<span className="text-xs font-semibold text-slate-200">{t("layout.title")}</span>
								</div>

								{!hasWebcam && (
									<div className="text-[10px] text-amber-500 bg-amber-500/10 border border-amber-500/20 rounded-lg p-2.5 text-center font-medium">
										No webcam video track found in this project.
									</div>
								)}

								<div className="p-2 rounded-lg editor-control-surface">
									<div className="text-[10px] font-medium text-slate-300 mb-1.5">
										{t("layout.preset")}
									</div>
									<Select
										value={webcamLayoutPreset}
										onValueChange={(value: WebcamLayoutPreset) =>
											onWebcamLayoutPresetChange?.(value)
										}
										disabled={!hasWebcam}
									>
										<SelectTrigger className="h-8 bg-black/20 border-white/10 text-xs">
											<SelectValue placeholder={t("layout.selectPreset")} />
										</SelectTrigger>
										<SelectContent>
											{WEBCAM_LAYOUT_PRESETS.filter((preset) => {
												if (preset.value === "picture-in-picture") return true;
												if (preset.value === "no-webcam") return true;
												if (preset.value === "vertical-stack") return isPortraitCanvas;
												return !isPortraitCanvas;
											}).map((preset) => (
												<SelectItem key={preset.value} value={preset.value} className="text-xs">
													{preset.value === "picture-in-picture"
														? t("layout.pictureInPicture")
														: preset.value === "vertical-stack"
															? t("layout.verticalStack")
															: preset.value === "no-webcam"
																? t("layout.noWebcam")
																: t("layout.dualFrame")}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{webcamLayoutPreset !== "no-webcam" && (
									<div className="mt-2 flex items-center justify-between p-2 rounded-lg editor-control-surface">
										<div className="text-[10px] font-medium text-slate-300">
											{t("layout.mirrorWebcam")}
										</div>
										<Switch
											checked={webcamMirrored}
											onCheckedChange={onWebcamMirroredChange}
											className="data-[state=checked]:bg-[#000AF2] scale-90"
											aria-label={t("layout.mirrorWebcam")}
											disabled={!hasWebcam}
										/>
									</div>
								)}

								{webcamLayoutPreset === "picture-in-picture" && (
									<div className="mt-2 flex items-center justify-between p-2 rounded-lg editor-control-surface">
										<div className="flex items-center gap-1 text-[10px] font-medium text-slate-300">
											<span>{t("layout.reactiveWebcam")}</span>
											<Tooltip
												content={t("layout.reactiveWebcamDescription")}
												className="max-w-[220px] leading-snug whitespace-normal"
											>
												<button
													type="button"
													className="text-slate-400 transition-colors hover:text-slate-200"
													aria-label={t("layout.reactiveWebcamDescription")}
												>
													<Info size={11} />
												</button>
											</Tooltip>
										</div>
										<Switch
											checked={webcamReactiveZoom}
											onCheckedChange={onWebcamReactiveZoomChange}
											className="data-[state=checked]:bg-[#000AF2] scale-90"
											aria-label={t("layout.reactiveWebcam")}
											disabled={!hasWebcam}
										/>
									</div>
								)}

								{webcamLayoutPreset === "picture-in-picture" && (
									<div className="mt-2 p-2 rounded-lg editor-control-surface">
										<div className="text-[10px] font-medium text-slate-300 mb-1.5">
											{t("layout.webcamShape")}
										</div>
										<div className="grid grid-cols-4 gap-1.5">
											{(
												[
													{ value: "rectangle", label: "Rect" },
													{ value: "circle", label: "Circle" },
													{ value: "square", label: "Square" },
													{ value: "rounded", label: "Rounded" },
												] as Array<{ value: WebcamMaskShape; label: string }>
											).map((shape) => (
												<button
													key={shape.value}
													type="button"
													onClick={() => onWebcamMaskShapeChange?.(shape.value)}
													disabled={!hasWebcam}
													className={cn(
														"h-10 rounded-lg border flex flex-col items-center justify-center gap-0.5 transition-all",
														webcamMaskShape === shape.value
															? "bg-[#000AF2] border-[#000AF2] text-white"
															: "bg-white/5 border-white/10 hover:bg-white/10 hover:border-white/20 text-slate-400",
													)}
												>
													<svg
														width="16"
														height="16"
														viewBox="0 0 16 16"
														fill="none"
														xmlns="http://www.w3.org/2000/svg"
													>
														{shape.value === "rectangle" && (
															<rect
																x="1"
																y="3"
																width="14"
																height="10"
																rx="2"
																stroke="currentColor"
																strokeWidth="1.5"
															/>
														)}
														{shape.value === "circle" && (
															<circle
																cx="8"
																cy="8"
																r="6.5"
																stroke="currentColor"
																strokeWidth="1.5"
															/>
														)}
														{shape.value === "square" && (
															<rect
																x="2"
																y="2"
																width="12"
																height="12"
																rx="1"
																stroke="currentColor"
																strokeWidth="1.5"
															/>
														)}
														{shape.value === "rounded" && (
															<rect
																x="1"
																y="3"
																width="14"
																height="10"
																rx="5"
																stroke="currentColor"
																strokeWidth="1.5"
															/>
														)}
													</svg>
													<span className="text-[8px] leading-none">{shape.label}</span>
												</button>
											))}
										</div>
									</div>
								)}

								{webcamLayoutPreset === "picture-in-picture" && (
									<div className="p-2 rounded-lg editor-control-surface mt-2">
										<div className="flex items-center justify-between mb-1.5">
											<div className="text-[10px] font-medium text-slate-300">
												{t("layout.webcamSize")}
											</div>
											<div className="text-[10px] font-medium text-slate-400">
												{webcamSizePreset}%
											</div>
										</div>
										<Slider
											value={[webcamSizePreset]}
											onValueChange={(values) => onWebcamSizePresetChange?.(values[0])}
											onValueCommit={() => onWebcamSizePresetCommit?.()}
											min={10}
											max={50}
											step={1}
											className="w-full"
											disabled={!hasWebcam}
										/>
									</div>
								)}
							</div>
						</div>
					)}

					{/* ── WATERMARK TAB ── */}
					{activePanelMode === "watermark" && watermarkSettings && onWatermarkSettingsChange && (
						<div className="space-y-4">
							<div className="editor-panel-section p-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] space-y-4">
								<div className="flex items-center justify-between mb-2">
									<div className="flex items-center gap-2">
										<Stamp className="w-4 h-4 text-slate-200" />
										<span className="text-xs font-semibold text-slate-200">Watermark</span>
									</div>
									{watermarkSettings.imageUrl && (
										<Button
											variant="ghost"
											size="icon"
											className="h-6 w-6 text-slate-400 hover:text-white"
											onClick={() =>
												onWatermarkSettingsChange({ ...watermarkSettings, imageUrl: null })
											}
										>
											<Trash2 className="w-3.5 h-3.5" />
										</Button>
									)}
								</div>

								{!watermarkSettings.imageUrl ? (
									<label className="flex flex-col items-center justify-center h-24 rounded-lg border-2 border-dashed border-white/10 hover:border-white/20 hover:bg-white/[0.02] transition-colors cursor-pointer group">
										<input
											type="file"
											accept="image/png,image/jpeg,image/webp"
											className="hidden"
											onChange={handleWatermarkUpload}
										/>
										<Upload className="w-5 h-5 mb-2 text-slate-500 group-hover:text-slate-300" />
										<span className="text-xs font-medium text-slate-400 group-hover:text-slate-300">
											Upload Image
										</span>
									</label>
								) : (
									<div className="relative flex items-center justify-center h-24 rounded-lg border border-white/10 bg-black/20 overflow-hidden">
										<img
											src={watermarkSettings.imageUrl}
											alt="Watermark preview"
											className="max-h-full max-w-full object-contain"
										/>
									</div>
								)}
							</div>

							{watermarkSettings.imageUrl && (
								<>
									<div className="editor-panel-section p-3 rounded-2xl border border-white/[0.05] bg-white/[0.02] space-y-4">
										<div className="space-y-3">
											<div className="space-y-1.5">
												<div className="text-[10px] font-medium text-slate-400">Position</div>
												<div className="grid grid-cols-3 gap-1">
													{(
														[
															{ value: "top-left" },
															{ value: "top-center" },
															{ value: "top-right" },
															{ value: "center-left" },
															{ value: "center" },
															{ value: "center-right" },
															{ value: "bottom-left" },
															{ value: "bottom-center" },
															{ value: "bottom-right" },
														] as Array<{
															value: import("./types").WatermarkPosition | string;
															disabled?: boolean;
														}>
													).map((pos, i) => {
														if (pos.disabled) {
															return <div key={i} className="h-8" />;
														}
														return (
															<button
																key={pos.value}
																type="button"
																onClick={() =>
																	onWatermarkSettingsChange({
																		...watermarkSettings,
																		position: pos.value as import("./types").WatermarkPosition,
																	})
																}
																className={cn(
																	"h-8 text-[10px] rounded-lg border transition-all duration-150 relative flex items-center justify-center font-medium",
																	watermarkSettings.position === pos.value
																		? "bg-[#000AF2] border-[#000AF2] shadow-sm"
																		: "bg-black/20 border-white/10 hover:bg-white/10",
																)}
															>
																<div className="absolute inset-1 border border-white/20 rounded-[4px] pointer-events-none" />
																<div
																	className={cn(
																		"absolute w-2 h-2 rounded-full",
																		watermarkSettings.position === pos.value
																			? "bg-white"
																			: "bg-slate-400",
																		pos.value.includes("top")
																			? "top-1.5"
																			: pos.value.includes("bottom")
																				? "bottom-1.5"
																				: "top-1/2 -translate-y-1/2",
																		pos.value.includes("left")
																			? "left-1.5"
																			: pos.value.includes("right")
																				? "right-1.5"
																				: "left-1/2 -translate-x-1/2",
																	)}
																/>
															</button>
														);
													})}
												</div>
											</div>

											<div className="space-y-1.5">
												<div className="flex justify-between">
													<span className="text-[11px] font-medium text-slate-400">Size</span>
													<span className="text-[11px] font-medium text-slate-200 tabular-nums">
														{watermarkSettings.size}%
													</span>
												</div>
												<Slider
													value={[watermarkSettings.size]}
													min={5}
													max={100}
													step={1}
													onValueChange={([val]) =>
														onWatermarkSettingsChange({ ...watermarkSettings, size: val })
													}
													onValueCommit={onWatermarkSettingsCommit}
												/>
											</div>

											<div className="space-y-1.5">
												<div className="flex justify-between">
													<span className="text-[11px] font-medium text-slate-400">Opacity</span>
													<span className="text-[11px] font-medium text-slate-200 tabular-nums">
														{watermarkSettings.opacity}%
													</span>
												</div>
												<Slider
													value={[watermarkSettings.opacity]}
													min={0}
													max={100}
													step={1}
													onValueChange={([val]) =>
														onWatermarkSettingsChange({ ...watermarkSettings, opacity: val })
													}
													onValueCommit={onWatermarkSettingsCommit}
												/>
											</div>
										</div>
									</div>
								</>
							)}
						</div>
					)}

					{/* ── ANNOTATION TAB ── */}
					{activePanelMode === "annotation" && (
						<div className="space-y-4">
							<div className="editor-panel-section p-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] space-y-3">
								<div className="flex items-center gap-2 mb-1">
									<PenLine className="w-4 h-4 text-slate-200" />
									<span className="text-xs font-semibold text-slate-200">
										{t("annotation.title")}
									</span>
								</div>

								{selectedAnnotation &&
								onAnnotationContentChange &&
								onAnnotationTypeChange &&
								onAnnotationStyleChange &&
								onAnnotationDelete ? (
									<AnnotationSettingsPanel
										annotation={selectedAnnotation}
										onContentChange={(content) =>
											onAnnotationContentChange(selectedAnnotation.id, content)
										}
										onTypeChange={(type) => onAnnotationTypeChange(selectedAnnotation.id, type)}
										onStyleChange={(style) => onAnnotationStyleChange(selectedAnnotation.id, style)}
										onFigureDataChange={
											onAnnotationFigureDataChange
												? (figureData) =>
														onAnnotationFigureDataChange(selectedAnnotation.id, figureData)
												: undefined
										}
										onDuplicate={
											onAnnotationDuplicate
												? () => onAnnotationDuplicate(selectedAnnotation.id)
												: undefined
										}
										onDelete={() => onAnnotationDelete(selectedAnnotation.id)}
									/>
								) : (
									<div className="border border-white/[0.06] bg-white/[0.02] rounded-xl p-6 flex flex-col items-center justify-center text-center text-slate-500 opacity-60">
										<PenLine className="w-8 h-8 mb-2 text-slate-600" />
										<span className="text-[11px] font-medium">No Annotation Selected</span>
										<span className="text-[9px] text-slate-600 mt-1 max-w-[180px]">
											Select or add an annotation region on the timeline to configure text, arrow,
											or shape overlays.
										</span>
									</div>
								)}
							</div>
						</div>
					)}

					{/* ── TOOLS TAB ── */}
					{activePanelMode === "tools" && (
						<div className="space-y-4">
							{/* Zoom Settings */}
							<div
								className={cn(
									"editor-panel-section p-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] space-y-3",
									!zoomEnabled && "opacity-40 pointer-events-none select-none",
								)}
							>
								<div className="flex items-center gap-2 mb-1">
									<Wand2 className="w-4 h-4 text-slate-200" />
									<span className="text-xs font-semibold text-slate-200">Zoom Properties</span>
								</div>

								{!zoomEnabled ? (
									<div className="text-[10px] text-slate-500 italic px-1">
										No active zoom region selected on timeline.
									</div>
								) : (
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-[10px] font-medium text-slate-400">
												{t("zoom.level")}
											</span>
											<span className="rounded-full border border-[#000AF2]/25 bg-[#000AF2]/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#000AF2]">
												{(
													selectedZoomCustomScale ??
													(selectedZoomDepth != null
														? ZOOM_DEPTH_SCALES[selectedZoomDepth]
														: MIN_ZOOM_SCALE)
												).toFixed(2)}
												×
											</span>
										</div>

										<div className="grid grid-cols-7 gap-1">
											{ZOOM_DEPTH_OPTIONS.map((option) => {
												const effectiveScale =
													selectedZoomCustomScale ??
													(selectedZoomDepth != null ? ZOOM_DEPTH_SCALES[selectedZoomDepth] : null);
												const isActive = effectiveScale === ZOOM_DEPTH_SCALES[option.depth];
												return (
													<Button
														key={option.depth}
														type="button"
														disabled={!zoomEnabled}
														onClick={() => onZoomDepthChange?.(option.depth)}
														className={cn(
															"h-8 w-full rounded-lg border px-1 text-center transition-all duration-150 ease-out",
															zoomEnabled
																? "opacity-100 cursor-pointer"
																: "opacity-40 cursor-not-allowed",
															isActive
																? "border-[#000AF2]/70 bg-[#000AF2] text-white shadow-[0_8px_20px_rgba(52,178,123,0.18)]"
																: "border-white/[0.06] bg-white/[0.035] text-slate-400 hover:bg-white/[0.075] hover:border-white/15 hover:text-slate-200",
														)}
													>
														<span className="text-[11px] font-semibold">{option.label}</span>
													</Button>
												);
											})}
										</div>

										<div>
											<SliderPrimitive.Root
												min={MIN_ZOOM_SCALE}
												max={MAX_ZOOM_SCALE}
												step={0.01}
												value={[
													selectedZoomCustomScale ??
														(selectedZoomDepth != null
															? ZOOM_DEPTH_SCALES[selectedZoomDepth]
															: MIN_ZOOM_SCALE),
												]}
												onValueChange={(values) => onZoomCustomScaleChange?.(values[0])}
												onValueCommit={() => onZoomCustomScaleCommit?.()}
												disabled={!zoomEnabled}
												className="relative flex w-full touch-none select-none items-center py-1"
											>
												<SliderPrimitive.Track className="relative h-1.5 w-full grow overflow-hidden rounded-full border border-white/10 bg-white/5">
													<SliderPrimitive.Range
														className={cn(
															"absolute h-full transition-colors duration-150",
															selectedZoomCustomScale != null ? "bg-[#000AF2]" : "bg-white/20",
														)}
													/>
												</SliderPrimitive.Track>
												<SliderPrimitive.Thumb
													className={cn(
														"block h-3.5 w-3.5 rounded-full border-2 shadow transition-all duration-150",
														"focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#000AF2]/50",
														"disabled:pointer-events-none disabled:opacity-50 cursor-grab active:cursor-grabbing",
														selectedZoomCustomScale != null
															? "border-[#000AF2] bg-[#000AF2] shadow-[0_0_6px_rgba(52,178,123,0.4)]"
															: "border-white/20 bg-[#2a2a30] hover:border-white/40",
													)}
												/>
											</SliderPrimitive.Root>
											<div className="flex justify-between text-[10px] text-slate-600 mt-1">
												<span>{MIN_ZOOM_SCALE.toFixed(1)}×</span>
												<span>{MAX_ZOOM_SCALE.toFixed(1)}×</span>
											</div>
										</div>

										{hasCursorTelemetry && (
											<div className="space-y-1.5">
												<div className="flex items-center justify-between gap-3">
													<span className="text-[10px] font-medium text-slate-400">
														{t("zoom.focusMode.title")}
													</span>
													<div className="grid w-32 grid-cols-2 gap-0.5 rounded-lg border border-white/[0.06] bg-white/[0.035] p-0.5">
														{(["manual", "auto"] as const).map((mode) => {
															const isActive = selectedZoomFocusMode === mode;
															return (
																<Button
																	key={mode}
																	type="button"
																	disabled={focusModeLocked}
																	onClick={() => !focusModeLocked && onZoomFocusModeChange?.(mode)}
																	className={cn(
																		"h-6 w-full rounded-md border px-1 text-center transition-all duration-150 ease-out",
																		isActive
																			? "border-[#000AF2]/50 bg-[#000AF2] text-white"
																			: "border-transparent bg-transparent text-slate-400 hover:bg-white/[0.06] hover:text-slate-200",
																		focusModeLocked
																			? "cursor-not-allowed opacity-50"
																			: "cursor-pointer",
																	)}
																>
																	<span className="text-[10px] font-semibold capitalize">
																		{t(`zoom.focusMode.${mode}`)}
																	</span>
																</Button>
															);
														})}
													</div>
												</div>
												{focusModeLocked && (
													<div className="flex items-start gap-1 text-[10px] leading-snug text-slate-500">
														<Info size={11} className="mt-px shrink-0" />
														<span>{t("zoom.focusMode.lockedDisclaimer")}</span>
													</div>
												)}
											</div>
										)}

										{onZoomPreviewStart && onZoomPreviewEnd && (
											<Button
												type="button"
												onPointerDown={() => onZoomPreviewStart()}
												onPointerUp={() => onZoomPreviewEnd()}
												onPointerLeave={() => onZoomPreviewEnd()}
												onPointerCancel={() => onZoomPreviewEnd()}
												onKeyDown={(e) => {
													if ((e.key === " " || e.key === "Enter") && !e.repeat) {
														e.preventDefault();
														onZoomPreviewStart();
													}
												}}
												onKeyUp={(e) => {
													if (e.key === " " || e.key === "Enter") {
														e.preventDefault();
														onZoomPreviewEnd();
													}
												}}
												onBlur={() => onZoomPreviewEnd()}
												className="h-7 w-full select-none rounded-md border border-white/[0.08] bg-white/[0.04] text-[10px] font-semibold text-slate-300 transition-all duration-150 ease-out hover:bg-white/[0.08] hover:text-slate-100 active:border-[#000AF2]/50 active:bg-[#000AF2] active:text-white cursor-pointer"
											>
												{t("zoom.previewHold")}
											</Button>
										)}

										{selectedZoomFocusMode !== "auto" &&
											selectedZoomFocus &&
											onZoomFocusCoordinateChange &&
											(() => {
												const effectiveZoomScale =
													selectedZoomCustomScale ??
													(selectedZoomDepth != null
														? ZOOM_DEPTH_SCALES[selectedZoomDepth]
														: MIN_ZOOM_SCALE);
												const bounds = getFocusBoundsForScale(effectiveZoomScale);
												const xRange = bounds.maxX - bounds.minX;
												const yRange = bounds.maxY - bounds.minY;
												const focusToPercentX = (cx: number) =>
													xRange <= 0
														? 50
														: Math.max(0, Math.min(100, ((cx - bounds.minX) / xRange) * 100));
												const focusToPercentY = (cy: number) =>
													yRange <= 0
														? 50
														: Math.max(0, Math.min(100, ((cy - bounds.minY) / yRange) * 100));
												const percentToFocusX = (p: number) =>
													xRange <= 0 ? bounds.minX : bounds.minX + (p / 100) * xRange;
												const percentToFocusY = (p: number) =>
													yRange <= 0 ? bounds.minY : bounds.minY + (p / 100) * yRange;
												return (
													<div>
														<span className="text-[10px] font-medium text-slate-400 mb-1.5 block">
															{t("zoom.position.title")}
														</span>
														<div className="grid grid-cols-2 gap-2">
															<div className="flex flex-col gap-1">
																<label className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
																	{t("zoom.position.x")}
																</label>
																<ZoomFocusCoordInput
																	ariaLabel={t("zoom.position.x")}
																	percent={focusToPercentX(selectedZoomFocus.cx)}
																	onChange={(p) =>
																		onZoomFocusCoordinateChange({
																			cx: percentToFocusX(p),
																			cy: selectedZoomFocus.cy,
																		})
																	}
																	onCommit={onZoomFocusCoordinateCommit}
																/>
															</div>
															<div className="flex flex-col gap-1">
																<label className="text-[9px] font-medium text-slate-400 uppercase tracking-wider">
																	{t("zoom.position.y")}
																</label>
																<ZoomFocusCoordInput
																	ariaLabel={t("zoom.position.y")}
																	percent={focusToPercentY(selectedZoomFocus.cy)}
																	onChange={(p) =>
																		onZoomFocusCoordinateChange({
																			cx: selectedZoomFocus.cx,
																			cy: percentToFocusY(p),
																		})
																	}
																	onCommit={onZoomFocusCoordinateCommit}
																/>
															</div>
														</div>
													</div>
												);
											})()}

										<div>
											<span className="text-[10px] font-medium text-slate-400 mb-1.5 block">
												{t("zoom.threeD.title")}
											</span>
											<div className="grid grid-cols-3 gap-1.5">
												{ROTATION_3D_PRESET_ORDER.map((preset) => {
													const isActive = selectedZoomRotationPreset === preset;
													return (
														<Button
															key={preset}
															type="button"
															onClick={() => onZoomRotationPresetChange?.(isActive ? null : preset)}
															className={cn(
																"h-8 w-full rounded-lg border px-1 text-center transition-all duration-150 ease-out cursor-pointer",
																isActive
																	? "border-[#000AF2]/60 bg-[#000AF2] text-white"
																	: "border-white/[0.06] bg-white/[0.035] text-slate-400 hover:bg-white/[0.075] hover:border-white/15 hover:text-slate-200",
															)}
														>
															<span className="text-[10px] font-semibold capitalize">
																{t(`zoom.threeD.preset.${preset}`)}
															</span>
														</Button>
													);
												})}
											</div>
										</div>

										<Button
											onClick={handleDeleteClick}
											variant="destructive"
											size="sm"
											className="mt-1 w-full gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all h-8 text-xs cursor-pointer"
										>
											<Trash2 className="w-3 h-3" />
											{t("zoom.deleteZoom")}
										</Button>
									</div>
								)}
							</div>

							{/* Speed Settings */}
							<div
								className={cn(
									"editor-panel-section p-2 rounded-2xl border border-white/[0.05] bg-white/[0.02] space-y-3",
									!selectedSpeedId && "opacity-40 pointer-events-none select-none",
								)}
							>
								<div className="flex items-center gap-2 mb-1">
									<SlidersHorizontal className="w-4 h-4 text-[#d97706]" />
									<span className="text-xs font-semibold text-slate-200">Speed Properties</span>
								</div>

								{!selectedSpeedId ? (
									<div className="text-[10px] text-slate-500 italic px-1">
										No active speed region selected on timeline.
									</div>
								) : (
									<div className="space-y-3">
										<div className="flex items-center justify-between">
											<span className="text-[10px] font-semibold uppercase tracking-[0.1em] text-slate-500">
												{t("speed.playbackSpeed")}
											</span>
											{selectedSpeedValue && (
												<span className="rounded-full border border-[#d97706]/25 bg-[#d97706]/10 px-2 py-0.5 text-[10px] font-semibold tabular-nums text-[#d97706]">
													{SPEED_OPTIONS.find((o) => o.speed === selectedSpeedValue)?.label ??
														`${selectedSpeedValue}×`}
												</span>
											)}
										</div>

										<div className="grid grid-cols-5 gap-1">
											{SPEED_OPTIONS.map((option) => {
												const isActive = selectedSpeedValue === option.speed;
												return (
													<Button
														key={option.speed}
														type="button"
														disabled={!selectedSpeedId}
														onClick={() => onSpeedChange?.(option.speed)}
														className={cn(
															"h-8 w-full rounded-lg border px-1 text-center transition-all duration-150 ease-out",
															selectedSpeedId
																? "opacity-100 cursor-pointer"
																: "opacity-40 cursor-not-allowed",
															isActive
																? "border-[#d97706]/70 bg-[#d97706] text-white shadow-[0_8px_20px_rgba(217,119,6,0.16)]"
																: "border-white/[0.06] bg-white/[0.035] text-slate-400 hover:bg-white/[0.075] hover:border-white/15 hover:text-slate-200",
														)}
													>
														<span className="text-[11px] font-semibold">{option.label}</span>
													</Button>
												);
											})}
										</div>

										<div className="flex items-center justify-between rounded-lg border border-white/[0.06] bg-white/[0.03] px-2 py-1.5">
											<span
												className={cn(
													"text-[10px]",
													selectedSpeedId ? "text-slate-500" : "text-slate-600",
												)}
											>
												{t("speed.customPlaybackSpeed")}
											</span>
											<CustomSpeedInput
												value={selectedSpeedValue ?? 1}
												onChange={(val) => onSpeedChange?.(val)}
												onError={() => toast.error(t("speed.maxSpeedError"))}
											/>
										</div>

										<Button
											onClick={() => selectedSpeedId && onSpeedDelete?.(selectedSpeedId)}
											variant="destructive"
											size="sm"
											className="w-full gap-2 bg-red-500/10 text-red-400 border border-red-500/20 hover:bg-red-500/20 hover:border-red-500/30 transition-all h-8 text-xs cursor-pointer"
										>
											<Trash2 className="w-3 h-3" />
											{t("speed.deleteRegion")}
										</Button>
									</div>
								)}
							</div>
						</div>
					)}
				</div>
			</div>

			{showCropDropdown && cropRegion && onCropChange && (
				<>
					<div
						className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 animate-in fade-in duration-200"
						onClick={() => setShowCropDropdown(false)}
					/>
					<div className="fixed top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-[60] bg-[#09090b] rounded-2xl shadow-2xl border border-white/10 p-8 w-[95vw] max-w-6xl max-h-[90vh] overflow-hidden flex flex-col animate-in zoom-in-95 duration-200">
						<div className="flex items-center justify-between mb-6 flex-shrink-0">
							<div>
								<span className="text-xl font-bold text-slate-200">{t("crop.cropVideo")}</span>
								<p className="text-sm text-slate-400 mt-2">{t("crop.dragInstruction")}</p>
							</div>
							<Button
								variant="ghost"
								size="icon"
								onClick={() => setShowCropDropdown(false)}
								className="hover:bg-white/10 text-slate-400 hover:text-white"
							>
								<X className="w-5 h-5" />
							</Button>
						</div>

						<div className="flex flex-row gap-8 overflow-hidden min-h-0 h-full">
							{/* Left Column: Canvas */}
							<div className="flex-1 overflow-hidden flex items-center justify-center bg-black/20 rounded-xl border border-white/5">
								<CropControl
									videoElement={videoElement || null}
									cropRegion={cropRegion!}
									onCropChange={onCropChange!}
									aspectRatio={aspectRatio}
								/>
							</div>

							{/* Right Column: Settings */}
							<div className="w-[280px] flex-shrink-0 flex flex-col justify-between">
								<div className="space-y-6">
									<div className="grid grid-cols-2 gap-4">
										{[
											{ label: "X", field: "x" as const, max: videoWidth },
											{ label: "Y", field: "y" as const, max: videoHeight },
											{ label: "W", field: "width" as const, max: videoWidth },
											{ label: "H", field: "height" as const, max: videoHeight },
										].map(({ label, field, max }) => (
											<div key={field} className="flex flex-col gap-1">
												<label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
													{label}
												</label>
												<input
													type="number"
													min={0}
													max={max}
													value={getCropPixelValue(field)}
													onChange={(e) => handleCropNumericChange(field, Number(e.target.value))}
													className="w-full h-9 rounded-md border border-white/10 bg-white/5 px-3 text-xs text-slate-200 outline-none focus:border-[#000AF2]/50 focus:ring-1 focus:ring-[#000AF2]/30 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
												/>
											</div>
										))}
									</div>

									<div className="flex flex-col gap-1">
										<label className="text-[10px] font-medium text-slate-400 uppercase tracking-wider">
											{t("crop.ratio")}
										</label>
										<div className="flex items-center gap-2">
											<select
												value={cropAspectRatio}
												onChange={(e) => applyCropAspectPreset(e.target.value)}
												className="flex-1 h-9 rounded-md border border-white/10 bg-[#1a1a1f] px-3 text-xs text-slate-200 outline-none focus:border-[#000AF2]/50 cursor-pointer"
											>
												<option value="" className="bg-[#1a1a1f] text-slate-200">
													{t("crop.free")}
												</option>
												<option value="16:9" className="bg-[#1a1a1f] text-slate-200">
													16:9
												</option>
												<option value="9:16" className="bg-[#1a1a1f] text-slate-200">
													9:16
												</option>
												<option value="4:3" className="bg-[#1a1a1f] text-slate-200">
													4:3
												</option>
												<option value="3:4" className="bg-[#1a1a1f] text-slate-200">
													3:4
												</option>
												<option value="1:1" className="bg-[#1a1a1f] text-slate-200">
													1:1
												</option>
												<option value="21:9" className="bg-[#1a1a1f] text-slate-200">
													21:9
												</option>
											</select>
											<button
												type="button"
												onClick={() => setCropAspectLocked((prev) => !prev)}
												className={cn(
													"h-9 w-10 flex items-center justify-center rounded-md border transition-all flex-shrink-0",
													cropAspectLocked
														? "border-[#000AF2]/50 bg-[#000AF2]/10 text-[#000AF2]"
														: "border-white/10 bg-white/5 text-slate-400 hover:text-slate-200",
												)}
												title={
													cropAspectLocked ? t("crop.unlockAspectRatio") : t("crop.lockAspectRatio")
												}
											>
												{cropAspectLocked ? (
													<Lock className="w-4 h-4" />
												) : (
													<Unlock className="w-4 h-4" />
												)}
											</button>
										</div>
									</div>

									<div className="p-3 bg-white/[0.02] border border-white/[0.05] rounded-lg flex items-center justify-between">
										<span className="text-xs text-slate-400">Resolution</span>
										<span className="text-xs font-mono text-slate-200">
											{videoWidth} × {videoHeight} px
										</span>
									</div>
								</div>

								<div className="pt-6 mt-auto">
									<Button
										onClick={() => setShowCropDropdown(false)}
										size="lg"
										className="w-full bg-[#000AF2] hover:bg-[#000AF2]/90 text-white font-semibold"
									>
										{t("crop.done")}
									</Button>
								</div>
							</div>
						</div>
					</div>
				</>
			)}
		</div>
	);
}
