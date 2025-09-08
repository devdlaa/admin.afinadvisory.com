import { Poppins } from "next/font/google";
import Sidebar from "../components/Sidebar/Sidebar";
import TopBar from "../components/TopBar/TopBar";
import { SessionProvider } from "next-auth/react";
import "./Layout.scss";
import { Providers } from "../components/providers";

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
});

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className={poppins.className}>
        <SessionProvider>
          <Providers>
            <div className="layout">
              <Sidebar />
              <div className={`main-content `}>
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
