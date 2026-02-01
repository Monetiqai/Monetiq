"use client";

import Link from "next/link";

export default function HeroNodeModeExplanation() {
  return (
    <section className="nodeHero">
      <style jsx>{`
        .nodeHero {
          margin-top: 32px;
          border: 1px solid rgba(139, 92, 246, 0.15);
          background: linear-gradient(180deg, rgba(139, 92, 246, 0.025), rgba(109, 40, 217, 0.015));
          border-radius: 22px;
          padding: 24px;
          position: relative;
          overflow: hidden;
        }
        .nodeHero:before {
          content: "";
          position: absolute;
          inset: -2px;
          background: radial-gradient(circle at 20% 10%, rgba(139, 92, 246, 0.08), transparent 55%);
          pointer-events: none;
        }

        .warningBlock {
          margin-top: 24px;
          margin-bottom: 24px;
          padding: 20px;
          border: 2px solid rgba(239, 68, 68, 0.3);
          background: rgba(239, 68, 68, 0.05);
          border-radius: 12px;
          position: relative;
        }

        .warningTitle {
          font-size: 14px;
          font-weight: 900;
          color: #ef4444;
          margin-bottom: 10px;
          text-transform: uppercase;
          letter-spacing: 0.5px;
        }

        .warningText {
          font-size: 12px;
          line-height: 1.6;
          opacity: 0.9;
          color: rgba(255, 255, 255, 0.85);
        }

        .nodeSteps {
          margin-top: 28px;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 16px;
          position: relative;
        }

        .nodeStep {
          padding: 16px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          border-radius: 12px;
        }

        .stepNumber {
          font-size: 12px;
          font-weight: 900;
          color: #8B5CF6;
          margin-bottom: 8px;
        }

        .stepTitle {
          font-size: 14px;
          font-weight: 700;
          margin-bottom: 8px;
        }

        .stepMicro {
          font-size: 11px;
          opacity: 0.75;
          line-height: 1.5;
        }

        .nodeSection {
          margin-top: 28px;
          padding: 20px;
          border: 1px solid rgba(255, 255, 255, 0.12);
          background: rgba(255, 255, 255, 0.03);
          border-radius: 16px;
          position: relative;
        }

        .nodeSectionTitle {
          font-size: 16px;
          font-weight: 900;
          margin-bottom: 12px;
        }

        .nodeFeatures {
          display: flex;
          flex-direction: column;
          gap: 6px;
          font-size: 12px;
          opacity: 0.85;
        }

        .nodeFeatures li {
          list-style: none;
          padding-left: 16px;
          position: relative;
          line-height: 1.4;
        }

        .nodeFeatures li:before {
          content: "–";
          position: absolute;
          left: 0;
          color: #8B5CF6;
          font-weight: 900;
        }

        .nodeMicro {
          margin-top: 12px;
          font-size: 11px;
          opacity: 0.7;
          font-style: italic;
        }

        .whySection {
          margin-top: 28px;
          padding: 20px;
          border: 1px solid rgba(139, 92, 246, 0.15);
          background: rgba(139, 92, 246, 0.03);
          border-radius: 16px;
        }

        .whyText {
          font-size: 12px;
          line-height: 1.6;
          opacity: 0.85;
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
          grid-template-columns: 1fr 1fr 1fr;
          gap: 16px;
          margin-bottom: 12px;
        }

        .modeItem {
          font-size: 11px;
          line-height: 1.5;
        }

        .modeItem strong {
          font-weight: 900;
          display: block;
          margin-bottom: 4px;
          font-size: 12px;
        }

        .modeDiffFooter {
          text-align: center;
          font-size: 12px;
          opacity: 0.7;
          font-style: italic;
          margin-top: 12px;
        }

        .nodeActions {
          margin-top: 20px;
          display: flex;
          gap: 12px;
          flex-wrap: wrap;
          position: relative;
        }

        .btnNode {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 12px 20px;
          border-radius: 14px;
          border: 1px solid rgba(139, 92, 246, 0.3);
          background: #8B5CF6;
          color: #fff;
          font-weight: 900;
          font-size: 12px;
          cursor: pointer;
          box-shadow: 0 12px 34px rgba(139, 92, 246, 0.25);
          transition: all 0.2s;
        }

        .btnNode:hover {
          background: #7C3AED;
          box-shadow: 0 16px 44px rgba(139, 92, 246, 0.35);
        }

        @media (max-width: 768px) {
          .nodeSteps {
            grid-template-columns: 1fr;
          }
          .modeDiffGrid {
            grid-template-columns: 1fr;
          }
        }
      `}</style>

      {/* WARNING BLOCK - VERY IMPORTANT */}
      <div className="warningBlock">
        <div className="warningTitle">⚠ This mode is not for everyone.</div>
        <div className="warningText">
          Node Mode is not designed to inspire you.<br />
          It is designed to replace repetition with architecture.<br /><br />
          If you are looking for presets, shortcuts, or one-click results,<br />
          this mode is not for you.
        </div>
      </div>

      {/* STEP SECTION */}
      <div className="nodeSteps">
        <div className="nodeStep">
          <div className="stepNumber">01</div>
          <div className="stepTitle">Design your logic</div>
          <div className="stepMicro">
            Every workflow starts with intent.
            Build your logic node by node.
            Each block has a role.
            Nothing is hidden.
            Nothing is guessed.
          </div>
        </div>

        <div className="nodeStep">
          <div className="stepNumber">02</div>
          <div className="stepTitle">Connect intelligence</div>
          <div className="stepMicro">
            Route prompts, images, videos, and data.
            Conditional paths.
            Multi-provider logic.
            Your system adapts automatically — without rewriting anything.
          </div>
        </div>

        <div className="nodeStep">
          <div className="stepNumber">03</div>
          <div className="stepTitle">Orchestrate at scale</div>
          <div className="stepMicro">
            From a single scene to a full creative engine.
            Reusable graphs.
            Persistent logic.
            Built to grow without breaking.
          </div>
        </div>
      </div>

      {/* CORE VALUE SECTION */}
      <div className="nodeSection">
        <div className="nodeSectionTitle">Built for architecture, not inspiration</div>
        <ul className="nodeFeatures">
          <li>Node-based creative architecture</li>
          <li>Full control over inputs, outputs, and flow</li>
          <li>Multi-provider orchestration</li>
          <li>Reusable workflows and logic graphs</li>
          <li>Zero presets</li>
          <li>Zero magic</li>
          <li>Zero guessing</li>
        </ul>
        <div className="nodeMicro">This mode is about leverage, not ideas.</div>
      </div>

      {/* WHY NODE MODE EXISTS */}
      <div className="whySection">
        <div className="nodeSectionTitle">Why Node Mode exists</div>
        <div className="whyText">
          Director Mode creates emotion.<br />
          Ads Mode creates performance.<br />
          <strong style={{ color: "#8B5CF6" }}>Node Mode creates systems.</strong><br /><br />
          Creativity does not scale by working harder.<br />
          It scales by designing infrastructure.
        </div>
      </div>

      {/* WHO IT'S FOR */}
      <div className="nodeSection">
        <div className="nodeSectionTitle">Who uses Node Mode</div>
        <ul className="nodeFeatures">
          <li>Power users</li>
          <li>Technical creators</li>
          <li>Studios and production teams</li>
          <li>Developers building creative pipelines</li>
          <li>Anyone who wants control over automation</li>
        </ul>
      </div>

      {/* WHAT NODE MODE IS NOT */}
      <div className="nodeSection">
        <div className="nodeSectionTitle">What this mode refuses to be</div>
        <ul className="nodeFeatures">
          <li style={{ color: "#ef4444" }}>✕ Beginner-friendly</li>
          <li style={{ color: "#ef4444" }}>✕ One-click generation</li>
          <li style={{ color: "#ef4444" }}>✕ Opinionated creativity</li>
          <li style={{ color: "#ef4444" }}>✕ Prompt guessing</li>
          <li style={{ color: "#ef4444" }}>✕ Inspiration-first tools</li>
        </ul>
      </div>

      {/* MODE COMPARISON */}
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
          <div className="modeItem">
            <strong>Node Mode</strong>
            Logic, orchestration, automation
          </div>
        </div>
        <div className="modeDiffFooter">
          Three modes. Three mindsets.<br />
          Don't mix them.<br />
          Power comes from separation.
        </div>
      </div>

      {/* FINAL CTA */}
      <div className="nodeActions">
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start", gap: "8px" }}>
          <Link href="/director-node" className="btnNode">
            Open the architecture
          </Link>
          <div style={{ fontSize: "11px", opacity: 0.7, fontStyle: "italic" }}>
            Build once. Reuse forever. Control everything.
          </div>
        </div>
      </div>
    </section>
  );
}
