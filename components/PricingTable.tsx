"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

type Plan = {
  key: "basic" | "pro" | "ultimate" | "creator";
  name: string;
  badge: { text: string; kind: "sky" | "lime" | "pink" } | null;
  forWho: string;

  monthly: { price: number; strike?: number; savePct?: number };
  annual: { price: number; strike?: number; savePct?: number; note?: string };

  included: { text: string; kind?: "sky" | "lime" | "pink" }[];
  bundles: { text: string; kind?: "sky" | "lime" | "pink" }[];

  highlight?: "popular" | "best";
  ctaKind: "sky" | "lime";
};

function money(n: number) {
  // show 17.4 not 17.40
  const s = n.toFixed(2).replace(/\.00$/, "").replace(/(\.\d)0$/, "$1");
  return `€${s}`;
}

export default function PricingTable({
  isAuthed,
  dashboardHref,
}: {
  isAuthed: boolean;
  dashboardHref: string;
}) {
  const [billing, setBilling] = useState<"annual" | "monthly">("annual");

  const plans: Plan[] = useMemo(
    () => [
      {
        key: "basic",
        name: "Basic",
        badge: { text: "START", kind: "sky" },
        forWho: "For first tests & light usage",
        monthly: { price: 9 },
        annual: { price: 7.5, note: "Billed yearly" },
        included: [
          { text: "Limited monthly generations", kind: "sky" },
          { text: "Standard templates", kind: "sky" },
          { text: "Basic export pipeline", kind: "sky" },
        ],
        bundles: [
          { text: "Core tools access", kind: "sky" },
          { text: "No PRO templates", kind: "sky" },
        ],
        ctaKind: "sky",
      },
      {
        key: "pro",
        name: "Pro",
        badge: { text: "PRO", kind: "sky" },
        forWho: "For creators shipping weekly",
        monthly: { price: 29, strike: 29, savePct: 0 }, // keep strike visible on monthly? optional
        annual: { price: 17.4, strike: 29, savePct: 40, note: "Billed yearly" },
        included: [
          { text: "Higher batch generation", kind: "sky" },
          { text: "More aspect ratios", kind: "sky" },
          { text: "Faster review flow", kind: "sky" },
        ],
        bundles: [
          { text: "Core + advanced tools", kind: "sky" },
          { text: "Limited PRO templates", kind: "sky" },
        ],
        ctaKind: "sky",
      },
      {
        key: "ultimate",
        name: "Ultimate",
        badge: { text: "MOST POPULAR", kind: "lime" },
        forWho: "For daily ad iterations",
        monthly: { price: 49, strike: 49 },
        annual: { price: 29.4, strike: 49, savePct: 40, note: "Billed yearly" },
        included: [
          { text: "PRO templates unlocked", kind: "lime" },
          { text: "High batch + fast iterations", kind: "lime" },
          { text: "Priority quality presets", kind: "lime" },
        ],
        bundles: [
          { text: "7-day PRO bundle", kind: "lime" },
          { text: "Advanced tool access", kind: "lime" },
        ],
        highlight: "popular",
        ctaKind: "lime",
      },
      {
        key: "creator",
        name: "Creator",
        badge: { text: "BEST VALUE", kind: "pink" },
        forWho: "For teams & maximum output",
        monthly: { price: 249, strike: 249 },
        annual: { price: 119, strike: 249, savePct: 52, note: "Billed yearly" },
        included: [
          { text: "Everything in Ultimate", kind: "pink" },
          { text: "Highest batch capacity", kind: "pink" },
          { text: "Priority templates + support", kind: "pink" },
        ],
        bundles: [
          { text: "30-day PRO bundle", kind: "pink" },
          { text: "Unlimited-style iterations", kind: "pink" },
        ],
        highlight: "best",
        ctaKind: "lime",
      },
    ],
    []
  );

  return (
    <section>
      {/* Pick your plan header + toggle */}
      <div className="pick">
        <div className="pickTop">
          <div>
            <div className="pickTitleRow">
              <h2 className="pickTitle">PICK YOUR PLAN</h2>
              <div className="savePill">Up to 50% off</div>
            </div>
            <p className="pickSub">
              Switch billing to see monthly vs annual pricing. PRO cards in Explore unlock on paid tiers.
            </p>
          </div>

          <div className="toggleWrap" aria-label="billing-toggle">
            <div className="seg">
              <button
                type="button"
                className={billing === "monthly" ? "segBtn active" : "segBtn"}
                onClick={() => setBilling("monthly")}
              >
                Monthly
              </button>
              <button
                type="button"
                className={billing === "annual" ? "segBtn active" : "segBtn"}
                onClick={() => setBilling("annual")}
              >
                Annual
              </button>
            </div>
            {billing === "annual" && <div className="miniTag">Save up to 50%</div>}
          </div>
        </div>
      </div>

      {/* Plans grid */}
      <div className="grid" aria-label="plans">
        {plans.map((p) => {
          const price = billing === "annual" ? p.annual.price : p.monthly.price;
          const strike = billing === "annual" ? p.annual.strike : p.monthly.strike;
          const savePct = billing === "annual" ? p.annual.savePct : p.monthly.savePct;

          const highlightClass =
            p.highlight === "popular" ? "plan popular" : p.highlight === "best" ? "plan best" : "plan";

          const badgeClass =
            p.badge?.kind === "lime"
              ? "badge badgeLime"
              : p.badge?.kind === "pink"
                ? "badge badgePink"
                : "badge badgeSky";

          const ctaClass = p.ctaKind === "lime" ? "btn btnLime" : "btn btnPrimary";

          const ctaHref = isAuthed ? dashboardHref : "/auth";

          return (
            <div key={p.key} className={highlightClass}>
              <div className="planTop">
                <div>
                  <div className="planName">{p.name}</div>
                  <div className="planFor">{p.forWho}</div>
                </div>
                {p.badge && <div className={badgeClass}>{p.badge.text}</div>}
              </div>

              <div className="planBody">
                <div className="priceRow">
                  <div className="price">
                    {typeof strike === "number" && strike !== price ? (
                      <span className="strike">{money(strike)}</span>
                    ) : null}
                    {money(price)}
                  </div>
                  <div className="per">/month</div>
                </div>

                {/* Save bar (reserve space always to align CTAs) */}
                <div className="saveSlot">
                  {typeof savePct === "number" && savePct > 0 ? (
                    <div className="saveBar">
                      <span>Save vs monthly</span>
                      <span className="savePct">−{savePct}%</span>
                    </div>
                  ) : (
                    <div className="saveBar ghost">
                      <span> </span>
                      <span className="savePct"> </span>
                    </div>
                  )}
                </div>

                {/* CTA slot (fixed height => aligned buttons) */}
                <div className="ctaSlot">
                  <Link className={ctaClass} href={ctaHref}>
                    Select plan →
                  </Link>
                </div>

                <div className="sectionTitle">INCLUDED</div>
                <ul className="list">
                  {p.included.map((x) => (
                    <li key={x.text} className="li">
                      <div
                        className={
                          x.kind === "lime" ? "tick tickLime" : x.kind === "pink" ? "tick tickPink" : "tick"
                        }
                      >
                        ✓
                      </div>
                      <div>{สีless(x.text)}</div>
                    </li>
                  ))}
                </ul>

                <div className="sectionTitle">BUNDLES</div>
                <ul className="list">
                  {p.bundles.map((x) => (
                    <li key={x.text} className="li">
                      <div
                        className={
                          x.kind === "lime" ? "tick tickLime" : x.kind === "pink" ? "tick tickPink" : "tick"
                        }
                      >
                        ✓
                      </div>
                      <div>{x.text}</div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>

      {/* Local styles */}
      <style>{`
        .pick{
          margin-top: 16px;
          border:1px solid rgba(255,255,255,.10);
          border-radius: 22px;
          background: rgba(255,255,255,.03);
          padding: 16px;
        }
        .pickTop{
          display:flex;
          justify-content:space-between;
          align-items:flex-end;
          gap:12px;
          flex-wrap:wrap;
        }
        .pickTitleRow{
          display:flex;
          gap: 10px;
          align-items:center;
          flex-wrap:wrap;
        }
        .pickTitle{
          margin: 0;
          font-size: 34px;
          font-weight: 950;
          letter-spacing: -.8px;
        }
        .pickSub{
          margin: 6px 0 0;
          font-size: 12px;
          opacity: .75;
          line-height: 1.5;
          max-width: 90ch;
        }
        .savePill{
          display:inline-flex; align-items:center; gap:8px;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(255,255,255,.14);
          background: rgba(255,45,139,.14);
          box-shadow: 0 0 0 6px rgba(255,45,139,.10);
          font-size: 12px;
          font-weight: 950;
          white-space: nowrap;
        }

        .toggleWrap{display:flex; align-items:center; gap:10px; flex-wrap:wrap; justify-content:flex-end;}
        .seg{
          display:inline-flex;
          border:1px solid rgba(255,255,255,.12);
          background: rgba(0,0,0,.25);
          border-radius: 999px;
          overflow:hidden;
        }
        .segBtn{
          border:0;
          background: transparent;
          color: rgba(255,255,255,.86);
          padding: 9px 12px;
          font-size: 12px;
          font-weight: 950;
          cursor: pointer;
          opacity: .85;
        }
        .segBtn:hover{opacity:1}
        .segBtn.active{
          background: rgba(56,189,248,.92);
          color:#001018;
          opacity: 1;
        }
        .miniTag{
          font-size: 12px;
          font-weight: 950;
          padding: 8px 10px;
          border-radius: 999px;
          border: 1px solid rgba(215,255,47,.22);
          background: rgba(215,255,47,.10);
          color: rgba(255,255,255,.92);
          white-space: nowrap;
        }

        .grid{
          margin-top: 14px;
          display:grid;
          grid-template-columns: repeat(4, minmax(0, 1fr));
          gap: 12px;
          align-items: stretch;
        }
        .plan{
          border:1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.03);
          border-radius: 18px;
          overflow:hidden;
          position: relative;
          display:flex;
          flex-direction:column;
        }
        .planTop{
          padding: 14px;
          border-bottom: 1px solid rgba(255,255,255,.10);
          background: rgba(0,0,0,.18);
          display:flex;
          align-items:flex-start;
          justify-content:space-between;
          gap: 10px;
        }
        .planName{font-weight: 950; font-size: 14px; margin: 0;}
        .planFor{margin-top: 6px; font-size: 12px; opacity: .75; line-height: 1.35;}

        .badge{
          font-size:11px; font-weight:950;
          padding:6px 8px; border-radius:999px;
          border:1px solid rgba(255,255,255,.14);
          background: rgba(0,0,0,.35);
          opacity:.95;
          white-space: nowrap;
        }
        .badgeSky{color: var(--sky);}
        .badgeLime{color: var(--lime); border-color: rgba(215,255,47,.22);}
        .badgePink{color: var(--pink); border-color: rgba(255,45,139,.22);}

        .planBody{padding: 14px; display:flex; flex-direction:column; gap: 12px; flex: 1;}
        .priceRow{display:flex; align-items:flex-end; justify-content:space-between; gap: 10px; flex-wrap:wrap;}
        .price{font-size: 32px; font-weight: 950; letter-spacing: -.7px;}
        .strike{font-size: 12px; opacity: .6; text-decoration: line-through; margin-right: 8px;}
        .per{font-size: 12px; opacity: .75; padding-bottom: 6px;}

        /* Align CTAs: reserve height for save + CTA */
        .saveSlot{min-height: 44px;}
        .saveBar{
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.10);
          background: rgba(255,45,139,.10);
          padding: 9px 10px;
          font-size: 12px;
          font-weight: 950;
          color: rgba(255,255,255,.9);
          display:flex;
          justify-content:space-between;
          align-items:center;
          gap: 10px;
        }
        .saveBar.ghost{
          background: rgba(255,255,255,.02);
          border-color: rgba(255,255,255,.06);
          color: transparent;
        }
        .savePct{color: var(--pink);}

        .ctaSlot{min-height: 44px; display:flex; align-items:flex-end;}
        .btn{width:100%;}

        .sectionTitle{margin-top: 6px; font-size: 11px; letter-spacing: .2px; font-weight: 950; opacity: .85;}
        .list{margin:0; padding:0; list-style:none; display:flex; flex-direction:column; gap: 10px;}
        .li{
          display:flex; gap:10px; align-items:flex-start;
          border:1px solid rgba(255,255,255,.10);
          background: rgba(255,255,255,.04);
          border-radius: 14px;
          padding: 10px 10px;
          font-size: 12px;
          opacity: .85;
          line-height: 1.35;
        }
        .tick{
          width:22px;height:22px;border-radius:10px;
          border:1px solid rgba(255,255,255,.12);
          background: rgba(56,189,248,.10);
          color: var(--sky);
          display:flex; align-items:center; justify-content:center;
          flex: 0 0 auto;
          font-weight: 950;
        }
        .tickLime{background: rgba(215,255,47,.12); color: var(--lime);}
        .tickPink{background: rgba(255,45,139,.12); color: var(--pink);}

        .plan.popular{
          border-color: rgba(215,255,47,.30);
          box-shadow: 0 0 0 6px rgba(215,255,47,.12);
          background:
            radial-gradient(circle at 30% 0%, rgba(215,255,47,.14), transparent 60%),
            rgba(255,255,255,.03);
        }
        .plan.best{
          border-color: rgba(255,45,139,.28);
          box-shadow: 0 0 0 6px rgba(255,45,139,.10);
          background:
            radial-gradient(circle at 70% 0%, rgba(255,45,139,.14), transparent 60%),
            rgba(255,255,255,.03);
        }

        @media (max-width: 1100px){
          .grid{grid-template-columns: repeat(2, minmax(0, 1fr));}
        }
        @media (max-width: 640px){
          .pickTitle{font-size: 26px;}
          .grid{grid-template-columns: 1fr;}
        }
      `}</style>
    </section>
  );
}

// tiny helper to avoid accidental weird characters in user copy/paste
function สีless(s: string) {
  return s;
}
