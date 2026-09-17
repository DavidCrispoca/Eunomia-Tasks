import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import { getSessionUser } from "@/lib/auth/cookies";
import { loadCloudData } from "@/lib/data/actions";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Eunomia Tasks",
  description:
    "Gestión de tareas, productividad personal y planificación del tiempo.",
};

export const viewport: Viewport = {
  themeColor: [{ media: "(prefers-color-scheme: dark)", color: "#090A0C" }],
};

export default async function RootLayout(props: LayoutProps<"/">) {
  const user = await getSessionUser();
  const cloudData = user && !user.demo ? await loadCloudData() : null;

  return (
    <html
      lang="es"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="h-full flex flex-col">
        <AppProviders initialUser={user} initialData={cloudData}>
          {props.children}
        </AppProviders>
      </body>
    </html>
  );
}