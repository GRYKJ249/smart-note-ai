import { Link, useRouterState } from "@tanstack/react-router";
import { useState } from "react";
import { Check, Code2, ImageIcon, LayoutDashboard, Menu, PanelLeftClose, PanelLeftOpen, Settings, X } from "lucide-react";
import { OperaLogoMark } from "@/components/brand/OperaLogoMark";
import { UserAvatar } from "@/components/profile/UserAvatar";
import { Button } from "@/components/ui/button";
import { useProfile } from "@/hooks/useProfile";
import { useLang } from "@/lib/i18n";
import { useTheme } from "@/components/theme/ThemeProvider";
import { SIMPLE_THEMES } from "@/lib/themes";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

const links = [
  { to: "/studio", icon: ImageIcon, en: "Creative Studio", ar: "استوديو الصور" },
  { to: "/code", icon: Code2, en: "Code workspace", ar: "بيئة الأكواد" },
  { to: "/dashboard", icon: LayoutDashboard, en: "Dashboard & profile", ar: "لوحة التحكم والملف" },
] as const;

export function AppSidebar({ children }: { children: React.ReactNode }) {
  const { t, lang } = useLang();
  const { username, displayName, avatarUrl } = useProfile();
  const { palette, setPaletteId } = useTheme();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const inChat = useRouterState({ select: (s) => s.location.pathname.startsWith("/chat") });
  const name = displayName || username || t("Your account", "حسابك");

  const sidebar = (
    <aside className={`flex h-full flex-col border-e border-border bg-card transition-[width] duration-200 ${collapsed ? "md:w-20" : "md:w-72"} w-72`}>
      <div className="flex h-16 items-center justify-between border-b border-border px-4">
        <Link to="/dashboard" className="flex min-w-0 items-center gap-3" onClick={() => setMobileOpen(false)}>
          <OperaLogoMark className="h-9 w-9" />
          {!collapsed && <span className="truncate font-display text-base font-bold">Opera <span className="text-primary">AI</span></span>}
        </Link>
        <Button variant="ghost" size="icon" className="md:hidden" onClick={() => setMobileOpen(false)} aria-label={t("Close menu", "إغلاق القائمة")}><X /></Button>
      </div>
      <nav className="flex-1 space-y-1 overflow-y-auto p-3">
        {links.map((item) => (
          <Link key={item.to} to={item.to} onClick={() => setMobileOpen(false)} activeProps={{ className: "bg-primary/12 text-primary" }} className="flex h-11 items-center gap-3 rounded-lg px-3 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground">
            <item.icon className="h-5 w-5 shrink-0" />
            {!collapsed && <span>{t(item.en, item.ar)}</span>}
          </Link>
        ))}
      </nav>
      <div className="border-t border-border p-3">
        <div className={`flex items-center gap-3 rounded-lg bg-muted/50 p-2 ${collapsed ? "justify-center" : ""}`}>
          <UserAvatar src={avatarUrl} name={name} className="h-10 w-10 shrink-0" />
          {!collapsed && <div className="min-w-0 flex-1"><p className="truncate text-sm font-semibold">{name}</p>{username && <p dir="ltr" className="truncate text-xs text-muted-foreground">{`@${username}`}</p>}</div>}
        </div>
        <div className="mt-2 hidden items-center gap-1 md:flex">
          <Button variant="ghost" className="min-w-0 flex-1" onClick={() => setCollapsed((value) => !value)} aria-label={t("Toggle sidebar", "تبديل الشريط الجانبي")}>
            {collapsed ? <PanelLeftOpen /> : <><PanelLeftClose /><span>{t("Collapse", "طي الشريط")}</span></>}
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" aria-label={t("Theme settings", "إعدادات المظهر")}><Settings /></Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44">
              {SIMPLE_THEMES.map((theme) => (
                <DropdownMenuItem key={theme.id} onSelect={() => setPaletteId(theme.paletteId)}>
                  <span className={`theme-dot theme-dot-${theme.id}`} />
                  <span className="flex-1">{t(theme.label, theme.labelAr)}</span>
                  {palette.id === theme.paletteId && <Check className="h-4 w-4" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>
    </aside>
  );

  return <div dir={lang === "ar" ? "rtl" : "ltr"} className="flex h-dvh overflow-hidden bg-background">
    {mobileOpen && <button type="button" className="fixed inset-0 z-40 bg-background/75 backdrop-blur-sm md:hidden" aria-label={t("Close menu", "إغلاق القائمة")} onClick={() => setMobileOpen(false)} />}
    <div className={`fixed inset-y-0 z-50 transition-transform md:static md:translate-x-0 ${lang === "ar" ? "right-0" : "left-0"} ${mobileOpen ? "translate-x-0" : lang === "ar" ? "translate-x-full" : "-translate-x-full"}`}>{sidebar}</div>
    <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
      <header className="flex h-16 shrink-0 items-center justify-between px-3 md:hidden">
        {inChat ? <Button variant="ghost" size="sm" className="rounded-full" onClick={() => window.dispatchEvent(new Event("open-conversations"))} aria-label={t("Conversations", "المحادثات")}><Menu />{t("Conversations", "المحادثات")}</Button> : <Button variant="ghost" size="icon" className="rounded-full" onClick={() => setMobileOpen(true)} aria-label={t("Open menu", "فتح القائمة")}><Menu /></Button>}
        <span className="rounded-full bg-secondary px-3 py-1 text-xs font-bold uppercase text-secondary-foreground">Free</span>
        <Button asChild variant="ghost" size="icon" className="rounded-full"><Link to="/dashboard" aria-label={t("Settings", "الإعدادات")}><Settings /></Link></Button>
      </header>
      <main className="min-h-0 flex-1 overflow-auto">{children}</main>
    </div>
  </div>;
}