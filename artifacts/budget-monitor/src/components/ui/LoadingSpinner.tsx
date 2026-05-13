import { FontAwesomeIcon } from '@fortawesome/react-fontawesome';
import { faSpinner } from '@fortawesome/free-solid-svg-icons';
import { CSSProperties } from "react";
import { cn } from "@/lib/utils";

interface LoadingSpinnerProps {
  className?: string;
  size?: number;
  style?: CSSProperties;
}

export function LoadingSpinner({ className, size = 32, style }: LoadingSpinnerProps) {
  return (
    <div className={cn("flex items-center justify-center p-4", className)} style={style}>
      <FontAwesomeIcon icon={faSpinner} className={`animate-spin text-blue-500 text-[${size}px]`} />
    </div>
  );
}
