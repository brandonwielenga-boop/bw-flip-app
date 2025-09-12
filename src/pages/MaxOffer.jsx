import { useState } from "react";

export default function MaxOffer() {
  const [arv, setArv] = useState("");
  const [rehab, setRehab] = useState("");

  const arvNum = parseFloat(arv) || 0;
  const rehabNum = parseFloat(rehab) || 0;

  const offers = [0.65, 0.7, 0.75, 0.8].map(pct => ({
    pct,
    value: arvNum * pct - rehabNum
  }));

  return (
    <div style={{ padding: 20 }}>
      <h2>Max Offer Calculator</h2>

      <label>After Repair Value (ARV)</label>
      <input
        type="number"
        placeholder="e.g. 250000"
        value={arv}
        onChange={(e) => setArv(e.target.value)}
        style={{ display: "block", margin: "8px 0 16px", width: "100%", padding: 10 }}
      />

      <label>Rehab Costs</label>
      <input
        type="number"
        placeholder="e.g. 45000"
        value={rehab}
        onChange={(e) => setRehab(e.target.value)}
        style={{ display: "block", margin: "8px 0 16px", width: "100%", padding: 10 }}
      />

      <ul style={{ lineHeight: 1.8, padding: 0, listStyle: "none" }}>
        {offers.map(o => (
          <li key={o.pct}>
            <strong>{(o.pct * 100).toFixed(0)}%</strong>: ${o.value.toLocaleString()}
          </li>
        ))}
      </ul>
    </div>
  );
}
