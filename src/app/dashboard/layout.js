import { Poppins } from "next/font/google";
import Sidebar from "../components/Sidebar/Sidebar";
import TopBar from "../components/TopBar/TopBar";
import { SessionProvider } from "next-auth/react";
import { Providers } from "../components/providers";
import LockDashboardButton from "../components/LockDashboardButton/LockDashboardButton";
import "./Layout.scss";

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
                <TopBar />
                <div className="content-area">{children}</div>
              </div>
            </div>
          </Providers>
        </SessionProvider>
      </body>
    </html>
  );
}
