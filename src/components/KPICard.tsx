import { ArrowUp, ArrowDown, Minus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface KPICardProps {
  label: string;
  value: string | number;
  comparison?: number; // percentage change
  tooltip?: string;
  className?: string;
}

export function KPICard({ label, value, comparison, tooltip, className }: KPICardProps) {
  const content = (
    <Card className={cn("animate-fade-in", className)}>
      <CardContent className="p-4 md:p-5">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide mb-1">
          {label}
        </p>
        <p className="text-2xl font-bold text-foreground leading-tight">{value}</p>
        {comparison !== undefined && (
          <div
            className={cn(
              "flex items-center gap-1 mt-1 text-xs font-medium",
              comparison > 0 && "text-pkg-coruja",
              comparison < 0 && "text-destructive",
              comparison === 0 && "text-muted-foreground",
            )}
          >
            {comparison > 0 ? <ArrowUp className="h-3 w-3" /> : comparison < 0 ? <ArrowDown className="h-3 w-3" /> : <Minus className="h-3 w-3" />}
            <span>{comparison > 0 ? "+" : ""}{comparison}%</span>
            <span className="text-muted-foreground ml-1">vs 2025</span>
          </div>
        )}
      </CardContent>
    </Card>
  );

  if (!tooltip) return content;

  return (
    <Tooltip>
      <TooltipTrigger asChild>{content}</TooltipTrigger>
      <TooltipContent className="max-w-xs text-xs">{tooltip}</TooltipContent>
    </Tooltip>
  );
}
