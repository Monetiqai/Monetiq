"use client";

import Link from "next/link";
import { useState } from "react";
import { DIRECTORS, CAMERAS, LENSES, FOCAL_LENGTHS, APERTURES } from "@/lib/cinema";
import { buildPrompt } from "@/lib/presets/utils";

export default function DirectorMode() {
  // Cinema settings
  const [director, setDirector] = useState("nolan");
  const [camera, setCamera] = useState("red_vraptor");
  const [lens, setLens] = useState("cooke_s4");
  const [focal, setFocal] = useState("35mm");
  const [aperture, setAperture] = useState("f4");
  const [userPrompt, setUserPrompt] = useState("");

  // UI state
  const [generating, setGenerating] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState("");

  const selectedDirector = DIRECTORS[director];

  function buildCinemaPrompt(): string {
    const directorPrompt = DIRECTORS[director]?.prompt;
    const cameraPrompt = CAMERAS[camera]?.prompt;
    const lensPrompt = LENSES[lens]?.prompt;
    const focalPrompt = FOCAL_LENGTHS[focal]?.prompt;
    const aperturePrompt = APERTURES[aperture]?.prompt;

    const cinemaParts = [
      directorPrompt,
      cameraPrompt,
      lensPrompt,
      focalPrompt,
      aperturePrompt,
    ];

    const negative =
      "No amateur footage, no shaky cam, no overexposed highlights, no digital noise, no cheap effects, maintain cinematic quality and coherence.";

    const cinemaPrompt = buildPrompt(cinemaParts, negative);

    if (userPrompt.trim()) {
      return `${userPrompt.trim()}\n\n${cinemaPrompt}`;
    }

    return cinemaPrompt;
  }

  async function handleGenerate() {
    if (!userPrompt.trim()) {
      alert("Please describe your scene in the prompt field");
      return;
    }

    setGenerating(true);
    const finalPrompt = buildCinemaPrompt();

    try {
      // Display the generated prompt
      setGeneratedPrompt(finalPrompt);
      console.log("Generated Prompt:", finalPrompt);
    } catch (error: any) {
      console.error("Generation error:", error);
      alert(error?.message ?? "Generation failed");
    } finally {
      setGenerating(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", background: "#0b0b0b", color: "white" }}>
      <style>{`
        :root {
          --bg: #0b0b0b;
          --panel: rgba(255,255,255,.04);
          --panel2: rgba(255,255,255,.06);
          --border: rgba(255,255,255,.12);
          --textDim: rgba(255,255,255,.78);
          --sky: #38BDF8;
          --sky2: #0EA5E9;
          --skyGlow: rgba(56,189,248,0.25);
        }

        * { box-sizing: border-box; }
        a { color: inherit; text-decoration: none; }
        button { font: inherit; }

        .wrap {
          width: min(1200px, 92vw);
          margin: 0 auto;
          padding: 20px 0 90px;
        }

        .header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid var(--border);
          margin-bottom: 24px;
        }

        .brand {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .brandTitle {
          font-size: 18px;
          font-weight: 950;
          letter-spacing: -0.3px;
        }

        .brandSub {
          font-size: 12px;
          opacity: 0.7;
          margin-top: 2px;
        }

        .btn {
          display: inline-flex;
          align-items: center;
          justify-content: center;
          padding: 10px 16px;
          border-radius: 14px;
          border: 1px solid rgba(255,255,255,.12);
          background: rgba(255,255,255,.06);
          font-weight: 900;
          font-size: 12px;
          cursor: pointer;
          transition: all 0.2s;
        }

        .btn:hover {
          border-color: rgba(56,189,248,.35);
          box-shadow: 0 0 0 6px var(--skyGlow);
        }

        .btnPrimary {
          background: var(--sky);
          color: #001018;
          border-color: rgba(255,255,255,.06);
          box-shadow: 0 12px 34px var(--skyGlow);
        }

        .btnPrimary:hover {
          background: var(--sky2);
          box-shadow: 0 16px 44px var(--skyGlow);
        }

        .btnPrimary:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        /* Director Header */
        .directorHeader {
          display: flex;
          align-items: center;
          gap: 20px;
          padding: 24px;
          background: linear-gradient(135deg, rgba(255,255,255,.08), rgba(255,255,255,.04));
          border-radius: 18px;
          border: 1px solid rgba(255,255,255,.12);
          margin-bottom: 24px;
        }

        .directorPhoto {
          width: 90px;
          height: 90px;
          border-radius: 50%;
          object-fit: cover;
          border: 3px solid rgba(56,189,248,.5);
          box-shadow: 0 8px 24px rgba(0,0,0,.4);
        }

        .directorInfo h2 {
          font-size: 22px;
          font-weight: 950;
          margin: 0;
          letter-spacing: -0.4px;
        }

        .directorInfo p {
          font-size: 13px;
          opacity: 0.75;
          margin: 6px 0 0;
        }

        /* Controls */
        .controls {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
          gap: 16px;
          margin-bottom: 20px;
        }

        .control {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
        }

        .controlLabel {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.7;
          margin-bottom: 10px;
        }

        .controlSelect {
          width: 100%;
          padding: 12px;
          background: var(--panel2);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s;
        }

        .controlSelect:hover {
          border-color: rgba(56,189,248,.35);
        }

        .controlSelect:focus {
          outline: none;
          border-color: var(--sky);
          box-shadow: 0 0 0 4px var(--skyGlow);
        }

        .promptArea {
          background: var(--panel);
          border: 1px solid var(--border);
          border-radius: 14px;
          padding: 16px;
          margin-bottom: 20px;
        }

        .promptLabel {
          font-size: 12px;
          font-weight: 900;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          opacity: 0.7;
          margin-bottom: 10px;
        }

        .promptInput {
          width: 100%;
          min-height: 120px;
          padding: 14px;
          background: var(--panel2);
          border: 1px solid var(--border);
          border-radius: 10px;
          color: white;
          font-size: 14px;
          font-family: inherit;
          resize: vertical;
          transition: all 0.2s;
        }

        .promptInput:hover {
          border-color: rgba(56,189,248,.35);
        }

        .promptInput:focus {
          outline: none;
          border-color: var(--sky);
          box-shadow: 0 0 0 4px var(--skyGlow);
        }

        .promptInput::placeholder {
          color: rgba(255,255,255,.4);
        }

        .generateSection {
          display: flex;
          justify-content: center;
          margin-top: 24px;
        }

        @media (max-width: 768px) {
          .controls {
            grid-template-columns: 1fr;
          }

          .directorHeader {
            flex-direction: column;
            text-align: center;
          }
        }
      `}</style>

      <div className="wrap">
        {/* Header */}
        <div className="header">
          <div className="brand">
            <div>
              <div className="brandTitle">🎬 Director Mode</div>
              <div className="brandSub">Create your film like your favorite director</div>
            </div>
          </div>
          <div style={{ display: "flex", gap: "12px", alignItems: "center" }}>
            <button
              className="btn"
              onClick={() => {
                localStorage.removeItem('director-mode-onboarding-seen');
                window.location.reload();
              }}
              style={{ fontSize: "12px" }}
            >
              📽️ Rewatch Onboarding
            </button>
            <Link href="/" className="btn">
              ← Back to Home
            </Link>
          </div>
        </div>

        {/* Director Header */}
        <div className="directorHeader">
          <img
            src={selectedDirector.photo}
            alt={selectedDirector.name}
            className="directorPhoto"
          />
          <div className="directorInfo">
            <h2>{selectedDirector.name}</h2>
            <p>{selectedDirector.tagline}</p>
          </div>
        </div>

        {/* Cinema Controls */}
        <div className="controls">
          {/* Director */}
          <div className="control">
            <div className="controlLabel">Director</div>
            <select
              className="controlSelect"
              value={director}
              onChange={(e) => setDirector(e.target.value)}
            >
              <option value="tarantino">Quentin Tarantino</option>
              <option value="spielberg">Steven Spielberg</option>
              <option value="besson">Luc Besson</option>
              <option value="nolan">Christopher Nolan</option>
              <option value="kubrick">Stanley Kubrick</option>
              <option value="anderson">Wes Anderson</option>
              <option value="cameron">James Cameron</option>
              <option value="burton">Tim Burton</option>
              <option value="scorsese">Martin Scorsese</option>
            </select>
          </div>

          {/* Camera */}
          <div className="control">
            <div className="controlLabel">Camera</div>
            <select
              className="controlSelect"
              value={camera}
              onChange={(e) => setCamera(e.target.value)}
            >
              <option value="red_vraptor">Red V-Raptor</option>
              <option value="sony_venice">Sony Venice</option>
              <option value="imax">IMAX Film Camera</option>
              <option value="arri_alexa">Arri Alexa</option>
              <option value="arriflex_16sr">Arriflex 16SR</option>
              <option value="panavision_dxl2">Panavision Millennium DXL2</option>
            </select>
          </div>

          {/* Lens */}
          <div className="control">
            <div className="controlLabel">Lens</div>
            <select
              className="controlSelect"
              value={lens}
              onChange={(e) => setLens(e.target.value)}
            >
              <option value="lensbaby">Lensbaby</option>
              <option value="hawk_vlite">Hawk V-Lite</option>
              <option value="laowa_macro">Laowa Macro</option>
              <option value="canon_k35">Canon K-35</option>
              <option value="panavision_c">Panavision C-Series</option>
              <option value="arri_signature">Arri Signature Prime</option>
              <option value="cooke_s4">Cooke S4</option>
              <option value="petzval">Petzval</option>
              <option value="helios">Helios</option>
              <option value="zeiss_ultra">Zeiss Ultra Prime</option>
            </select>
          </div>

          {/* Focal Length */}
          <div className="control">
            <div className="controlLabel">Focal Length</div>
            <select
              className="controlSelect"
              value={focal}
              onChange={(e) => setFocal(e.target.value)}
            >
              <option value="8mm">8mm (Ultra Wide)</option>
              <option value="14mm">14mm (Wide)</option>
              <option value="35mm">35mm (Balanced)</option>
              <option value="50mm">50mm (Intimate)</option>
            </select>
          </div>

          {/* Aperture */}
          <div className="control">
            <div className="controlLabel">Aperture</div>
            <select
              className="controlSelect"
              value={aperture}
              onChange={(e) => setAperture(e.target.value)}
            >
              <option value="f1_4">f/1.4 (Artistic)</option>
              <option value="f4">f/4 (Balanced)</option>
              <option value="f11">f/11 (Clinical)</option>
            </select>
          </div>
        </div>

        {/* User Prompt */}
        <div className="promptArea">
          <div className="promptLabel">Your Scene Description</div>
          <textarea
            className="promptInput"
            value={userPrompt}
            onChange={(e) => setUserPrompt(e.target.value)}
            placeholder="Describe your scene, action, mood, or narrative context... (e.g., 'A luxury perfume bottle on a marble surface, soft morning light, elegant and premium atmosphere')"
          />
        </div>

        {/* Generate Button */}
        <div className="generateSection">
          <button
            className="btn btnPrimary"
            onClick={handleGenerate}
            disabled={generating}
          >
            {generating ? "Generating..." : "Generate Cinema Prompt →"}
          </button>
        </div>

        {/* Generated Prompt Display */}
        {generatedPrompt && (
          <div className="promptArea" style={{ marginTop: "24px" }}>
            <div className="promptLabel">Generated Cinema Prompt</div>
            <div style={{
              padding: "16px",
              background: "rgba(56,189,248,.08)",
              border: "1px solid rgba(56,189,248,.3)",
              borderRadius: "10px",
              color: "white",
              fontSize: "13px",
              lineHeight: "1.6",
              whiteSpace: "pre-wrap",
              fontFamily: "monospace"
            }}>
              {generatedPrompt}
            </div>
            <div style={{ marginTop: "12px", display: "flex", gap: "10px" }}>
              <button
                className="btn"
                onClick={() => {
                  navigator.clipboard.writeText(generatedPrompt);
                  alert("Prompt copied to clipboard!");
                }}
              >
                📋 Copy to Clipboard
              </button>
              <button
                className="btn"
                onClick={() => setGeneratedPrompt("")}
              >
                ✕ Clear
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
