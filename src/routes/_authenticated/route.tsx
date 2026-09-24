import { createFileRoute, Outlet } from "@tanstack/react-router";
import { AppSidebar } from "@/components/layout/AppSidebar";

// No sign-in: the workspace is open and all data lives in the visitor's browser.
export const Route = createFileRoute("/_authenticated")({
  ssr: false,
  component: AppLayout,
});

function AppLayout() {
  return (
    <AppSidebar>
      <Outlet />
    </AppSidebar>
  );
}
