import React, { useState } from "react";
import { Plus, Search, FileText, Trash2, Folder, FolderOpen } from "lucide-react";

export default function NoteExplorer({ 
  notes, activeNote, onSelectNote, 
  onCreateNote, onDeleteNote 
}) {
  const [searchQuery, setSearchQuery] = useState("");
  const [collapsedGroups, setCollapsedGroups] = useState({
    politician: false,
    party: false,
    event: false,
    general: false
  });

  const toggleGroup = (group) => {
    setCollapsedGroups(prev => ({
      ...prev,
      [group]: !prev[group]
    }));
  };

  const handleCreateNote = () => {
    const title = prompt("Enter note title:");
    if (!title || !title.trim()) return;

    // Check if note already exists
    const exists = notes.some(n => n.title.toLowerCase().trim() === title.toLowerCase().trim());
    if (exists) {
      alert("A note with this title already exists!");
      return;
    }

    onCreateNote(title.trim());
  };

  const handleDelete = (note, e) => {
    e.stopPropagation();
    if (confirm(`Are you sure you want to delete "${note.title}"?`)) {
      onDeleteNote(note.title);
    }
  };

  // Filter notes based on search query
  const filteredNotes = notes.filter(note => 
    note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    note.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Group notes by type
  const groupedNotes = {
    politician: filteredNotes.filter(n => n.type === "politician"),
    party: filteredNotes.filter(n => n.type === "party"),
    event: filteredNotes.filter(n => n.type === "event"),
    general: filteredNotes.filter(n => n.type === "general" || !n.type)
  };

  const renderGroup = (groupType, label) => {
    const list = groupedNotes[groupType];
    const isCollapsed = collapsedGroups[groupType];
    
    if (list.length === 0 && searchQuery) return null;

    return (
      <div style={{ marginBottom: "16px" }} key={groupType}>
        <div 
          className="note-group-title" 
          onClick={() => toggleGroup(groupType)}
          style={{ cursor: "pointer", userSelect: "none" }}
        >
          {isCollapsed ? <ChevronRightIcon /> : <ChevronDownIcon />}
          <span>{label} ({list.length})</span>
        </div>
        
        {!isCollapsed && (
          <div style={{ paddingLeft: "8px", marginTop: "4px" }}>
            {list.map(note => {
              const isActive = activeNote && activeNote.title === note.title;
              const isStub = note.isStub;
              const partyColor = note.party ? `var(--color-${note.party.toLowerCase()})` : "transparent";

              return (
                <div 
                  key={note.title}
                  className={`note-item ${isActive ? "active" : ""} ${isStub ? "stub" : ""}`}
                  onClick={() => onSelectNote(note)}
                  style={{ display: "flex", justifyContent: "space-between", alignBars: "center" }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {note.party ? (
                      <span className="party-dot-badge" style={{ backgroundColor: partyColor }} />
                    ) : (
                      <FileText size={13} style={{ color: isStub ? "var(--text-muted)" : "var(--text-secondary)" }} />
                    )}
                    <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                      {note.title}
                    </span>
                  </div>
                  
                  {isActive && (
                    <button 
                      onClick={(e) => handleDelete(note, e)}
                      style={{ background: "none", border: "none", color: "var(--text-muted)", cursor: "pointer" }}
                      className="delete-note-btn"
                      title="Delete Note"
                    >
                      <Trash2 size={12} className="hover:text-red-400" style={{ transition: "color 0.2s" }} />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    );
  };

  return (
    <aside className="obsidian-sidebar">
      <div className="sidebar-header">
        <div className="sidebar-title">
          <Folder size={16} style={{ color: "var(--accent-color)" }} />
          Political Vault
        </div>
        <button className="header-btn" onClick={handleCreateNote} style={{ padding: "4px 8px" }}>
          <Plus size={14} /> New
        </button>
      </div>

      <div className="search-box">
        <div className="search-input-wrapper">
          <Search size={14} style={{ color: "var(--text-muted)" }} />
          <input 
            type="text" 
            className="search-field" 
            placeholder="Search notes..." 
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <div className="note-list-container">
        {renderGroup("politician", "Politicians")}
        {renderGroup("party", "Parties")}
        {renderGroup("event", "Historical Events")}
        {renderGroup("general", "General & Stubs")}

        {filteredNotes.length === 0 && (
          <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)", fontSize: "0.8rem" }}>
            No notes found.
          </div>
        )}
      </div>
    </aside>
  );
}

// Inline mini SVG Chevron components
const ChevronDownIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}><polyline points="6 9 12 15 18 9"></polyline></svg>
);

const ChevronRightIcon = () => (
  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: "var(--text-muted)" }}><polyline points="9 18 15 12 9 6"></polyline></svg>
);
