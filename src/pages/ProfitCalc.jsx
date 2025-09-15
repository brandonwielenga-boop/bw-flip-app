import React, { useState, useEffect, useMemo } from "react";

// ===== Helper =====
const toNumber = (val) => {
  if (!val && val !== 0) return 0;
  const n = parseFloat(String(val).replace(/[^0-9.-]+/g, ""));
  return Number.isFinite(n) ? n : 0;
};

// ===== LocalStorage Keys =====
const STORAGE_KEY = "profitProjects_v1";
const MAXOFFER_KEY = "maxOfferProjects_v1";
const REHAB_KEY = "rehabProjects_v1";

export default function Profit() {
  // ===== State =====
  const [address, setAddress] = useState("");
  const [projects, setProjects] = useState([]);
  const [selectedId, setSelectedId] = useState(null);

  // Deal basics
  const [arv, setArv] = useState("");
  const [purchase, setPurchase] = useState("");
  const [rehab, setRehab] = useState("");

  // Transaction costs / carry
  const [closingBuy, setClosingBuy] = useState("2"); // % of purchase
  const [closingSell, setClosingSell] = useState("6"); // % of ARV
  const [contingencyPct, setContingencyPct] = useState("10"); // % of rehab
  const [carryMonths, setCarryMonths] = useState("4");
  const [utilitiesMonthly, setUtilitiesMonthly] = useState("0");
  const [taxesMonthly, setTaxesMonthly] = useState("0");

  // Financing
  const [rateAPR, setRateAPR] = useState("12");
  const [points, setPoints] = useState("2");
  const [ltvPct, setLtvPct] = useState("85");
  const [loanAmountInput, setLoanAmountInput] = useState(""); // manual override
  const [numDraws, setNumDraws] = useState("0");
  const [drawAmount, setDrawAmount] = useState("0");

  // ===== Effects =====
  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try { setProjects(JSON.parse(saved) || []); } catch {}
    }
  }, []);

  // ===== Persistence helpers =====
  const persist = (next) => {
    setProjects(next);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(next));
  };

  const handleSave = () => {
    if (!address) return;
    const entry = {
      id: selectedId || Date.now(),
      address, arv, purchase, rehab,
      closingBuy, closingSell, contingencyPct, carryMonths,
      utilitiesMonthly, taxesMonthly,
      rateAPR, points, ltvPct, loanAmountInput, numDraws, drawAmount,
      updatedAt: new Date().toISOString(),
    };
    const next = selectedId
      ? projects.map((p) => (p.id === selectedId ? entry : p))
      : [...projects, entry];
    if (!selectedId) setSelectedId(entry.id);
    persist(next);
  };

  const handleLoad = (id) => {
    const proj = projects.find((p) => p.id === id);
    if (!proj) return;
    setSelectedId(proj.id);
    setAddress(proj.address || "");
    setArv(proj.arv || "");
    setPurchase(proj.purchase || "");
    setRehab(proj.rehab || "");
    setClosingBuy(proj.closingBuy || "2");
    setClosingSell(proj.closingSell || "6");
    setContingencyPct(proj.contingencyPct || "10");
    setCarryMonths(proj.carryMonths || "4");
    setUtilitiesMonthly(proj.utilitiesMonthly || "0");
    setTaxesMonthly(proj.taxesMonthly || "0");
    setRateAPR(proj.rateAPR || "12");
    setPoints(proj.points || "2");
    setLtvPct(proj.ltvPct || "85");
    setLoanAmountInput(proj.loanAmountInput || "");
    setNumDraws(proj.numDraws || "0");
    setDrawAmount(proj.drawAmount || "0");
  };

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
    setContingencyPct("10");
    setCarryMonths("4");
    setUtilitiesMonthly("0");
    setTaxesMonthly("0");
    setRateAPR("12");
    setPoints("2");
    setLtvPct("85");
    setLoanAmountInput("");
    setNumDraws("0");
    setDrawAmount("0");
  };

  const pullFromMaxOffer = () => {
    const raw = localStorage.getItem(MAXOFFER_KEY);
    if (!raw) { alert("No Max Offer projects found."); return; }
    try {
      const list = JSON.parse(raw) || [];
      if (!list.length) return;
      let match = list.find((p) => p.address && p.address.toLowerCase() === address.toLowerCase());
      if (!match) match = list[list.length - 1];
      setArv(match.arv || "");
    } catch {}
  };

  const pullFromRehabCalc = () => {
    const raw = localStorage.getItem(REHAB_KEY);
    if (!raw) { alert("No RehabCalc projects found."); return; }
    try {
      const list = JSON.parse(raw) || [];
      if (!list.length) return;
      let match = list.find((p) => p.address && p.address.toLowerCase() === address.toLowerCase());
      if (!match) match = list[list.length - 1];
      setRehab(match.total || match.rehab || "");
    } catch {}
  };

  // ===== Calculations =====
  const calc = useMemo(() => {
    const arvNum = toNumber(arv);
    const purchaseNum = toNumber(purchase);
    const rehabNum = toNumber(rehab);
    const closingBuyNum = (toNumber(closingBuy) / 100) * purchaseNum;
    const closingSellNum = (toNumber(closingSell) / 100) * arvNum;
    const contingencyNum = (toNumber(contingencyPct) / 100) * rehabNum;

    // Financing
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

    // Base costs do NOT include financing/carry (to avoid double-counting)
    const totalCosts = purchaseNum + rehabNum + closingBuyNum + closingSellNum + contingencyNum;
    const financingCarry = pointsCost + interestCost + drawFees + utilitiesCost + taxesCost;

    const grossProfit = arvNum - totalCosts;
    const netProfit = grossProfit - financingCarry;
    const margin = arvNum > 0 ? grossProfit / arvNum : 0;
    const netMargin = arvNum > 0 ? netProfit / arvNum : 0;

    return {
      arvNum, purchaseNum, rehabNum,
      closingBuyNum, closingSellNum, contingencyNum,
      pointsCost, interestCost, drawFees, utilitiesCost, taxesCost,
      effectiveLoan: loanAmount, derivedMonthlyInterest,
      totalCosts, grossProfit, netProfit, margin, netMargin,
    };
  }, [arv,purchase,rehab,closingBuy,closingSell,contingencyPct,carryMonths,rateAPR,points,ltvPct,loanAmountInput,numDraws,drawAmount,utilitiesMonthly,taxesMonthly]);

  const { arvNum, purchaseNum, rehabNum, closingBuyNum, closingSellNum, contingencyNum, pointsCost, interestCost, drawFees, utilitiesCost, taxesCost, effectiveLoan, derivedMonthlyInterest, totalCosts, grossProfit, netProfit, margin, netMargin } = calc;

  // ===== Styles =====
  const styles = {
    container: { padding: 24, maxWidth: 1100, margin: "0 auto" },
    title: { fontSize: 24, fontWeight: 700, textAlign: "center", marginBottom: 16 },
    grid2: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 },
    grid3: { display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 },
    label: { display: "block", fontSize: 13, fontWeight: 600, marginBottom: 4 },
    input: { border: "1px solid #ccc", borderRadius: 6, padding: 8, width: "100%" },
    select: { border: "1px solid #ccc", borderRadius: 6, padding: 8, width: "100%" },
    btnRow: { display: "flex", gap: 12, marginTop: 8 },
    btnBase: { borderRadius: 9999, padding: "10px 18px", fontWeight: 600, border: "1px solid transparent", cursor: "pointer", color: "#000", boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.04)" },
    btnBlue: { background: "#E5EDFF", borderColor: "#C9D6FF" }, // Save
    btnGreen:{ background: "#DFF7E6", borderColor: "#C7EFD5" }, // Load
    btnRed:  { background: "#FFDADB", borderColor: "#F5B5B7" }, // Delete/Remove
    chip: { background: "#CFF6D9", border: "1px solid #B6EBC8", color: "#000", padding: "6px 10px", borderRadius: 9999, fontSize: 12, fontWeight: 600, cursor: "pointer" },
    section: { marginBottom: 24 },
    resultsBox: { border: "1px solid #ddd", borderRadius: 6, padding: 16, background: "#fff" },
    breakdownRow: { display: "flex", justifyContent: "space-between", fontSize: 14, margin: "2px 0" },
    breakdownLabel: { fontWeight: 500 },
    subhead: { fontWeight: 600, marginTop: 8 },
    netProfit: { color: "green", fontWeight: 700, fontSize: 16, marginTop: 8 },
    smallMuted: { fontSize: 12, color: "#6b7280" },
  };

  // ===== UI =====
  return (
    <div style={styles.container}>
      <h1 style={styles.title}>Profit Calculator</h1>

      {/* Top Controls */}
      <div style={{ ...styles.grid2, marginBottom: 24 }}>
        {/* Address */}
        <div>
          <label style={styles.label}>Address</label>
          <input style={styles.input} value={address} onChange={(e) => setAddress(e.target.value)} placeholder="Property address (e.g., 1219 Claremont St)" />
          <div style={styles.btnRow}>
            <button onClick={handleSave} style={{...styles.btnBase, ...styles.btnBlue}}>Save</button>
            <button onClick={handleRemove} style={{...styles.btnBase, ...styles.btnRed}} disabled={!selectedId}>Delete</button>
          </div>
        </div>
        {/* Saved Projects */}
        <div>
          <label style={styles.label}>Saved Projects</label>
          <select style={styles.select} value={selectedId || ""} onChange={(e) => { const v = e.target.value; if (!v) return; handleLoad(Number(v)); }}>
            <option value="">Saved projects...</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>{p.address}</option>
            ))}
          </select>
          <div style={styles.btnRow}>
            <button onClick={() => selectedId && handleLoad(selectedId)} style={{...styles.btnBase, ...styles.btnGreen}} disabled={!selectedId}>Load</button>
            <button onClick={handleRemove} style={{...styles.btnBase, ...styles.btnRed}} disabled={!selectedId}>Remove</button>
          </div>
        </div>
      </div>

      {/* Deal Basics */}
      <div style={styles.section}>
        <h2 style={{fontSize: 18, fontWeight: 600, marginBottom: 8}}>Deal Basics</h2>
        <div style={styles.grid3}>
          <div>
            <label style={styles.label}>ARV</label>
            <input style={styles.input} value={arv} onChange={(e) => setArv(e.target.value)} placeholder="$350,000" />
            <div style={{marginTop: 6}}>
              <button onClick={pullFromMaxOffer} style={styles.chip}>Pull ARV from Max Offer</button>
            </div>
          </div>
          <div>
            <label style={styles.label}>Purchase Price</label>
            <input style={styles.input} value={purchase} onChange={(e) => setPurchase(e.target.value)} placeholder="$220,000" />
          </div>
          <div>
            <label style={styles.label}>Rehab</label>
            <input style={styles.input} value={rehab} onChange={(e) => setRehab(e.target.value)} placeholder="$45,000" />
            <div style={{marginTop: 6}}>
              <button onClick={pullFromRehabCalc} style={styles.chip}>Pull Rehab</button>
            </div>
          </div>
        </div>
      </div>

      {/* Transaction Costs */}
      <div style={styles.section}>
        <h2 style={{fontSize: 18, fontWeight: 600, marginBottom: 8}}>Transaction Costs</h2>
        <div style={styles.grid3}>
          <div>
            <label style={styles.label}>Closing Costs (Buy %)</label>
            <input style={{...styles.input, width: 100}} value={closingBuy} onChange={(e) => setClosingBuy(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Closing Costs (Sell %)</label>
            <input style={{...styles.input, width: 100}} value={closingSell} onChange={(e) => setClosingSell(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Contingency (% of Rehab)</label>
            <input style={{...styles.input, width: 120}} value={contingencyPct} onChange={(e) => setContingencyPct(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Carrying Costs */}
      <div style={styles.section}>
        <h2 style={{fontSize: 18, fontWeight: 600, marginBottom: 8}}>Carrying Costs</h2>
        <div style={styles.grid3}>
          <div>
            <label style={styles.label}>Carry Months</label>
            <input style={{...styles.input, width: 100}} value={carryMonths} onChange={(e) => setCarryMonths(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Utilities ($/mo)</label>
            <input style={{...styles.input, width: 120}} value={utilitiesMonthly} onChange={(e) => setUtilitiesMonthly(e.target.value)} />
          </div>
          <div>
            <label style={styles.label}>Taxes ($/mo)</label>
            <input style={{...styles.input, width: 120}} value={taxesMonthly} onChange={(e) => setTaxesMonthly(e.target.value)} />
          </div>
        </div>
      </div>

      {/* Financing */}
      <div style={styles.section}>
        <h2 style={{fontSize: 18, fontWeight: 600, marginBottom: 8}}>Financing</h2>
        <div style={styles.grid2}>
          <div>
            <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 8}}>
              <span style={{fontSize: 12, color: "#555", whiteSpace: "nowrap"}}>APR %</span>
              <input style={{...styles.input, width: 80}} value={rateAPR} onChange={(e) => setRateAPR(e.target.value)} />
            </div>
            <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 8}}>
              <span style={{fontSize: 12, color: "#555", whiteSpace: "nowrap"}}>Points %</span>
              <input style={{...styles.input, width: 80}} value={points} onChange={(e) => setPoints(e.target.value)} />
            </div>
            <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 8}}>
              <span style={{fontSize: 12, color: "#555", whiteSpace: "nowrap"}}>LTV %</span>
              <input style={{...styles.input, width: 80}} value={ltvPct} onChange={(e) => setLtvPct(e.target.value)} />
            </div>
            <div style={{display: "flex", alignItems: "center", gap: 8}}>
              <span style={{fontSize: 12, color: "#555", whiteSpace: "nowrap"}}>Loan Amount ($)</span>
              <input style={{...styles.input, width: 160}} value={loanAmountInput} onChange={(e) => setLoanAmountInput(e.target.value)} placeholder="auto from LTV" />
            </div>
          </div>
          <div>
            <div style={{display: "flex", alignItems: "center", gap: 8, marginBottom: 8}}>
              <span style={{fontSize: 12, color: "#555", whiteSpace: "nowrap"}}># Draws</span>
              <input style={{...styles.input, width: 70}} value={numDraws} onChange={(e) => setNumDraws(e.target.value)} />
            </div>
            <div style={{display: "flex", alignItems: "center", gap: 8}}>
              <span style={{fontSize: 12, color: "#555", whiteSpace: "nowrap"}}>Draw Fee ($)</span>
              <input style={{...styles.input, width: 100}} value={drawAmount} onChange={(e) => setDrawAmount(e.target.value)} />
            </div>
          </div>
        </div>
      </div>

      {/* Results / Summary */}
      <div style={styles.resultsBox}>
        {/* Header line */}
        <p><strong>Gross Profit:</strong> ${grossProfit.toLocaleString()}</p>
        <p><strong>Margin:</strong> {(margin * 100).toFixed(1)}%</p>
        <p style={styles.smallMuted}>Total Costs: ${totalCosts.toLocaleString()}</p>

        {/* Line-by-line breakdown */}
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8}}>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>ARV</span><span>${arvNum.toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>Purchase</span><span>-${purchaseNum.toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>Rehab</span><span>-${rehabNum.toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>Closing Costs (Buy)</span><span>-${closingBuyNum.toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>Closing Costs (Sell)</span><span>-${closingSellNum.toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>Contingency</span><span>-${contingencyNum.toLocaleString()}</span></div>
        </div>

        {/* Separator + Gross */}
        <div style={{borderTop: "1px solid #eee", margin: "8px 0"}} />
        <p><strong>Gross Profit:</strong> ${grossProfit.toLocaleString()}</p>

        {/* Financing & Carry */}
        <div style={{marginTop: 6, fontWeight: 600}}>Financing & Carry</div>
        <div style={{display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8}}>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>Points Cost</span><span>-${pointsCost.toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>Total Interest (APR × months)</span><span>-${interestCost.toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>Draw Fees</span><span>-${drawFees.toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>Utilities (× months)</span><span>-${utilitiesCost.toLocaleString()}</span></div>
          <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>Taxes (× months)</span><span>-${taxesCost.toLocaleString()}</span></div>
        </div>
        <div style={{fontSize: 12, color: "#6b7280", marginTop: 4}}>Monthly interest ≈ {Number.isFinite(derivedMonthlyInterest) ? `$${Math.round(derivedMonthlyInterest).toLocaleString()}` : "$0"}</div>

        {/* Separator + Net */}
        <div style={{borderTop: "1px solid #eee", margin: "8px 0"}} />
        <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>Total Costs</span><span>${totalCosts.toLocaleString()}</span></div>
        <div style={styles.breakdownRow}><span style={styles.breakdownLabel}>Loan Amount Used</span><span>${effectiveLoan.toLocaleString()}</span></div>
        <p style={styles.netProfit}>Net Profit: ${netProfit.toLocaleString()}</p>
        <p><strong>Margin:</strong> {(netMargin * 100).toFixed(1)}%</p>
      </div>
    </div>
  );
}


