import { Button, ButtonProps } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Download, Globe } from "lucide-react";
import { forwardRef } from "react";

export const LandingPrimaryButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size="lg"
        className={cn(
          "text-lg px-8 py-3 border-none min-w-[200px]",
          "bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500",
          "shadow-[0_0_20px_rgba(16,185,129,0.3)] hover:shadow-[0_0_30px_rgba(16,185,129,0.5)]",
          "transition-shadow duration-300",
          "text-primary-foreground",
          className
        )}
        {...props}
      >
        <Download className="mr-2 h-5 w-5" />
        {children}
      </Button>
    );
  }
);
LandingPrimaryButton.displayName = "LandingPrimaryButton";

export const LandingSecondaryButton = forwardRef<
  HTMLButtonElement,
  ButtonProps
>(({ className, children, ...props }, ref) => {
  return (
    <Button
      ref={ref}
      size="lg"
      className={cn(
        "text-lg px-8 py-3 border-none min-w-[200px]",
        "bg-gradient-to-r from-[hsl(220,64%,50%)] to-[hsl(220,64%,45%)] hover:from-[hsl(220,70%,55%)] hover:to-[hsl(220,70%,50%)]",
        "shadow-[0_0_20px_rgba(59,130,246,0.3)] hover:shadow-[0_0_30px_rgba(59,130,246,0.5)]",
        "transition-shadow duration-300",
        // Gold variant logic from CtaSection was different:
        // bg-golden-static ...
        // I should check if I should unify them or keep them distinct.
        // Hero uses Blue variant. Cta uses Gold variant for Web.
        // Let's create a specific one for Web if they differ.
        className
      )}
      {...props}
    >
      <Globe className="mr-2 h-5 w-5" />
      {children}
    </Button>
  );
});
LandingSecondaryButton.displayName = "LandingSecondaryButton";

export const LandingGoldButton = forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, children, ...props }, ref) => {
    return (
      <Button
        ref={ref}
        size="lg"
        className={cn(
          "text-white h-10 rounded-md text-lg px-8 py-3 border-none min-w-[200px]",
          "bg-golden-static hover:bg-golden-hover brightness-90 hover:brightness-95 saturate-110",
          "ring-1 ring-white/30 shadow-[0_0_16px_rgba(218,165,32,0.28)] hover:shadow-[0_0_22px_rgba(218,165,32,0.42)]",
          "transition-all duration-300",
          className
        )}
        {...props}
      >
        <Globe className="mr-2 h-5 w-5" />
        {children}
      </Button>
    );
  }
);
LandingGoldButton.displayName = "LandingGoldButton";
