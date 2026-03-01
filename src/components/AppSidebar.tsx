import {
  LayoutDashboard, Users, Settings, Heart, CalendarDays
} from "lucide-react";
import { NavLink } from "@/components/NavLink";
import {
  Sidebar, SidebarContent, SidebarGroup, SidebarGroupContent,
  SidebarMenu, SidebarMenuButton, SidebarMenuItem,
} from "@/components/ui/sidebar";

const items = [
  { title: "Visão Geral", url: "/", icon: LayoutDashboard },
  { title: "Clientes", url: "/clientes", icon: Users },
  { title: "Agenda", url: "/agenda", icon: CalendarDays },
];

export function AppSidebar() {
  return (
    <Sidebar collapsible="icon">
      <div className="flex items-center gap-2 px-4 py-5 border-b border-sidebar-border">
        <Heart className="h-6 w-6 text-sidebar-primary fill-sidebar-primary shrink-0" />
        <span className="font-display text-lg font-bold text-sidebar-primary-foreground group-data-[collapsible=icon]:hidden">
          Evydência
        </span>
      </div>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.url}>
                  <SidebarMenuButton asChild tooltip={item.title}>
                    <NavLink
                      to={item.url}
                      end={item.url === "/"}
                      className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground transition-colors"
                      activeClassName="bg-sidebar-accent text-sidebar-primary font-semibold"
                    >
                      <item.icon className="h-4 w-4 shrink-0" />
                      <span>{item.title}</span>
                    </NavLink>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="mt-auto p-4 border-t border-sidebar-border">
        <SidebarMenu>
          <SidebarMenuItem>
            <SidebarMenuButton asChild tooltip="Configurações">
              <NavLink
                to="/config"
                className="flex items-center gap-3 px-3 py-2 rounded-md text-sidebar-foreground hover:bg-sidebar-accent transition-colors"
                activeClassName="bg-sidebar-accent text-sidebar-primary"
              >
                <Settings className="h-4 w-4 shrink-0" />
                <span>Configurações</span>
              </NavLink>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </div>
    </Sidebar>
  );
}
