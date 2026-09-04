import { Geist } from "next/font/google";
import { Toaster } from "sonner";
import "./globals.css";
import BottomNav from "@/components/BottomNav";
import UserButton from "@/components/UserButton";

const geist = Geist({ subsets: ["latin"] });

export const metadata = {
  manifest: "/manifest.json",
  title: "Inventory App",
  description: "Manage your inventory",
  icons: {
    icon: [
      { url: "/icons/icon.svg", type: "image/svg+xml" },
      { url: "/icons/favicon-32x32.png", sizes: "32x32", type: "image/png" },
      { url: "/icons/favicon-16x16.png", sizes: "16x16", type: "image/png" },
    ],
    apple: "/icons/apple-touch-icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Inventory",
  },
};

export const viewport = {
  themeColor: "#0f172a",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={`${geist.className} bg-zinc-100`}>
        {/* Top header */}
        <header className="bg-white border-b px-4 py-3 sticky top-0 z-40">
          <div className="max-w-lg mx-auto flex items-center justify-between">
            <h1 className="text-lg font-bold">📦 Inventory</h1>
            <UserButton />
          </div>
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
