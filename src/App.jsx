import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  Plus,
  Upload,
  Pencil,
  Trash2,
  X,
  Loader2,
  FileText,
  Inbox,
  SendHorizontal,
  Save,
  AlertCircle,
  BookOpenText,
} from "lucide-react";
import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
} from "firebase/firestore";

/* ---------------------------------------------------------------
   Design tokens — paper-ledger look: cream page, ink-navy structure,
   one sealing-wax red for the "stamp" moments (save / new entry).
----------------------------------------------------------------*/
const INK = "#26313f";
const INK_SOFT = "#5b6b7d";
const PAPER = "#f6f1e6";
const PAPER_LINE = "#e2d9c4";
const RULE = "#c9bd9e";
const WAX = "#9a3324";
const WAX_DARK = "#7a2819";

const MONTHS = [
  "Styczeń", "Luty", "Marzec", "Kwiecień", "Maj", "Czerwiec",
  "Lipiec", "Sierpień", "Wrzesień", "Październik", "Listopad", "Grudzień",
];

const YEARS = Array.from({ length: 6 }, (_, i) => 2024 + i);

const INCOMING_FIELDS = [
  { key: "dataOtrzymania", label: "Data otrzymania", type: "date" },
  { key: "rodzaj", label: "Rodzaj dok.", type: "text" },
  { key: "nr", label: "Nr", type: "text" },
  { key: "dataDokumentu", label: "Data", type: "date" },
  { key: "odKogo", label: "Od kogo", type: "text" },
  { key: "tresc", label: "Treść otrzymanej korespondencji", type: "textarea" },
  { key: "znakReferenta", label: "Znak referenta", type: "text" },
  { key: "gdzieDok", label: "Gdzie jest dok. / Nr teczki", type: "text" },
  { key: "uwagi", label: "Uwagi", type: "textarea" },
];

const OUTGOING_FIELDS = [
  { key: "dataWyslania", label: "Data wysłanej koresp.", type: "date" },
  { key: "doKogo", label: "Do kogo", type: "text" },
  { key: "tresc", label: "Treść wysłanej korespondencji", type: "textarea" },
  { key: "nrOdpowiedzi", label: "Nr koresp. na którą udzielono odp.", type: "text" },
  { key: "nrWyslanej", label: "Nr korespondencji wysłanej", type: "text" },
  { key: "gdzieUkryte", label: "Gdzie ukryte", type: "text" },
  { key: "uwagi", label: "Uwagi (wysłana przez / jak)", type: "textarea" },
];

function emptyEntry(fields) {
  const e = {};
  fields.forEach((f) => (e[f.key] = ""));
  return e;
}

// Nazwa kolekcji Firestore dla danego miesiąca/roku/kierunku.
function collectionName(year, month, direction) {
  return `korespondencja_${year}_${String(month).padStart(2, "0")}_${direction}`;
}

function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(r.result.split(",")[1]);
    r.onerror = () => reject(new Error("Nie udało się odczytać pliku"));
    r.readAsDataURL(file);
  });
}

/* ---------------------------------------------------------------
   Small UI atoms
----------------------------------------------------------------*/
function Seal({ size = 40 }) {
  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: "50%",
        background: `radial-gradient(circle at 35% 30%, ${WAX} 0%, ${WAX_DARK} 70%)`,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        boxShadow: "0 2px 4px rgba(0,0,0,0.25), inset 0 1px 2px rgba(255,255,255,0.15)",
        flexShrink: 0,
      }}
    >
      <BookOpenText size={size * 0.5} color="#f6e9d8" strokeWidth={1.75} />
    </div>
  );
}

function FieldInput({ field, value, onChange, autoFocus }) {
  const common = {
    value: value ?? "",
    onChange: (e) => onChange(field.key, e.target.value),
    autoFocus,
    style: {
      width: "100%",
      fontFamily: "inherit",
      fontSize: "0.85rem",
      color: INK,
      background: "#fffdf8",
      border: `1px solid ${RULE}`,
      borderRadius: 4,
      padding: "0.4rem 0.5rem",
      outline: "none",
    },
  };
  if (field.type === "textarea") return <textarea rows={2} {...common} />;
  if (field.type === "date") return <input type="date" {...common} />;
  return <input type="text" {...common} />;
}

/* ---------------------------------------------------------------
   Manual add/edit modal
----------------------------------------------------------------*/
function EntryModal({ fields, initial, onSave, onClose, title }) {
  const [draft, setDraft] = useState(initial);
  const update = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(38,49,63,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: PAPER, width: "100%", maxWidth: 640, maxHeight: "88vh", overflowY: "auto", borderRadius: "16px 16px 0 0", border: `1px solid ${RULE}`, borderBottom: "none", padding: "1.25rem 1.25rem 1.5rem" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "Georgia, serif", color: INK, fontSize: "1.05rem" }}>{title}</h3>
          <button onClick={onClose} aria-label="Zamknij"><X size={20} color={INK_SOFT} /></button>
        </div>
        <div className="flex flex-col gap-3">
          {fields.map((f, i) => (
            <label key={f.key} className="flex flex-col gap-1">
              <span style={{ fontSize: "0.72rem", color: INK_SOFT, letterSpacing: "0.02em" }}>{f.label}</span>
              <FieldInput field={f} value={draft[f.key]} onChange={update} autoFocus={i === 0} />
            </label>
          ))}
        </div>
        <button
          onClick={() => onSave(draft)}
          className="flex items-center justify-center gap-2 mt-5"
          style={{ width: "100%", background: WAX, color: "#f6e9d8", border: "none", borderRadius: 8, padding: "0.7rem", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}
        >
          <Save size={16} /> Zapisz wpis
        </button>
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Upload + AI (Gemini Vision) extraction modal
----------------------------------------------------------------*/
function UploadModal({ direction, fields, onSave, onClose }) {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState("");
  const [draft, setDraft] = useState(null);
  const inputRef = useRef(null);

  const fieldList = fields.map((f) => `- ${f.key}: ${f.label}`).join("\n");

  const handleFile = async (f) => {
    if (!f) return;
    setFile(f);
    setError("");
    setDraft(null);
    setPreview(f.type.startsWith("image/") ? URL.createObjectURL(f) : null);
    setStatus("reading");
    try {
      const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
      if (!apiKey) throw new Error("Brak klucza VITE_GEMINI_API_KEY w konfiguracji.");
      const base64 = await fileToBase64(f);
      const mimeType = f.type || "image/jpeg";

      const prompt = `Jesteś asystentem biurowym. Na obrazie/dokumencie znajduje się pismo urzędowe lub e-mail. Wyciągnij z niego dane do rejestru korespondencji ${direction === "incoming" ? "PRZYCHODZĄCEJ" : "WYCHODZĄCEJ"} i zwróć WYŁĄCZNIE obiekt JSON (bez markdown, bez komentarzy) z dokładnie tymi kluczami:\n${fieldList}\n\nZasady:\n- Daty w formacie DD.MM.RRRR jeśli widoczne, inaczej pusty string.\n- Jeśli pola nie da się ustalić z dokumentu, zostaw pusty string "".\n- Nie zmyślaj danych, których nie widać w dokumencie.\n- Zwróć czysty JSON, nic więcej.`;

      const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.6-flash:generateContent?key=${apiKey}`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            contents: [
              {
                parts: [
                  { inline_data: { mime_type: mimeType, data: base64 } },
                  { text: prompt },
                ],
              },
            ],
          }),
        }
      );
      const data = await response.json();
      const text = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!text) throw new Error(data?.error?.message || "Brak odpowiedzi od Gemini");
      const cleaned = text.replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(cleaned);
      const merged = emptyEntry(fields);
      fields.forEach((f) => {
        if (typeof parsed[f.key] === "string") merged[f.key] = parsed[f.key];
      });
      setDraft(merged);
      setStatus("idle");
    } catch (e) {
      console.error(e);
      setError(`Nie udało się odczytać dokumentu automatycznie (${e.message}). Możesz wpisać dane ręcznie poniżej.`);
      setDraft(emptyEntry(fields));
      setStatus("idle");
    }
  };

  const update = (k, v) => setDraft((d) => ({ ...d, [k]: v }));

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(38,49,63,0.55)", display: "flex", alignItems: "flex-end", justifyContent: "center", zIndex: 50 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: PAPER, width: "100%", maxWidth: 640, maxHeight: "90vh", overflowY: "auto", borderRadius: "16px 16px 0 0", border: `1px solid ${RULE}`, borderBottom: "none", padding: "1.25rem 1.25rem 1.5rem" }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 style={{ fontFamily: "Georgia, serif", color: INK, fontSize: "1.05rem" }}>Dodaj ze zdjęcia / skanu</h3>
          <button onClick={onClose} aria-label="Zamknij"><X size={20} color={INK_SOFT} /></button>
        </div>

        {!file && (
          <button
            onClick={() => inputRef.current?.click()}
            className="flex flex-col items-center justify-center gap-2"
            style={{ width: "100%", border: `2px dashed ${RULE}`, borderRadius: 10, padding: "2.25rem 1rem", background: "#fffdf8", cursor: "pointer" }}
          >
            <Upload size={28} color={INK_SOFT} />
            <span style={{ color: INK_SOFT, fontSize: "0.85rem" }}>Wybierz zdjęcie lub skan pisma</span>
          </button>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(e) => handleFile(e.target.files?.[0])}
        />

        {file && (
          <div className="flex items-center gap-3 mt-2 mb-3">
            {preview ? (
              <img src={preview} alt="podgląd" style={{ width: 56, height: 56, objectFit: "cover", borderRadius: 6, border: `1px solid ${RULE}` }} />
            ) : (
              <FileText size={32} color={INK_SOFT} />
            )}
            <div className="flex-1" style={{ fontSize: "0.8rem", color: INK }}>{file.name}</div>
            <button
              onClick={() => { setFile(null); setDraft(null); setPreview(null); setError(""); }}
              style={{ fontSize: "0.75rem", color: WAX, background: "none", border: "none", cursor: "pointer" }}
            >
              Zmień plik
            </button>
          </div>
        )}

        {status === "reading" && (
          <div className="flex items-center gap-2" style={{ color: INK_SOFT, fontSize: "0.85rem", padding: "0.75rem 0" }}>
            <Loader2 size={16} className="animate-spin" /> Odczytuję dokument…
          </div>
        )}

        {error && (
          <div className="flex items-start gap-2" style={{ color: WAX_DARK, fontSize: "0.8rem", padding: "0.5rem 0" }}>
            <AlertCircle size={16} style={{ marginTop: 1, flexShrink: 0 }} /> {error}
          </div>
        )}

        {draft && status === "idle" && (
          <>
            <div style={{ fontSize: "0.72rem", color: INK_SOFT, margin: "0.75rem 0 0.5rem" }}>
              Sprawdź i popraw dane przed zapisaniem:
            </div>
            <div className="flex flex-col gap-3">
              {fields.map((f) => (
                <label key={f.key} className="flex flex-col gap-1">
                  <span style={{ fontSize: "0.72rem", color: INK_SOFT }}>{f.label}</span>
                  <FieldInput field={f} value={draft[f.key]} onChange={update} />
                </label>
              ))}
            </div>
            <button
              onClick={() => onSave(draft)}
              className="flex items-center justify-center gap-2 mt-5"
              style={{ width: "100%", background: WAX, color: "#f6e9d8", border: "none", borderRadius: 8, padding: "0.7rem", fontSize: "0.9rem", fontWeight: 600, cursor: "pointer" }}
            >
              <Save size={16} /> Zapisz wpis
            </button>
          </>
        )}
      </div>
    </div>
  );
}

/* ---------------------------------------------------------------
   Main app
----------------------------------------------------------------*/
export default function App() {
  const now = new Date();
  const [year, setYear] = useState(now.getFullYear());
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [direction, setDirection] = useState("incoming");
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [saveError, setSaveError] = useState("");

  const fields = direction === "incoming" ? INCOMING_FIELDS : OUTGOING_FIELDS;

  const load = useCallback(async () => {
    setLoading(true);
    setSaveError("");
    try {
      const snap = await getDocs(collection(db, collectionName(year, month, direction)));
      setEntries(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    } catch (e) {
      console.error(e);
      setSaveError("Nie udało się wczytać danych z Firebase. Sprawdź konfigurację (VITE_FIREBASE_*).");
      setEntries([]);
    }
    setLoading(false);
  }, [year, month, direction]);

  useEffect(() => { load(); }, [load]);

  const addEntry = async (draft) => {
    try {
      const ref = await addDoc(collection(db, collectionName(year, month, direction)), draft);
      setEntries((prev) => [...prev, { id: ref.id, ...draft }]);
      setModal(null);
    } catch (e) {
      console.error(e);
      setSaveError("Nie udało się zapisać wpisu.");
    }
  };

  const updateEntry = async (id, draft) => {
    try {
      await updateDoc(doc(db, collectionName(year, month, direction), id), draft);
      setEntries((prev) => prev.map((e) => (e.id === id ? { id, ...draft } : e)));
      setModal(null);
    } catch (e) {
      console.error(e);
      setSaveError("Nie udało się zapisać zmian.");
    }
  };

  const deleteEntry = async (id) => {
    if (!window.confirm("Usunąć ten wpis?")) return;
    try {
      await deleteDoc(doc(db, collectionName(year, month, direction), id));
      setEntries((prev) => prev.filter((e) => e.id !== id));
    } catch (e) {
      console.error(e);
      setSaveError("Nie udało się usunąć wpisu.");
    }
  };

  return (
    <div style={{ minHeight: "100vh", background: PAPER, fontFamily: "system-ui, sans-serif" }}>
      <div style={{ background: INK, padding: "1.1rem 1.25rem 1.4rem" }}>
        <div className="flex items-center gap-3">
          <Seal />
          <div>
            <h1 style={{ fontFamily: "Georgia, serif", color: "#f6e9d8", fontSize: "1.15rem", letterSpacing: "0.01em" }}>Książka Korespondencji</h1>
            <p style={{ color: "#aeb9c6", fontSize: "0.75rem" }}>Rejestr pism przychodzących i wychodzących</p>
          </div>
        </div>

        <div className="flex gap-2 mt-4">
          <select value={month} onChange={(e) => setMonth(Number(e.target.value))} style={selectStyle}>
            {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
          </select>
          <select value={year} onChange={(e) => setYear(Number(e.target.value))} style={selectStyle}>
            {YEARS.map((y) => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
      </div>

      <div className="flex" style={{ borderBottom: `1px solid ${RULE}` }}>
        <TabButton active={direction === "incoming"} onClick={() => setDirection("incoming")} icon={<Inbox size={15} />} label="Przychodząca" />
        <TabButton active={direction === "outgoing"} onClick={() => setDirection("outgoing")} icon={<SendHorizontal size={15} />} label="Wychodząca" />
      </div>

      <div style={{ padding: "1rem 1rem 6rem" }}>
        {saveError && (
          <div className="flex items-center gap-2 mb-3" style={{ color: WAX_DARK, fontSize: "0.8rem" }}>
            <AlertCircle size={15} /> {saveError}
          </div>
        )}

        {loading ? (
          <div className="flex items-center gap-2" style={{ color: INK_SOFT, fontSize: "0.85rem", padding: "1rem 0" }}>
            <Loader2 size={16} className="animate-spin" /> Wczytuję…
          </div>
        ) : entries.length === 0 ? (
          <div style={{ border: `1px dashed ${RULE}`, borderRadius: 10, padding: "2rem 1rem", textAlign: "center", color: INK_SOFT, fontSize: "0.85rem" }}>
            Brak wpisów za {MONTHS[month - 1].toLowerCase()} {year}. Dodaj pierwszy wpis poniżej.
          </div>
        ) : (
          <div className="flex flex-col gap-3">
            {entries.map((entry) => (
              <EntryCard key={entry.id} entry={entry} fields={fields} onEdit={() => setModal({ edit: entry })} onDelete={() => deleteEntry(entry.id)} />
            ))}
          </div>
        )}
      </div>

      <div style={{ position: "fixed", bottom: 0, left: 0, right: 0, background: PAPER, borderTop: `1px solid ${RULE}`, padding: "0.75rem 1rem", display: "flex", gap: "0.6rem" }}>
        <button onClick={() => setModal("upload")} className="flex items-center justify-center gap-2" style={{ ...actionBtnStyle, background: "#fffdf8", color: INK, border: `1px solid ${RULE}` }}>
          <Upload size={16} /> Ze zdjęcia
        </button>
        <button onClick={() => setModal("add")} className="flex items-center justify-center gap-2" style={{ ...actionBtnStyle, background: WAX, color: "#f6e9d8", border: "none" }}>
          <Plus size={16} /> Wpis ręczny
        </button>
      </div>

      {modal === "add" && (
        <EntryModal fields={fields} initial={emptyEntry(fields)} title={direction === "incoming" ? "Nowe pismo przychodzące" : "Nowe pismo wychodzące"} onClose={() => setModal(null)} onSave={addEntry} />
      )}
      {modal === "upload" && (
        <UploadModal direction={direction} fields={fields} onClose={() => setModal(null)} onSave={addEntry} />
      )}
      {modal && modal.edit && (
        <EntryModal fields={fields} initial={modal.edit} title="Edytuj wpis" onClose={() => setModal(null)} onSave={(draft) => updateEntry(modal.edit.id, draft)} />
      )}
    </div>
  );
}

const selectStyle = {
  flex: 1,
  background: "#1d2733",
  color: "#f0ece1",
  border: `1px solid #3a4757`,
  borderRadius: 7,
  padding: "0.45rem 0.5rem",
  fontSize: "0.85rem",
};

const actionBtnStyle = {
  flex: 1,
  borderRadius: 9,
  padding: "0.75rem",
  fontSize: "0.85rem",
  fontWeight: 600,
  cursor: "pointer",
};

function TabButton({ active, onClick, icon, label }) {
  return (
    <button
      onClick={onClick}
      className="flex items-center justify-center gap-2 flex-1"
      style={{ padding: "0.7rem", fontSize: "0.85rem", fontWeight: 600, color: active ? WAX : INK_SOFT, background: active ? "#fffdf8" : "transparent", borderBottom: active ? `2px solid ${WAX}` : "2px solid transparent", border: "none", cursor: "pointer" }}
    >
      {icon} {label}
    </button>
  );
}

function EntryCard({ entry, fields, onEdit, onDelete }) {
  const primary = fields[0];
  const secondary = fields.find((f) => f.key.toLowerCase().includes("kogo")) || fields[1];
  const content = fields.find((f) => f.key === "tresc");

  return (
    <div style={{ background: "#fffdf8", border: `1px solid ${PAPER_LINE}`, borderRadius: 10, padding: "0.85rem 0.9rem" }}>
      <div className="flex items-start justify-between gap-2">
        <div style={{ minWidth: 0 }}>
          <div style={{ fontSize: "0.78rem", color: INK_SOFT, fontFamily: "ui-monospace, monospace" }}>
            {entry[primary.key] || "—"} {secondary ? `· ${entry[secondary.key] || "—"}` : ""}
          </div>
          {content && (
            <div style={{ fontSize: "0.85rem", color: INK, marginTop: "0.25rem", overflowWrap: "break-word" }}>
              {entry[content.key] || <span style={{ color: INK_SOFT }}>brak treści</span>}
            </div>
          )}
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={onEdit} aria-label="Edytuj" style={iconBtnStyle}><Pencil size={15} color={INK_SOFT} /></button>
          <button onClick={onDelete} aria-label="Usuń" style={iconBtnStyle}><Trash2 size={15} color={WAX} /></button>
        </div>
      </div>

      <div className="flex flex-wrap gap-x-3 gap-y-1 mt-2" style={{ fontSize: "0.72rem", color: INK_SOFT }}>
        {fields
          .filter((f) => f.key !== primary.key && f.key !== content?.key)
          .map((f) => (entry[f.key] ? (
            <span key={f.key}><strong style={{ color: INK }}>{f.label}:</strong> {entry[f.key]}</span>
          ) : null))}
      </div>
    </div>
  );
}

const iconBtnStyle = { background: "none", border: "none", cursor: "pointer", padding: 4 };
