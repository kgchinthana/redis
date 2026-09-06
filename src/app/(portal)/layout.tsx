import Nav from "@/components/Nav";

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-screen flex-col bg-zinc-950">
      <Nav />
      <main className="flex-1 p-6">{children}</main>
    </div>
  );
}
