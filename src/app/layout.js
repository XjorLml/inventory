import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import BottomNav from "@/components/BottomNav";

const geist = Geist({ subsets: ["latin"] });

export const metadata = {
  manifest: "/manifest.json",
  title: "Inventory App",
  description: "Manage your inventory",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Inventory",
  },
};

export const viewport = {
  themeColor: "#0d1b2a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-zinc-100`}>
        {/* Top header */}
        <header className="bg-white border-b px-4 py-4 sticky top-0 z-40">
          <h1 className="text-lg font-bold">📦 Inventory</h1>
        </header>

        {/* Page content */}
        <main className="px-4 py-5 pb-24 max-w-lg mx-auto">{children}</main>

        {/* Bottom navigation */}
        <Toaster position="bottom-center" />
        <BottomNav />
      </body>
    </html>
  );
}
