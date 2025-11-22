import type { Metadata } from "next";
import "./globals.css";
import { Inter, Poppins } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["500", "600", "700"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "DebtPro | Pay Your Home Loan Off Sooner",
  description:
    "DebtPro helps Australian homeowners use smart strategies and extra repayments to pay off their mortgage faster.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <body
        className={`${inter.variable} ${poppins.variable} bg-slate-900 text-slate-300 antialiased`}
      >
        {children}
      </body>
    </html>
  );
}
