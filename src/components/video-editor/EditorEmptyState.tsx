import * as DialogPrimitive from "@radix-ui/react-dialog";
import { AlertCircle, FileVideo, FolderOpen, Minus, Trash2, Upload, X } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";
import { getProjectFolder, parentDirectoryOf, saveUserPreferences } from "@/lib/userPreferences";
import { nativeBridgeClient } from "@/native";

interface EditorEmptyStateProps {
	onVideoImported: (videoPath: string) => void;
	onProjectOpened: (project: unknown, path: string | null) => void;
}

type DropError = "unsupported-format" | "load-failed" | null;

export function EditorEmptyState({ onVideoImported, onProjectOpened }: EditorEmptyStateProps) {
	const te = useScopedT("editor");
	const tc = useScopedT("common");
	const [isDraggingOver, setIsDraggingOver] = useState(false);
	const [dropError, setDropError] = useState<DropError>(null);
	const lastDropErrorRef = useRef<Exclude<DropError, null>>("unsupported-format");
	if (dropError !== null) lastDropErrorRef.current = dropError;

	const [recentProjects, setRecentProjects] = useState<any[]>([]);

	useEffect(() => {
		const fetchRecent = async () => {
			const projects = await window.electronAPI.getRecentProjects();
			setRecentProjects(projects);
		};
		fetchRecent();
	}, []);

	const handleOpenRecent = useCallback(
		async (project: any) => {
			if (!project.entryFilePath) return;
			let result: Awaited<ReturnType<typeof window.electronAPI.loadProjectFileFromPath>>;
			try {
				result = await window.electronAPI.loadProjectFileFromPath(project.entryFilePath);
			} catch {
				setDropError("load-failed");
				return;
			}
			if (!result.success || !result.project) {
				setDropError("load-failed");
				return;
			}
			onProjectOpened(result.project, result.path ?? null);
		},
		[onProjectOpened],
	);

	const handleRemoveRecent = useCallback(async (e: React.MouseEvent, id: string) => {
		e.stopPropagation();
		await window.electronAPI.removeRecentProject(id);
		setRecentProjects((prev) => prev.filter((p) => p.id !== id));
	}, []);

	const handleImportVideo = useCallback(async () => {
		const result = await window.electronAPI.openVideoFilePicker();
		if (result.canceled || !result.success || !result.path) return;
		const setResult = await nativeBridgeClient.project.setCurrentVideoPath(result.path);
		if (!setResult.success) return;
		onVideoImported(result.path);
	}, [onVideoImported]);

	const handleLoadProject = useCallback(async () => {
		const result = await nativeBridgeClient.project.loadProjectFile(getProjectFolder());
		if (result.canceled || !result.success || !result.project) return;
		if (result.path) {
			const folder = parentDirectoryOf(result.path);
			if (folder) saveUserPreferences({ projectFolder: folder });
		}
		onProjectOpened(result.project, result.path ?? null);
	}, [onProjectOpened]);

	const handleDragOver = useCallback((e: React.DragEvent) => {
		e.preventDefault();
		if (e.dataTransfer.items.length > 0) setIsDraggingOver(true);
	}, []);

	const handleDragLeave = useCallback((e: React.DragEvent) => {
		if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDraggingOver(false);
	}, []);

	const handleDrop = useCallback(
		async (e: React.DragEvent) => {
			e.preventDefault();
			setIsDraggingOver(false);
			const files = Array.from(e.dataTransfer.files);
			if (files.length === 0) return;
			const projectFile = files.find((f) => f.name.endsWith(".screenforge"));
			if (!projectFile) {
				setDropError("unsupported-format");
				return;
			}
			let filePath: string;
			try {
				filePath = window.electronAPI.getPathForFile(projectFile);
			} catch {
				setDropError("load-failed");
				return;
			}
			if (!filePath) {
				setDropError("load-failed");
				return;
			}
			let result: Awaited<ReturnType<typeof window.electronAPI.loadProjectFileFromPath>>;
			try {
				result = await window.electronAPI.loadProjectFileFromPath(filePath);
			} catch {
				setDropError("load-failed");
				return;
			}
			if (!result.success || !result.project) {
				setDropError("load-failed");
				return;
			}
			onProjectOpened(result.project, result.path ?? null);
		},
		[onProjectOpened],
	);

	return (
		<Dialog
			open={true}
			onOpenChange={(_open) => {
				/* keep open until user takes action */
			}}
		>
			<DialogContent
				className="bg-[#0f1115] border-none rounded-xl p-0 gap-0 shadow-2xl w-full max-w-[700px] h-[540px] flex flex-col overflow-hidden"
				hideCloseButton
			>
				{/* Drop overlay */}
				{isDraggingOver && (
					<div className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-[#0f1115]/90 backdrop-blur-sm transition-all duration-300">
						<div className="bg-[#0014FF]/20 border border-[#0014FF]/40 p-5 rounded-full mb-5 shadow-[0_0_30px_rgba(0,20,255,0.3)]">
							<Upload className="h-8 w-8 text-white animate-bounce" />
						</div>
						<p className="text-lg font-bold text-white tracking-wide">
							{te("emptyState.dropOverlay")}
						</p>
					</div>
				)}

				{/* Custom Header Bar */}
				<div className="flex items-center justify-between px-6 py-4">
					<div className="flex items-center gap-2.5">
						<img
							src="screenforge.png"
							alt="ScreenForge"
							className="w-[18px] h-[18px] rounded-[4px] opacity-90"
						/>
						<span className="text-xs font-bold text-white tracking-wide">ScreenForge</span>
					</div>
					<div className="flex items-center gap-4">
						<button
							type="button"
							className="text-slate-400 hover:text-white transition-colors focus:outline-none"
						>
							<Minus size={16} strokeWidth={2.5} />
						</button>
						<DialogPrimitive.Close className="text-slate-400 hover:text-white transition-colors focus:outline-none">
							<X size={16} strokeWidth={2.5} />
						</DialogPrimitive.Close>
					</div>
				</div>

				<div
					className="flex flex-col flex-1 w-full px-10 pb-6 pt-5 min-h-0"
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}
				>
					<div className="flex flex-col text-left mb-6 shrink-0">
						<DialogTitle className="text-[22px] font-bold text-white tracking-tight mb-0.5">
							Welcome to the Studio
						</DialogTitle>
						<DialogDescription className="text-[13px] text-slate-300 font-medium">
							Choose where you want to start your project
						</DialogDescription>
					</div>

					<div className="flex gap-5 w-full shrink-0">
						<button
							onClick={handleImportVideo}
							className="flex-1 flex flex-row items-center justify-center rounded-2xl border border-dashed border-white/[0.15] bg-transparent hover:bg-white/[0.02] hover:border-white/[0.3] transition-all duration-200 group focus:outline-none h-[86px]"
						>
							<div className="mr-3 text-white group-hover:scale-110 transition-transform duration-300 shrink-0">
								<FileVideo size={28} strokeWidth={1.5} />
							</div>
							<div className="flex flex-col text-left">
								<span className="text-[12px] font-bold text-white mb-0.5">
									Import Video file...
								</span>
								<span className="text-[9px] text-slate-500 font-medium tracking-wide">
									Supported formats MP4, MOV, WEBM...
								</span>
							</div>
						</button>

						<button
							onClick={handleLoadProject}
							className="flex-1 flex flex-row items-center justify-center rounded-2xl border border-dashed border-white/[0.15] bg-transparent hover:bg-white/[0.02] hover:border-white/[0.3] transition-all duration-200 group focus:outline-none h-[86px]"
						>
							<div className="mr-3 text-white group-hover:scale-110 transition-transform duration-300 shrink-0">
								<FolderOpen size={28} strokeWidth={1.5} />
							</div>
							<div className="flex flex-col text-left">
								<span className="text-[12px] font-bold text-white mb-0.5">Load Project...</span>
								<span className="text-[9px] text-slate-500 font-medium tracking-wide">
									Click to open or drag & drop
								</span>
							</div>
						</button>
					</div>

					<div className="mt-8 flex flex-col flex-1 min-h-0">
						<div className="flex items-center mb-2 shrink-0">
							<span className="text-[12px] font-bold text-white tracking-wide">
								Recent Projects
							</span>
						</div>

						<div className="flex-1 bg-white/[0.02] rounded-xl overflow-hidden flex flex-col p-2">
							{recentProjects.length > 0 ? (
								<div className="flex flex-col gap-1 overflow-y-auto custom-scrollbar h-full pr-1">
									{recentProjects.map((project) => (
										<button
											key={project.id}
											onClick={() => handleOpenRecent(project)}
											className="flex items-center justify-between py-2.5 px-3 rounded-lg hover:bg-white/[0.04] transition-all group text-left shrink-0"
										>
											<div className="flex items-center gap-3 overflow-hidden">
												<img src="screenforge.png" alt="Project" className="w-4 h-4 opacity-90" />
												<span className="text-[13px] font-bold text-white truncate">
													{project.name}
												</span>
											</div>
											<div
												className="p-1.5 rounded-md transition-all text-slate-500 hover:bg-red-500/20 hover:text-red-400"
												onClick={(e) => handleRemoveRecent(e, project.id)}
												title="Remove from recents"
											>
												<Trash2 size={16} />
											</div>
										</button>
									))}
								</div>
							) : (
								<div className="flex-1 flex flex-col items-center justify-center">
									<span className="text-xs text-slate-500 font-medium">
										No recent projects found
									</span>
								</div>
							)}
						</div>
					</div>

					{/* Drop error internal dialog */}
					{dropError !== null && (
						<div className="absolute inset-0 z-50 bg-[#0f1115]/95 backdrop-blur-md flex flex-col p-10 items-center justify-center text-center">
							<div className="flex items-center justify-center w-14 h-14 rounded-full bg-red-500/10 border border-red-500/20 mb-5 shadow-[0_0_20px_rgba(239,68,68,0.15)]">
								<AlertCircle className="w-6 h-6 text-red-400" strokeWidth={2} />
							</div>
							<h3 className="text-base font-bold text-white mb-2 tracking-tight">
								{lastDropErrorRef.current === "unsupported-format"
									? te("emptyState.dropErrors.unsupportedFormatTitle")
									: te("emptyState.dropErrors.couldNotOpenTitle")}
							</h3>
							<p className="text-sm text-slate-400 mb-8 max-w-[280px]">
								{lastDropErrorRef.current === "unsupported-format"
									? te("emptyState.dropErrors.unsupportedFormatMessage")
									: te("emptyState.dropErrors.couldNotOpenMessage")}
							</p>
							<button
								type="button"
								onClick={() => setDropError(null)}
								className="w-full max-w-[200px] py-3 rounded-lg bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.08] text-white text-sm font-bold transition-colors"
							>
								{tc("actions.close")}
							</button>
						</div>
					)}
				</div>
			</DialogContent>
		</Dialog>
	);
}
