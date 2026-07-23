import { Save, Trash2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { useScopedT } from "@/contexts/I18nContext";

interface UnsavedChangesDialogProps {
	isOpen: boolean;
	variant?: "close" | "newProject" | "loadProject";
	onSaveAndClose: () => void;
	onDiscardAndClose: () => void;
	onCancel: () => void;
}

export function UnsavedChangesDialog({
	isOpen,
	variant = "close",
	onSaveAndClose,
	onDiscardAndClose,
	onCancel,
}: UnsavedChangesDialogProps) {
	const td = useScopedT("dialogs");

	const saveLabel =
		variant === "newProject"
			? td("unsavedChanges.saveAndNewProject")
			: variant === "loadProject"
				? td("unsavedChanges.saveAndLoadProject")
				: td("unsavedChanges.saveAndClose");
	const discardLabel =
		variant === "newProject"
			? td("unsavedChanges.discardAndNewProject")
			: variant === "loadProject"
				? td("unsavedChanges.discardAndLoadProject")
				: td("unsavedChanges.discardAndClose");

	return (
		<Dialog open={isOpen} onOpenChange={(open) => !open && onCancel()}>
			<DialogContent className="bg-[#0A0D0F] border border-white/10 rounded-2xl max-w-[340px] p-0 overflow-hidden shadow-2xl animate-in zoom-in-95 duration-200">
				{/* Header with gradient */}
				<div className="px-6 pt-6 pb-5 bg-gradient-to-b from-white/[0.03] to-transparent border-b border-white/[0.04]">
					<div className="flex items-start gap-4">
						<div className="w-10 h-10 rounded-xl bg-[#000AF2]/10 flex items-center justify-center border border-[#000AF2]/20 shrink-0">
							<Save className="w-5 h-5 text-[#6b8fff]" />
						</div>
						<div className="mt-0.5">
							<DialogTitle className="text-base font-bold text-white leading-tight">
								Save Changes?
							</DialogTitle>
							<DialogDescription className="text-xs text-slate-400 mt-1.5 leading-relaxed">
								You have unsaved changes. Do you want to save them before continuing?
							</DialogDescription>
						</div>
					</div>
				</div>

				<div className="px-6 py-5 flex flex-col gap-2.5 bg-[#060809]">
					<button
						type="button"
						onClick={onSaveAndClose}
						className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-[#000AF2] text-white hover:bg-[#1a1fff] font-bold text-xs transition-all shadow-md shadow-[#000AF2]/20 hover:scale-[1.02] active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-[#000AF2] focus-visible:ring-offset-2 focus-visible:ring-offset-[#060809]"
					>
						<Save className="w-4 h-4" />
						{saveLabel}
					</button>
					<button
						type="button"
						onClick={onDiscardAndClose}
						className="flex items-center justify-center gap-2 w-full h-10 rounded-xl bg-white/[0.03] border border-white/5 text-slate-300 hover:bg-red-500/10 hover:text-red-400 hover:border-red-500/20 font-semibold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-red-500/50 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060809]"
					>
						<Trash2 className="w-4 h-4" />
						{discardLabel}
					</button>
					<button
						type="button"
						onClick={onCancel}
						className="flex items-center justify-center gap-2 w-full h-10 rounded-xl text-slate-500 hover:text-white font-semibold text-xs transition-all hover:scale-[1.02] active:scale-[0.98] outline-none focus-visible:ring-2 focus-visible:ring-white/20 focus-visible:ring-offset-2 focus-visible:ring-offset-[#060809]"
					>
						Cancel
					</button>
				</div>
			</DialogContent>
		</Dialog>
	);
}
