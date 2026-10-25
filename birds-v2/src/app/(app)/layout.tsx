import { AppNav } from "@/components/app-nav";

// Static shell: no session read here, so the nav prerenders and every page
// streams its own data behind <Suspense> (Cache Components).
export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-dvh md:grid md:grid-cols-[15rem_1fr]">
      <AppNav />
      <main className="mx-auto w-full max-w-2xl px-4 pt-6 pb-32 md:px-8 md:pt-10 md:pb-12">{children}</main>
    </div>
  );
}
