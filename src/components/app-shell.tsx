"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Home,
  Network,
  MessageSquare,
  Settings,
  ChevronLeft,
  Menu,
  X,
  LogOut,
} from "lucide-react";

const navItems = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard },
  { label: "Listings", href: "/listings", icon: Home },
  { label: "Network", href: "/network", icon: Network },
  { label: "Messages", href: "/messages", icon: MessageSquare },
  { label: "Settings", href: "/settings", icon: Settings },
];

interface AppShellProps {
  children: React.ReactNode;
  user?: { name: string; email: string; avatar?: string };
}

export function AppShell({ children, user }: AppShellProps) {
  const [collapsed, setCollapsed] = useState(false);
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      {/* Mobile overlay */}
      {mobileOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
          onClick={() => setMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-sidebar-border bg-sidebar transition-all duration-200",
          collapsed ? "w-16" : "w-60",
          mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        {/* Logo area */}
        <div className="flex h-14 items-center justify-between border-b border-sidebar-border px-4">
          {!collapsed && (
            <Link href="/dashboard" className="flex items-center gap-2">
              <div className="flex h-7 w-7 items-center justify-center rounded bg-primary">
                <span className="font-mono text-xs font-bold text-primary-foreground">1</span>
              </div>
              <span className="text-sm font-semibold text-sidebar-foreground">
                One Degree
              </span>
            </Link>
          )}
          {collapsed && (
            <Link href="/dashboard" className="mx-auto flex h-7 w-7 items-center justify-center rounded bg-primary">
              <span className="font-mono text-xs font-bold text-primary-foreground">1</span>
            </Link>
          )}
          <button
            onClick={() => setCollapsed(!collapsed)}
            className="hidden rounded p-1 text-muted-foreground transition-colors hover:bg-sidebar-accent hover:text-sidebar-foreground lg:block"
          >
            <ChevronLeft
              className={cn(
                "h-4 w-4 transition-transform",
                collapsed && "rotate-180"
              )}
            />
          </button>
          <button
            onClick={() => setMobileOpen(false)}
            className="rounded p-1 text-muted-foreground lg:hidden"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Nav items */}
        <nav className="flex-1 space-y-1 px-2 py-3">
          {navItems.map((item) => {
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-primary"
                    : "text-muted-foreground hover:bg-sidebar-accent hover:text-sidebar-foreground"
                )}
              >
                <item.icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        {/* User footer */}
        {user && (
          <div className="border-t border-sidebar-border p-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-semibold text-muted-foreground">
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="h-full w-full rounded-full object-cover"
                  />
                ) : (
                  user.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")
                    .toUpperCase()
                )}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <p className="truncate text-xs font-medium text-sidebar-foreground">
                    {user.name}
                  </p>
                  <p className="truncate text-[10px] text-muted-foreground">
                    {user.email}
                  </p>
                </div>
              )}
            </div>
          </div>
        )}
      </aside>

      {/* Main content */}
      <div
        className={cn(
          "flex flex-1 flex-col transition-all duration-200",
          collapsed ? "lg:pl-16" : "lg:pl-60"
        )}
      >
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b border-border bg-background/80 px-4 backdrop-blur-md lg:px-6">
          <button
            onClick={() => setMobileOpen(true)}
            className="rounded p-1 text-muted-foreground hover:text-foreground lg:hidden"
          >
            <Menu className="h-5 w-5" />
          </button>
        </header>

        {/* Page content */}
        <main className="flex-1 overflow-auto">
          <div className="mx-auto w-full max-w-7xl px-4 py-6 lg:px-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
