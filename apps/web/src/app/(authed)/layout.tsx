import { AuthGate } from "@/components/auth-gate";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";

export default function AuthedLayout({ children }: { children: React.ReactNode }) {
  return (
    <AuthGate>
      <div className="flex min-h-screen">
        <Sidebar />
        <div className="flex flex-1 flex-col">
          <Topbar />
          <main className="flex-1 overflow-auto">
            <div className="mx-auto max-w-5xl px-6 py-10">{children}</div>
          </main>
        </div>
      </div>
    </AuthGate>
  );
}
