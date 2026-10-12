import type { Metadata } from "next";
import { Fraunces, Inter, Special_Elite } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const fraunces = Fraunces({ subsets: ["latin"], variable: "--font-display", axes: ["SOFT", "WONK"] });
const specialElite = Special_Elite({ weight: "400", subsets: ["latin"], variable: "--font-typewriter" });
const inter = Inter({ subsets: ["latin"], variable: "--font-body" });

export const metadata: Metadata = {
  title: "GAVEL — Every scam gets a fair trial",
  description:
    "Put any suspicious message, link, QR code, document or voice note on trial. The AI investigates, you decide.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${fraunces.variable} ${specialElite.variable} ${inter.variable}`}>
        <div className="courthouse">
          <header className="masthead">
            <div className="masthead-inner">
              <Link href="/" className="brand" aria-label="GAVEL home">
                <span className="brand-gavel" aria-hidden="true">
                  <svg viewBox="0 0 64 64" width="34" height="34">
                    <g transform="rotate(-35 32 32)">
                      <rect x="12" y="26" width="34" height="12" rx="3" fill="#c9a24a" />
                      <rect x="10" y="22" width="8" height="20" rx="2" fill="#8a6a2a" />
                      <rect x="38" y="22" width="8" height="20" rx="2" fill="#8a6a2a" />
                      <rect x="44" y="29" width="14" height="6" rx="3" fill="#e8cf8a" />
                    </g>
                    <rect x="14" y="50" width="36" height="6" rx="3" fill="#8a6a2a" />
                  </svg>
                </span>
                <span className="brand-name">GAVEL</span>
              </Link>
              <nav className="nav">
                <Link href="/">Courtroom</Link>
                <Link href="/cases">Case Files</Link>
                <Link href="/school">Law School</Link>
                <Link href="/about">How the court works</Link>
              </nav>
            </div>
            <div className="masthead-plinth" aria-hidden="true" />
          </header>
          <main className="main">{children}</main>
          <footer className="footer">
            <p>
              Every scam gets a fair trial. The AI investigates — <strong>you</strong> decide.
            </p>
            <p className="footer-note">
              Runs on your device. Nothing is blocked, sent, or filed without you.
            </p>
          </footer>
        </div>
      </body>
    </html>
  );
}
