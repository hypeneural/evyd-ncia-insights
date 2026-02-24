import { cn } from "@/lib/utils";
import { PackageName } from "@/mocks/types";

const styles: Record<PackageName, string> = {
  "Mamãe Coruja": "bg-pkg-coruja text-pkg-coruja-fg",
  "Super Mãe": "bg-pkg-super text-pkg-super-fg",
  "A melhor mãe do mundo": "bg-pkg-melhor text-pkg-melhor-fg",
};

export function PackageBadge({ name, className }: { name: PackageName; className?: string }) {
  return (
    <span className={cn("inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium", styles[name], className)}>
      {name}
    </span>
  );
}
