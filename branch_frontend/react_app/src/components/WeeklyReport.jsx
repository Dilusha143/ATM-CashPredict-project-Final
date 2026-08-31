/**
 * WeeklyReport.jsx
 * ─────────────────────────────────────────────────────────────────
 * Weekly Cash Replenishment Report downloader for ATM CashPredict.
 * Drop into branch_frontend/react_app/src/components/
 * Add to App.jsx as a tab: <WeeklyReport />
 *
 * Features
 *  • Date-picker to choose report week
 *  • Preview card showing ATM totals, Poya days, holidays, alerts
 *  • One-click Excel download (hits GET /report/weekly)
 *  • Fully styled to match existing CashAlerts / PoyaDashboard look
 */

import { useState, useEffect, useCallback } from "react";

const API = import.meta.env.VITE_API_URL || "";

// ── Colour constants matching your existing palette ─────────────────────────
const ALERT_COLOUR = {
  "C4": "#FF4444",
  "C3": "#FF8800",
  "C2": "#FFD700",
  "C1": "#4CAF50",
};

const ZONE_ICON = {
  Transport:   "✈️",
  Commercial:  "🏪",
  Educational: "🎓",
  Residential: "🏘️",
};

// ── Helpers ──────────────────────────────────────────────────────────────────
function mondayOfWeek(date) {
  const d = new Date(date);
  const day = d.getDay();
  const diff = (day === 0 ? -6 : 1 - day);
  d.setDate(d.getDate() + diff);
  return d.toISOString().split("T")[0];
}

function fmtLKR(val) {
  return new Intl.NumberFormat("en-LK", { style: "currency", currency: "LKR",
    maximumFractionDigits: 0 }).format(val);
}

function AlertBadge({ text }) {
  const key = text?.slice(0, 2);
  const bg  = ALERT_COLOUR[key] || "#ccc";
  return (
    <span style={{
      background: bg, color: "#fff", borderRadius: 4,
      padding: "2px 8px", fontSize: 13, fontWeight: 700,
    }}>{text}</span>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export default function WeeklyReport() {
  const [weekStart, setWeekStart]     = useState(mondayOfWeek(new Date()));
  const [preview, setPreview]         = useState(null);
  const [loading, setLoading]         = useState(false);
  const [downloading, setDownloading] = useState(false);
  const [error, setError]             = useState(null);

  const token = localStorage.getItem("atm_token");

  const fetchPreview = useCallback(async () => {
    setLoading(true);
    setError(null);
    setPreview(null);
    try {
      const endpoint = `${API || ""}/report/preview?week_start=${weekStart}`;
      const res  = await fetch(endpoint, { headers: { "X-Auth-Token": token } });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Preview failed");
      setPreview(data);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [weekStart, token]);

  // Auto-load preview on mount and week change
  useEffect(() => { fetchPreview(); }, [fetchPreview]);

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const res = await fetch(
        `${API}/report/weekly?week_start=${weekStart}`,
        { headers: { "X-Auth-Token": token } }
      );
      if (!res.ok) throw new Error("Download failed");
      const blob = await res.blob();
      const url  = URL.createObjectURL(blob);
      const a    = document.createElement("a");
      a.href     = url;
      a.download = `ATM_CashPredict_Report_${weekStart}.xlsx`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (e) {
      setError(e.message);
    } finally {
      setDownloading(false);
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={styles.container}>
      {/* ── Header ── */}
      <div style={styles.header}>
        <div>
          <h2 style={styles.title}>📊 Weekly Cash Replenishment Report</h2>
          <p style={styles.subtitle}>
            ATM demand forecasts · Poya adjustments · Replenishment schedule
          </p>
        </div>
        <div style={styles.headerBadge}>Bank Manager Report</div>
      </div>

      {/* ── Controls ── */}
      <div style={styles.controls}>
        <div style={styles.controlGroup}>
          <label style={styles.label}>Report Week (starting Monday)</label>
          <input
            type="date"
            value={weekStart}
            onChange={e => setWeekStart(mondayOfWeek(e.target.value))}
            style={styles.datePicker}
          />
        </div>
        <button onClick={fetchPreview} disabled={loading} style={styles.previewBtn}>
          {loading ? "Loading…" : "🔄 Refresh Preview"}
        </button>
        <button
          onClick={handleDownload}
          disabled={downloading || loading}
          style={styles.downloadBtn}
        >
          {downloading ? "Generating…" : "⬇️ Download Excel Report"}
        </button>
      </div>

      {/* ── Error ── */}
      {error && (
        <div style={styles.errorBox}>⚠️ {error}</div>
      )}

      {/* ── Loading skeleton ── */}
      {loading && (
        <div style={styles.skeleton}>
          <div style={styles.skeletonLine} />
          <div style={{ ...styles.skeletonLine, width: "60%" }} />
          <div style={{ ...styles.skeletonLine, width: "80%" }} />
        </div>
      )}

      {/* ── Preview ── */}
      {preview && !loading && (
        <div>
          {/* Week info bar */}
          <div style={styles.weekBar}>
            <span style={styles.weekLabel}>
              📅 {preview.report_label}
            </span>
            <span style={styles.grandTotal}>
              Grand Total: {fmtLKR(preview.grand_total)}
            </span>
          </div>

          {/* Poya & Holiday chips */}
          {(preview.poya_days.length > 0 || preview.holidays.length > 0) && (
            <div style={styles.chipsRow}>
              {preview.poya_days.map((d, i) => (
                <span key={i} style={styles.poyaChip}>🌕 Poya: {d}</span>
              ))}
              {preview.holidays.map((h, i) => (
                <span key={i} style={styles.holidayChip}>🎉 {h}</span>
              ))}
            </div>
          )}

          {/* ATM cards grid */}
          <div style={styles.grid}>
            {preview.atm_summaries.map(atm => (
              <ATMCard key={atm.atm} atm={atm} />
            ))}
          </div>

          {/* Sheets preview */}
          <div style={styles.sheetsInfo}>
            <h4 style={styles.sheetsTitle}>📋 Report Sheets Included</h4>
            <div style={styles.sheetsGrid}>
              {[
                ["Cover", "Metadata, legend, confidentiality note"],
                ["Weekly Summary", "One row per ATM, 7-day totals + Poya flags"],
                ["Daily Detail", "Full breakdown: predictions, P10/P90, alerts"],
                ["Replenishment Schedule", "Priority loading plan for the week"],
              ].map(([name, desc]) => (
                <div key={name} style={styles.sheetCard}>
                  <div style={styles.sheetName}>{name}</div>
                  <div style={styles.sheetDesc}>{desc}</div>
                </div>
              ))}
            </div>
          </div>

          {/* Download CTA */}
          <div style={styles.ctaBox}>
            <div>
              <div style={styles.ctaTitle}>Ready to download</div>
              <div style={styles.ctaSubtitle}>
                Professional Excel workbook · 4 sheets · Colour-coded alerts
              </div>
            </div>
            <button
              onClick={handleDownload}
              disabled={downloading}
              style={styles.ctaBig}
            >
              {downloading ? "⏳ Generating…" : "⬇️ Download Excel"}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// ── ATM preview card ─────────────────────────────────────────────────────────
function ATMCard({ atm }) {
  const hasCritical = atm.critical_days > 0;
  const hasHigh     = atm.high_days > 0;
  const border = hasCritical ? `2px solid ${ALERT_COLOUR.C4}`
               : hasHigh     ? `2px solid ${ALERT_COLOUR.C3}`
               : "1px solid #e0e6f0";

  return (
    <div style={{ ...styles.atmCard, border }}>
      <div style={styles.atmHeader}>
        <span style={styles.zoneIcon}>
          {ZONE_ICON[atm.zone] || "🏧"}
        </span>
        <div>
          <div style={styles.atmName}>{atm.atm}</div>
          <div style={styles.atmZone}>{atm.zone}</div>
        </div>
      </div>

      <div style={styles.atmTotal}>{fmtLKR(atm.weekly_total)}</div>
      <div style={styles.atmTotalLabel}>Weekly Predicted Demand</div>

      <div style={styles.atmMeta}>
        <div style={styles.metaItem}>
          <span style={styles.metaKey}>Peak</span>
          <span style={styles.metaVal}>{atm.peak_day}</span>
        </div>
        <div style={styles.metaItem}>
          <span style={styles.metaKey}>Poya Days</span>
          <span style={styles.metaVal}>{atm.poya_days}</span>
        </div>
      </div>

      {(hasCritical || hasHigh) && (
        <div style={styles.atmAlerts}>
          {atm.critical_days > 0 && (
            <AlertBadge text={`C4 ×${atm.critical_days}`} />
          )}
          {atm.high_days > 0 && (
            <AlertBadge text={`C3 ×${atm.high_days}`} />
          )}
        </div>
      )}
    </div>
  );
}

// ── Styles ───────────────────────────────────────────────────────────────────
const styles = {
  container: {
    fontFamily: "Arial, sans-serif",
    maxWidth: 1100,
    margin: "0 auto",
    padding: 24,
    color: "#1A1A2E",
  },
  header: {
    background: "linear-gradient(135deg, #1A3A5C, #2563A8)",
    borderRadius: 12,
    padding: "24px 28px",
    marginBottom: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  title: { color: "#fff", margin: 0, fontSize: 25, fontWeight: 700 },
  subtitle: { color: "#C9A84C", margin: "4px 0 0", fontSize: 15 },
  headerBadge: {
    background: "#C9A84C", color: "#1A3A5C", borderRadius: 6,
    padding: "6px 14px", fontWeight: 700, fontSize: 14,
  },
  controls: {
    display: "flex", gap: 12, alignItems: "flex-end",
    marginBottom: 20, flexWrap: "wrap",
  },
  controlGroup: { display: "flex", flexDirection: "column", gap: 4 },
  label: { fontSize: 14, fontWeight: 600, color: "#555" },
  datePicker: {
    padding: "8px 12px", borderRadius: 6, border: "1px solid #cdd5e0",
    fontSize: 16, color: "#1A1A2E",
  },
  previewBtn: {
    padding: "9px 18px", borderRadius: 6,
    background: "#fff", border: "1px solid #1A3A5C",
    color: "#1A3A5C", fontWeight: 600, cursor: "pointer", fontSize: 15,
  },
  downloadBtn: {
    padding: "9px 22px", borderRadius: 6,
    background: "#1A3A5C", border: "none",
    color: "#fff", fontWeight: 700, cursor: "pointer", fontSize: 15,
  },
  errorBox: {
    background: "#fff0f0", border: "1px solid #ffaaaa",
    borderRadius: 8, padding: "10px 16px", marginBottom: 16,
    color: "#c00", fontSize: 15,
  },
  skeleton: { marginBottom: 24 },
  skeletonLine: {
    height: 18, background: "#e8ecf4", borderRadius: 4,
    marginBottom: 10, width: "100%", animation: "pulse 1.5s infinite",
  },
  weekBar: {
    display: "flex", justifyContent: "space-between", alignItems: "center",
    background: "#F5F7FA", border: "1px solid #D0D9E8",
    borderRadius: 8, padding: "12px 18px", marginBottom: 14,
  },
  weekLabel: { fontSize: 17, fontWeight: 600, color: "#1A3A5C" },
  grandTotal: { fontSize: 18, fontWeight: 700, color: "#1A3A5C" },
  chipsRow: { display: "flex", gap: 8, flexWrap: "wrap", marginBottom: 16 },
  poyaChip: {
    background: "#FFF3CD", border: "1px solid #C9A84C",
    borderRadius: 20, padding: "4px 12px", fontSize: 14, fontWeight: 600,
    color: "#7a5c00",
  },
  holidayChip: {
    background: "#E8F5E9", border: "1px solid #4CAF50",
    borderRadius: 20, padding: "4px 12px", fontSize: 14, fontWeight: 600,
    color: "#1b5e20",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))",
    gap: 14, marginBottom: 24,
  },
  atmCard: {
    borderRadius: 10, padding: 16,
    background: "#fff", boxShadow: "0 2px 8px rgba(0,0,0,0.07)",
  },
  atmHeader: { display: "flex", alignItems: "center", gap: 10, marginBottom: 12 },
  zoneIcon: { fontSize: 25 },
  atmName: { fontSize: 15, fontWeight: 700, color: "#1A3A5C" },
  atmZone: { fontSize: 13, color: "#777" },
  atmTotal: { fontSize: 21, fontWeight: 700, color: "#1A3A5C" },
  atmTotalLabel: { fontSize: 12, color: "#888", marginBottom: 10 },
  atmMeta: { display: "flex", gap: 12, marginBottom: 10 },
  metaItem: { display: "flex", flexDirection: "column" },
  metaKey: { fontSize: 11, color: "#aaa", textTransform: "uppercase" },
  metaVal: { fontSize: 15, fontWeight: 600 },
  atmAlerts: { display: "flex", gap: 6, flexWrap: "wrap" },
  sheetsInfo: {
    background: "#F5F7FA", borderRadius: 10, padding: 18, marginBottom: 20,
  },
  sheetsTitle: { margin: "0 0 12px", color: "#1A3A5C", fontSize: 16 },
  sheetsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: 10,
  },
  sheetCard: {
    background: "#fff", border: "1px solid #D0D9E8",
    borderRadius: 8, padding: "10px 14px",
  },
  sheetName: { fontWeight: 700, fontSize: 15, color: "#1A3A5C", marginBottom: 4 },
  sheetDesc: { fontSize: 13, color: "#666" },
  ctaBox: {
    background: "linear-gradient(135deg, #1A3A5C, #2563A8)",
    borderRadius: 10, padding: "18px 24px",
    display: "flex", justifyContent: "space-between", alignItems: "center",
  },
  ctaTitle: { color: "#fff", fontWeight: 700, fontSize: 17 },
  ctaSubtitle: { color: "#C9A84C", fontSize: 14, marginTop: 4 },
  ctaBig: {
    background: "#C9A84C", border: "none", color: "#1A3A5C",
    fontWeight: 800, fontSize: 16, borderRadius: 8,
    padding: "12px 28px", cursor: "pointer",
  },
};
