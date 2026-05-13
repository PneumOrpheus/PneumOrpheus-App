"use client";

import * as React from "react";
import * as SliderPrimitive from "@radix-ui/react-slider";

import { cn } from "@/lib/utils";

function Slider({
  className,
  ...props
}: React.ComponentProps<typeof SliderPrimitive.Root>) {
  return (
    <SliderPrimitive.Root
      data-slot="slider"
      className={cn(
        "relative flex w-full touch-none items-center select-none",
        className
      )}
      {...props}
    >
      <SliderPrimitive.Track
        data-slot="slider-track"
        className="relative h-3 w-full grow overflow-hidden rounded-full bg-zinc-300 dark:bg-white/[0.95]"
      >
        <SliderPrimitive.Range
          data-slot="slider-range"
          className="absolute h-full bg-zinc-900 dark:bg-white"
        />
      </SliderPrimitive.Track>
      <SliderPrimitive.Thumb
        data-slot="slider-thumb"
        className="block cursor-pointer size-6 rounded-full border-0 bg-zinc-900 shadow transition-shadow hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-zinc-900 focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 dark:bg-[#4d97ff] dark:focus-visible:ring-[#4d97ff] dark:focus-visible:ring-offset-zinc-950"
      />
    </SliderPrimitive.Root>
  );
}

export { Slider };
