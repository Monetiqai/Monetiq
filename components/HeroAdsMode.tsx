"use client";

import Link from "next/link";

export default function HeroAdsMode() {
  return (
    <section className="adsHero">
      <style jsx>{`
        .adsHero {
          margin-top: 32px;
          border: 1px solid rgba(56, 189, 248, 0.2);
          background: linear-gradient(180deg, rgba(56, 189, 248, 0.04), rgba(14, 165, 233, 0.02));
          border-radius: 22px;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        .adsHero:before {
          content: "";
          position: absolute;
          inset: -2px;
          background: radial-gradient(circle at 20% 10%, rgba(56, 189, 248, 0.15), transparent 55%);
          pointer-events: none;
        }

        .adsBadge {
          display: inline-flex;
          gap: 6px;
          align-items: center;
          padding: 6px 10px;
          border-radius: 999px;
          border: 1px solid rgba(56, 189, 248, 0.25);
          background: rgba(56, 189, 248, 0.06);
          font-size: 10px;
          font-weight: 800;
          color: rgba(56, 189, 248, 0.9);
          text-transform: uppercase;
          letter-spacing: 1px;
          position: relative;
        }

        .adsHeadline {
          margin: 16px 0 0;
          font-size: clamp(28px, 4vw, 34px);
          line-height: 1.1;
          letter-spacing: -0.6px;
          font-weight: 950;
          position: relative;
        }

        .adsSubheadline {
          margin: 12px 0 0;
          font-size: 13px;
          opacity: 0.78;
          line-height: 1.5;
          max-width: 72ch;
          position: relative;
        }

        .adsSteps {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          position: relative;
        }

        .adsStep {
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
        }

        .stepNumber {
          font-size: 12px;
          font-weight: 900;
          color: #38BDF8;
          margin-bottom: 8px;
        }

        .stepTitle {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 6px;
        }

        .stepMicro {
          font-size: 12px;
          opacity: 0.7;
          line-height: 1.4;
        }

        .adsSection {
          margin-top: 24px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          position: relative;
        }

        .adsSectionTitle {
          font-size: 16px;
          font-weight: 900;
          margin-bottom: 12px;
        }

        .adsFeatures {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
          opacity: 0.85;
        }

        .adsFeatures li {
          list-style: none;
          padding-left: 20px;
          position: relative;
        }

        .adsFeatures li:before {
          content: "•";
          position: absolute;
          left: 0;
          color: #38BDF8;
          font-weight: 900;
        }

        .adsMicro {
          margin-top: 12px;
          font-size: 12px;
          opacity: 0.7;
          font-style: italic;
        }

        .adsComparison {
          margin-top: 24px;
          position: relative;
        }

        .comparisonTable {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-top: 12px;
        }

        .comparisonCol {
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
        }

        .comparisonCol.highlight {
          border-color: rgba(56, 189, 248, 0.3);
          background: rgba(56, 189, 248, 0.05);
        }

        .comparisonHeader {
          font-size: 13px;
          font-weight: 900;
          margin-bottom: 12px;
          opacity: 0.9;
        }

        .comparisonItem {
          font-size: 12px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.06);
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .comparisonItem:last-child {
          border-bottom: none;
        }

        .comparisonClosing {
          margin-top: 16px;
          font-size: 14px;
          font-weight: 700;
          text-align: center;
          opacity: 0.9;
        }

        .modeDiff {
          margin-top: 24px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          position: relative;
        }

        .modeDiffGrid {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 16px;
          margin-bottom: 12px;
        }

        .modeItem {
          font-size: 12px;
          line-height: 1.5;
        }

        .modeItem strong {
          font-weight: 900;
          display: block;
          margin-bottom: 4px;
        }

        .modeDiffFooter {
          text-align: center;
          font-size: 12px;
          opacity: 0.7;
          font-style: italic;
        }

        .adsActions {
          margin-top: 20px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          position: relative;
        }

        .btnAds {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 20px;
          border-radius: 14px;
          border: 1px solid rgba(56, 189, 248, 0.3);
          background: #38BDF8;
          color: #000;
          font-weight: 900;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 0 12px 34px rgba(56, 189, 248, 0.25);
          transition: all 0.2s;
        }

        .btnAds:hover {
          background: #0EA5E9;
          box-shadow: 0 16px 44px rgba(56, 189, 248, 0.35);
        }

        .btnAdsSecondary {
          background: rgba(255, 255, 255, 0.06);
          color: #fff;
          border: 1px solid rgba(255, 255, 255, 0.12);
          box-shadow: none;
        }

        .btnAdsSecondary:hover {
          border-color: rgba(56, 189, 248, 0.35);
          box-shadow: 0 0 0 6px rgba(56, 189, 248, 0.15);
        }

        @media (max-width: 768px) {
          .adsSteps {
            grid-template-columns: 1fr;
          }
          .comparisonTable {
            grid-template-columns: 1fr;
          }
          .modeDiffGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Badge */}
      <div className="adsBadge">
        <span>NEW — PERFORMANCE ADS</span>
      </div>

      {/* Headline */}
      <h2 className="adsHeadline">
        Stop guessing your ads.
        <br />
        <span style={{ color: "#38BDF8" }}>Test. Pick a winner. Scale.</span>
      </h2>

      {/* Subheadline */}
      <p className="adsSubheadline">
        Ads Mode turns your product into tested, ready-to-scale ads for TikTok, Instagram & Facebook.
        No editing. No prompts. No creative skills required.
      </p>

      {/* How It Works */}
      <div className="adsSteps">
        <div className="adsStep">
          <div className="stepNumber">01</div>
          <div className="stepTitle">Upload your product</div>
          <div className="stepMicro">Image, category, price. That's it.</div>
        </div>

        <div className="adsStep">
          <div className="stepNumber">02</div>
          <div className="stepTitle">We generate structured test variants</div>
          <div className="stepMicro">Different hooks. Different angles. Built for performance.</div>
        </div>

        <div className="adsStep">
          <div className="stepNumber">03</div>
          <div className="stepTitle">Pick the winner. Scale.</div>
          <div className="stepMicro">Generate the final ad only for what performs.</div>
        </div>
      </div>

      {/* A/B Testing Section */}
      <div className="adsSection">
        <div className="adsSectionTitle">Built for A/B testing</div>
        <ul className="adsFeatures">
          <li>Generate 2–4 ad variants automatically</li>
          <li>Hook / Trust / Strong Hook / Offer</li>
          <li>Same product, different angles</li>
        </ul>
        <div className="adsMicro">Same product. Same budget. Only the angle changes.</div>
      </div>

      {/* Vs Agencies Comparison */}
      <div className="adsComparison">
        <div className="adsSectionTitle">Why Ads Mode beats agencies</div>
        <div className="comparisonTable">
          <div className="comparisonCol">
            <div className="comparisonHeader">Agencies</div>
            <div className="comparisonItem">
              <span style={{ color: "#ef4444" }}>✕</span>
              <span>Expensive</span>
            </div>
            <div className="comparisonItem">
              <span style={{ color: "#ef4444" }}>✕</span>
              <span>Slow iterations</span>
            </div>
            <div className="comparisonItem">
              <span style={{ color: "#ef4444" }}>✕</span>
              <span>One idea</span>
            </div>
          </div>

          <div className="comparisonCol highlight">
            <div className="comparisonHeader" style={{ color: "#38BDF8" }}>Ads Mode</div>
            <div className="comparisonItem">
              <span style={{ color: "#4ade80" }}>✓</span>
              <span>Predictable</span>
            </div>
            <div className="comparisonItem">
              <span style={{ color: "#4ade80" }}>✓</span>
              <span>Test in minutes</span>
            </div>
            <div className="comparisonItem">
              <span style={{ color: "#4ade80" }}>✓</span>
              <span>Multiple variants</span>
            </div>
          </div>
        </div>
        <div className="comparisonClosing">
          Agencies sell ideas. Ads Mode sells proof.
        </div>
      </div>

      {/* Mode Differentiation */}
      <div className="modeDiff">
        <div className="modeDiffGrid">
          <div className="modeItem">
            <strong>Director Mode</strong>
            Cinema, storytelling, premium visuals
          </div>
          <div className="modeItem">
            <strong>Ads Mode</strong>
            Performance, testing, scaling
          </div>
        </div>
        <div className="modeDiffFooter">
          Two tools. Two goals.
          <br />
          Don't mix them. Performance needs discipline.
        </div>
      </div>

      {/* CTAs */}
      <div className="adsActions">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
          <Link href="/ads-mode" className="btnAds">
            Create your first Ad Pack
          </Link>
          <div style={{ fontSize: "11px", opacity: 0.7, fontStyle: "italic" }}>
            Takes less than 2 minutes. No setup.
          </div>
        </div>
        <a href="#ads-how-it-works" style={{ fontSize: "12px", opacity: 0.7, textDecoration: "underline", cursor: "pointer" }}>
          See how Ads Mode works
        </a>
      </div>
    </section>
  );
}
