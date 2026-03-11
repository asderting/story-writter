import * as React from 'react';
import { cn } from '@/lib/utils';

export interface SliderProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'type'> {}

const Slider = React.forwardRef<HTMLInputElement, SliderProps>(
  ({ className, ...props }, ref) => {
    return (
      <input
        type="range"
        className={cn(
          'w-full h-2 rounded-full appearance-none cursor-pointer bg-zinc-700',
          '[&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:h-4 [&::-webkit-slider-thumb]:w-4 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-zinc-50 [&::-webkit-slider-thumb]:shadow-sm [&::-webkit-slider-thumb]:transition-colors',
          '[&::-webkit-slider-thumb]:hover:bg-zinc-300',
          '[&::-moz-range-thumb]:h-4 [&::-moz-range-thumb]:w-4 [&::-moz-range-thumb]:rounded-full [&::-moz-range-thumb]:border-0 [&::-moz-range-thumb]:bg-zinc-50 [&::-moz-range-thumb]:shadow-sm [&::-moz-range-thumb]:transition-colors',
          '[&::-moz-range-thumb]:hover:bg-zinc-300',
          '[&::-moz-range-track]:rounded-full [&::-moz-range-track]:bg-zinc-700',
          'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-zinc-400',
          'disabled:pointer-events-none disabled:opacity-50',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Slider.displayName = 'Slider';

export { Slider };
