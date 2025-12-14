import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap text-sm font-medium ring-offset-background transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-b from-primary to-primary/80 text-primary-foreground hover:from-primary/90 hover:to-primary/70 shadow-md hover:shadow-lg rounded-button [box-shadow:inset_0_1px_0_hsl(0_0%_100%/0.15),inset_0_-2px_4px_hsl(0_0%_0%/0.2),0_4px_8px_hsl(0_0%_0%/0.15)]",
        destructive: "bg-destructive text-destructive-foreground hover:bg-destructive/90 rounded-button",
        outline: "border border-border bg-transparent hover:bg-secondary hover:text-secondary-foreground rounded-button",
        secondary: "bg-secondary text-secondary-foreground hover:bg-secondary/80 rounded-button",
        ghost: "hover:bg-secondary hover:text-secondary-foreground rounded-button",
        link: "text-primary underline-offset-4 hover:underline",
        premium: "bg-gradient-to-b from-primary to-primary/70 text-primary-foreground hover:from-primary-glow hover:to-primary rounded-button [box-shadow:inset_0_1px_0_hsl(0_0%_100%/0.2),inset_0_-2px_4px_hsl(0_0%_0%/0.25),0_0_20px_hsl(var(--primary)/0.3)]",
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