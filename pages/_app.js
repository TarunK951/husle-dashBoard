import "@/styles/globals.css";
import { Inter } from "next/font/google";
import { SpeedInsights } from "@vercel/speed-insights/next";

const inter = Inter({ subsets: ["latin"] });

export default function App({ Component, pageProps }) {
  return (
    <main className={inter.className}>
      <Component {...pageProps} />
      {process.env.VERCEL === "1" ? <SpeedInsights /> : null}
    </main>
  );
}
