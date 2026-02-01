"use client";

import Link from "next/link";

export default function HeroDirectorModeExplanation() {
  return (
    <section className="directorExplanation">
      <style jsx>{`
        .directorExplanation {
          margin-top: 32px;
          border: 1px solid rgba(255, 167, 38, 0.2);
          background: linear-gradient(180deg, rgba(255, 167, 38, 0.04), rgba(255, 143, 0, 0.02));
          border-radius: 22px;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        .directorExplanation:before {
          content: "";
          position: absolute;
          inset: -2px;
          background: radial-gradient(circle at 20% 10%, rgba(255, 167, 38, 0.15), transparent 55%);
          pointer-events: none;
        }

        .directorHeadline {
          margin: 0 0 12px;
          font-size: clamp(28px, 4vw, 34px);
          line-height: 1.1;
          letter-spacing: -0.6px;
          font-weight: 950;
          position: relative;
        }

        .directorSubheadline {
          margin: 0 0 32px;
          font-size: 13px;
          opacity: 0.78;
          line-height: 1.5;
          max-width: 72ch;
          position: relative;
        }

        .directorSteps {
          margin-top: 24px;
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          position: relative;
        }

        .directorStep {
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
        }

        .stepNumber {
          font-size: 12px;
          font-weight: 900;
          color: #ffa726;
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

        .directorSection {
          margin-top: 24px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          position: relative;
        }

        .directorSectionTitle {
          font-size: 16px;
          font-weight: 900;
          margin-bottom: 12px;
        }

        .directorFeatures {
          display: flex;
          flex-direction: column;
          gap: 8px;
          font-size: 13px;
          opacity: 0.85;
        }

        .directorFeatures li {
          list-style: none;
          padding-left: 20px;
          position: relative;
        }

        .directorFeatures li:before {
          content: "•";
          position: absolute;
          left: 0;
          color: #ffa726;
          font-weight: 900;
        }

        .directorMicro {
          margin-top: 12px;
          font-size: 12px;
          opacity: 0.7;
          font-style: italic;
        }

        .directorComparison {
          margin-top: 24px;
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.2);
          background: rgba(255, 255, 255, 0.04);
          border-radius: 12px;
          text-align: center;
          font-size: 12px;
          opacity: 0.8;
          font-style: italic;
        }

        .directorActions {
          margin-top: 20px;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
          position: relative;
        }

        .btnDirector {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 20px;
          border-radius: 14px;
          border: 1px solid rgba(255, 167, 38, 0.3);
          background: #ffa726;
          color: #000;
          font-weight: 900;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 0 12px 34px rgba(255, 167, 38, 0.25);
          transition: all 0.2s;
          text-decoration: none;
        }

        .btnDirector:hover {
          background: #ff8f00;
          box-shadow: 0 16px 44px rgba(255, 167, 38, 0.35);
        }

        @media (max-width: 768px) {
          .directorSteps {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* Headline */}
      <h2 className="directorHeadline">
        Create films. <span style={{ color: "#ffa726", fontWeight: 700 }}>Not ads.</span>
      </h2>

      {/* Subheadline */}
      <p className="directorSubheadline">
        Director Mode is built for storytelling, cinematic identity, and premium visuals.
        This is where vision comes first.
      </p>

      {/* Steps */}
      <div className="directorSteps">
        <div className="directorStep">
          <div className="stepNumber">01</div>
          <div className="stepTitle">Define your vision</div>
          <div className="stepMicro">
            Choose a cinematic style.
            <br />
            Mood, rhythm, intention.
          </div>
        </div>

        <div className="directorStep">
          <div className="stepNumber">02</div>
          <div className="stepTitle">Build your scene</div>
          <div className="stepMicro">
            Multi-shot sequences.
            <br />
            Controlled camera language.
            <br />
            Visual consistency.
          </div>
        </div>

        <div className="directorStep">
          <div className="stepNumber">03</div>
          <div className="stepTitle">Shape your film</div>
          <div className="stepMicro">
            Trailers, scenes, short films.
            <br />
            Designed to leave an impression.
          </div>
        </div>
      </div>

      {/* Purpose Section */}
      <div className="directorSection">
        <div className="directorSectionTitle">Built for cinematic storytelling</div>
        <ul className="directorFeatures">
          <li>Narrative-driven visuals</li>
          <li>Premium composition and pacing</li>
          <li>Brand image and long-term perception</li>
          <li>Not optimized for ads or testing</li>
        </ul>
        <div className="directorMicro">This mode is about emotion, not metrics.</div>
      </div>

      {/* Comparison */}
      <div className="directorComparison">
        Director Mode builds brand memory. Ads Mode builds performance.
      </div>

      {/* CTA */}
      <div className="directorActions">
        <Link href="/director-mode" className="btnDirector">
          Enter the Studio
        </Link>
        <div style={{ fontSize: "11px", opacity: 0.7, fontStyle: "italic" }}>
          For filmmakers, brands, and creators.
        </div>
      </div>
    </section>
  );
}
