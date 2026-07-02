import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";

// Dynamic SEO — pulled from Website Settings in the database
export async function generateMetadata(): Promise<Metadata> {
  const defaults = {
    title: "The Scent Atelier | Luxury Perfumes | Nairobi, Kenya",
    description:
      "Every Fragrance Tells Your Story. Shop luxury fragrances in Nairobi, Kenya.",
  };
  try {
    const { db } = await import("@/db");
    const { settings } = await import("@/db/schema");
    const rows = await db.select().from(settings);
    const map: Record<string, string> = {};
    for (const row of rows) map[row.key] = row.value;

    const title = map.seoTitle || defaults.title;
    const description = map.seoDescription || defaults.description;
    return {
      title,
      description,
      keywords: map.seoKeywords || undefined,
      openGraph: {
        title,
        description,
        siteName: map.businessName || "The Scent Atelier",
        type: "website",
      },
      twitter: { card: "summary_large_image", title, description },
    };
  } catch {
    return defaults;
  }
}

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#121212] text-white antialiased">{children}</body>
    </html>
  );
}
