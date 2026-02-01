"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { supabaseBrowser } from "@/lib/supabase/browser";

interface HeaderProps {
  isAuthed?: boolean;
  userEmail?: string;
}

export default function Header({ isAuthed = false, userEmail }: HeaderProps) {
  const pathname = usePathname();

  const handleLogout = async () => {
    try {
      const supabase = supabaseBrowser();
      await supabase.auth.signOut();
      window.location.href = "/";
    } catch (error) {
      console.error("Logout error:", error);
    }
  };

  return (
    <>
      <style>{`
        .topbar {
          position: sticky;
          top: 0;
          z-index: 50;
          background: rgba(11, 11, 11, 0.55);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }
        .topbarInner {
          width: min(1200px, 92vw);
          margin: 0 auto;
          padding: 14px 0;
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
          flex-wrap: wrap;
        }
        .brand {
          display: flex;
          align-items: center;
          gap: 10px;
          text-decoration: none;
          color: white;
        }
        .logo {
          width: 40px;
          height: 40px;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .logo img {
          width: 100%;
          height: 100%;
          object-fit: contain;
        }
        .brandTitle {
          display: flex;
          flex-direction: column;
          line-height: 1.05;
        }
        .brandTitle strong {
          font-size: 14px;
          letter-spacing: 0.2px;
          color: white;
        }
        .brandTitle span {
          font-size: 12px;
          opacity: 0.7;
          color: white;
        }
        .nav {
          display: flex;
          gap: 10px;
          align-items: center;
          flex-wrap: wrap;
        }
        .navLink {
          font-size: 12px;
          opacity: 0.85;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid transparent;
          transition: all 0.2s;
          text-decoration: none;
          color: white;
        }
        .navLink:hover {
          opacity: 1;
          border-color: rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.04);
        }
        .navLink.active {
          opacity: 1;
          border-color: rgba(0, 188, 212, 0.35);
          background: rgba(0, 188, 212, 0.08);
          color: #00BCD4;
        }
        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 12px;
          border-radius: 14px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.06);
          font-weight: 900;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          color: white;
        }
        .btn:hover {
          border-color: rgba(0, 188, 212, 0.35);
          box-shadow: 0 0 0 6px rgba(0, 188, 212, 0.25);
        }
        .btnPrimary {
          background: #00BCD4;
          color: #001018;
          border-color: rgba(255, 255, 255, 0.06);
          box-shadow: 0 12px 34px rgba(0, 188, 212, 0.25);
        }
        .btnPrimary:hover {
          background: #00ACC1;
          box-shadow: 0 16px 44px rgba(0, 188, 212, 0.25);
        }
        .btnLogout {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 6px 10px;
          border-radius: 10px;
          border: 1px solid rgba(255, 255, 255, 0.08);
          background: rgba(255, 255, 255, 0.03);
          font-weight: 600;
          font-size: 11px;
          cursor: pointer;
          transition: all 0.2s;
          text-decoration: none;
          color: rgba(255, 255, 255, 0.65);
          opacity: 0.7;
        }
        .btnLogout:hover {
          opacity: 1;
          color: rgba(255, 255, 255, 0.9);
          border-color: rgba(255, 255, 255, 0.14);
          background: rgba(255, 255, 255, 0.06);
        }
      `}</style>

      <div className="topbar">
        <div className="topbarInner">
          <Link href="/" className="brand">
            <div className="logo">
              <img
                src="/logo.png"
                alt="Monetiq.ai Logo"
              />
            </div>
            <div className="brandTitle">
              <strong>Monetiq.ai</strong>
              <span>Creative Suite</span>
            </div>
          </Link>

          <div className="nav">
            <Link href="/" className={`navLink ${pathname === "/" ? "active" : ""}`}>
              Home
            </Link>
            {isAuthed && (
              <>
                <Link href="/image" className={`navLink ${pathname === "/image" ? "active" : ""}`}>
                  Image Tool
                </Link>
                <Link href="/video" className={`navLink ${pathname === "/video" ? "active" : ""}`}>
                  Video Tool
                </Link>
                <Link href="/library" className={`navLink ${pathname === "/library" ? "active" : ""}`}>
                  Library
                </Link>
              </>
            )}
            <Link href="/pricing" className={`navLink ${pathname === "/pricing" ? "active" : ""}`}>
              Pricing
            </Link>
          </div>

          <div style={{ marginLeft: "auto", display: "flex", gap: 10, alignItems: "center" }}>
            {isAuthed ? (
              <button onClick={handleLogout} className="btnLogout">
                Logout
              </button>
            ) : (
              <Link href="/auth" className="btn btnPrimary">
                Sign In
              </Link>
            )}
          </div>
        </div>
      </div>
    </>
  );
}
