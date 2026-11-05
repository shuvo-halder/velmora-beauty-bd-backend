import React from 'react';
import { RefreshCw } from 'lucide-react';

export function LoadingSpinner({ message = "Loading..." }: { message?: string }) {
  return (
    <div className="p-12 flex flex-col items-center justify-center gap-3 text-muted-foreground w-full h-full min-h-[200px]">
      <RefreshCw className="w-8 h-8 animate-spin text-primary" />
      <p className="text-sm font-medium">{message}</p>
    </div>
  );
}
