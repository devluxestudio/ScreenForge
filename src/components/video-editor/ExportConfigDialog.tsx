import { Check, Download, Folder } from "lucide-react";
import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useScopedT } from "@/contexts/I18nContext";
import type { ExportFormat, ExportQuality, GifFrameRate, GifSizePreset } from "@/lib/exporter";
import { calculateOutputDimensions, GIF_FRAME_RATES, GIF_SIZE_PRESETS } from "@/lib/exporter";
import { cn } from "@/lib/utils";

interface ExportConfigDialogProps {
	isOpen: boolean;
	onClose: () => void;
	videoPath: string | null;
	duration: number; // in seconds
	videoWidth: number;
	videoHeight: number;
	cropRegion: any;
	aspectRatio: string;
	onExport: (settings: {
		format: ExportFormat;
		quality?: ExportQuality;
		gifConfig?: {
			frameRate: GifFrameRate;
			loop: boolean;
			sizePreset: GifSizePreset;
			width: number;
			height: number;
		};
	}) => void;
}

export function ExportConfigDialog({
	isOpen,
	onClose,
	videoPath,
	duration,
	videoWidth,
	videoHeight,
	cropRegion,
	aspectRatio,
	onExport,
}: ExportConfigDialogProps) {
	const ts = useScopedT("dialogs");

	// State fields
	const [exportName, setExportName] = useState("export_file");
	const [exportFolder, setExportFolder] = useState("C:/Users/Operations Lateef/Downloads");
	const [format, setFormat] = useState<ExportFormat>("mp4");
	const [quality, setQuality] = useState<ExportQuality>("good");
	const [resolution, setResolution] = useState("1080p");
	const [frameRate, setFrameRate] = useState(30);

	// GIF configuration
	const [gifFrameRate, setGifFrameRate] = useState<GifFrameRate>(15);
	const [gifLoop, setGifLoop] = useState(true);
	const [gifSizePreset, setGifSizePreset] = useState<GifSizePreset>("medium");

	// Fetch defaults on open
	useEffect(() => {
		if (isOpen) {
			const filename = videoPath
				? videoPath.split("/").pop()?.split(".")[0] || "export_file"
				: "export_file";
			setExportName(`export_${filename}_${Date.now().toString().slice(-4)}`);

			// Try to get folder from local preferences
			try {
				const prefs = localStorage.getItem("screenforge_user_preferences");
				if (prefs) {
					const parsed = JSON.parse(prefs);
					if (parsed.exportFolder) {
						setExportFolder(parsed.exportFolder);
					}
				}
			} catch (e) {
				console.error("Failed to read user export folder preference", e);
			}
		}
	}, [isOpen, videoPath]);

	// Browse folder trigger
	const handleBrowseFolder = async () => {
		try {
			const result = await window.electronAPI.pickExportSavePath(
				`${exportName}.${format === "gif" ? "gif" : "mp4"}`,
				exportFolder,
			);
			if (result.success && result.path) {
				// Get parent directory path
				const parentDir = result.path.substring(0, result.path.lastIndexOf("\\"));
				setExportFolder(parentDir || result.path);

				// If they picked a name, set it too
				const pickedFilename = result.path.split("\\").pop()?.split(".")[0];
				if (pickedFilename) {
					setExportName(pickedFilename);
				}
			}
		} catch (err) {
			console.error("Error picking save path", err);
		}
	};

	// Calculate current GIF output dimensions
	const getGifDimensions = () => {
		const effectiveSourceWidth = cropRegion
			? Math.round(cropRegion.width * videoWidth)
			: videoWidth;
		const effectiveSourceHeight = cropRegion
			? Math.round(cropRegion.height * videoHeight)
			: videoHeight;

		let arValue = 16 / 9;
		if (aspectRatio === "native") {
			arValue = effectiveSourceWidth / (effectiveSourceHeight || 1);
		} else {
			const [w, h] = aspectRatio.split(":").map(Number);
			if (w && h) arValue = w / h;
		}

		return calculateOutputDimensions(
			effectiveSourceWidth || 1920,
			effectiveSourceHeight || 1080,
			gifSizePreset,
			GIF_SIZE_PRESETS,
			arValue,
		);
	};

	const gifDimensions = getGifDimensions();

	// Live file size estimate
	const getEstimatedSizeMB = () => {
		const durSec = Number.isFinite(duration) && duration > 0 ? duration : 5;
		if (format === "gif") {
			const fps = gifFrameRate as number;
			const fpsMultiplier = fps >= 30 ? 1.4 : fps >= 20 ? 1.1 : fps >= 15 ? 0.9 : 0.6;
			const sizeMultiplier =
				gifSizePreset === "original"
					? 1.5
					: gifSizePreset === "large"
						? 1.0
						: gifSizePreset === "medium"
							? 0.6
							: 0.3;
			const size = (durSec * 0.85 * fpsMultiplier * sizeMultiplier).toFixed(2);
			return `${size} MB`;
		} else {
			let bitrateMbps = 4; // Good quality 1080p
			if (quality === "medium") bitrateMbps = 2.2;
			if (quality === "source") bitrateMbps = 8.5;

			// Adjust bitrate based on resolution selection
			if (resolution === "720p") bitrateMbps *= 0.6;
			if (resolution === "2K" || resolution === "4K") bitrateMbps *= 2.0;

			const sizeMin = (durSec * (bitrateMbps * 0.85)) / 8;
			const sizeMax = (durSec * (bitrateMbps * 1.15)) / 8;
			return `${sizeMin.toFixed(1)} MB - ${sizeMax.toFixed(1)} MB`;
		}
	};

	const formatDuration = (seconds: number) => {
		if (!Number.isFinite(seconds) || seconds <= 0) return "00:00:00";
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		const pad = (num: number) => String(num).padStart(2, "0");
		return `${pad(hrs)}:${pad(mins)}:${pad(secs)}`;
	};

	const handleStartExport = () => {
		if (format === "gif") {
			onExport({
				format: "gif",
				gifConfig: {
					frameRate: gifFrameRate,
					loop: gifLoop,
					sizePreset: gifSizePreset,
					width: gifDimensions.width,
					height: gifDimensions.height,
				},
			});
		} else {
			onExport({
				format: "mp4",
				quality,
			});
		}
		onClose();
	};

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
			<DialogContent className="max-w-[680px] bg-[#0A0D0F] border border-white/10 text-slate-200 p-6 overflow-hidden shadow-2xl rounded-2xl animate-in zoom-in-95 duration-200">
				<DialogHeader className="pb-4 border-b border-white/[0.06]">
					<DialogTitle className="text-lg font-bold text-white flex items-center gap-2">
						<Download className="w-5 h-5 text-[#000AF2]" />
						Export Project
					</DialogTitle>
				</DialogHeader>

				{/* Two Column Grid for Landscape Layout */}
				<div className="py-4 grid grid-cols-1 md:grid-cols-2 gap-6">
					{/* Left Column: Basic Details & Format */}
					<div className="space-y-4">
						{/* Name Field */}
						<div className="space-y-1.5">
							<label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
								File Name
							</label>
							<input
								type="text"
								value={exportName}
								onChange={(e) => setExportName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
								className="w-full h-9 bg-white/[0.04] border border-white/10 rounded-lg px-3 text-sm text-white focus:outline-none focus:border-[#000AF2]/60 focus:ring-1 focus:ring-[#000AF2]/30 transition-all font-medium"
							/>
						</div>

						{/* Save Location Selector */}
						<div className="space-y-1.5">
							<label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
								Save To
							</label>
							<div className="flex gap-2">
								<input
									type="text"
									readOnly
									value={exportFolder}
									className="flex-1 h-9 bg-white/[0.04] border border-white/10 rounded-lg px-3 text-xs text-slate-400 focus:outline-none pointer-events-none truncate font-medium"
								/>
								<Button
									type="button"
									onClick={handleBrowseFolder}
									className="h-9 bg-white/[0.04] border border-white/10 text-slate-300 hover:bg-white/[0.08] hover:text-white rounded-lg px-3 flex items-center gap-1 text-xs font-semibold"
								>
									<Folder className="w-4 h-4 text-slate-400" />
									Browse
								</Button>
							</div>
						</div>

						{/* Format Selector Pills */}
						<div className="space-y-1.5">
							<label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
								Export Format
							</label>
							<div className="flex bg-white/[0.03] p-1 rounded-lg border border-white/5 gap-1">
								{(
									[
										{ id: "mp4", label: "MP4 Video" },
										{ id: "gif", label: "GIF Animation" },
									] as const
								).map((tab) => (
									<button
										key={tab.id}
										type="button"
										onClick={() => setFormat(tab.id)}
										className={cn(
											"flex-1 py-1.5 text-xs font-semibold rounded-md transition-all duration-150",
											format === tab.id
												? "bg-[#000AF2] text-white shadow-md shadow-[#000AF2]/10"
												: "text-slate-400 hover:text-slate-200",
										)}
									>
										{tab.label}
									</button>
								))}
							</div>
						</div>
					</div>

					{/* Right Column: Advanced Format specific options */}
					<div className="space-y-4 border-t md:border-t-0 md:border-l border-white/[0.06] pt-4 md:pt-0 md:pl-6">
						{format === "mp4" ? (
							<div className="space-y-4 animate-in fade-in duration-200">
								{/* MP4 Quality */}
								<div className="space-y-2">
									<label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
										Video Quality
									</label>
									<div className="flex bg-white/[0.03] p-1 rounded-lg border border-white/5 gap-1">
										{(
											[
												{ value: "medium", label: "Draft" },
												{ value: "good", label: "Recommended" },
												{ value: "source", label: "High" },
											] as const
										).map((q) => (
											<button
												key={q.value}
												type="button"
												onClick={() => setQuality(q.value)}
												className={cn(
													"flex-1 py-1.5 text-xs rounded-md transition-all duration-150 font-semibold flex items-center justify-center gap-1",
													quality === q.value
														? "bg-[#000AF2]/25 text-blue-400 border border-[#000AF2]/30"
														: "text-slate-400 hover:text-slate-200 border border-transparent",
												)}
											>
												{quality === q.value && <Check className="w-3.5 h-3.5" />}
												{q.label}
											</button>
										))}
									</div>
								</div>

								{/* MP4 Resolution */}
								<div className="space-y-1.5">
									<label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
										Resolution
									</label>
									<Select value={resolution} onValueChange={setResolution}>
										<SelectTrigger className="h-9 bg-white/[0.04] border-white/10 text-xs text-white">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="bg-[#0A0D0F] border-white/10">
											<SelectItem value="720p" className="text-xs text-slate-200">
												720p (HD)
											</SelectItem>
											<SelectItem value="1080p" className="text-xs text-slate-200">
												1080p (Full HD)
											</SelectItem>
											<SelectItem value="source" className="text-xs text-slate-200">
												Original
											</SelectItem>
										</SelectContent>
									</Select>
								</div>

								{/* MP4 Frame Rate */}
								<div className="space-y-1.5">
									<label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
										Frame Rate
									</label>
									<Select
										value={String(frameRate)}
										onValueChange={(val) => setFrameRate(Number(val))}
									>
										<SelectTrigger className="h-9 bg-white/[0.04] border-white/10 text-xs text-white">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="bg-[#0A0D0F] border-white/10">
											<SelectItem value="24" className="text-xs text-slate-200">
												24 fps (Cinema)
											</SelectItem>
											<SelectItem value="30" className="text-xs text-slate-200">
												30 fps (Standard)
											</SelectItem>
											<SelectItem value="60" className="text-xs text-slate-200">
												60 fps (Smooth)
											</SelectItem>
										</SelectContent>
									</Select>
								</div>
							</div>
						) : (
							<div className="space-y-4 animate-in fade-in duration-200">
								{/* GIF Size */}
								<div className="space-y-1.5">
									<label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
										GIF Size
									</label>
									<Select
										value={gifSizePreset}
										onValueChange={(val) => setGifSizePreset(val as GifSizePreset)}
									>
										<SelectTrigger className="h-9 bg-white/[0.04] border-white/10 text-xs text-white">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="bg-[#0A0D0F] border-white/10">
											{Object.entries(GIF_SIZE_PRESETS).map(([key, preset]) => (
												<SelectItem key={key} value={key} className="text-xs text-slate-200">
													{key === "original"
														? "Original"
														: key.charAt(0).toUpperCase() + key.slice(1)}{" "}
													({preset.maxHeight}p)
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* GIF Frame Rate */}
								<div className="space-y-1.5">
									<label className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
										Frame Rate
									</label>
									<Select
										value={String(gifFrameRate)}
										onValueChange={(val) => setGifFrameRate(Number(val) as GifFrameRate)}
									>
										<SelectTrigger className="h-9 bg-white/[0.04] border-white/10 text-xs text-white">
											<SelectValue />
										</SelectTrigger>
										<SelectContent className="bg-[#0A0D0F] border-white/10">
											{GIF_FRAME_RATES.map((rate) => (
												<SelectItem
													key={rate.value}
													value={String(rate.value)}
													className="text-xs text-slate-200"
												>
													{rate.label}
												</SelectItem>
											))}
										</SelectContent>
									</Select>
								</div>

								{/* GIF Loop switch */}
								<div className="flex items-center justify-between bg-white/[0.02] border border-white/5 rounded-xl px-4 py-2">
									<div className="space-y-0.5">
										<span className="text-xs font-semibold text-slate-300">Loop Animation</span>
										<p className="text-[10px] text-slate-500 font-medium">Infinite loop playback</p>
									</div>
									<Switch
										checked={gifLoop}
										onCheckedChange={setGifLoop}
										className="data-[state=checked]:bg-[#000AF2]"
									/>
								</div>
							</div>
						)}
					</div>
				</div>

				{/* Modal Footer */}
				<div className="pt-4 border-t border-white/[0.06] flex items-center justify-between">
					<div className="space-y-0.5">
						<span className="text-[10px] text-slate-500 font-semibold block uppercase tracking-wider">
							Estimate
						</span>
						<div className="text-xs text-slate-300 font-bold flex items-center gap-1.5">
							<span>{formatDuration(duration).slice(3)}</span>
							<span className="text-white/20">•</span>
							<span className="text-[#3b82f6]">{getEstimatedSizeMB()}</span>
						</div>
					</div>

					<div className="flex gap-2">
						<Button
							type="button"
							variant="outline"
							onClick={onClose}
							className="h-9 text-xs font-semibold border-white/10 bg-transparent text-slate-300 hover:bg-white/[0.05] hover:text-white px-4 rounded-lg"
						>
							{ts("dialogCancel")}
						</Button>
						<Button
							type="button"
							onClick={handleStartExport}
							className="h-9 bg-[#000AF2] text-white hover:bg-[#000AF2]/90 hover:scale-[1.02] active:scale-[0.98] transition-all duration-150 px-5 rounded-lg text-xs font-bold flex items-center gap-1.5 shadow-md shadow-[#000AF2]/25"
						>
							<Download className="w-4 h-4" />
							Export
						</Button>
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
