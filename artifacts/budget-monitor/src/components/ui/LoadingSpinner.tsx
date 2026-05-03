import { Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
  style?: React.CSSProperties;
}

export function LoadingSpinner({ className, size = 32, style }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center p-4", className)} style={style}>
      <Loader2 className="animate-spin text-blue-500" size={size} />
    </div>
  );
}
