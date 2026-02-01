import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import PricingTable from "../../components/PricingTable";

// ✅ Soft PRO gate (no DB): keep consistent with app/page.tsx
const PRO_EMAILS = new Set<string>([
  "you@example.com",
]);

const PRO_DOMAINS = new Set<string>([
  // "monetiq.ai",
]);

function isProFromEmail(emailRaw: string | null | undefined) {
  const email = (emailRaw ?? "").toLowerCase();
  const domain = email.includes("@") ? email.split("@")[1] : "";
  return !!email && (PRO_EMAILS.has(email) || (domain && PRO_DOMAINS.has(domain)));
}

export default async function PricingPage() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const isAuthed = !!auth.user;

  const email = auth.user?.email ?? null;
  const isPro = isProFromEmail(email);

  return (
    <main style={{ minHeight: "100vh", background: "#0b0b0b", color: "white" }}>
      <style>{`
        :root{
          --bg:#0b0b0b;
          --panel: rgba(255,255,255,.04);
          --panel2: rgba(255,255,255,.06);
          --border: rgba(255,255,255,.12);
          --textDim: rgba(255,255,255,.78);

          --sky: #38BDF8;
          --sky2:#0EA5E9;
          --skyGlow: rgba(56,189,248,0.25);

          --lime: #D7FF2F;
          --lime2:#BFFF00;
          --limeGlow: rgba(215,255,47,0.22);

          --pink: #ff2d8b;
          --pinkGlow: rgba(255,45,139,.18);
        }
        *{box-sizing:border-box}
        a{color:inherit;text-decoration:none}
        .wrap{width:min(1220px,92vw); margin:0 auto; padding:16px 0 90px;}
        .topbar{
          position:sticky; top:0; z-index:50;
          background: rgba(11,11,11,.55);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255,255,255,.10);
        }
        .topbarInner{
          width:min(1220px,92vw); margin:0 auto;
          padding:14px 0;
          display:flex; align-items:center; justify-content:space-between;
          gap:12px; flex-wrap:wrap;
        }
        .brand{display:flex; align-items:center; gap:10px;}
        .logo{
          width:40px;height:40px;
          display:flex; align-items:center; justify-content:center;
        }
        .logo img{
          width:100%; height:100%; object-fit:contain;
        }
        .brandTitle{display:flex; flex-direction:column; line-height:1.05;}
        .brandTitle strong{font-size:14px; letter-spacing:.2px}
        .brandTitle span{font-size:12px; opacity:.7}
        .btn{
          display:inline-flex; align-items:center; justify-content:center;
          padding:10px 12px; border-radius:14px;
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.06);
          font-weight:900; font-size:12px;
          cursor:pointer;
        }
        .btn:hover{border-color: rgba(56,189,248,.35); box-shadow: 0 0 0 6px var(--skyGlow);}
        .btnPrimary{
          background: var(--sky);
          color:#001018;
          border-color: rgba(255,255,255,.06);
          box-shadow: 0 12px 34px var(--skyGlow);
        }
        .btnPrimary:hover{background: var(--sky2); box-shadow: 0 16px 44px var(--skyGlow);}

        .note{
          margin-top: 14px;
          border:1px solid rgba(255,255,255,.10);
          border-radius: 18px;
          background: rgba(255,255,255,.03);
          padding: 14px;
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap: 12px;
          flex-wrap:wrap;
        }
        .note strong{font-size:13px;}
        .note span{font-size:12px; opacity:.75; line-height:1.45; max-width: 88ch;}
        .footer{
          margin-top: 16px;
          border-top: 1px solid rgba(255,255,255,.10);
          padding-top: 12px;
          display:flex; justify-content:space-between;
          gap:12px; flex-wrap:wrap;
          font-size: 12px; opacity:.75;
        }
      `}</style>

      {/* Removed local header - using global header from layout.tsx */}

      <div className="wrap">
        {/* Pricing table (client) */}
        <PricingTable isAuthed={isAuthed} dashboardHref="/dashboard" />

        {/* Status */}
        <section className="note">
          <div>
            <strong>Current access</strong>
            <div style={{ marginTop: 6 }}>
              <span>
                {isPro ? (
                  <>
                    You are currently <span style={{ color: "var(--lime)", fontWeight: 950 }}>PRO</span>.
                  </>
                ) : (
                  <>
                    You are currently <span style={{ color: "var(--sky)", fontWeight: 950 }}>FREE</span>. PRO cards redirect here.
                  </>
                )}
                {email ? <> · <span style={{ opacity: 0.8 }}>{email}</span></> : null}
              </span>
            </div>
          </div>

          <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
            <Link className="btn" href="/">Back to Explore</Link>
            <Link className="btn btnPrimary" href={isAuthed ? "/dashboard" : "/auth"}>
              {isAuthed ? "Open Dashboard →" : "Sign in →"}
            </Link>
          </div>
        </section>

        <div className="footer">
          <span>© {new Date().getFullYear()} Monetiq.ai</span>
          <span>Pricing · Monthly/Annual toggle · Aligned CTAs</span>
        </div>
      </div>
    </main>
  );
}
