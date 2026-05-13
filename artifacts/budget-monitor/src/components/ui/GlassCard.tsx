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
        "glass overflow-hidden flex flex-col bg-white border border-gray-200 shadow-sm rounded-xl",
        className
      )} 
      {...props}
    >
      {header && (
        <div className={cn("px-6 py-4 border-b border-gray-200 bg-gray-50", headerClassName)}>
          {header}
        </div>
      )}
      <div className="flex-1 p-6">
        {children}
      </div>
      {footer && (
        <div className={cn("px-6 py-4 border-t border-gray-200 bg-gray-50", footerClassName)}>
          {footer}
        </div>
      )}
    </div>
  );
}
