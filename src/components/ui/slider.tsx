import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
	React.ElementRef<typeof SliderPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
	<SliderPrimitive.Root
		ref={ref}
		className={cn(
			"relative flex w-full touch-none select-none items-center py-2 group cursor-grab active:cursor-grabbing",
			className,
		)}
		{...props}
	>
		<SliderPrimitive.Track className="relative h-[6px] w-full grow overflow-hidden rounded-full bg-white/5 ring-1 ring-inset ring-white/10 shadow-inner">
			<SliderPrimitive.Range className="absolute h-full bg-gradient-to-r from-[#000AF2] to-[#4338ca]" />
		</SliderPrimitive.Track>
		<SliderPrimitive.Thumb className="block h-[16px] w-[16px] rounded-full border-[2.5px] border-[#111827] bg-white shadow-[0_0_10px_rgba(0,10,242,0.4)] ring-2 ring-[#000AF2]/50 transition-transform duration-200 group-hover:scale-110 group-active:scale-95 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/80 disabled:pointer-events-none disabled:opacity-50" />
	</SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
