import * as SliderPrimitive from "@radix-ui/react-slider";
import * as React from "react";

import { cn } from "@/lib/utils";

const Slider = React.forwardRef<
	React.ElementRef<typeof SliderPrimitive.Root>,
	React.ComponentPropsWithoutRef<typeof SliderPrimitive.Root>
>(({ className, ...props }, ref) => (
	<SliderPrimitive.Root
		ref={ref}
		className={cn("relative flex w-full touch-none select-none items-center", className)}
		{...props}
	>
		<SliderPrimitive.Track className="relative h-[3px] w-full grow overflow-hidden rounded-[2px] bg-white/10">
			<SliderPrimitive.Range className="absolute h-full bg-[#1e40af]" />
		</SliderPrimitive.Track>
		<SliderPrimitive.Thumb className="block h-[14px] w-[14px] rounded-full bg-white shadow-[0_2px_4px_rgba(0,0,0,0.3)] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/50 disabled:pointer-events-none disabled:opacity-50" />
	</SliderPrimitive.Root>
));
Slider.displayName = SliderPrimitive.Root.displayName;

export { Slider };
