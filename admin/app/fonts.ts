import { Alexandria, Inter } from "next/font/google";

// Two fonts, matching the public frontend exactly (was Inter + Montserrat —
// a third family the admin app carried on its own, found live and
// consolidated on request: the whole platform now shares one display font
// and one body font, not a different pair per app).
export const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export const alexandria = Alexandria({
  subsets: ["latin"],
  weight: ["500", "600", "700", "800"],
  variable: "--font-alexandria",
  display: "swap",
});
