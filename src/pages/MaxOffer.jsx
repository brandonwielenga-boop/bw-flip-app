import { useState } from "react";

export default function MaxOffer() {
  const [arv, setArv] = useState("");
  const [rehab, setRehab] = useState("");

  const toNum = (v) => {
    const n = parseFloat(String(v).replace(/,/g, ""));
    return Number.isFinite(n) ? n : 0;
  };

  const arvNum = toNum(arv);
  const rehabNum = toNum(rehab);

  const offers = [0.65, 0.7, 0.75, 0.8].map((pct) => ({
    pct,
    value: Math.max(0, arvNum * pct - rehabNum),
  }));

  const fmtMoney = (n) =>
    n.toLocaleString(undefined, { maximumFractionDigits: 0 });

  const handleClear = () => {
    setArv("");
    setRehab("");
  };

  return (
    <div style={{ padding: 20, maxWidth: 500, margin: "0 auto" }}>
      <h2 style={{ marginBottom: 20 }}>Max Offer Calculator</h2>

      {/* Inputs */}
      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 6 }}>
          After Repair Value (ARV)
        </label>
        <input
          type="number"
          placeholder="e.g. 250000"
          value={arv}
          onChange={(e) => setArv(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{ display: "block", marginBottom: 6 }}>
          Rehab Costs
        </label>
        <input
          type="number"
          placeholder="e.g. 45000"
          value={rehab}
          onChange={(e) => setRehab(e.target.value)}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 6,
            border: "1px solid #ccc",
          }}
        />
      </div>

      {/* Clear button */}
      <button
        onClick={handleClear}
        style={{
          marginBottom: 24,
          padding: "8px 16px",
          border: "none",
          borderRadius: 6,
          background: "#ef4444",
          color: "#fff",
          cursor: "pointer",
        }}
      >
        Clear
      </button>

      {/* Offers */}
      <h3 style={{ marginBottom: 10 }}>Max Offer</h3>
      <div style={{ display: "grid", gap: 10 }}>
        {offers.map((o) => (
          <div
            key={o.pct}
            style={{
              padding: 12,
              borderRadius: 6,
              border: "1px solid #ddd",
              background: "#f9fafb",
              display: "flex",
              justifyContent: "space-between",
            }}
          >
            <strong>LTV {(o.pct * 100).toFixed(0)}%</strong>
            <span>{o.value > 0 ? `$${fmtMoney(o.value)}` : "$0"}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

