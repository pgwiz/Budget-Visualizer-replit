import React from 'react';
import { cn } from '@/lib/utils';

interface GlassCardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
  header?: React.ReactNode;
  footer?: React.ReactNode;
  headerClassName?: string;
  footerClassName?: string;
}

export function GlassCard({ 
  children, 
  header, 
  footer, 
  className, 
  headerClassName, 
  footerClassName, 
  ...props 
}: GlassCardProps) {
  return (
    <div 
      className={cn(
        "glass overflow-hidden flex flex-col",
        className
      )} 
      {...props}
    >
      {header && (
        <div className={cn("px-6 py-4 border-b border-white/10 bg-white/5", headerClassName)}>
          {header}
        </div>
      )}
      <div className="flex-1 p-6">
        {children}
      </div>
      {footer && (
        <div className={cn("px-6 py-4 border-t border-white/10 bg-white/5", footerClassName)}>
          {footer}
        </div>
      )}
    </div>
  );
}
