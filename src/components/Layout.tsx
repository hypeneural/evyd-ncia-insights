import { SidebarProvider, SidebarTrigger } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/AppSidebar";
import { Heart } from "lucide-react";

export function Layout({ children }: { children: React.ReactNode }) {
  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full">
        <AppSidebar />
        <main className="flex-1 overflow-auto">
          <header className="h-14 flex items-center border-b bg-card px-4 gap-3 sticky top-0 z-30">
            <SidebarTrigger />
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-primary fill-primary" />
              <span className="font-display text-lg font-bold tracking-tight text-foreground">
                Evydência
              </span>
              <span className="hidden sm:inline text-xs text-muted-foreground font-medium">
                CRM Dia das Mães
              </span>
            </div>
          </header>
          <div className="p-4 md:p-6 lg:p-8">{children}</div>
        </main>
      </div>
    </SidebarProvider>
  );
}
