import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "text-primary-foreground shadow-md hover:shadow-lg rounded-button relative overflow-hidden bg-gradient-to-b from-[hsl(0_38%_38%)] to-[hsl(0_38%_30%)] hover:from-[hsl(0_38%_42%)] hover:to-[hsl(0_38%_33%)] before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/8 before:to-transparent before:pointer-events-none opacity-90 hover:opacity-100",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-button opacity-90 hover:opacity-100",
        outline: "border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground rounded-button opacity-90 hover:opacity-100",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-button relative overflow-hidden before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/5 before:to-transparent before:pointer-events-none opacity-90 hover:opacity-100",
        ghost: "hover:bg-secondary hover:text-secondary-foreground rounded-button opacity-90 hover:opacity-100",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "text-primary-foreground shadow-glow hover:shadow-[0_0_30px_hsl(var(--primary)/0.5)] rounded-button relative overflow-hidden bg-gradient-to-b from-[hsl(0_38%_40%)] to-[hsl(0_38%_28%)] hover:from-[hsl(0_38%_45%)] hover:to-[hsl(0_38%_32%)] before:absolute before:inset-0 before:bg-gradient-to-b before:from-white/12 before:to-transparent before:pointer-events-none opacity-90 hover:opacity-100",
      },
      size: {
        default: "h-10 px-6 py-2",
        sm: "h-9 px-4",
        lg: "h-12 px-8 text-base",
        icon: "h-10 w-10 rounded-full",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";
    return <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />;
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };