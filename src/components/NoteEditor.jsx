import React, { useState, useEffect } from "react";
import { Edit3, Eye, FileText, Info } from "lucide-react";

export default function NoteEditor({ 
  note, allNotes, onUpdateNote, onWikiLinkClick 
}) {
  const [viewMode, setViewMode] = useState("preview"); // "edit" | "preview"

  // Whenever the active note changes, default to Preview mode for clean reading
  useEffect(() => {
    setViewMode("preview");
  }, [note?.title]);

  if (!note) {
    return (
      <div className="obsidian-editor-pane">
        <div className="editor-header">
          <div className="editor-title-display">
            <FileText size={16} style={{ color: "var(--text-muted)" }} />
            <span>Active Note</span>
          </div>
        </div>
        <div className="editor-scroller" style={{ justifyContent: "center", alignItems: "center", color: "var(--text-secondary)", textAlign: "center" }}>
          <Info size={40} strokeWidth={1.5} style={{ marginBottom: "12px", color: "var(--accent-color)" }} />
          <h3>No Note Selected</h3>
          <p style={{ fontSize: "0.85rem", color: "var(--text-muted)", marginTop: "8px", maxWidth: "320px" }}>
            Select an existing note from the Political Vault sidebar or click a node in the graph to inspect and edit.
          </p>
        </div>
      </div>
    );
  }

  const handleContentChange = (e) => {
    onUpdateNote({
      ...note,
      content: e.target.value
    });
  };

  const handleMetaChange = (field, value) => {
    onUpdateNote({
      ...note,
      [field]: value
    });
  };

  // Simple Markdown Parsing logic
  const parseBoldText = (text) => {
    const boldRegex = /\*\*(.*?)\*\*/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = boldRegex.exec(text)) !== null) {
      const textBefore = text.substring(lastIndex, match.index);
      if (textBefore) parts.push(textBefore);

      parts.push(<strong key={match.index}>{match[1]}</strong>);
      lastIndex = boldRegex.lastIndex;
    }

    const textAfter = text.substring(lastIndex);
    if (textAfter) parts.push(textAfter);

    return parts.length > 0 ? parts : text;
  };

  const replaceWikiLinks = (text) => {
    const linkRegex = /\[\[(.*?)\]\]/g;
    const parts = [];
    let lastIndex = 0;
    let match;

    while ((match = linkRegex.exec(text)) !== null) {
      const textBefore = text.substring(lastIndex, match.index);
      if (textBefore) {
        parts.push(parseBoldText(textBefore));
      }

      const targetTitle = match[1].trim();
      // Check if note exists and is not a stub
      const targetNote = allNotes.find(
        n => n.title.toLowerCase().trim() === targetTitle.toLowerCase().trim()
      );
      const exists = targetNote && !targetNote.isStub;

      parts.push(
        <a
          key={match.index}
          href="#"
          onClick={(e) => {
            e.preventDefault();
            onWikiLinkClick(targetTitle);
          }}
          className={`wiki-link ${exists ? "" : "stub"}`}
          title={exists ? `Open note: ${targetTitle}` : `Create note: ${targetTitle}`}
        >
          {targetTitle}
        </a>
      );

      lastIndex = linkRegex.lastIndex;
    }

    const textAfter = text.substring(lastIndex);
    if (textAfter) {
      parts.push(parseBoldText(textAfter));
    }

    return parts.length > 0 ? parts : parseBoldText(text);
  };

  const parseMarkdown = (content) => {
    const lines = content.split("\n");
    const renderedElements = [];
    
    // Filter out YAML frontmatter block if it exists
    let inFrontmatter = false;
    let textLines = [];
    
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (i === 0 && line.trim() === "---") {
        inFrontmatter = true;
        continue;
      }
      if (inFrontmatter && line.trim() === "---") {
        inFrontmatter = false;
        continue;
      }
      if (!inFrontmatter) {
        textLines.push(line);
      }
    }

    const joinedText = textLines.join("\n");
    const sections = joinedText.split("\n\n");

    sections.forEach((section, secIdx) => {
      const trimmed = section.trim();
      if (!trimmed) return;

      // Headings
      if (trimmed.startsWith("# ")) {
        renderedElements.push(<h1 key={secIdx}>{replaceWikiLinks(trimmed.substring(2))}</h1>);
        return;
      }
      if (trimmed.startsWith("## ")) {
        renderedElements.push(<h2 key={secIdx}>{replaceWikiLinks(trimmed.substring(3))}</h2>);
        return;
      }
      if (trimmed.startsWith("### ")) {
        renderedElements.push(<h3 key={secIdx}>{replaceWikiLinks(trimmed.substring(4))}</h3>);
        return;
      }

      // Lists
      if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
        const items = trimmed.split("\n");
        renderedElements.push(
          <ul key={secIdx}>
            {items.map((item, itemIdx) => {
              const cleanItem = item.replace(/^[-*]\s+/, "");
              return <li key={itemIdx}>{replaceWikiLinks(cleanItem)}</li>;
            })}
          </ul>
        );
        return;
      }

      // Standard paragraph with line breaks
      const linesOfPara = trimmed.split("\n");
      renderedElements.push(
        <p key={secIdx}>
          {linesOfPara.map((line, lineIdx) => (
            <React.Fragment key={lineIdx}>
              {lineIdx > 0 && <br />}
              {replaceWikiLinks(line)}
            </React.Fragment>
          ))}
        </p>
      );
    });

    return renderedElements;
  };

  return (
    <div className="obsidian-editor-pane">
      <div className="editor-header">
        <div className="editor-title-display">
          <FileText size={15} style={{ color: "var(--accent-color)" }} />
          <span style={{ fontWeight: 600 }}>{note.title}</span>
          {note.isStub && (
            <span style={{ fontSize: "0.7rem", color: "var(--danger)", background: "rgba(239, 68, 68, 0.1)", padding: "2px 6px", borderRadius: "4px" }}>
              Stub Note
            </span>
          )}
        </div>

        <div className="tab-toggle-group">
          <button 
            className={`tab-toggle-btn ${viewMode === "preview" ? "active" : ""}`}
            onClick={() => setViewMode("preview")}
          >
            <Eye size={12} style={{ marginRight: "4px", display: "inline" }} /> Preview
          </button>
          <button 
            className={`tab-toggle-btn ${viewMode === "edit" ? "active" : ""}`}
            onClick={() => setViewMode("edit")}
          >
            <Edit3 size={12} style={{ marginRight: "4px", display: "inline" }} /> Edit
          </button>
        </div>
      </div>

      <div className="editor-scroller">
        {viewMode === "edit" ? (
          <>
            {/* Metadata Bar */}
            <div className="editor-meta-bar">
              <div>
                <label className="dossier-label">Note Type</label>
                <select 
                  className="select-dropdown" 
                  style={{ width: "100%", height: "36px", marginTop: "4px" }}
                  value={note.type || "general"}
                  onChange={(e) => handleMetaChange("type", e.target.value)}
                >
                  <option value="politician">Politician</option>
                  <option value="party">Political Party</option>
                  <option value="event">Historical Event</option>
                  <option value="general">General Topic / Dossier</option>
                </select>
              </div>

              <div>
                <label className="dossier-label">Party Affiliation</label>
                <select 
                  className="select-dropdown" 
                  style={{ width: "100%", height: "36px", marginTop: "4px" }}
                  value={note.party || ""}
                  onChange={(e) => handleMetaChange("party", e.target.value)}
                >
                  <option value="">None / Independent</option>
                  <option value="dmk">DMK</option>
                  <option value="aiadmk">AIADMK</option>
                  <option value="bjp">BJP</option>
                  <option value="ntk">NTK</option>
                  <option value="tvk">TVK</option>
                  <option value="inc">Congress</option>
                  <option value="vck">VCK</option>
                  <option value="pmk">PMK</option>
                  <option value="mdmk">MDMK</option>
                </select>
              </div>

              <div>
                <label className="dossier-label">Constituency / Leader</label>
                <input 
                  type="text" 
                  className="form-input" 
                  style={{ width: "100%", height: "36px", marginTop: "4px", padding: "6px 12px" }}
                  placeholder="e.g., Kolathur / M. K. Stalin"
                  value={note.constituency || ""}
                  onChange={(e) => handleMetaChange("constituency", e.target.value)}
                />
              </div>
            </div>

            {/* Markdown Text Area */}
            <textarea
              className="editor-textarea"
              placeholder="# Enter Note Title&#10;&#10;Write markdown notes here. Use double brackets to link: [[Another Politician]] or [[DMK]]."
              value={note.content}
              onChange={handleContentChange}
            />
          </>
        ) : (
          <div className="preview-container">
            {parseMarkdown(note.content)}
          </div>
        )}
      </div>
    </div>
  );
}
