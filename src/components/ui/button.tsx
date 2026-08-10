import Link from "next/link";
import type { ButtonHTMLAttributes, ReactNode } from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "ghost";
type Size = "sm" | "md" | "lg";

const variantClasses: Record<Variant, string> = {
  primary:
    "bg-[linear-gradient(135deg,#087a55,#07523e)] text-white shadow-[0_10px_25px_rgba(4,120,87,0.22)] hover:-translate-y-0.5 hover:brightness-110 hover:shadow-[0_15px_32px_rgba(4,120,87,0.28)] focus-visible:outline-emerald-700",
  secondary:
    "border border-slate-300/90 bg-white/90 text-slate-800 shadow-[0_3px_10px_rgba(15,23,42,0.05)] backdrop-blur hover:-translate-y-0.5 hover:border-slate-400 hover:bg-white hover:shadow-md",
  ghost: "text-slate-700 hover:bg-emerald-50 hover:text-emerald-900",
};

const sizeClasses: Record<Size, string> = {
  sm: "h-9 px-3 text-sm",
  md: "h-11 px-5 text-sm",
  lg: "h-12 px-6 text-base",
};

function buttonClasses(variant: Variant, size: Size, className?: string) {
  return cn(
    "inline-flex items-center justify-center gap-2 rounded-[0.9rem] font-bold tracking-[-0.01em] transition-[background-color,border-color,color,box-shadow,filter,transform] duration-200 focus-visible:outline-2 focus-visible:outline-offset-2 active:translate-y-px disabled:pointer-events-none disabled:opacity-50",
    variantClasses[variant],
    sizeClasses[size],
    className,
  );
}

type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
  size?: Size;
};

export function Button({ className, variant = "primary", size = "md", ...props }: ButtonProps) {
  return <button className={buttonClasses(variant, size, className)} {...props} />;
}

type ButtonLinkProps = {
  href: string;
  children: ReactNode;
  className?: string;
  variant?: Variant;
  size?: Size;
};

export function ButtonLink({
  href,
  children,
  className,
  variant = "primary",
  size = "md",
}: ButtonLinkProps) {
  return (
    <Link href={href} className={buttonClasses(variant, size, className)}>
      {children}
    </Link>
  );
}
