import Link from "next/link";
import { supabaseServer } from "@/lib/supabase/server";
import AutoVideo from "@/components/AutoVideo";
import ExploreSection from "../components/ExploreSection";
import GlobalHero from "@/components/GlobalHero";
import ModeTransition from "@/components/ModeTransition";
import HeroDirectorMode from "@/components/HeroDirectorMode";
import HeroDirectorModeExplanation from "@/components/HeroDirectorModeExplanation";
import HeroNodeMode from "@/components/HeroNodeMode";
import HeroNodeModeExplanation from "@/components/HeroNodeModeExplanation";
import HeroAdsModeVideo from "@/components/HeroAdsModeVideo";
import HeroAdsMode from "@/components/HeroAdsMode";

type LandingTool = {
  id: string;
  title: string;
  subtitle: string | null;
  href: string;
  tag: string | null;
  tag_color: "sky" | "lime" | "neutral" | null;
  thumb_bucket: string | null;
  thumb_path: string | null;
  media_kind: "video" | "image" | null;
  poster_path: string | null;
  sort: number;
  category: string | null;
  is_featured: boolean | null;
};

function publicUrl(bucket: string, path: string) {
  const base = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  return `${base}/storage/v1/object/public/${bucket}/${path}`;
}

async function getLandingTools(): Promise<
  (LandingTool & { mediaUrl: string | null; posterUrl: string | null })[]
> {
  const supabase = await supabaseServer();
  const { data, error } = await supabase
    .from("landing_tools")
    .select(
      "id,title,subtitle,href,tag,tag_color,thumb_bucket,thumb_path,media_kind,poster_path,sort,category,is_featured"
    )
    .eq("is_active", true)
    .order("sort", { ascending: true });

  if (error) throw new Error(error.message);

  const rows = (data ?? []) as LandingTool[];
  return rows.map((t) => {
    const bucket = t.thumb_bucket || "assets";
    const mediaUrl = t.thumb_path ? publicUrl(bucket, t.thumb_path) : null;
    const posterUrl = t.poster_path ? publicUrl(bucket, t.poster_path) : null;
    return { ...t, mediaUrl, posterUrl };
  });
}

// ✅ Soft PRO gate (no DB): whitelist emails or domains
const PRO_EMAILS = new Set<string>([
  "artvs@gmail.com",
]);
const PRO_DOMAINS = new Set<string>([]);

// ✅ Tool routes (NO dashboard)
function imageToolHref(isAuthed: boolean) {
  return isAuthed ? "/image" : "/auth";
}
function videoToolHref(isAuthed: boolean) {
  return isAuthed ? "/video" : "/auth";
}
function libraryHref(isAuthed: boolean) {
  return isAuthed ? "/library" : "/auth";
}

// ✅ Map landing tools → direct tool
function toolClickHref(t: { title: string; href: string; category?: string | null }, isAuthed: boolean) {
  // ✅ Presets: respect the DB href (ex: /tool/mixed-media?preset=neon-tech-outline)
  if (t.category === "preset") {
    return isAuthed ? t.href : "/auth";
  }

  const title = (t.title || "").toLowerCase();

  // If the card is Nano Banana / Image tool
  if (title.includes("nano") || title.includes("banana") || title.includes("image")) {
    return imageToolHref(isAuthed);
  }

  // If the card is video tool
  if (title.includes("video") || title.includes("veo") || title.includes("animate")) {
    return videoToolHref(isAuthed);
  }

  // default fallback: image tool
  return imageToolHref(isAuthed);
}

export default async function HomePage() {
  const supabase = await supabaseServer();
  const { data: auth } = await supabase.auth.getUser();
  const isAuthed = !!auth.user;

  const email: string = (auth.user?.email ?? "").toLowerCase();
  const domain: string = email.includes("@") ? email.split("@")[1] : "";

  const isPro: boolean =
    !!email &&
    (PRO_EMAILS.has(email) || (domain !== "" && PRO_DOMAINS.has(domain)));

  const tools = await getLandingTools();
  const presets = tools.filter((t) => t.category === "preset");
  const exploreTools = tools.filter((t) => t.category !== "preset");

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
        }

        *{box-sizing:border-box}
        a{color:inherit;text-decoration:none}
        button{font:inherit}

        .wrap{width:min(1400px,96vw); margin:0 auto; padding:16px 0 90px;}

        /* 3-Column Modes Grid */
        .modesGrid{
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
          margin-bottom: 60px;
        }
        .modeColumn{
          display: flex;
          flex-direction: column;
          gap: 0;
        }

        @media (max-width: 1200px){
          .modesGrid{
            grid-template-columns: 1fr;
            gap: 40px;
          }
        }

        /* Topbar */
        .topbar{
          position:sticky; top:0; z-index:50;
          background: rgba(11,11,11,.55);
          backdrop-filter: blur(10px);
          border-bottom: 1px solid rgba(255,255,255,.10);
        }
        .topbarInner{
          width:min(1200px,92vw); margin:0 auto;
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
        .brandTitle{display:flex;flex-direction:column;line-height:1.05;}
        .brandTitle strong{font-size:14px;letter-spacing:.2px}
        .brandTitle span{font-size:12px;opacity:.7}

        .nav{display:flex; gap:10px; align-items:center; flex-wrap:wrap;}
        .navLink{
          font-size:12px; opacity:.85;
          padding:8px 10px; border-radius:999px;
          border:1px solid transparent;
        }
        .navLink:hover{
          opacity:1;
          border-color: rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
        }

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

        /* Hero header */
        .hero{
          margin-top: 16px;
          border:1px solid rgba(255,255,255,.12);
          background: linear-gradient(180deg, rgba(255,255,255,.05), rgba(255,255,255,.03));
          border-radius: 22px;
          padding: 18px;
          position: relative;
          overflow:hidden;
        }
        .hero:before{
          content:"";
          position:absolute;
          inset:-2px;
          background: radial-gradient(circle at 20% 10%, rgba(56,189,248,.22), transparent 55%);
          pointer-events:none;
        }
        .heroTop{
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          gap: 12px;
          flex-wrap:wrap;
          position: relative;
        }
        .kicker{
          display:inline-flex;
          gap:8px;
          align-items:center;
          padding: 8px 10px;
          border-radius: 999px;
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.04);
          font-size: 12px;
          opacity: .92;
        }
        .dot{
          width:8px;height:8px;border-radius:99px;
          background: var(--sky);
          box-shadow: 0 0 0 6px var(--skyGlow);
        }
        .hero h1{
          margin: 10px 0 0;
          font-size: 34px;
          line-height: 1.05;
          letter-spacing: -.6px;
          font-weight: 950;
          position: relative;
        }
        .hero p{
          margin: 10px 0 0;
          font-size: 13px;
          opacity: .78;
          line-height: 1.5;
          max-width: 72ch;
          position: relative;
        }
        .heroActions{
          margin-top: 12px;
          display:flex; gap:10px; flex-wrap:wrap;
          position: relative;
        }

        /* Explore row */
        .rowHead{
          margin-top: 14px;
          display:flex; align-items:flex-end; justify-content:space-between;
          gap: 10px; flex-wrap:wrap;
        }
        .rowHead strong{font-size:14px; font-weight:950;}
        .rowHead span{font-size:12px; opacity:.75;}

        /* Presets cards */
        .hscroll{
          margin-top: 10px;
          display:flex;
          gap: 12px;
          overflow-x: auto;
          padding-bottom: 10px;
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
        }
        .hscroll::-webkit-scrollbar{height:10px}
        .hscroll::-webkit-scrollbar-thumb{background:rgba(255,255,255,.10); border-radius:999px}
        .hscroll::-webkit-scrollbar-track{background:transparent}

        .toolCard{
          scroll-snap-align: start;
          flex: 0 0 auto;
          width: 340px;
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.03);
          border-radius: 18px;
          overflow:hidden;
          position: relative;
        }
        .toolCard:hover{
          border-color: rgba(56,189,248,.32);
          box-shadow: 0 0 0 6px var(--skyGlow);
          transform: translateY(-1px);
          transition: .18s ease;
        }
        .tag{
          position:absolute; top:12px; left:12px;
          font-size:11px; font-weight:950;
          padding:6px 8px; border-radius:999px;
          border:1px solid rgba(255,255,255,.14);
          background: rgba(0,0,0,.35);
          z-index: 2;
        }
        .tagSky{color: var(--sky);}
        .tagLime{color: var(--lime); border-color: rgba(215,255,47,.22);}

        .media{
          height: 190px;
          position: relative;
          background: linear-gradient(135deg, rgba(255,255,255,.06), rgba(255,255,255,.02));
          border-bottom: 1px solid rgba(255,255,255,.10);
          overflow:hidden;
        }
        .media video, .media img{
          width:100%; height:100%;
          object-fit: cover;
          display:block;
          filter: saturate(1.05) contrast(1.05);
        }
        .body{padding: 12px;}
        .title{font-weight:950; font-size:13px;}
        .desc{margin-top:6px; font-size:12px; opacity:.75; line-height:1.35;}
        .meta{margin-top:10px; display:flex; align-items:center; justify-content:space-between; font-size:12px; opacity:.78;}
        .arrow{opacity:.9}

        @media (max-width: 980px){
          .hero h1{font-size: 30px}
          .toolCard{width: 320px;}
        }
        @media (max-width: 640px){
          .hero h1{font-size: 26px}
          .toolCard{width: 86vw;}
        }
      `}</style>

      {/* Removed local header - now using global header from layout.tsx */}

      <div className="wrap">
        {/* GLOBAL HERO - Platform Positioning */}
        <GlobalHero />

        {/* TRANSITION - Connect Hero to Modes */}
        <ModeTransition />

        {/* 3-COLUMN MODES GRID */}
        <section className="modesGrid">
          {/* DIRECTOR MODE - Left Column (Orange) */}
          <div className="modeColumn">
            <HeroDirectorMode />
            <HeroDirectorModeExplanation />
          </div>

          {/* NODE MODE - Center Column (Violet) */}
          <div className="modeColumn">
            <HeroNodeMode />
            <HeroNodeModeExplanation />
          </div>

          {/* ADS MODE - Right Column (Cyan) */}
          <div className="modeColumn">
            <HeroAdsModeVideo />
            <HeroAdsMode />
          </div>
        </section>

        {/* Hero */}
        <section className="hero">
          <div className="heroTop">
            <div>
              <div className="kicker">
                <span className="dot" />
                <span>Upload → Prompt → Generate → Library</span>
              </div>

              <h1>
                Generate premium ad creatives —{" "}
                <span style={{ color: "var(--sky)" }}>fast + consistent</span>.
              </h1>

              <p>
                One tool. One prompt bar. Your product stays identical. Everything you generate is saved in Asset Library.
              </p>

              <div className="heroActions">
                <Link className="btn btnPrimary" href={imageToolHref(isAuthed)}>Open NanoBanana Pro →</Link>
                <Link className="btn" href={videoToolHref(isAuthed)}>Open Video Tool →</Link>
                <Link className="btn" href={libraryHref(isAuthed)}>Open Asset Library →</Link>
              </div>
            </div>
          </div>
        </section>

        {/* Explore */}
        <div className="rowHead" id="explore">
          <div>
            <strong>Explore</strong>
            <div><span>Click → opens the tool directly</span></div>
          </div>

          <Link className="btn btnPrimary" href={imageToolHref(isAuthed)}>Open Tool →</Link>
        </div>

        {/* Override tool links to direct tool */}
        <ExploreSection
          tools={exploreTools.map((t) => ({ ...t, href: toolClickHref(t, isAuthed) }))}
          isAuthed={isAuthed}
          isPro={isPro}
        />

        {/* Presets */}
        {presets.length > 0 && (
          <section style={{ marginTop: 18 }} id="presets">
            <div className="rowHead">
              <div>
                <strong>Presets</strong>
                <div><span>Direct entry — no dashboard</span></div>
              </div>
              <Link className="btn" href={imageToolHref(isAuthed)}>Try now</Link>
            </div>

            <div className="hscroll" aria-label="presets">
              {presets.map((t) => (
                <Link key={t.id} href={isAuthed ? t.href : "/auth"} className="toolCard">
                  {t.tag && (
                    <div className={`tag ${t.tag_color === "lime" ? "tagLime" : "tagSky"}`}>
                      {t.tag}
                    </div>
                  )}

                  <div className="media">
                    {t.media_kind === "video" && t.mediaUrl ? (
                      <AutoVideo src={t.mediaUrl} poster={t.posterUrl ?? undefined} />
                    ) : t.mediaUrl ? (
                      <img src={t.mediaUrl} alt={t.title} loading="lazy" decoding="async" />
                    ) : (
                      <div style={{ height: "100%" }} />
                    )}
                  </div>

                  <div className="body">
                    <div className="title">{t.title}</div>
                    {t.subtitle && <div className="desc">{t.subtitle}</div>}
                    <div className="meta">
                      <span style={{ opacity: 0.7 }}>Open tool</span>
                      <span className="arrow">→</span>
                    </div>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        )}

        {/* Footer */}
        <div style={{ marginTop: 22, borderTop: "1px solid rgba(255,255,255,.10)", paddingTop: 12, opacity: 0.75, fontSize: 12 }}>
          © {new Date().getFullYear()} Monetiq.ai · Landing → Tool → Asset Library
        </div>
      </div>
    </main>
  );
}
