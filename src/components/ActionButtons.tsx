"use client";

import { motion, HTMLMotionProps } from "framer-motion";
import { Loader2 } from "lucide-react";
import { ReactNode } from "react";

type Variant = "primary" | "success" | "danger" | "ghost";

interface Props extends Omit<HTMLMotionProps<"button">, "children"> {
  loading?: boolean;
  variant?: Variant;
  children: ReactNode;
}

const styles: Record<Variant, string> = {
  primary: "bg-indigo-600 text-white hover:bg-indigo-700 shadow-md shadow-indigo-200",
  success: "border border-emerald-300 text-emerald-600 bg-white hover:bg-emerald-50",
  danger: "text-slate-400 hover:text-red-500 hover:bg-red-50",
  ghost: "text-slate-600 hover:bg-slate-100",
};

export default function ActionButton({
  loading = false,
  variant = "primary",
  children,
  className = "",
  disabled,
  ...props
}: Props) {
  return (
    <motion.button
      whileHover={{ scale: loading ? 1 : 1.03 }}
      whileTap={{ scale: loading ? 1 : 0.95 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
      disabled={disabled || loading}
      className={`inline-flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold transition-colors disabled:cursor-not-allowed disabled:opacity-70 ${styles[variant]} ${className}`}
      {...props}
    >
      {loading && <Loader2 className="h-4 w-4 animate-spin" />}
      {children}
    </motion.button>
  );
}