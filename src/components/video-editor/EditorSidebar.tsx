import { ComponentType } from "react";
import { cn } from "@/lib/utils";

export interface SidebarMode {
	id: string;
	label: string;
	icon: ComponentType<{ className?: string }>;
	disabled?: boolean;
}

interface EditorSidebarProps {
	modes: SidebarMode[];
	activeMode: string;
	onModeChange: (mode: string) => void;
}

export function EditorSidebar({ modes, activeMode, onModeChange }: EditorSidebarProps) {
	return (
		<div className="w-[48px] h-full flex-shrink-0 flex flex-col items-center bg-[#111827] border-r border-white/5 py-4 z-50">
			{/* Logo */}
			<div className="w-8 h-8 rounded-lg bg-[#3b82f6] flex items-center justify-center mb-6 shadow-sm">
				<span className="text-white font-bold text-sm tracking-tighter">SF</span>
			</div>

			{/* Navigation Rail */}
			<div className="flex flex-col gap-2 flex-1 w-full items-center">
				{modes.map((mode) => {
					const Icon = mode.icon;
					const isActive = activeMode === mode.id;
					return (
						<button
							key={mode.id}
							type="button"
							title={mode.label}
							disabled={mode.disabled}
							onClick={() => onModeChange(mode.id)}
							className={cn(
								"flex h-[40px] w-[40px] items-center justify-center rounded-lg transition-all duration-200 group",
								mode.disabled
									? "cursor-not-allowed opacity-30"
									: isActive
										? "bg-[#1e40af] text-white opacity-100"
										: "text-white opacity-50 hover:opacity-100 hover:bg-white/[0.04]",
							)}
						>
							<Icon className="h-[20px] w-[20px]" />
						</button>
					);
				})}
			</div>

			{/* Bottom Profile / Settings */}
			<div className="flex flex-col gap-3 mt-auto w-full items-center">
				<button className="flex h-8 w-8 items-center justify-center rounded-full bg-[#3b82f6] text-white font-semibold text-xs transition-transform hover:scale-105 shadow-sm">
					OL
				</button>
			</div>
		</div>
	);
}
