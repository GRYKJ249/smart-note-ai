import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/layout/AppSidebar";
import { AuthGate } from "@/components/auth/AuthGate";

export const Route = createFileRoute("/_authenticated")({ ssr: false, component: AppLayout });
function AppLayout() { return <AuthGate><AppSidebar><Outlet /></AppSidebar></AuthGate>; }
