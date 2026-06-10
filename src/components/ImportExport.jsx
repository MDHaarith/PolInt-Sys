import React, { useState } from "react";
import { Download, Upload, Plus, FileText, CheckCircle, AlertCircle } from "lucide-react";

export default function ImportExport({ db, onUpdateDatabase }) {
  const [csvInput, setCsvInput] = useState("");
  const [importLog, setImportLog] = useState(null);
  
  // Form State for Manual Add
  const [name, setName] = useState("");
  const [party, setParty] = useState("ind");
  const [constituency, setConstituency] = useState("");
  const [role, setRole] = useState("");
  const [netWorth, setNetWorth] = useState("");
  const [bio, setBio] = useState("");
  const [nuance, setNuance] = useState("");
  const [formSuccess, setFormSuccess] = useState(false);

  // Simple CSV Parser
  const parseCSV = (text) => {
    const lines = text.split("\n").map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length <= 1) return { error: "CSV must contain a header row and at least one data row." };

    // Basic CSV split ignoring commas inside quotes
    const splitCSVLine = (line) => {
      const result = [];
      let current = "";
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === "," && !inQuotes) {
          result.push(current.trim().replace(/^"|"$/g, ''));
          current = "";
        } else {
          current += char;
        }
      }
      result.push(current.trim().replace(/^"|"$/g, ''));
      return result;
    };

    const headers = splitCSVLine(lines[0]).map(h => h.toLowerCase());
    const importedPoliticians = [];

    for (let i = 1; i < lines.length; i++) {
      const values = splitCSVLine(lines[i]);
      if (values.length < headers.length) continue;

      const pObj = {
        id: `imported_${Date.now()}_${i}`,
        criminalCases: [],
        nuances: []
      };

      headers.forEach((header, idx) => {
        const val = values[idx] || "";
        if (header === "name") pObj.name = val;
        else if (header === "party") pObj.party = val.toLowerCase();
        else if (header === "constituency") pObj.constituency = val;
        else if (header === "role" || header === "portfolio") pObj.role = val;
        else if (header === "networth" || header === "assets") pObj.netWorth = val;
        else if (header === "bio" || header === "biography") pObj.bio = val;
        else if (header === "nuance" || header === "nuances") {
          if (val) pObj.nuances.push(val);
        }
      });

      if (!pObj.name || !pObj.party) {
        continue; // Skip invalid records
      }

      // Default values
      if (!pObj.constituency) pObj.constituency = "General";
      if (!pObj.role) pObj.role = "MLA";
      if (!pObj.netWorth) pObj.netWorth = "N/A";
      if (!pObj.bio) pObj.bio = `Representative of ${pObj.constituency} constituency.`;

      importedPoliticians.push(pObj);
    }

    return { data: importedPoliticians };
  };

  const handleCsvImport = () => {
    if (!csvInput.trim()) return;
    const result = parseCSV(csvInput);
    
    if (result.error) {
      setImportLog({ type: "error", message: result.error });
      return;
    }

    if (result.data.length === 0) {
      setImportLog({ type: "error", message: "No valid politician rows found. Make sure columns 'Name' and 'Party' are populated." });
      return;
    }

    // Merge into database
    const updatedPoliticians = [...db.politicians, ...result.data];
    
    // Auto-create relationship: Member of Party
    const newRelationships = [...db.relationships];
    result.data.forEach((p) => {
      // Check if target party exists in our DB, if not use independent or create
      const partyExists = db.parties.some(pt => pt.id === p.party);
      const partyId = partyExists ? p.party : "ind";
      
      newRelationships.push({
        id: `rel_import_${p.id}`,
        source: p.id,
        target: partyId,
        type: "member",
        label: "Member of",
        nuance: `${p.name} represents ${p.constituency} under ${partyId.toUpperCase()} party banner.`
      });
    });

    onUpdateDatabase({
      ...db,
      politicians: updatedPoliticians,
      relationships: newRelationships
    });

    setImportLog({ 
      type: "success", 
      message: `Successfully imported ${result.data.length} politicians/MLAs to the active intelligence graph!` 
    });
    setCsvInput("");
  };

  const handleManualAdd = (e) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newId = `manual_${Date.now()}`;
    const newPolitician = {
      id: newId,
      name,
      party,
      constituency: constituency || "General",
      role: role || "Political Figure",
      netWorth: netWorth || "N/A",
      birthYear: 1980,
      criminalCases: [],
      bio: bio || `Active political organizer in Tamil Nadu representing ${constituency || 'General'}.`,
      nuances: nuance ? [nuance] : []
    };

    const newRelationships = [...db.relationships, {
      id: `rel_manual_${newId}`,
      source: newId,
      target: party,
      type: "member",
      label: "Member of",
      nuance: `${name} is affiliated with the ${party.toUpperCase()} organization.`
    }];

    onUpdateDatabase({
      ...db,
      politicians: [...db.politicians, newPolitician],
      relationships: newRelationships
    });

    setFormSuccess(true);
    setName("");
    setConstituency("");
    setRole("");
    setNetWorth("");
    setBio("");
    setNuance("");
    
    setTimeout(() => setFormSuccess(false), 3000);
  };

  const handleExportJSON = () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(db, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", "tn_political_intelligence_db.json");
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  return (
    <div className="import-export-container">
      <h2 className="table-title" style={{ marginBottom: "8px" }}>Data Intelligence Hub</h2>
      <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginBottom: "24px" }}>
        Extend the Tamil Nadu political graph by uploading bulk datasets or adding new key figures manually.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "28px" }}>
        
        {/* Left Side: CSV Import & Export */}
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          
          <div className="glass glass-hover" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Download size={18} style={{ color: "var(--success)" }} /> Export Database
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "16px", lineHeight: 1.4 }}>
              Download the active political network, including all customized nodes, relationships, and newly entered MLAs, as a structured JSON file.
            </p>
            <button className="button-btn" onClick={handleExportJSON} style={{ width: "100%", display: "flex", justifyContent: "center", alignItems: "center", gap: "8px" }}>
              <Download size={16} /> Download JSON Database
            </button>
          </div>

          <div className="glass glass-hover" style={{ padding: "24px" }}>
            <h3 style={{ fontSize: "1.1rem", marginBottom: "12px", display: "flex", alignItems: "center", gap: "8px" }}>
              <Upload size={18} style={{ color: "var(--accent-color)" }} /> Paste MLA CSV Data
            </h3>
            <p style={{ color: "var(--text-secondary)", fontSize: "0.85rem", marginBottom: "12px", lineHeight: 1.4 }}>
              Paste comma-separated rows of MLAs. Ensure your headers match: <code>Name, Party, Constituency, Role, NetWorth, Bio, Nuance</code>.
            </p>

            <textarea
              className="form-input"
              style={{ width: "100%", height: "130px", fontFamily: "monospace", fontSize: "0.75rem", marginBottom: "12px", resize: "none" }}
              placeholder="Name,Party,Constituency,Role,NetWorth,Bio,Nuance&#10;M. Appavu,dmk,Radhapuram,Speaker of Assembly,₹5 Crore,DMK politician representing Radhapuram,Active speaker of the 16th assembly."
              value={csvInput}
              onChange={(e) => setCsvInput(e.target.value)}
            />

            <button className="button-btn" onClick={handleCsvImport} style={{ width: "100%" }}>
              Process & Import CSV
            </button>

            {importLog && (
              <div style={{ 
                marginTop: "12px", 
                padding: "12px", 
                borderRadius: "8px", 
                background: importLog.type === "success" ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
                border: `1px solid ${importLog.type === 'success' ? 'rgba(16, 185, 129, 0.2)' : 'rgba(239, 68, 68, 0.2)'}`,
                color: importLog.type === "success" ? "var(--success)" : "var(--danger)",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                {importLog.type === "success" ? <CheckCircle size={16} /> : <AlertCircle size={16} />}
                <span>{importLog.message}</span>
              </div>
            )}
          </div>

          <div className="template-instructions">
            <strong>Sample CSV Column Template:</strong>
            <pre style={{ fontSize: "0.75rem", marginTop: "8px", background: "rgba(0,0,0,0.2)", padding: "8px", borderRadius: "6px", overflowX: "auto" }}>
              Name,Party,Constituency,Role,NetWorth,Bio,Nuance
            </pre>
            <p style={{ fontSize: "0.75rem", marginTop: "8px" }}>
              * Party values must be standard IDs like: <code>dmk</code>, <code>aiadmk</code>, <code>bjp</code>, <code>ntk</code>, <code>tvk</code>, <code>inc</code>, <code>vck</code>, <code>pmk</code>, <code>mdmk</code>, or <code>ind</code>.
            </p>
          </div>
        </div>

        {/* Right Side: Manual Form */}
        <div className="glass glass-hover" style={{ padding: "24px" }}>
          <h3 style={{ fontSize: "1.1rem", marginBottom: "16px", display: "flex", alignItems: "center", gap: "8px" }}>
            <Plus size={18} style={{ color: "var(--accent-color)" }} /> Add New Politician
          </h3>

          <form onSubmit={handleManualAdd} className="add-entity-form">
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Name *</label>
                <input required type="text" className="form-input" placeholder="e.g., M. Appavu" value={name} onChange={(e) => setName(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Affiliated Party *</label>
                <select className="select-dropdown" style={{ height: "42px" }} value={party} onChange={(e) => setParty(e.target.value)}>
                  {db.parties.map(pt => (
                    <option key={pt.id} value={pt.id}>{pt.name.split(" (")[0]}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <div className="form-group">
                <label className="form-label">Constituency</label>
                <input type="text" className="form-input" placeholder="e.g., Radhapuram" value={constituency} onChange={(e) => setConstituency(e.target.value)} />
              </div>
              <div className="form-group">
                <label className="form-label">Net Worth / Assets</label>
                <input type="text" className="form-input" placeholder="e.g., ₹5 Crore" value={netWorth} onChange={(e) => setNetWorth(e.target.value)} />
              </div>
            </div>

            <div className="form-group">
              <label className="form-label">Current Role / Portfolio</label>
              <input type="text" className="form-input" placeholder="e.g., Speaker of the Assembly" value={role} onChange={(e) => setRole(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Political Biography</label>
              <textarea className="form-input" style={{ height: "60px", resize: "none" }} placeholder="Brief background of the political leader..." value={bio} onChange={(e) => setBio(e.target.value)} />
            </div>

            <div className="form-group">
              <label className="form-label">Controversial Nuance / Inside Intel</label>
              <textarea className="form-input" style={{ height: "60px", resize: "none" }} placeholder="Controversies, historical actions, family associations..." value={nuance} onChange={(e) => setNuance(e.target.value)} />
            </div>

            <button type="submit" className="button-btn" style={{ marginTop: "12px" }}>
              Add to Active Graph
            </button>

            {formSuccess && (
              <div style={{ 
                marginTop: "12px", 
                padding: "12px", 
                borderRadius: "8px", 
                background: "rgba(16, 185, 129, 0.08)",
                border: "1px solid rgba(16, 185, 129, 0.2)",
                color: "var(--success)",
                fontSize: "0.8rem",
                display: "flex",
                alignItems: "center",
                gap: "8px"
              }}>
                <CheckCircle size={16} />
                <span>Politician successfully added to active dataset and linked to party node!</span>
              </div>
            )}
          </form>
        </div>

      </div>
    </div>
  );
}
