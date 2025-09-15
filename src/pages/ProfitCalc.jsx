import React, { useState, useEffect, useMemo } from "react";

// helper for safe number parsing
const toNumber = (val) => {
  if (!val && val !== 0) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(n) ? n : 0;
};

const STORAGE_KEY = "profitProjects_v1";
const MAXOFFER_KEY = "maxOfferProjects_v1";
const REHAB_KEY = "rehabProjects_v1";

export default function Profit() {
  const [address, setAddress] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // baseline inputs
  const [arv, setArv] = useState("");
  const [purchase, setPurchase] = useState("");
  const [rehab, setRehab] = useState("");
  const [closingBuy, setClosingBuy] = useState("2"); // % of purchase
  const [closingSell, setClosingSell] = useState("6"); // % of ARV
  const [carryMonths, setCarryMonths] = useState("4");
  const [contingencyPct, setContingencyPct] = useState("10");

  // financing
  const [rateAPR, setRateAPR] = useState("12"); // % annual
  const [points, setPoints] = useState("2"); // % of loan
  const [numDraws, setNumDraws] = useState("0");
  const [drawAmount, setDrawAmount] = useState("0");
  const [ltvPct, setLtvPct] = useState("85"); // % of purchase
  const [loanAmountInput, setLoanAmountInput] = useState(""); // manual override
  const [utilitiesMonthly, setUtilitiesMonthly] = useState("0");
  const [taxesMonthly, setTaxesMonthly] = useState("0");

  // load saved projects
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setProjects(JSON.parse(saved) || []); } catch {}
    }
  }, []);

  const persist = (next) => {
    setProjects(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  // Save / Update
  const handleSave = () => {
    if (!address) { alert("Please enter an address before saving."); return; }
    const now = new Date().toISOString();
    const entry = {
      id: selectedId || Date.now(),
      address,
      arv,
      purchase,
      rehab,
      closingBuy,
      closingSell,
      carryMonths,
      contingencyPct,
      rateAPR,
      points,
      numDraws,
      drawAmount,
      ltvPct,
      loanAmountInput,
      utilitiesMonthly,
      taxesMonthly,
      updatedAt: now,
    };
    const next = selectedId
      ? projects.map((p) => (p.id === selectedId ? entry : p))
      : [...projects, entry];
    if (!selectedId) setSelectedId(entry.id);
    persist(next);
  };

  // Load by id
  const handleLoad = (id) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    setSelectedId(proj.id);
    setAddress(proj.address || "");
    setArv(proj.arv || "");
    setPurchase(proj.purchase || "");
    setRehab(proj.rehab || "");
    setClosingBuy(proj.closingBuy ?? "2");
    setClosingSell(proj.closingSell ?? "6");
    setCarryMonths(proj.carryMonths ?? "4");
    setContingencyPct(proj.contingencyPct ?? "10");
    setRateAPR(proj.rateAPR ?? "12");
    setPoints(proj.points ?? "2");
    setNumDraws(proj.numDraws ?? "0");
    setDrawAmount(proj.drawAmount ?? "0");
    setLtvPct(proj.ltvPct ?? "85");
    setLoanAmountInput(proj.loanAmountInput ?? "");
    setUtilitiesMonthly(proj.utilitiesMonthly ?? "0");
    setTaxesMonthly(proj.taxesMonthly ?? "0");
  };

  // Remove selected
  const handleRemove = () => {
    if (!selectedId) return;
    const next = projects.filter((p) => p.id !== selectedId);
    persist(next);
    setSelectedId(null);
    setAddress("");
    setArv("");
    setPurchase("");
    setRehab("");
    setClosingBuy("2");
    setClosingSell("6");
    setCarryMonths("4");
    setContingencyPct("10");
    setRateAPR("12");
    setPoints("2");
    setNumDraws("0");
    setDrawAmount("0");
    setLtvPct("85");
    setLoanAmountInput("");
    setUtilitiesMonthly("0");
    setTaxesMonthly("0");
  };

  // Pull ARV from Max Offer
  const pullFromMaxOffer = () => {
    const raw = localStorage.getItem(MAXOFFER_KEY);
    if (!raw) { alert("No Max Offer projects found."); return; }
    const list = JSON.parse(raw || "[]");
    if (!list.length) return;
    let match = list.find((p) => p.address && address && p.address.toLowerCase() === address.toLowerCase());
    if (!match) match = list[list.length - 1];
    setArv(match?.arv || "");
  };

  // Pull Rehab from RehabCalc
  const pullFromRehabCalc = () => {
    const raw = localStorage.getItem(REHAB_KEY);
    if (!raw) { alert("No RehabCalc projects found."); return; }
    const list = JSON.parse(raw || "[]");
    if (!list.length) return;
    let match = list.find((p) => p.address && address && p.address.toLowerCase() === address.toLowerCase());
    if (!match) match = list[list.length - 1];
    setRehab(match?.total || match?.rehab || "");
  };

  // Calculations
  const {
    grossProfit,
    netProfit,
    netMargin,
    pointsCost,
    interestCost,
    drawFees,
    effectiveLoan,
    totalCosts,
    derivedMonthlyInterest,
    utilitiesCost,
    taxesCost,
    baseCosts,
    financingCosts,
    carryingCosts,
  } = useMemo(() => {
    const arvNum = toNumber(arv);
    const purchaseNum = toNumber(purchase);
    const rehabNum = toNumber(rehab);

    const closingBuyNum = (toNumber(closingBuy) / 100) * purchaseNum;
    const closingSellNum = (toNumber(closingSell) / 100) * arvNum;
    const contingencyNum = (toNumber(contingencyPct) / 100) * rehabNum;

    const manualLoan = toNumber(loanAmountInput);
    const ltvLoan = purchaseNum * (toNumber(ltvPct) / 100);
    const loanAmount = manualLoan > 0 ? manualLoan : ltvLoan;

    const pointsCost = (toNumber(points) / 100) * loanAmount;
    const monthlyRate = toNumber(rateAPR) / 100 / 12;
    const derivedMonthlyInterest = loanAmount * monthlyRate;
    const interestCost = derivedMonthlyInterest * toNumber(carryMonths);

    const drawFees = toNumber(numDraws) * toNumber(drawAmount);
    const utilitiesCost = toNumber(utilitiesMonthly) * toNumber(carryMonths);
    const taxesCost = toNumber(taxesMonthly) * toNumber(carryMonths);

    const baseCosts =
      purchaseNum +
      rehabNum +
      closingBuyNum +
      closingSellNum +
      contingencyNum;

    const financingCosts = pointsCost + interestCost + drawFees;
    const carryingCosts = utilitiesCost + taxesCost;

    const totalCosts = baseCosts + financingCosts + carryingCosts;

    const grossProfit = arvNum - baseCosts; // excludes financing+carrying
    const netProfit = grossProfit - financingCosts - carryingCosts;
    const netMargin = arvNum > 0 ? netProfit / arvNum : 0;

    return {
      grossProfit,
      netProfit,
      netMargin,
      pointsCost,
      interestCost,
      drawFees,
      effectiveLoan: loanAmount,
      totalCosts,
      derivedMonthlyInterest,
      utilitiesCost,
      taxesCost,
      baseCosts,
      financingCosts,
      carryingCosts,
    };
  }, [
    arv,
    purchase,
    rehab,
    closingBuy,
    closingSell,
    carryMonths,
    contingencyPct,
    rateAPR,
    points,
    numDraws,
    drawAmount,
    ltvPct,
    loanAmountInput,
    utilitiesMonthly,
    taxesMonthly,
  ]);

  const styles = {
    container: { padding: 24, maxWidth: 1000, margin: "0 auto" },
    title: { fontSize: "24px", fontWeight: 700, textAlign: "center", marginBottom: 16 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
    grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 },
    label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 },
    input: { border: "1px solid #ccc", borderRadius: 6, padding: 8, width: "100%" },
    select: { border: "1px solid #ccc", borderRadius: 6, padding: 8, width: "100%" },
    btnRow: { display: "flex", gap: 8, marginTop: 8 },
    btn: { background: "#f5f5f5", border: "1px solid #ccc", borderRadius: 6, padding: "6px 12px", cursor: "pointer", color: "#000" },
    section: { marginBottom: 24 },
    resultsBox: { border: "1px solid #ddd", borderRadius: 6, padding: 16, background: "#fff" },
    breakdownRow: { display: "flex", justifyContent: "space-between", fontSize: 14 },
    breakdownLabel: { fontWeight: 500 },
    subhead: { fontWeight: 600, marginTop: 8 },
    netProfit: { color: "green", fontWeight: 700, fontSize: "16px", marginTop: 8 },
    smallMuted: { fontSize: 12, color: "#6b7280" },
  };

  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Profit Calculator</h1>

      {/* Top Controls */}
      <div style={{ ...styles.grid2, marginBottom: 24 }}>
        {/* Address */}
        <div>
          <label style={styles.label}>Address</label>
          <input
            style={styles.input}
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            placeholder="Property address (e.g., 1219 Claremont St)"
          />
          <div style={styles.btnRow}>
            <button onClick={handleSave} style={styles.btn}>Save</button>
            <button onClick={handleRemove} style={styles.btn} disabled={!selectedId}>Delete</button>
          </div>
        </div>
        {/* Saved Projects */}
        <div>
          <label style={styles.label}>Saved Projects</label>
          <select
            style={styles.select}
            value={selectedId || ""}
            onChange={(e) => { const v = e.target.value; if (!v) return; handleLoad(Number(v)); }}
          >
            <option value="">Saved projects...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.address}</option>
            ))}
          </select>
          <div style={styles.btnRow}>
            <button onClick={() => selectedId && handleLoad(selectedId)} style={styles.btn} disabled={!selectedId}>Load</button>
            <button onClick={handleRemove} style={styles.btn} disabled={!selectedId}>Remove</button>
          </div>
        </div>
      </div>

      {/* Deal Basics */}
      <div style={styles.section}>
        <h2>Deal Basics</h2>
        <div style={styles.grid3}>
          <div>
            <label style={styles.label}>ARV</label>
            <input style={styles.input} value={arv} onChange={(e) => setArv(e.target.value)} placeholder="$350,000" />
            <div style={styles.btnRow}>
              <button onClick={pullFromMaxOffer} style={styles.btn}>Pull ARV from Max Offer</button>
            </div>
          </div>
          <div>
            <label style={styles.label}>Purchase Price</label>
            <input style={styles.input} value={purchase} onChange={(e) => setPurchase(e.target.value)} placeholder="$220,000" />
          </div>
          <div>
            <label style={styles.label}>Rehab</label>
            <input style={styles.input} value={rehab} onChange={(e) => setRehab(e.target.value)} placeholder="$45,000" />
            <div style={styles.btnRow}>
              <button onClick={pullFromRehabCalc} style={styles.btn}>Pull Rehab</button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Costs */}
      <div style={styles.section}>
        <h2>Transaction Costs</h2>
        <div style={styles.grid3}>
          <div>
            <label style={styles.label}>Closing Costs (Buy %)</label>
            <input style={styles.input} value={closingBuy} onChange={(e) => setClosingBuy(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Closing Costs (Sell %)</label>
            <input style={styles.input} value={closingSell} onChange={(e) => setClosingSell(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Contingency (% of Rehab)</label>
            <input style={styles.input} value={contingencyPct} onChange={(e) => setContingencyPct(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Carrying Costs */}
      <div style={styles.section}>
        <h2>Carrying Costs</h2>
        <div style={styles.grid3}>
          <div>
            <label style={styles.label}>Carry Months</label>
            <input style={styles.input} value={carryMonths} onChange={(e) => setCarryMonths(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Utilities ($/mo)</label>
            <input style={styles.input} value={utilitiesMonthly} onChange={(e) => setUtilitiesMonthly(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Taxes ($/mo)</label>
            <input style={styles.input} value={taxesMonthly} onChange={(e) => setTaxesMonthly(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Financing */}
      <div style={styles.section}>
        <h2>Financing</h2>
        <div style={styles.grid2}>
          <div>
            <label style={styles.label}>APR %</label>
            <input style={styles.input} value={rateAPR} onChange={(e) => setRateAPR(e.target.value)} />

            <label style={styles.label}>Points %</label>
            <input style={styles.input} value={points} onChange={(e) => setPoints(e.target.value)} />

            <label style={styles.label}>LTV %</label>
            <input style={styles.input} value={ltvPct} onChange={(e) => setLtvPct(e.target.value)} />

            <label style={styles.label}>Loan Amount ($)</label>
            <input style={styles.input} value={loanAmountInput} onChange={(e) => setLoanAmountInput(e.target.value)} placeholder="auto from LTV" />
          </div>
          <div>
            <label style={styles.label}># Draws</label>
            <input style={styles.input} value={numDraws} onChange={(e) => setNumDraws(e.target.value)} />

            <label style={styles.label}>Draw Fee ($)</label>
            <input style={styles.input} value={drawAmount} onChange={(e) => setDrawAmount(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Results */}
      <div style={styles.section}>
        <h2>Results / Summary</h2>
        <div style={styles.resultsBox}>
          <p><strong>ARV:</strong> ${toNumber(arv).toLocaleString()}</p>

          <div style={styles.subhead}>Base Costs (for Gross Profit)</div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>- Purchase Price</span><span>${toNumber(purchase).toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>- Rehab</span><span>${toNumber(rehab).toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>- Closing Costs (Buy)</span><span>${((toNumber(closingBuy)/100)*toNumber(purchase)).toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>- Closing Costs (Sell)</span><span>${((toNumber(closingSell)/100)*toNumber(arv)).toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>- Contingency</span><span>${((toNumber(contingencyPct)/100)*toNumber(rehab)).toLocaleString()}</span></div>

          <div className="hr" style={{borderTop:"1px solid #eee", margin:"8px 0"}} />
          <p><strong>Gross Profit:</strong> ${grossProfit.toLocaleString()}</p>

          <div style={styles.subhead}>Financing & Carry</div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>- Points Cost</span><span>${pointsCost.toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>- Total Interest (APR × Months)</span><span>${interestCost.toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>- Draw Fees</span><span>${drawFees.toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>- Utilities (× months)</span><span>${utilitiesCost.toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>- Taxes (× months)</span><span>${taxesCost.toLocaleString()}</span></div>
          <div style={styles.smallMuted}>Monthly interest ≈ {Number.isFinite(derivedMonthlyInterest) ? `$${Math.round(derivedMonthlyInterest).toLocaleString()}` : "$0"}</div>

          <div className="hr" style={{borderTop:"1px solid #eee", margin:"8px 0"}} />
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>Total Costs</span><span>${totalCosts.toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>Loan Amount Used</span><span>${effectiveLoan.toLocaleString()}</span></div>
          <p style={styles.netProfit}>Net Profit: ${netProfit.toLocaleString()}</p>
          <p><strong>Margin:</strong> {(netMargin * 100).toFixed(1)}%</p>
        </div>
      </div>
    </div>
  );
}

