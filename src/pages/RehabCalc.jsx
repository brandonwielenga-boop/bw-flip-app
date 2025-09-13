import { useEffect, useState } from "react";

// Key for localStorage
const STORE_KEY = "rehabProjects_v1";

// Default line items
const DEFAULT_ITEMS = [
  { id: 1, name: "Roof", included: false, rate: 0 },      // $/sf
  { id: 2, name: "Siding", included: false, rate: 0 },    // $/sf
  { id: 3, name: "HVAC", included: false, cost: 0 },      // flat amount
  { id: 4, name: "Rewiring", included: false, rate: 0 },  // $/sf
  { id: 5, name: "Repiping", included: false, rate: 0 },  // $/sf
  { id: 6, name: "Flooring", included: false, rate: 0 },  // $/sf
];

// Helpers for localStorage
const readStore = () => {
  try {
    const raw = localStorage.getItem(STORE_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch (e) {
    console.warn("Failed to read store:", e);
    return {};
  }
};

const writeStore = (obj) => {
  try {
    localStorage.setItem(STORE_KEY, JSON.stringify(obj));
  } catch (e) {
    console.warn("Failed to write store:", e);
  }
};

// Small, accessible toggle switch
function Toggle({ checked, onChange }) {
  const width = 44;
  const height = 24;
  const knob = 20;
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      onClick={() => onChange(!checked)}
      style={{
        width,
        height,
        borderRadius: height,
        border: "1px solid #d1d5db",
        background: checked ? "#10b981" : "#e5e7eb",
        position: "relative",
        padding: 0,
        cursor: "pointer",
        transition: "background 150ms ease",
      }}
    >
      <span
        style={{
          position: "absolute",
          top: 1,
          left: checked ? width - knob - 1 : 1,
          width: knob,
          height: knob,
          borderRadius: knob,
          background: "#fff",
          boxShadow: "0 1px 2px rgba(0,0,0,0.2)",
          transition: "left 150ms ease",
        }}
      />
    </button>
  );
}

export default function RehabCalc() {
  // currency helpers for toggle inputs
  const toNumber = (v) => {
    if (v === null || v === undefined) return 0;
    const cleaned = String(v).replace(/[^0-9.-]/g, "");
    const n = parseFloat(cleaned);
    return Number.isFinite(n) ? n : 0;
  };
  const fmtCurrency = (v) => Number(v || 0).toLocaleString(undefined, { maximumFractionDigits: 2 });
  const [items, setItems] = useState(DEFAULT_ITEMS);
  const [address, setAddress] = useState("");
  const [savedList, setSavedList] = useState([]); // array of addresses
  const [selectedSaved, setSelectedSaved] = useState("");

  // SF-based estimator state (single block)
  const RATE_OPTIONS = [
    { key: "light", label: "Light Rehab ($10/sf)", rate: 10 },
    { key: "mid", label: "Mid Tier Rehab ($20/sf)", rate: 20 },
    { key: "gut", label: "Gut Job ($45/sf)", rate: 45 },
  ];
  const [sf, setSf] = useState(0);
  const [scope, setScope] = useState(RATE_OPTIONS[0].key);

  const rateByKey = (k) => RATE_OPTIONS.find((o) => o.key === k)?.rate || 0;
  const baseRehab = Number(sf || 0) * rateByKey(scope);

  // Load saved keys on mount
  useEffect(() => {
    const keys = Object.keys(readStore()).sort();
    setSavedList(keys);
    if (keys.length && !selectedSaved) setSelectedSaved(keys[0]);
  }, []);

  const updateItem = (id, field, value) => {
    setItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  // TOTAL = Base Rehab (SF * $/sf from scope) + toggles
  // Toggles: HVAC uses flat 'cost'; others use 'rate * sf'
  const togglesTotal = items
    .filter((item) => item.included)
    .reduce((sum, item) => {
      if (item.name === "HVAC") {
        return sum + Number(item.cost || 0);
      }
      return sum + Number(item.rate || 0) * Number(sf || 0);
    }, 0);
  const total = baseRehab + togglesTotal;

  const clear = () => {
    setItems((prev) => prev.map((item) => ({ ...item, cost: 0, included: false })));
    setSf(0);
    setScope(RATE_OPTIONS[0].key);
  };

  // Save current items under the typed address (including SF estimator)
  const saveProject = () => {
    const key = address.trim();
    if (!key) {
      alert("Enter an address before saving.");
      return;
    }
    const store = readStore();
    store[key] = { items, meta: { sf, scope } };
    writeStore(store);
    const keys = Object.keys(store).sort();
    setSavedList(keys);
    setSelectedSaved(key);
  };

  // Delete the typed address project
  const deleteCurrent = () => {
    const key = address.trim();
    if (!key) {
      alert("Enter the address you want to delete, or use the dropdown below.");
      return;
    }
    const store = readStore();
    if (!(key in store)) {
      alert("No saved project found for that address.");
      return;
    }
    if (!confirm(`Delete saved project for "${key}"?`)) return;
    delete store[key];
    writeStore(store);
    const keys = Object.keys(store).sort();
    setSavedList(keys);
    if (selectedSaved === key) setSelectedSaved(keys[0] || "");
  };

  // Load selected project from dropdown
  const loadSelected = () => {
    if (!selectedSaved) return;
    const store = readStore();
    const record = store[selectedSaved];
    if (!record) return;
    setAddress(selectedSaved);
    // Ensure we keep stable ids if shape changed
    const merged = (record.items || []).map((it, idx) => ({
      id: it.id ?? idx + 1,
      name: it.name ?? `Item ${idx + 1}`,
      included: it.included ?? false,
      // Support both old 'cost' and new 'rate' schema
      cost: it.cost !== undefined ? Number(it.cost || 0) : (it.name === "HVAC" ? 0 : undefined),
      rate: it.rate !== undefined ? Number(it.rate || 0) : (it.name !== "HVAC" ? Number(it.cost || 0) : 0),
    }));
    // Ensure new default items (e.g., Flooring) are present when loading older saves
    let ensured = [...merged];
    const have = new Set(ensured.map((x) => x.name));
    const nextIdBase = Math.max(0, ...ensured.map((x) => Number(x.id) || 0));
    let addIdx = 1;
    DEFAULT_ITEMS.forEach((def) => {
      if (!have.has(def.name)) {
        ensured.push({ ...def, id: nextIdBase + addIdx++ });
      }
    });
    setItems(ensured.length ? ensured : DEFAULT_ITEMS);

    // load meta
    const meta = record.meta || {};
    setSf(Number(meta.sf || 0));
    setScope(meta.scope || RATE_OPTIONS[0].key);
  };

  // Delete selected project from dropdown
  const deleteSelected = () => {
    if (!selectedSaved) return;
    const store = readStore();
    if (!(selectedSaved in store)) return;
    if (!confirm(`Delete saved project for "${selectedSaved}"?`)) return;
    delete store[selectedSaved];
    writeStore(store);
    const keys = Object.keys(store).sort();
    setSavedList(keys);
    setSelectedSaved(keys[0] || "");
    // If deleting the one currently in the address field, keep the working form intact
  };

  return (
    <div style={{ padding: 20, maxWidth: 720, margin: "40px auto" }}>
      <h2 style={{ marginBottom: 8 }}>Rehab Calculator</h2>
      <p style={{ color: "#666", marginBottom: 16 }}>
        Enter costs, toggle categories on/off, and save/load projects by address.
      </p>

      {/* Project Header Card */}
      <div
        style={{
          border: "1px solid #e5e7eb",
          borderRadius: 10,
          padding: 12,
          marginBottom: 16,
          boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
        }}
     >
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8 }}>
          <input
            type="text"
            placeholder="Property address (e.g., 1219 Claremont St, Lincoln, NE)"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            style={{
              padding: 10,
              borderRadius: 8,
              border: "1px solid #d1d5db",
            }}
          />
          <button
            onClick={saveProject}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              background: "#2563eb",
              color: "#fff",
              cursor: "pointer",
            }}
          >
            Save
          </button>
          <button
            onClick={deleteCurrent}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "1px solid #ef4444",
              background: "#fff",
              color: "#ef4444",
              cursor: "pointer",
            }}
          >
            Delete
          </button>
        </div>

        {/* Saved projects row */}
        <div style={{ display: "grid", gridTemplateColumns: "1fr auto auto", gap: 8, marginTop: 10 }}>
          <select
            value={selectedSaved}
            onChange={(e) => setSelectedSaved(e.target.value)}
            style={{ padding: 10, borderRadius: 8, border: "1px solid #d1d5db" }}
          >
            <option value="" disabled>
              {savedList.length ? "Select saved address" : "No saved addresses yet"}
            </option>
            {savedList.map((k) => (
              <option key={k} value={k}>
                {k}
              </option>
            ))}
          </select>
          <button
            onClick={loadSelected}
            disabled={!selectedSaved}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: "none",
              background: selectedSaved ? "#10b981" : "#9ca3af",
              color: "#fff",
              cursor: selectedSaved ? "pointer" : "not-allowed",
            }}
          >
            Load
          </button>
          <button
            onClick={deleteSelected}
            disabled={!selectedSaved}
            style={{
              padding: "10px 14px",
              borderRadius: 8,
              border: selectedSaved ? "1px solid #ef4444" : "1px solid #e5e7eb",
              background: "#fff",
              color: selectedSaved ? "#ef4444" : "#9ca3af",
              cursor: selectedSaved ? "pointer" : "not-allowed",
            }}
          >
            Delete Selected
          </button>
        </div>
      </div>

      {/* --- SF estimator moved BELOW saved addresses and ABOVE toggles --- */}
      <div style={{ border: "1px solid #e5e7eb", borderRadius: 8, padding: 10, marginBottom: 12 }}>
        <div style={{ fontSize: 12, color: "#374151", marginBottom: 6 }}>Square Footage</div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
          <input
            type="number"
            placeholder="0"
            value={sf}
            onChange={(e) => setSf(toNumber(e.target.value))}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}
          />
          <select
            value={scope}
            onChange={(e) => setScope(e.target.value)}
            style={{ padding: 8, borderRadius: 8, border: "1px solid #d1d5db" }}
          >
            {RATE_OPTIONS.map((o) => (
              <option key={o.key} value={o.key}>{o.label}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Toggle rows */}
      {items.map((item) => (
        <div
          key={item.id}
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            marginBottom: 10,
            border: "1px solid #e5e7eb",
            borderRadius: 8,
            padding: 10,
            boxShadow: "0 1px 2px rgba(0,0,0,0.04)",
          }}
        >
          <div style={{ flex: 1, display: "flex", alignItems: "center", gap: 8 }}>
            <Toggle
              checked={item.included}
              onChange={(val) => updateItem(item.id, "included", val)}
            />
            <span>{item.name}</span>
          </div>
          <div style={{ display: "flex", alignItems: "center" }}>
            <input
              type="text"
              inputMode="decimal"
              placeholder="$0"
              value={item.name === "HVAC" ? `$${fmtCurrency(item.cost)}` : `$${fmtCurrency(item.rate)}`}
              onChange={(e) => {
                const n = toNumber(e.target.value);
                if (item.name === "HVAC") {
                  updateItem(item.id, "cost", n);
                } else {
                  updateItem(item.id, "rate", n);
                }
              }}
              style={{
                width: 160,
                padding: 8,
                borderRadius: 8,
                border: "1px solid #d1d5db",
              }}
            />
            <div style={{ fontSize: 12, color: "#6b7280", marginLeft: 8 }}>
              {item.name === "HVAC" ? "Amount ($)" : "Rate ($/sf)"}
            </div>
          </div>
        </div>
      ))}

      <button
        onClick={clear}
        style={{
          marginTop: 10,
          padding: "10px 16px",
          borderRadius: 8,
          border: "none",
          background: "#ef4444",
          color: "#fff",
          cursor: "pointer",
          boxShadow: "0 2px 6px rgba(239,68,68,0.35)",
        }}
      >
        Clear All
      </button>

      {/* Base Rehab line item (auto) — moved below Clear All */}
      <div
        style={{
          marginTop: 12,
          borderTop: "1px dashed #e5e7eb",
          paddingTop: 12,
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          gap: 12,
          fontWeight: 600,
        }}
      >
        <div>Base Rehab (SF × $/sf)</div>
        <div>{baseRehab.toLocaleString()}</div>
      </div>

      {/* Toggles subtotal + breakdown */}
      <div
        style={{
          marginTop: 8,
          borderTop: "1px dashed #e5e7eb",
          paddingTop: 12,
        }}
      >
        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          fontWeight: 600,
          marginBottom: 6,
        }}>
          <div>Toggles Subtotal</div>
          <div>{togglesTotal.toLocaleString()}</div>
        </div>

        {/* Breakdown of each included toggle with a value */}
        <div>
          {items
            .filter(i => i.included && (
              i.name === "HVAC"
                ? Number(i.cost || 0) > 0
                : Number(i.rate || 0) * Number(sf || 0) > 0
            ))
            .map(i => {
              const amount = i.name === "HVAC"
                ? Number(i.cost || 0)
                : Number(i.rate || 0) * Number(sf || 0);
              return (
                <div key={`brk-${i.id}`} style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  padding: "6px 0",
                  borderBottom: "1px solid #f3f4f6",
                  fontSize: 14,
                }}>
                  <div style={{ color: "#374151" }}>
                    {i.name}
                    {i.name !== "HVAC" && (
                      <span style={{ color: "#6b7280", marginLeft: 8, fontSize: 12 }}>
                        (${Number(i.rate || 0).toLocaleString()} / sf × {Number(sf || 0).toLocaleString()} sf)
                      </span>
                    )}
                  </div>
                  <div style={{ color: "#111827" }}>{amount.toLocaleString()}</div>
                </div>
              );
            })}
          {items.filter(i => i.included && (
            i.name === "HVAC"
              ? Number(i.cost || 0) > 0
              : Number(i.rate || 0) * Number(sf || 0) > 0
          )).length === 0 && (
            <div style={{ color: "#6b7280", fontSize: 12 }}>No toggle items added yet.</div>
          )}
        </div>
      </div>

      <h3 style={{ marginTop: 20 }}>Total Rehab: {total.toLocaleString()}</h3>
      <div style={{ color: "#6b7280", fontSize: 12 }}>
        (Includes Base Rehab + checked line items)
      </div>
    </div>
  );
}
