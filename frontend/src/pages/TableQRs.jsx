import { useState } from "react";
import { QRCodeCanvas } from "qrcode.react";
import { Printer } from "lucide-react";

export default function TableQRs() {
  // Automatically uses the current Network IP if you open this page via the Network URL
  const defaultBase = `${window.location.protocol}//${window.location.host}`;
  const [baseUrl, setBaseUrl] = useState(defaultBase);
  const tables = [1, 2, 3, 4, 5, 6];

  return (
    <div style={{ maxWidth: "1000px", margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px", marginBottom: "20px" }}>
        <div>
          <h1 style={{ color: "#396000" }}>Zaika Table QR Codes</h1>
          <p style={{ color: "#6E6A63", fontSize: "0.9rem" }}>
            Scan any QR with your phone (must be on the same Wi-Fi as your laptop)
          </p>
        </div>
        <button
          onClick={() => window.print()}
          style={{ background: "#396000", color: "#fff", border: "none", padding: "10px 18px", borderRadius: "10px", fontWeight: "700", cursor: "pointer", display: "flex", alignItems: "center", gap: "8px" }}
        >
          <Printer size={16} /> Print QR Cards
        </button>
      </div>

      {/* Editable Base URL in case you opened localhost instead of Network IP */}
      <div style={{ background: "#FFF8DB", padding: "12px 16px", borderRadius: "12px", marginBottom: "24px", border: "1px solid #DAB716" }}>
        <label style={{ fontSize: "0.85rem", fontWeight: "700", display: "block", marginBottom: "6px" }}>
          Wi-Fi Base URL (replace localhost with your laptop's Network IP, e.g., http://192.168.1.15:5173):
        </label>
        <input
          type="text"
          value={baseUrl}
          onChange={(e) => setBaseUrl(e.target.value.replace(/\/$/, ""))}
          style={{ width: "100%", padding: "8px 12px", borderRadius: "8px", border: "1px solid #ccc", fontSize: "0.95rem" }}
        />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(220px, 1fr))", gap: "20px" }}>
        {tables.map((num) => {
          const tableUrl = `${baseUrl}/table/${num}`;
          return (
            <div
              key={num}
              style={{ background: "#fff", padding: "20px", borderRadius: "16px", textAlign: "center", boxShadow: "0 4px 14px rgba(0,0,0,0.06)", borderTop: "5px solid #396000" }}
            >
              <h2 style={{ color: "#396000", marginBottom: "4px" }}>ZAIKA</h2>
              <span style={{ background: "#DAB716", color: "#111", fontSize: "0.78rem", fontWeight: "800", padding: "3px 10px", borderRadius: "10px" }}>
                Table #{num}
              </span>

              <div style={{ margin: "18px 0" }}>
                <QRCodeCanvas value={tableUrl} size={160} fgColor="#1E1E1C" />
              </div>

              <p style={{ fontSize: "0.75rem", color: "#6E6A63", wordBreak: "break-all" }}>
                {tableUrl}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
}