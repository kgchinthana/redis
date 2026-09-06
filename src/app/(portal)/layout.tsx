import Sidebar from "@/components/Sidebar";
import { ToastProvider } from "@/components/Toast";
import { ConfirmProvider } from "@/components/Confirm";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <ToastProvider>
      <ConfirmProvider>
        <div className="flex min-h-screen bg-zinc-950">
          <Sidebar />
          <main className="min-w-0 flex-1 overflow-x-hidden p-6">{children}</main>
        </div>
      </ConfirmProvider>
    </ToastProvider>
  );
}
