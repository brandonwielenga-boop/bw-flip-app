// src/pages/MaxOffer.jsx
import { useEffect, useMemo, useState } from "react";

// ——— helpers ———
const toNumber = (v) => {
  if (v === null || v === undefined) return 0;
  const cleaned = String(v).replace(/[^0-9.-]/g, "");
  const n = parseFloat(cleaned);
  return Number.isFinite(n) ? n : 0;
};

const fmtMoney = (n) =>
  Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });

const STORAGE_KEY = "maxOfferProjects_v1";     // separate from RehabCalc
const REHAB_STORAGE_KEY = "rehabProjects_v1";  // RehabCalc saves (object keyed by address)

// RehabCalc parity helpers
const readRehabStore = () => {
  try {
    const raw = localStorage.getItem(REHAB_STORAGE_KEY);
    return raw ? JSON.parse(raw) : {}; // OBJECT keyed by address
  } catch {
    return {};
  }
};

const rateByScope = (scope) => {
  if (scope === "mid") return 20;
  if (scope === "gut") return 45;
  return 10; // "light" default
};

// Compute total rehab from a RehabCalc record (same math as RehabCalc)
const computeRehabTotalFromRecord = (rec) => {
  if (!rec) return 0;
  const meta = rec.meta || {};
  const sf = Number(meta.sf || 0);
  const base = sf * rateByScope(meta.scope || "light");
  const items = Array.isArray(rec.items) ? rec.items : [];

  const toggles = items.reduce((sum, it) => {
    if (!it?.included) return sum;
    if (it.name === "HVAC") return sum + Number(it.cost || 0);
    // Non-HVAC: support both 'rate' (new) and 'cost' (legacy-as-rate)
    const rate = it.rate !== undefined ? Number(it.rate || 0) : Number(it.cost || 0);
    return sum + rate * sf;
  }, 0);

  return base + toggles;
};

// ——— shared UI styles ———
const card = {
  border: "1px solid #e5e7eb",
  borderRadius: 12,
  padding: 12,
  background: "#fff",
};

const label = { fontSize: 12, color: "#374151" };
const inputBox = {
  padding: 10,
  borderRadius: 8,
  border: "1px solid #d1d5db",
  background: "#fff",
};

const btnSm = (bg) => ({
  padding: "4px 8px",
  borderRadius: 9999,
  border: "1px solid transparent",
  background: bg,
  color: "#111827",
  cursor: "pointer",
  boxShadow: "0 1px 2px rgba(0,0,0,0.06)",
  fontSize: 11,
  lineHeight: 1.1,
});

export default function MaxOffer() {
  // raw strings for nice masking; store numbers via toNumber
  const [arv, setArv] = useState("");
  const [rehab, setRehab] = useState("");

  // simple address-based save/load for MaxOffer
  const [address, setAddress] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState("");

  // RehabCalc saves (for pulling totals)
  const [rehabSavedKeys, setRehabSavedKeys] = useState([]);
  const [rehabPick, setRehabPick] = useState("");
  const [rehabFrom, setRehabFrom] = useState(""); // which RehabCalc address this offer used

  // load MaxOffer projects
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      setProjects(raw ? JSON.parse(raw) : []);
    } catch (e) {
      console.error("Failed to load max-offer projects", e);
      setProjects([]);
    }
  }, []);

  // load keys from RehabCalc store once
  useEffect(() => {
    const keys = Object.keys(readRehabStore()).sort();
    setRehabSavedKeys(keys);
    if (keys.length && !rehabPick) setRehabPick(keys[0]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const N = useMemo(
    () => ({
      arv: toNumber(arv),
      rehab: toNumber(rehab),
    }),
    [arv, rehab]
  );

  const calc = useMemo(() => {
    const tiers = [0.8, 0.75, 0.7, 0.65].map((ltv) => ({
      ltv,
      number: N.arv * ltv,
      offerAfterRehab: N.arv * ltv - N.rehab,
    }));
    return { tiers };
  }, [N]);

  // —— actions ——
  const clearValues = () => {
    setArv("");
    setRehab("");
    // keep rehabFrom so you remember context while tweaking
  };
  const resetForm = () => {
    setArv("");
    setRehab("");
    setAddress("");
    setSelectedId("");
    setRehabFrom("");
  };

  // —— save/load/delete ——
  const saveProject = () => {
    const addr = address.trim();
    if (!addr) return alert("Enter an address to save");
    const payload = {
      id: Date.now(),
      address: addr,
      arv,
      rehab,
      rehabFrom, // remember source
      updatedAt: new Date().toISOString(),
    };
    const next = upsertProject(projects, payload);
    setProjects(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const loadSelected = () => {
    const p = projects.find((x) => String(x.id) === String(selectedId));
    if (!p) return alert("Pick a saved project to load");
    setAddress(p.address || "");
    setArv(p.arv || "");
    setRehab(p.rehab || "");
    setRehabFrom(p.rehabFrom || "");
    if (p.rehabFrom) setRehabPick(p.rehabFrom);
  };

  const deleteSelected = () => {
    if (!selectedId) return alert("Pick a saved project to delete");
    const next = projects.filter((x) => String(x.id) !== String(selectedId));
    setProjects(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
    setSelectedId("");
  };

  // —— pull rehab from RehabCalc saves ——
  const pullRehabFromRehabCalc = () => {
    try {
      const store = readRehabStore(); // OBJECT keyed by address
      const norm = (s) => (s || "").trim().toLowerCase();

      // Prefer explicit pick; else fall back to typed address; else bail
      const key =
        rehabPick ||
        (address.trim()
          ? Object.keys(store).find((k) => norm(k) === norm(address))
          : "");

      if (!key) return alert("No RehabCalc project selected or matching address.");
      const rec = store[key];
      if (!rec) return alert("Saved RehabCalc project not found.");
      const total = computeRehabTotalFromRecord(rec);
      setRehab(String(total || 0));
      setRehabFrom(key); // remember where it came from
    } catch (e) {
      console.error("Failed to read rehab projects", e);
      alert("Couldn't read RehabCalc saves");
    }
  };

  const input = (labelText, value, setter, { money = true, right = "" } = {}) => (
    <div style={{ display: "grid", gap: 6 }}>
      <label style={label}>{labelText}</label>
      <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
        <input
          type="text"
          inputMode="decimal"
          placeholder={money ? "$0" : "0"}
          value={money ? (value ? `$${fmtMoney(toNumber(value))}` : "") : value}
          onChange={(e) => setter(e.target.value)}
          style={{ ...inputBox, flex: 1 }}
        />
        {right && <div style={{ fontSize: 12, color: "#6b7280" }}>{right}</div>}
      </div>
    </div>
  );

  return (
    <div style={{ padding: 20, maxWidth: 880, margin: "40px auto", display: "grid", gap: 14 }}>
      <div style={{ display: "flex", alignItems: "baseline", justifyContent: "center" }}>
        <h2 style={{ margin: 0 }}>Max Offer Calculator</h2>
      </div>

      {/* Project controls */}
      <div style={{ ...card, display: "grid", gap: 8 }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 90px 90px", gap: 8 }}>
          <input
            type="text"
            placeholder="Property address (e.g., 1219 Claremont St, Lincoln)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            style={inputBox}
          />
          <button
            onClick={saveProject}
            style={{
              ...btnSm("#e0e7ff", "#1d4ed8"),
              fontSize: 14,
              padding: "3px 6px",
              border: "1px solid #bfdbfe",
              width: "100%",
            }}
          >
            Save
          </button>
          <button
            onClick={deleteSelected}
            style={{
              ...btnSm("#fee2e2", "#b91c1c"),
              fontSize: 14,
              padding: "3px 6px",
              border: "1px solid #fecaca",
              width: "100%",
            }}
          >
            Delete
          </button>
        </div>

        <div style={{ display: "grid", gridTemplateColumns: "1.6fr 90px 90px", gap: 8 }}>
          <select
            value={selectedId}
            onChange={(e) => setSelectedId(e.target.value)}
            style={inputBox}
          >
            <option value="">Saved projects…</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.address}{p.rehabFrom ? ` — uses: ${p.rehabFrom}` : ""}
              </option>
            ))}
          </select>
          <button
            onClick={loadSelected}
            style={{
              ...btnSm("#dcfce7", "#15803d"),
              fontSize: 14,
              padding: "3px 6px",
              border: "1px solid #bbf7d0",
              width: "100%",
            }}
          >
            Load
          </button>
          <button
            onClick={deleteSelected}
            style={{
              ...btnSm("#fee2e2", "#b91c1c"),
              fontSize: 14,
              padding: "3px 6px",
              border: "1px solid #fecaca",
              width: "100%",
            }}
          >
            Remove
          </button>
        </div>
      </div>

      {/* Pull Rehab from RehabCalc */}
      <div style={{ ...card, display: "grid", gridTemplateColumns: "1fr auto", gap: 8 }}>
        <select
          value={rehabPick}
          onChange={(e) => setRehabPick(e.target.value)}
          style={inputBox}
        >
          <option value="" disabled>
            {rehabSavedKeys.length ? "Select saved RehabCalc address" : "No saved RehabCalc projects"}
          </option>
          {rehabSavedKeys.map((k) => (
            <option key={k} value={k}>
              {k}
            </option>
          ))}
        </select>
        <button
          onClick={pullRehabFromRehabCalc}
          disabled={!rehabSavedKeys.length}
          style={{
            ...btnSm("#e0f2fe", "#0369a1"),
            border: "1px solid #bae6fd",
            opacity: rehabSavedKeys.length ? 1 : 0.5,
          }}
        >
          Load Rehab
        </button>
      </div>

      {/* Inputs */}
      <div style={{ ...card }}>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          {input("After Repair Value (ARV)", arv, setArv)}
          {input("Rehab Cost", rehab, setRehab)}
        </div>

        {/* Source tag */}
        {rehabFrom && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: "#065f46",
              background: "#ecfdf5",
              border: "1px solid #a7f3d0",
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "6px 10px",
              borderRadius: 999,
            }}
          >
            <span>Loaded from RehabCalc:</span>
            <strong>{rehabFrom}</strong>
            <button
              onClick={() => setRehabFrom("")}
              style={{
                marginLeft: 6,
                border: "none",
                background: "transparent",
                cursor: "pointer",
                color: "#047857",
              }}
              title="Clear tag"
            >
              ×
            </button>
          </div>
        )}
      </div>

      {/* LTV Amount */}
      <div style={{ ...card }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>LTV Amount</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {calc.tiers.map((t) => (
            <div key={t.ltv} style={{ ...card, padding: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                {(t.ltv * 100).toFixed(0)}% LTV
              </div>
              <div style={{ fontWeight: 700 }}>${fmtMoney(t.number)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Max Offer per LTV */}
      <div style={{ ...card }}>
        <div style={{ fontWeight: 600, marginBottom: 6 }}>Max Offer at Each LTV</div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: 8 }}>
          {calc.tiers.map((t) => (
            <div key={t.ltv} style={{ ...card, padding: 10 }}>
              <div style={{ fontSize: 12, color: "#6b7280" }}>
                Offer @ {(t.ltv * 100).toFixed(0)}% LTV
              </div>
              <div style={{ fontWeight: 700 }}>${fmtMoney(t.offerAfterRehab)}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Bottom actions */}
      <div
        style={{
          display: "flex",
          gap: 8,
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <button
          onClick={clearValues}
          style={{ ...btnSm("#f3f4f6", "#374151"), border: "1px solid #e5e7eb" }}
        >
          Clear Values
        </button>
        <button
          onClick={resetForm}
          style={{ ...btnSm("#fee2e2", "#b91c1c"), border: "1px solid #fecaca" }}
        >
          Reset Form
        </button>
      </div>
    </div>
  );
}

function upsertProject(list, item) {
  const idx = list.findIndex(
    (x) => x.address.trim().toLowerCase() === item.address.trim().toLowerCase()
  );
  if (idx >= 0) {
    const next = [...list];
    next[idx] = { ...next[idx], ...item, id: next[idx].id || item.id };
    return next;
  }
  return [item, ...list];
}
