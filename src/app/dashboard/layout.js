import "../globals.css";
import "./layout.scss";
import { Poppins } from "next/font/google";

import Sidebar from "../components/shared/Sidebar/Sidebar";

import { SessionProvider } from "next-auth/react";
import { Providers } from "../components/providers";

import LockDashboardButton from "../components/shared/LockDashboardButton/LockDashboardButton";
const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({ children, session }) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <SessionProvider session={session}>
          <Providers>
            <div className="layout">
              <LockDashboardButton />
              <Sidebar />
              <div className="main-content">
                <div className="content-area">{children}</div>
              </div>
            </div>
          </Providers>
        </SessionProvider>
      </body>
    </html>
  );
}
