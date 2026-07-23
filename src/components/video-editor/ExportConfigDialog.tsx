import { Check, Folder, ImagePlus, Loader2, Pencil, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { Dialog, DialogContent, DialogTitle } from "@/components/ui/dialog";
import {
	Select,
	SelectContent,
	SelectItem,
	SelectTrigger,
	SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useScopedT } from "@/contexts/I18nContext";
import type {
	ExportFormat,
	ExportProgress,
	ExportQuality,
	GifFrameRate,
	GifSizePreset,
} from "@/lib/exporter";
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
		thumbnailPath?: string;
		gifConfig?: {
			frameRate: GifFrameRate;
			loop: boolean;
			sizePreset: GifSizePreset;
			width: number;
			height: number;
		};
	}) => void;
	isExporting?: boolean;
	progress?: ExportProgress | null;
	error?: string | null;
	onCancelExport?: () => void;
	exportedFilePath?: string;
	onShowInFolder?: () => void;
	currentProjectPath?: string | null;
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
	isExporting = false,
	progress = null,
	error = null,
	onCancelExport,
	exportedFilePath,
	onShowInFolder,
	currentProjectPath,
}: ExportConfigDialogProps) {
	const t = useScopedT("dialogs");

	const [exportName, setExportName] = useState("export_file");
	const [exportFolder, setExportFolder] = useState("C:/Users/Operations Lateef/Downloads");
	const [format, setFormat] = useState<ExportFormat>("mp4");
	const [quality, setQuality] = useState<ExportQuality>("good");
	const [resolution, setResolution] = useState("1080p");
	const [frameRate, setFrameRate] = useState(30);
	const [gifFrameRate, setGifFrameRate] = useState<GifFrameRate>(15);
	const [gifLoop, setGifLoop] = useState(true);
	const [gifSizePreset, setGifSizePreset] = useState<GifSizePreset>("medium");
	const [showSuccess, setShowSuccess] = useState(false);
	const [thumbnailUrl, setThumbnailUrl] = useState<string | null>(null);
	const [exportThumbnailPath, setExportThumbnailPath] = useState<string | null>(null);
	const [isSavingThumbnail, setIsSavingThumbnail] = useState(false);
	const thumbnailInputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		if (isOpen && !isExporting && !progress) {
			const filename = videoPath
				? videoPath.split("/").pop()?.split(".")[0] || "export_file"
				: "export_file";
			setExportName(`export_${filename}_${Date.now().toString().slice(-4)}`);
			try {
				const prefs = localStorage.getItem("screenforge_user_preferences");
				if (prefs) {
					const parsed = JSON.parse(prefs);
					if (parsed.exportFolder) setExportFolder(parsed.exportFolder);
				}
			} catch (e) {
				console.error("Failed to read user export folder preference", e);
			}
			setShowSuccess(false);
		}
	}, [isOpen, videoPath, isExporting, progress]);

	useEffect(() => {
		if (isExporting) setShowSuccess(false);
	}, [isExporting]);

	useEffect(() => {
		if (!isExporting && progress && progress.percentage >= 100 && !error) {
			setShowSuccess(true);
		}
	}, [isExporting, progress, error]);

	const handleBrowseFolder = async () => {
		try {
			const result = await window.electronAPI.pickExportSavePath(
				`${exportName}.${format === "gif" ? "gif" : "mp4"}`,
				exportFolder,
			);
			if (result.success && result.path) {
				const parentDir = result.path.substring(0, result.path.lastIndexOf("\\"));
				setExportFolder(parentDir || result.path);
				const pickedFilename = result.path.split("\\").pop()?.split(".")[0];
				if (pickedFilename) setExportName(pickedFilename);
			}
		} catch (_err) {}
	};

	const handleEditCover = () => {
		thumbnailInputRef.current?.click();
	};

	const handleThumbnailFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
		const file = e.target.files?.[0];
		if (!file) return;

		// Show live preview immediately via object URL
		const objectUrl = URL.createObjectURL(file);
		setThumbnailUrl(objectUrl);
		setIsSavingThumbnail(true);

		try {
			// Get the native file path via webUtils
			const nativePath = window.electronAPI.getPathForFile(file);

			if (nativePath) {
				// Try to copy the asset into the project's assets folder
				try {
					let targetDir: string;
					if (currentProjectPath) {
						targetDir = `${currentProjectPath.replace(/\\/g, "/").split("/").slice(0, -1).join("/")}/assets`;
					} else {
						const appDataPath = await window.electronAPI.getAppDataPath();
						targetDir = `${appDataPath}/thumbnails`;
					}
					const result = await window.electronAPI.copyAssetToProject(
						targetDir,
						nativePath,
						"background",
					);
					if (result.success && result.path) {
						setExportThumbnailPath(result.path);
					}
				} catch {
					// Silently ignore — preview still works via objectUrl
				}
			}
		} catch (err) {
			console.error("Failed to save thumbnail:", err);
		} finally {
			setIsSavingThumbnail(false);
			// Reset the input so the same file can be re-picked
			if (thumbnailInputRef.current) thumbnailInputRef.current.value = "";
		}
	};

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
			let bitrateMbps = 4;
			if (quality === "medium") bitrateMbps = 2.2;
			if (quality === "source") bitrateMbps = 8.5;
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
			onExport({ format: "mp4", quality, thumbnailPath: exportThumbnailPath || undefined });
		}
	};

	const formatLabel = format === "gif" ? "GIF" : "Video";
	const isCompiling = isExporting && progress && progress.percentage >= 100 && format === "gif";
	const isFinalizing = progress?.phase === "finalizing";
	const renderProgress = progress?.renderProgress;

	const getStatusMessage = () => {
		if (error) return t("export.tryAgain");
		if (showSuccess) return t("export.savedSuccessfully", { format: formatLabel });
		if (isCompiling || isFinalizing) {
			if (format === "mp4") return t("export.finalizingVideo");
			if (renderProgress !== undefined && renderProgress > 0)
				return t("export.compilingGifProgress", { progress: String(renderProgress) });
			return t("export.compilingGifWait");
		}
		return t("export.takeMoment");
	};

	const getTitle = () => {
		if (error) return t("export.failed");
		if (showSuccess) return t("export.complete");
		if (isFinalizing && format === "mp4") return t("export.finalizingVideoTitle");
		if (isCompiling || isFinalizing) return t("export.compilingGif");
		return t("export.exportingFormat", { format: formatLabel });
	};

	return (
		<Dialog
			open={isOpen}
			onOpenChange={(open) => {
				if (!open && !isExporting) onClose();
			}}
		>
			<DialogContent
				hideCloseButton={true}
				className="max-w-[760px] w-[760px] bg-[#111418] border border-white/5 text-slate-200 p-0 overflow-hidden shadow-2xl rounded-xl animate-in zoom-in-95 duration-200 flex flex-col"
			>
				{/* Header Area */}
				<div className="relative flex items-center justify-between px-6 h-14 bg-[#111418] border-b border-white/[0.04] shrink-0">
					<DialogTitle className="text-sm font-semibold text-white tracking-wide">
						Export
					</DialogTitle>

					<button
						onClick={onClose}
						className="p-1.5 text-slate-500 hover:text-slate-300 transition-colors rounded-md hover:bg-white/5"
					>
						<X className="w-4 h-4" />
					</button>
				</div>

				<div className="flex flex-row flex-1 min-h-0">
					{/* Hidden file input for thumbnail picking */}
					<input
						ref={thumbnailInputRef}
						type="file"
						accept="image/*"
						className="hidden"
						onChange={handleThumbnailFileChange}
					/>
					{/* Left Column: Preview */}
					<div className="w-[240px] shrink-0 bg-[#0E1114] px-5 py-6 border-r border-white/[0.04] flex flex-col gap-3">
						{/* Thumbnail preview */}
						<div
							className="w-full aspect-video bg-[#181C20] rounded-lg flex items-center justify-center border border-white/5 shadow-inner relative overflow-hidden group cursor-pointer hover:border-[#000AF2]/40 transition-all duration-200"
							onClick={!isExporting && !showSuccess ? handleEditCover : undefined}
						>
							{thumbnailUrl ? (
								<>
									<img
										src={thumbnailUrl}
										alt="Thumbnail"
										className="absolute inset-0 w-full h-full object-cover"
									/>
									{/* Hover overlay to re-pick */}
									{!isExporting && !showSuccess && (
										<div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
											<div className="flex items-center gap-1.5 text-white text-[11px] font-medium">
												<Pencil className="w-3 h-3" />
												Change
											</div>
										</div>
									)}
									{isSavingThumbnail && (
										<div className="absolute bottom-1.5 right-1.5 w-4 h-4">
											<Loader2 className="w-4 h-4 text-white animate-spin" />
										</div>
									)}
								</>
							) : (
								<div className="flex flex-col items-center gap-2 text-slate-500 group-hover:text-[#000AF2] transition-colors">
									<ImagePlus className="w-6 h-6" />
									<span className="text-[10px] font-medium">Set Thumbnail</span>
								</div>
							)}
						</div>

						{!isExporting && !showSuccess && (
							<button
								onClick={handleEditCover}
								className="w-full h-8 bg-white/[0.03] hover:bg-[#000AF2]/10 hover:border-[#000AF2]/30 text-slate-400 hover:text-[#000AF2] text-[11px] font-medium rounded-md border border-white/5 transition-all duration-200 flex items-center justify-center gap-1.5"
							>
								<ImagePlus className="w-3 h-3" />
								{thumbnailUrl ? "Change Cover" : "Set Cover Image"}
							</button>
						)}

						{/* Duration / size info in the left column */}
						{!isExporting && !showSuccess && (
							<div className="mt-auto pt-3 border-t border-white/[0.04] flex flex-col gap-2">
								<div className="flex justify-between">
									<span className="text-[10px] text-slate-500 uppercase tracking-wider">
										Duration
									</span>
									<span className="text-[11px] text-slate-300 font-medium">
										{formatDuration(duration).slice(3)}
									</span>
								</div>
								<div className="flex justify-between">
									<span className="text-[10px] text-slate-500 uppercase tracking-wider">
										Est. Size
									</span>
									<span className="text-[11px] text-slate-300 font-medium">
										{getEstimatedSizeMB()}
									</span>
								</div>
							</div>
						)}
					</div>

					{/* Right Column: Content */}
					<div className="flex-1 flex flex-col bg-[#111418] min-w-0 overflow-hidden">
						{isExporting || showSuccess || error ? (
							<div className="flex-1 flex flex-col justify-center items-center p-12 text-center animate-in fade-in duration-300">
								{showSuccess ? (
									<div className="w-16 h-16 rounded-full bg-[#000AF2]/10 flex items-center justify-center border border-[#000AF2]/20 mb-6">
										<Check className="w-8 h-8 text-[#000AF2]" />
									</div>
								) : error ? (
									<div className="w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center border border-red-500/20 mb-6">
										<X className="w-8 h-8 text-red-500" />
									</div>
								) : (
									<div className="w-16 h-16 rounded-full bg-[#000AF2]/10 flex items-center justify-center border border-[#000AF2]/20 mb-6">
										<Loader2 className="w-8 h-8 text-[#000AF2] animate-spin" />
									</div>
								)}

								<h3 className="text-xl font-bold text-slate-100 mb-2">{getTitle()}</h3>
								<p className="text-sm text-slate-400 mb-8 max-w-sm mx-auto">
									{error || getStatusMessage()}
								</p>

								{isExporting && progress && !error && (
									<div className="w-full max-w-xs mx-auto space-y-2">
										<div className="flex justify-between text-[11px] font-medium text-slate-500 uppercase tracking-wider">
											<span>
												{isCompiling || isFinalizing
													? t("export.compiling")
													: t("export.renderingFrames")}
											</span>
											<span className="text-[#000AF2]">
												{isCompiling || isFinalizing
													? renderProgress !== undefined && renderProgress > 0
														? `${renderProgress}%`
														: "..."
													: `${progress.percentage.toFixed(0)}%`}
											</span>
										</div>
										<div className="h-1.5 bg-white/5 rounded-full overflow-hidden border border-white/5">
											{isCompiling || isFinalizing ? (
												renderProgress !== undefined && renderProgress > 0 ? (
													<div
														className="h-full bg-[#000AF2] transition-all duration-300 ease-out"
														style={{ width: `${renderProgress}%` }}
													/>
												) : (
													<div className="h-full w-full relative overflow-hidden">
														<div
															className="absolute h-full w-1/3 bg-[#000AF2]"
															style={{ animation: "indeterminate 1.5s ease-in-out infinite" }}
														/>
														<style>{`@keyframes indeterminate { 0% { transform: translateX(-100%); } 100% { transform: translateX(400%); } }`}</style>
													</div>
												)
											) : (
												<div
													className="h-full bg-[#000AF2] transition-all duration-300 ease-out"
													style={{ width: `${Math.min(progress.percentage, 100)}%` }}
												/>
											)}
										</div>
										<div className="text-[11px] text-slate-500 pt-1 font-medium">
											{progress.currentFrame} / {progress.totalFrames} frames
										</div>
									</div>
								)}

								<div className="mt-8 flex gap-3">
									{error || showSuccess ? (
										<>
											{exportedFilePath && (
												<button
													onClick={onShowInFolder}
													className="px-6 py-2.5 bg-white/5 hover:bg-white/10 text-slate-300 text-sm font-medium rounded-lg transition-colors border border-white/10 shadow-sm"
												>
													Open Folder
												</button>
											)}
											<button
												onClick={onClose}
												className="px-8 py-2.5 bg-[#000AF2] hover:bg-[#1a1fff] text-white text-sm font-medium rounded-lg transition-colors shadow-md shadow-[#000AF2]/20"
											>
												Done
											</button>
										</>
									) : (
										onCancelExport && (
											<button
												onClick={onCancelExport}
												className="px-6 py-2.5 bg-white/5 hover:bg-red-500/10 text-slate-300 hover:text-red-400 text-sm font-medium rounded-lg transition-colors border border-white/10 hover:border-red-500/20 shadow-sm"
											>
												Cancel Export
											</button>
										)
									)}
								</div>
							</div>
						) : (
							<>
								<div className="flex-1 min-h-0 p-6 space-y-5 overflow-y-auto custom-scrollbar">
									<h2 className="text-[11px] font-bold text-slate-400 tracking-widest uppercase">
										Output Settings
									</h2>

									<div className="grid grid-cols-[90px_1fr] items-center gap-y-5 gap-x-4">
										<label className="text-[13px] font-medium text-slate-400">Name</label>
										<input
											type="text"
											value={exportName}
											onChange={(e) => setExportName(e.target.value.replace(/[^a-zA-Z0-9_-]/g, ""))}
											className="w-full h-9 bg-white/[0.03] border border-white/10 rounded-lg px-4 text-[13px] text-white focus:outline-none focus:border-[#000AF2]/60 focus:ring-1 focus:ring-[#000AF2]/30 transition-all shadow-inner"
										/>

										<label className="text-[13px] font-medium text-slate-400">Save to</label>
										<div className="flex gap-2">
											<input
												type="text"
												readOnly
												value={exportFolder}
												className="flex-1 h-9 bg-white/[0.03] border border-white/10 rounded-lg px-4 text-[13px] text-slate-400 focus:outline-none pointer-events-none truncate shadow-inner"
											/>
											<button
												type="button"
												onClick={handleBrowseFolder}
												className="h-9 w-10 bg-white/[0.03] border border-white/10 hover:bg-white/[0.08] rounded-lg flex items-center justify-center transition-colors shadow-sm"
											>
												<Folder className="w-4 h-4 text-slate-400" />
											</button>
										</div>

										<label className="text-[13px] font-medium text-slate-400">Format</label>
										<Select value={format} onValueChange={(v) => setFormat(v as ExportFormat)}>
											<SelectTrigger className="h-9 bg-white/[0.03] border-white/10 text-[13px] text-white w-full sm:w-56 shadow-inner">
												<SelectValue />
											</SelectTrigger>
											<SelectContent className="bg-[#111418] border-white/10">
												<SelectItem value="mp4" className="text-[13px] text-slate-200">
													MP4
												</SelectItem>
												<SelectItem value="gif" className="text-[13px] text-slate-200">
													GIF
												</SelectItem>
											</SelectContent>
										</Select>

										{format === "mp4" ? (
											<>
												<label className="text-[13px] font-medium text-slate-400">Quality</label>
												<div className="flex items-center gap-6">
													{(
														[
															{ value: "medium", label: "Lower" },
															{ value: "good", label: "Recommend" },
															{ value: "source", label: "Higher" },
														] as const
													).map((q) => (
														<label
															key={q.value}
															className="flex items-center gap-2 cursor-pointer group"
															onClick={() => setQuality(q.value)}
														>
															<div
																className={cn(
																	"w-4 h-4 rounded-full border flex items-center justify-center transition-colors shadow-inner",
																	quality === q.value
																		? "border-[#000AF2]"
																		: "border-slate-600 group-hover:border-slate-400",
																)}
															>
																{quality === q.value && (
																	<div className="w-2 h-2 rounded-full bg-[#000AF2]" />
																)}
															</div>
															<span
																className={cn(
																	"text-[13px] font-medium",
																	quality === q.value
																		? "text-slate-200"
																		: "text-slate-400 group-hover:text-slate-300",
																)}
															>
																{q.label}
															</span>
														</label>
													))}
												</div>

												<label className="text-[13px] font-medium text-slate-400">Resolution</label>
												<Select value={resolution} onValueChange={setResolution}>
													<SelectTrigger className="h-9 bg-white/[0.03] border-white/10 text-[13px] text-white w-full sm:w-56 shadow-inner">
														<SelectValue />
													</SelectTrigger>
													<SelectContent className="bg-[#111418] border-white/10">
														<SelectItem value="720p" className="text-[13px] text-slate-200">
															1280x720
														</SelectItem>
														<SelectItem value="1080p" className="text-[13px] text-slate-200">
															1920x1080
														</SelectItem>
														<SelectItem value="source" className="text-[13px] text-slate-200">
															Match Project
														</SelectItem>
													</SelectContent>
												</Select>

												<label className="text-[13px] font-medium text-slate-400">Frame Rate</label>
												<Select
													value={String(frameRate)}
													onValueChange={(val) => setFrameRate(Number(val))}
												>
													<SelectTrigger className="h-9 bg-white/[0.03] border-white/10 text-[13px] text-white w-full sm:w-56 shadow-inner">
														<SelectValue />
													</SelectTrigger>
													<SelectContent className="bg-[#111418] border-white/10">
														<SelectItem value="24" className="text-[13px] text-slate-200">
															24 fps
														</SelectItem>
														<SelectItem value="25" className="text-[13px] text-slate-200">
															25 fps
														</SelectItem>
														<SelectItem value="30" className="text-[13px] text-slate-200">
															30 fps
														</SelectItem>
														<SelectItem value="60" className="text-[13px] text-slate-200">
															60 fps
														</SelectItem>
													</SelectContent>
												</Select>
											</>
										) : (
											<>
												<label className="text-[13px] font-medium text-slate-400">GIF Size</label>
												<Select
													value={gifSizePreset}
													onValueChange={(val) => setGifSizePreset(val as GifSizePreset)}
												>
													<SelectTrigger className="h-9 bg-white/[0.03] border-white/10 text-[13px] text-white w-full sm:w-56 shadow-inner">
														<SelectValue />
													</SelectTrigger>
													<SelectContent className="bg-[#111418] border-white/10">
														{Object.entries(GIF_SIZE_PRESETS).map(([key, preset]) => (
															<SelectItem
																key={key}
																value={key}
																className="text-[13px] text-slate-200"
															>
																{key.charAt(0).toUpperCase() + key.slice(1)} ({preset.maxHeight}p)
															</SelectItem>
														))}
													</SelectContent>
												</Select>

												<label className="text-[13px] font-medium text-slate-400">Frame Rate</label>
												<Select
													value={String(gifFrameRate)}
													onValueChange={(val) => setGifFrameRate(Number(val) as GifFrameRate)}
												>
													<SelectTrigger className="h-9 bg-white/[0.03] border-white/10 text-[13px] text-white w-full sm:w-56 shadow-inner">
														<SelectValue />
													</SelectTrigger>
													<SelectContent className="bg-[#111418] border-white/10">
														{GIF_FRAME_RATES.map((rate) => (
															<SelectItem
																key={rate.value}
																value={String(rate.value)}
																className="text-[13px] text-slate-200"
															>
																{rate.label}
															</SelectItem>
														))}
													</SelectContent>
												</Select>

												<label className="text-[13px] font-medium text-slate-400">Looping</label>
												<div className="flex items-center">
													<Switch
														checked={gifLoop}
														onCheckedChange={setGifLoop}
														className="data-[state=checked]:bg-[#000AF2] scale-90 origin-left"
													/>
												</div>
											</>
										)}
									</div>
								</div>

								{/* Bottom Action Bar */}
								<div className="px-6 py-3 border-t border-white/[0.04] flex items-center justify-end gap-3 bg-[#0E1114] shrink-0">
									<button
										onClick={onClose}
										className="px-5 py-2 text-[13px] font-medium text-slate-400 hover:text-slate-200 rounded-lg hover:bg-white/5 transition-colors"
									>
										Cancel
									</button>
									<button
										onClick={handleStartExport}
										className="px-8 py-2 bg-[#000AF2] text-white hover:bg-[#1a1fff] rounded-lg text-[13px] font-semibold transition-all shadow-md shadow-[#000AF2]/20 hover:shadow-[#000AF2]/40 active:scale-95"
									>
										Export
									</button>
								</div>
							</>
						)}
					</div>
				</div>
			</DialogContent>
		</Dialog>
	);
}
