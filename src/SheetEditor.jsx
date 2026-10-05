import React, { useEffect, useMemo, useRef, useState } from "react";
import DOMPurify from "dompurify";
import { readDraft, writeDraft } from "./storage.js";
import {
  REFERENCE_LINK,
  sourceMetadata,
  frequencyLimit,
  copy,
  parsePilot,
  createSheet,
  validateSheet,
  downloadPilot,
  pilotPortrait,
  getPath,
  setPath,
  diffData,
  mergePlan,
  applyMerge,
  entries,
  allActions,
  resourceNames,
  applyResolvedDamage,
} from "./compcon.js";

const Ic = ({ name }) => (
  <i className={`fa-solid fa-${name}`} aria-hidden="true" />
);
const clean = (html) =>
  DOMPurify.sanitize(String(html || ""), {
    ALLOWED_TAGS: [
      "p",
      "br",
      "b",
      "strong",
      "i",
      "em",
      "u",
      "ul",
      "ol",
      "li",
      "blockquote",
      "h3",
      "h4",
      "table",
      "tbody",
      "tr",
      "td",
      "th",
    ],
    ALLOWED_ATTR: [],
  });
const plain = (v) =>
  String(v ?? "")
    .replace(/<[^>]*>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
const labels = {
  skills: "Gatilhos",
  talents: "Talentos",
  licenses: "Licenças",
  core_bonuses: "Core bonuses",
  reserves: "Reservas",
  orgs: "Organizações",
  armor: "Armadura",
  weapons: "Armas",
  gear: "Equipamentos",
  frame: "Frame",
  systems: "Sistemas",
  mech_weapons: "Armas do mecha",
  weapon_mods: "Mods de armas",
};
const blank = () => ({
  itemType: "pilot",
  id: `ts-${Date.now()}`,
  originId: `ts-${Date.now()}`,
  name: "Novo piloto",
  callsign: "",
  level: 0,
  mechSkills: [0, 0, 0, 0],
  skills: [],
  talents: [],
  licenses: [],
  core_bonuses: [],
  reserves: [],
  mechs: [],
  loadouts: [{ name: "Loadout", armor: [], weapons: [], gear: [] }],
  active_index: 0,
  stats: {
    max: { hp: 10, armor: 0, evasion: 10, edef: 10, speed: 4, grit: 0 },
    current: { hp: 10, overshield: 0, burn: 0 },
  },
  notes: "",
  history: "",
  background: "",
  text_appearance: "",
});
function Rules({ value }) {
  return value ? (
    <div
      className="ts-sheet-rules"
      dangerouslySetInnerHTML={{ __html: clean(value) }}
    />
  ) : null;
}
function Field({
  label,
  value,
  onChange,
  type = "text",
  min,
  max,
  disabled = false,
  multiline = false,
  live = false,
}) {
  const [draft, setDraft] = useState(value ?? "");
  useEffect(() => setDraft(value ?? ""), [value]);
  function commit() {
    const v = type === "number" ? Number(draft) : draft;
    if (
      type === "number" &&
      (draft === "" ||
        !Number.isFinite(v) ||
        v < (min ?? -Infinity) ||
        v > (max ?? Infinity))
    ) {
      setDraft(value ?? "");
      return;
    }
    if (v !== value) onChange?.(v);
  }
  if (type === "boolean")
    return (
      <label className="ts-sheet-field">
        <span>{label}</span>
        <input
          aria-label={label}
          type="checkbox"
          checked={!!value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.checked)}
        />
      </label>
    );
  return (
    <label className="ts-sheet-field">
      <span>{label}</span>
      {multiline ? (
        <textarea
          aria-label={label}
          disabled={disabled}
          value={draft}
          onChange={(e) => {
            setDraft(e.target.value);
            if (live) onChange?.(e.target.value);
          }}
          onBlur={commit}
        />
      ) : (
        <input
          aria-label={label}
          type={type}
          min={min}
          max={max}
          disabled={disabled}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") e.currentTarget.blur();
          }}
        />
      )}
    </label>
  );
}
function RichField({ label, value, onChange, editing }) {
  const ref = useRef();
  useEffect(() => {
    if (ref.current) ref.current.innerHTML = clean(value);
  }, [value, editing]);
  function paste(e) {
    e.preventDefault();
    const safe =
      clean(e.clipboardData.getData("text/html")) ||
      e.clipboardData.getData("text/plain");
    const selection = window.getSelection();
    if (!selection?.rangeCount) return;
    const range = selection.getRangeAt(0);
    if (!ref.current?.contains(range.commonAncestorContainer)) return;
    range.deleteContents();
    const fragment = e.clipboardData.getData("text/html")
      ? range.createContextualFragment(safe)
      : document.createTextNode(safe);
    range.insertNode(fragment);
    range.collapse(false);
    selection.removeAllRanges();
    selection.addRange(range);
  }
  return (
    <div className="ts-sheet-field ts-sheet-rich">
      <span>{label}</span>
      {editing ? (
        <div
          ref={ref}
          className="ts-sheet-rules ts-sheet-rich-input"
          contentEditable
          suppressContentEditableWarning
          aria-label={label}
          role="textbox"
          aria-multiline="true"
          tabIndex={0}
          onPaste={paste}
          onBlur={(e) => {
            const next = clean(e.currentTarget.innerHTML);
            if (next !== clean(value)) onChange(next);
          }}
        />
      ) : (
        <Rules value={value || "<p>Não informado.</p>"} />
      )}
    </div>
  );
}
function RawTree({ value, path = [], edit, editing, depth = 0 }) {
  if (depth > 16)
    return (
      <p className="ts-sheet-muted">
        Use o editor JSON para os dados mais profundos.
      </p>
    );
  if (value === null)
    return <p className="ts-sheet-muted">{String(path.at(-1))}: vazio</p>;
  if (typeof value !== "object")
    return (
      <Field
        label={String(path.at(-1) || "Valor")}
        value={value}
        type={
          typeof value === "number"
            ? "number"
            : typeof value === "boolean"
              ? "boolean"
              : "text"
        }
        multiline={typeof value === "string" && value.length > 120}
        disabled={!editing}
        onChange={(v) => edit(path, v)}
      />
    );
  return (
    <details className="ts-sheet-raw-node">
      <summary>
        {Array.isArray(value)
          ? `${path.at(-1) || "Lista"} • ${value.length} entradas`
          : value.name || String(path.at(-1) || "Dados completos")}
      </summary>
      <div className="ts-sheet-fields">
        {Object.entries(value).map(([k, v]) => (
          <RawTree
            key={k}
            value={v}
            path={[...path, Array.isArray(value) ? Number(k) : k]}
            edit={edit}
            editing={editing}
            depth={depth + 1}
          />
        ))}
      </div>
    </details>
  );
}
function ItemCard({ entry, editing, edit, remove, host }) {
  const [detailed, setDetailed] = useState(false),
    d = entry.data;
  return (
    <article className="ts-sheet-card">
      <div className="ts-sheet-row-head">
        <h3>{entry.name}</h3>
        <span className="ts-sheet-chip">
          {labels[entry.kind] || entry.kind}
        </span>
        {editing && (
          <button
            className="ts-info"
            aria-label={`Remover ${entry.name}`}
            onClick={() => remove(entry.path)}
          >
            <Ic name="trash-can" />
          </button>
        )}
      </div>
      <div className="ts-sheet-item-meta">
        {entry.item.rank != null && (
          <span>
            Rank {entry.item.rank}
            {entry.kind === "skills" ? ` • +${entry.item.rank * 2}` : ""}
          </span>
        )}
        {d.brew?.LcpName && (
          <span>
            {d.brew.LcpName} {d.brew.LcpVersion}
          </span>
        )}
        {entry.item.destroyed && <span>Destruído</span>}
        {d.damage && (
          <span>{d.damage.map((x) => `${x.val} ${x.type}`).join(" • ")}</span>
        )}
        {d.range && (
          <span>{d.range.map((x) => `${x.type} ${x.val}`).join(" • ")}</span>
        )}
      </div>
      <Rules value={d.effect || d.terse || d.description} />
      {(d.actions?.length > 0 || d.ranks?.length > 0) && (
        <p className="ts-sheet-muted">
          {d.actions?.length
            ? `${d.actions.length} ações`
            : `${d.ranks.length} ranks descritos`}{" "}
          • detalhes abaixo
        </p>
      )}
      <details>
        <summary>Descrição e regras completas</summary>
        <Rules value={d.description} />
        <Rules value={d.detail} />
        {d.ranks?.map((r, i) => (
          <section key={i} className="ts-sheet-card">
            <h3>
              {i + 1}. {r.name} {entry.item.rank <= i ? "• não adquirido" : ""}
            </h3>
            <Rules value={r.description} />
            {r.actions?.map((a, j) => (
              <details key={j}>
                <summary>
                  {a.name} • {a.activation} •{" "}
                  {a.frequency || "Sem frequência informada"}
                </summary>
                <Rules value={a.detail} />
                <Rules value={a.trigger} />
              </details>
            ))}
          </section>
        ))}
        {d.actions?.map((a, i) => (
          <details key={i}>
            <summary>
              {a.name} • {a.activation} •{" "}
              {a.frequency || "Sem frequência informada"}
            </summary>
            <Rules value={a.trigger} />
            <Rules value={a.terse} />
            <Rules value={a.detail} />
          </details>
        ))}
      </details>
      {editing && (
        <>
          <button className="ts-button" onClick={() => setDetailed(!detailed)}>
            {detailed ? "Fechar edição" : "Editar este conteúdo"}
          </button>
          {detailed && (
            <>
              <div className="ts-sheet-fields">
                <Field
                  label={`Nome de ${entry.name}`}
                  value={d.name}
                  onChange={(v) => edit([...entry.dataPath, "name"], v)}
                />
                {entry.item.rank != null && (
                  <Field
                    label={`Rank de ${entry.name}`}
                    type="number"
                    min={1}
                    max={3}
                    value={entry.item.rank}
                    onChange={(v) => edit([...entry.path, "rank"], v)}
                  />
                )}
                <RichField
                  editing
                  label={`Descrição de ${entry.name}`}
                  value={d.description}
                  onChange={(v) => edit([...entry.dataPath, "description"], v)}
                />
                <RichField
                  editing
                  label={`Efeito de ${entry.name}`}
                  value={d.effect}
                  onChange={(v) => edit([...entry.dataPath, "effect"], v)}
                />
              </div>
              <RawTree value={d} path={entry.dataPath} edit={edit} editing />
            </>
          )}
        </>
      )}
      {host.openItem && entry.item._foundryUuid && (
        <button
          className="ts-button"
          onClick={() => host.openItem(entry.item._foundryUuid)}
        >
          Abrir item no Foundry
        </button>
      )}
    </article>
  );
}
function Dialog({ title, onClose, children, wide = false, busy = false }) {
  const ref = useRef();
  useEffect(() => {
    const previous = document.activeElement;
    ref.current?.focus();
    return () => previous?.focus();
  }, []);
  function key(e) {
    if (e.key === "Escape" && !busy) {
      e.preventDefault();
      onClose();
    }
    if (e.key !== "Tab") return;
    const controls = [
      ...ref.current.querySelectorAll(
        "button:not(:disabled),input:not(:disabled),select:not(:disabled),textarea:not(:disabled),[href]",
      ),
    ];
    const first = controls[0],
      last = controls.at(-1);
    if (
      e.shiftKey &&
      (document.activeElement === first ||
        document.activeElement === ref.current)
    ) {
      e.preventDefault();
      last?.focus();
    } else if (
      !e.shiftKey &&
      (document.activeElement === last ||
        document.activeElement === ref.current)
    ) {
      e.preventDefault();
      first?.focus();
    }
  }
  return (
    <div className="ts-modal-backdrop">
      <section
        ref={ref}
        className={`ts-dialog ts-sheet-dialog ${wide ? "ts-sheet-dialog-wide" : ""}`}
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="ts-sheet-dialog-title"
        onKeyDown={key}
      >
        <button
          className="ts-dialog-close ts-info"
          aria-label="Fechar janela da ficha"
          disabled={busy}
          onClick={onClose}
        >
          <Ic name="xmark" />
        </button>
        <h2 id="ts-sheet-dialog-title">{title}</h2>
        {children}
      </section>
    </div>
  );
}
function Resource({ name, current, max, onValue, onMax, editing }) {
  return (
    <div className="ts-sheet-resource">
      <label>{name}</label>
      <div className="ts-sheet-resource-values">
        <button
          disabled={!editing}
          aria-label={`Reduzir ${name}`}
          onClick={() => onValue(Math.max(0, Number(current) - 1))}
        >
          −
        </button>
        <input
          aria-label={`${name} atual`}
          type="number"
          min="0"
          disabled={!editing}
          value={current ?? 0}
          onChange={(e) => {
            const n = Number(e.target.value);
            if (e.target.value !== "" && Number.isFinite(n) && n >= 0)
              onValue(n);
          }}
        />
        <button
          disabled={!editing}
          aria-label={`Aumentar ${name}`}
          onClick={() => onValue(Number(current || 0) + 1)}
        >
          +
        </button>
        {max != null && (
          <>
            <span>/</span>
            <input
              aria-label={`${name} máximo`}
              type="number"
              min="0"
              disabled={!editing}
              value={max}
              onChange={(e) => {
                const n = Number(e.target.value);
                if (e.target.value !== "" && Number.isFinite(n) && n >= 0)
                  onMax(n);
              }}
            />
          </>
        )}
      </div>
      {max != null && current > max && (
        <small>Acima do máximo. Resolva o efeito conforme a regra.</small>
      )}
    </div>
  );
}

export function SheetEditor({ host = {} }) {
  const key = `sheet:${host.key || "standalone"}`,
    noteKey = `sheet-private:${host.key || "standalone"}`;
  const [sheet, setSheet] = useState(() => {
      try {
        return host.sheetProject ? validateSheet(host.sheetProject) : null;
      } catch {
        return null;
      }
    }),
    [ready, setReady] = useState(false),
    [status, setStatus] = useState("Carregando…"),
    [section, setSection] = useState("overview"),
    [editing, setEditing] = useState(false),
    [query, setQuery] = useState(""),
    [category, setCategory] = useState(""),
    [unitIndex, setUnitIndex] = useState(-1),
    [loadoutIndex, setLoadoutIndex] = useState(0),
    [modal, setModal] = useState(null),
    [busy, setBusy] = useState(false),
    [error, setError] = useState(""),
    [notice, setNotice] = useState(""),
    [link, setLink] = useState(
      host.shareLink || (host.isFoundry ? "" : REFERENCE_LINK),
    ),
    [staged, setStaged] = useState(null),
    [selected, setSelected] = useState(new Set()),
    [history, setHistory] = useState({ past: [], future: [] }),
    [gmNote, setGmNote] = useState(host.privateNotes || ""),
    [jsonText, setJsonText] = useState(""),
    [damage, setDamage] = useState(0),
    [newName, setNewName] = useState(""),
    [newKind, setNewKind] = useState("skills"),
    [foundryPlan, setFoundryPlan] = useState(null),
    [downloads, setDownloads] = useState([]),
    [applyParts, setApplyParts] = useState({
      identity: true,
      portrait: true,
      build: true,
      combat: true,
      mechs: true,
    });
  const latest = useRef(sheet),
    hist = useRef(history),
    latestNote = useRef(gmNote),
    lock = useRef(false),
    fileInput = useRef(),
    links = useRef([]),
    root = useRef();
  latest.current = sheet;
  hist.current = history;
  latestNote.current = gmNote;
  useEffect(() => {
    let alive = true;
    Promise.all([readDraft(key), readDraft(noteKey)])
      .then(([stored, note]) => {
        if (!alive) return;
        if (
          stored &&
          (!host.sheetProject || stored.updatedAt > host.sheetProject.updatedAt)
        )
          setSheet(validateSheet(stored));
        if (note?.text != null) setGmNote(note.text);
      })
      .catch(() => {
        if (alive)
          setNotice(
            "Não foi possível recuperar o rascunho. Use Exportar para guardar sua ficha.",
          );
      })
      .finally(() => {
        if (alive) setReady(true);
      });
    return () => {
      alive = false;
    };
  }, [key]);
  useEffect(() => {
    if (!ready || !sheet) return;
    setStatus("Salvando rascunho…");
    let alive = true;
    const timer = setTimeout(
      () =>
        writeDraft(key, sheet)
          .then(() => {
            if (alive) setStatus("Rascunho salvo");
          })
          .catch(() => {
            if (alive) setStatus("Exporte para guardar");
          }),
      500,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [sheet, ready, key]);
  useEffect(() => {
    if (!ready) return;
    let alive = true;
    const timer = setTimeout(
      () =>
        Promise.all([
          writeDraft(noteKey, { text: gmNote, updatedAt: Date.now() }),
          host.savePrivateNotes?.(gmNote),
        ]).catch(() => {
          if (alive)
            setError(
              "Não foi possível salvar a nota privada. Copie o texto antes de fechar.",
            );
        }),
      650,
    );
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [gmNote, ready, noteKey]);
  useEffect(
    () => () => {
      if (latest.current) writeDraft(key, latest.current).catch(() => {});
      writeDraft(noteKey, {
        text: latestNote.current,
        updatedAt: Date.now(),
      }).catch(() => {});
      links.current.forEach((x) => URL.revokeObjectURL(x.url));
    },
    [key],
  );
  useEffect(() => {
    if (section === "advanced" && sheet)
      setJsonText(JSON.stringify(sheet.data, null, 2));
  }, [section]);
  const data = sheet?.data,
    all = useMemo(() => (data ? entries(data) : []), [data]),
    actions = useMemo(() => (data ? allActions(data) : []), [data]);
  const unit = unitIndex < 0 ? data : data?.mechs?.[unitIndex],
    unitPath = unitIndex < 0 ? [] : ["mechs", unitIndex];
  const portrait = useMemo(()=>{
    try { return pilotPortrait(unit) || (unitIndex < 0 ? host.source || '' : ''); }
    catch { return ''; }
  },[unit,unitIndex,host.source]);
  function update(next, record = true, applying = false) {
    if (lock.current && !applying) return;
    if (record && latest.current) {
      const h = {
        past: [...hist.current.past.slice(-39), copy(latest.current)],
        future: [],
      };
      hist.current = h;
      setHistory(h);
    }
    next.updatedAt = Date.now();
    latest.current = next;
    setSheet(next);
  }
  function edit(path, value) {
    const next = copy(latest.current);
    setPath(next.data, path, value);
    update(next);
  }
  function remove(path) {
    const next = copy(latest.current),
      parent = getPath(next.data, path.slice(0, -1));
    if (Array.isArray(parent)) parent.splice(path.at(-1), 1);
    else setPath(next.data, path, null);
    update(next);
  }
  function undo() {
    if (!hist.current.past.length || lock.current) return;
    const h = hist.current,
      current = copy(latest.current),
      previous = copy(h.past.at(-1));
    hist.current = {
      past: h.past.slice(0, -1),
      future: [current, ...h.future],
    };
    setHistory(hist.current);
    update(previous, false);
  }
  function redo() {
    if (!hist.current.future.length || lock.current) return;
    const h = hist.current,
      current = copy(latest.current),
      next = copy(h.future[0]);
    hist.current = { past: [...h.past, current], future: h.future.slice(1) };
    setHistory(hist.current);
    update(next, false);
  }
  async function run(fn) {
    if (lock.current) return;
    lock.current = true;
    setBusy(true);
    setError("");
    try {
      await fn();
    } catch (e) {
      setError(
        e.message || "Não foi possível concluir. Seu rascunho está preservado.",
      );
    } finally {
      lock.current = false;
      setBusy(false);
    }
  }
  function stage(incoming, source) {
    const current = latest.current;
    if (!current) {
      const next = createSheet(incoming, source);
      latest.current = next;
      setSheet(next);
      setModal(null);
      setLoadoutIndex(next.data.active_index || 0);
      setNotice(
        host.isFoundry ? "Ficha carregada. Vincule ao ator para aplicar os dados e o retrato." : "Ficha carregada. A cópia pode ser editada; o COMP/CON original não foi alterado.",
      );
      if (host.isFoundry) setModal('apply-options');
      return;
    }
    const samePilot = current.data.id === incoming.id;
    const changes = mergePlan(
      samePilot ? current.base : current.data,
      current.data,
      incoming,
    );
    setStaged({ incoming, source, changes, samePilot });
    setSelected(new Set(changes.filter((c) => c.selected).map((c) => c.key)));
    setModal("merge");
  }
  async function importLink() {
    await run(async () => {
      const result = await downloadPilot(link);
      stage(result.data, result);
    });
  }
  async function importFile(file) {
    if (!file) return;
    await run(async () => {
      if (file.size > 12 * 1024 * 1024) throw new Error("Limite: 12 MB.");
      const parsed = JSON.parse(await file.text());
      if (parsed.schema === "token-studio-sheet-1" && !latest.current) {
        const next = validateSheet(parsed);
        latest.current = next;
        setSheet(next);
        setModal(null);
        setNotice("Projeto de ficha recuperado.");
      } else stage(parsePilot(parsed), { filename: file.name });
    });
  }
  function finishMerge() {
    try {
      const next = copy(latest.current);
      next.data = parsePilot(applyMerge(next.data, staged.changes, selected));
      next.base = copy(staged.incoming);
      next.source = {
        ...sourceMetadata(staged.source),
        importedAt: Date.now(),
      };
      if (!staged.samePilot) {
        next.tracking = { round: 1, uses: {} };
      }
      update(next);
      setModal(null);
      setStaged(null);
      setNotice("Atualização revisada aplicada ao rascunho.");
    } catch (e) {
      setError(e.message);
    }
  }
  function download(value, filename) {
    const blob = new Blob([JSON.stringify(value, null, 2)], {
      type: "application/json",
    });
    const item = { url: URL.createObjectURL(blob), filename };
    links.current.push(item);
    setDownloads((prev) => [...prev, item].slice(-3));
    setNotice("Arquivo preparado. Use o link para baixar.");
  }
  function portable() {
    download(latest.current, `token-studio-${data.callsign || "piloto"}.json`);
  }
  function compconExport() {
    download(
      { EXPORT_TYPE: "pilot", data: latest.current.data },
      `compcon-${data.callsign || "piloto"}.json`,
    );
  }
  function addItem() {
    if (!newName.trim()) return;
    const next = copy(latest.current),
      id = `ts_custom_${Date.now()}`,
      kind = newKind;
    const definition = {
      id,
      name: newName.trim(),
      description: "",
      actions: [],
      bonuses: [],
    };
    let path;
    if (["skills", "talents", "licenses"].includes(kind)) {
      path = [kind];
      next.data[kind] ||= [];
      const d =
        kind === "talents"
          ? {
              ...definition,
              ranks: [
                { name: "Rank I", description: "" },
                { name: "Rank II", description: "" },
                { name: "Rank III", description: "" },
              ],
            }
          : definition;
      next.data[kind].push({ id, rank: 1, data: d });
    } else if (["armor", "weapons", "gear"].includes(kind)) {
      next.data.loadouts ||= [
        { name: "Loadout", armor: [], weapons: [], gear: [] },
      ];
      const index = Math.min(loadoutIndex, next.data.loadouts.length - 1);
      next.data.loadouts[index][kind] ||= [];
      next.data.loadouts[index][kind].push({
        id,
        type: {
          armor: "PilotArmor",
          weapons: "PilotWeapon",
          gear: "PilotGear",
        }[kind],
        instanceId: id,
        data: definition,
      });
    } else {
      next.data[kind] ||= [];
      next.data[kind].push(definition);
    }
    update(next);
    setModal(null);
    setNewName("");
    setEditing(true);
    setNotice(
      "Conteúdo personalizado adicionado. Edite sua descrição, ações e campos.",
    );
  }
  function useAction(action) {
    const limit = frequencyLimit(action.action.frequency);
    if (
      !action.active ||
      (limit &&
        (latest.current.tracking?.uses?.[action.key] || 0) >= limit.limit)
    )
      return;
    const next = copy(latest.current);
    next.tracking ||= { round: 1, uses: {} };
    next.tracking.uses ||= {};
    next.tracking.uses[action.key] = (next.tracking.uses[action.key] || 0) + 1;
    update(next);
  }
  function resetUses(period) {
    const next = copy(latest.current);
    next.tracking ||= { round: 1, uses: {} };
    const uses = { ...next.tracking.uses };
    for (const a of actions) {
      const limit = frequencyLimit(a.action.frequency);
      if (
        period === "mission" ||
        limit?.period === period ||
        (period === "scene" && limit?.period === "round")
      )
        delete uses[a.key];
    }
    next.tracking.uses = uses;
    if (period === "round")
      next.tracking.round = (next.tracking.round || 1) + 1;
    update(next);
    setNotice(
      `Controles de uso reiniciados: ${{ round: "rodada", scene: "cena", mission: "missão" }[period]}. Os recursos de vida/calor continuam como estavam.`,
    );
  }
  async function reviewFoundry() {
    if (!host.prepareSheetApply) {
      portable();
      return;
    }
    await run(async () => {
      const plan = await host.prepareSheetApply(latest.current, applyParts);
      setFoundryPlan(plan);
      setModal("foundry");
    });
  }
  async function applyFoundry() {
    await run(async () => {
      const result = await host.applySheet(foundryPlan, latest.current);
      if (result.sheetProject) update(result.sheetProject,true,true);
      host.onSheetApplied?.(result);
      setModal(null);
      setNotice(
        "Ficha vinculada ao ator e alterações aplicadas no Foundry.",
      );
    });
  }
  useEffect(() => {
    function keyboard(e) {
      if (
        !root.current?.getClientRects().length ||
        lock.current ||
        e.target.isContentEditable ||
        /INPUT|TEXTAREA|SELECT/.test(e.target.tagName)
      )
        return;
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        e.preventDefault();
        e.shiftKey ? redo() : undo();
      }
    }
    window.addEventListener("keydown", keyboard);
    return () => window.removeEventListener("keydown", keyboard);
  }, []);
  function selectSection(s) {
    setSection(s);
    setQuery("");
    setCategory("");
  }
  const filter = (entry) =>
    `${entry.name} ${plain(entry.data.description)} ${plain(entry.data.effect)} ${JSON.stringify(entry.data.actions || [])}`
      .toLowerCase()
      .includes(query.toLowerCase()) &&
    (!category || entry.kind === category);
  const navigation = [
    ["overview", "Visão geral", "table-cells-large"],
    ["pilot", "Piloto e biografia", "user-astronaut"],
    ["abilities", "Habilidades", "bolt"],
    ["equipment", "Equipamentos", "toolbox"],
    ["mechs", "Mechas", "robot"],
    ["combat", "Combate e recursos", "shield-halved"],
    ["notes", "Notas do mestre", "lock"],
    ["source", "Importação e histórico", "cloud-arrow-down"],
    ["advanced", "Dados completos", "sliders"],
  ];
  const current = unit?.stats?.current || {},
    maximum = unit?.stats?.max || {};
  const primaryResources =
    unitIndex < 0
      ? ["hp", "overshield", "burn", "activations"]
      : [
          "hp",
          "overshield",
          "heat",
          "structure",
          "stress",
          "repairCapacity",
          "burn",
          "overcharge",
          "activations",
        ];
  const resourceKeys = [
    ...new Set([
      "hp",
      "overshield",
      "heat",
      "structure",
      "stress",
      "repairCapacity",
      "burn",
      "overcharge",
      "activations",
      ...Object.keys(current).filter((k) => typeof current[k] === "number"),
    ]),
  ].filter((k) => current[k] != null || maximum[k] != null);
  function unitSelect() {
    return (
      <div className="ts-sheet-unit-select">
        <span className="ts-sheet-muted">Unidade</span>
        <select
          aria-label="Unidade da ficha"
          value={unitIndex}
          onChange={(e) => setUnitIndex(Number(e.target.value))}
        >
          <option value={-1}>{data.callsign || data.name} • Piloto</option>
          {data.mechs.map((m, i) => (
            <option key={m.id || i} value={i}>
              {m.name || `Mecha ${i + 1}`}
            </option>
          ))}
        </select>
      </div>
    );
  }
  const title = (heading, description) => (
    <div className="ts-sheet-section-title">
      <div>
        <h2>{heading}</h2>
        {description && <p>{description}</p>}
      </div>
    </div>
  );
  const search = (choices) => (
    <div className="ts-sheet-search">
      <input
        aria-label="Buscar na ficha"
        placeholder="Buscar nome, efeito ou regra…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
      />
      <select
        aria-label="Filtrar conteúdo"
        value={category}
        onChange={(e) => setCategory(e.target.value)}
      >
        <option value="">Todas as categorias</option>
        {choices.map((k) => (
          <option key={k} value={k}>
            {labels[k]}
          </option>
        ))}
      </select>
      {editing && (
        <button className="ts-button" onClick={() => setModal("add")}>
          <Ic name="plus" /> Adicionar
        </button>
      )}
    </div>
  );
  return (
    <section className="ts-sheet" ref={root}>
      <input
        className="ts-sheet-hidden"
        ref={fileInput}
        type="file"
        accept=".json,application/json"
        aria-label="Arquivo de ficha COMP/CON"
        onChange={(e) => {
          importFile(e.target.files?.[0]);
          e.target.value = "";
        }}
      />
      {error && (
        <div className="ts-sheet-inline-notice ts-sheet-error" role="alert">
          <Ic name="circle-exclamation" />
          <span>{error}</span>
          <button
            className="ts-info"
            aria-label="Fechar erro da ficha"
            onClick={() => setError("")}
          >
            <Ic name="xmark" />
          </button>
        </div>
      )}
      {notice && (
        <div className="ts-sheet-inline-notice" role="status">
          <Ic name="circle-check" />
          <span>
            {notice}{" "}
            {downloads.map((x) => (
              <a
                className="ts-sheet-download"
                key={x.url}
                href={x.url}
                download={x.filename}
              >
                {x.filename}{" "}
              </a>
            ))}
          </span>
          <button
            className="ts-info"
            aria-label="Fechar aviso da ficha"
            onClick={() => setNotice("")}
          >
            <Ic name="xmark" />
          </button>
        </div>
      )}
      {!sheet ? (
        <div className="ts-sheet-empty">
          <Ic name="address-card" />
          <h2>A ficha inteira, ao alcance do mestre</h2>
          <p>
            Carregue um link do COMP/CON ou um JSON exportado. Você terá piloto,
            equipamentos, regras, mechas e recursos em uma cópia que pode
            revisar e editar.
          </p>
          <div className="ts-sheet-import-box">
            <input
              aria-label="Link do COMP/CON"
              value={link}
              onChange={(e) => setLink(e.target.value)}
              placeholder="https://compcon.app/link/pilot/…"
            />
            <button
              className="ts-button ts-primary"
              onClick={importLink}
              disabled={busy || !ready}
            >
              {busy ? "Carregando…" : "Carregar ficha"}
            </button>
          </div>
          <div className="ts-sheet-header-actions">
            <button
              className="ts-button"
              disabled={busy || !ready}
              onClick={() => fileInput.current.click()}
            >
              <Ic name="file-import" /> Importar JSON
            </button>
            {host.readActorSheet && (
              <button
                className="ts-button"
                disabled={busy || !ready}
                onClick={() =>
                  run(async () =>
                    stage(await host.readActorSheet(), {
                      kind: "foundry",
                      actorUuid: host.actorUuid,
                    }),
                  )
                }
              >
                Ler ficha do Foundry
              </button>
            )}
            <button
              className="ts-button"
              disabled={busy || !ready}
              onClick={() => update(createSheet(blank(), { kind: "manual" }))}
            >
              Criar ficha em branco
            </button>
          </div>
          <p className="ts-sheet-muted">
            O link é uma origem de leitura. Alterações daqui não são enviadas à
            conta COMP/CON.
          </p>
        </div>
      ) : (
        <>
          <header className="ts-sheet-header" inert={busy ? true : undefined}>
            {portrait && <img className="ts-sheet-avatar" src={portrait} alt={`Retrato de ${unit?.name || data.name}`} />}
            <div>
              <div className="ts-sheet-eyebrow">
                Ficha do mestre •{" "}
                {sheet.source?.code ? "COMP/CON" : "Cópia de trabalho"}
              </div>
              <h1>{data.callsign || data.name}</h1>
              <p className="ts-sheet-subtitle">
                {data.name} {data.player_name ? `• ${data.player_name}` : ""} •{" "}
                {data.mechs.length} mecha(s) • {actions.length} ações descritas
              </p>
            </div>
            <div className="ts-sheet-header-actions">
              <div className="ts-sheet-level">
                <small>LICENSE LEVEL</small>
                <strong>{data.level ?? "—"}</strong>
              </div>
              <button
                className="ts-button"
                disabled={busy}
                aria-pressed={editing}
                onClick={() => setEditing(!editing)}
              >
                <Ic name={editing ? "eye" : "pen-to-square"} />
                {editing ? "Visualizar" : "Editar ficha"}
              </button>
              <button
                className="ts-button"
                disabled={busy}
                onClick={() => setModal("import")}
              >
                <Ic name="cloud-arrow-down" /> Importar / atualizar
              </button>
            </div>
          </header>
          <div className="ts-sheet-layout" inert={busy ? true : undefined}>
            <aside className="ts-sheet-sidebar" aria-label="Seções da ficha">
              {navigation.map(([id, name, icon]) => (
                <button
                  key={id}
                  aria-pressed={section === id}
                  onClick={() => selectSection(id)}
                >
                  <Ic name={icon} />
                  {name}
                  {id === "abilities" && <small>{actions.length}</small>}
                </button>
              ))}
              <div className="ts-sheet-source-info">
                {sheet.source?.code ? (
                  <>
                    <strong>COMP/CON v3</strong>
                    <br />
                    {sheet.source.code}
                    <br />
                  </>
                ) : (
                  <>
                    Cópia independente
                    <br />
                  </>
                )}
                {new Date(sheet.source.importedAt).toLocaleString("pt-BR")}
                <br />
                {sheet.source.actorUuid ? `Ator vinculado: ${host.name || data.name}` : 'Ficha aguardando vínculo ao ator.'}
                <br />
                Notas do mestre são privadas.
              </div>
            </aside>
            <main className="ts-sheet-content">
              {section === "overview" && (
                <>
                  {title(
                    "Visão geral",
                    "Valores da última importação ou da sua edição. As regras completas estão nas seções ao lado.",
                  )}
                  {unitSelect()}
                  <div className="ts-sheet-stats">
                    {[
                      "hp",
                      "armor",
                      "evasion",
                      "edef",
                      "speed",
                      "grit",
                      ...(unitIndex >= 0 ? ["heat", "structure"] : []),
                    ]
                      .filter((k) => current[k] != null || maximum[k] != null)
                      .map((k) => (
                        <div
                          className={`ts-sheet-stat ${k === "hp" ? "ts-sheet-hp" : ""}`}
                          key={k}
                        >
                          <small>{resourceNames[k]}</small>
                          <strong>
                            {current[k] ?? maximum[k]}
                            {["hp", "heat", "structure"].includes(k) &&
                              maximum[k] != null && <em> / {maximum[k]}</em>}
                          </strong>
                          {k === "hp" && maximum[k] > 0 && (
                            <meter
                              min="0"
                              max={maximum[k]}
                              value={current[k]}
                            />
                          )}
                        </div>
                      ))}
                  </div>
                  <article className="ts-sheet-card">
                    <h3>HASE • Piloto</h3>
                    <div className="ts-sheet-hase">
                      {["Hull", "Agility", "Systems", "Engineering"].map(
                        (name, i) => (
                          <Field
                            key={name}
                            label={name}
                            type="number"
                            min={0}
                            max={6}
                            value={data.mechSkills?.[i] ?? 0}
                            disabled={!editing}
                            onChange={(v) => edit(["mechSkills", i], v)}
                          />
                        ),
                      )}
                    </div>
                    <p className="ts-sheet-muted">
                      Estatísticas importadas preservam bônus e homebrews.
                      Mudanças de build exigem recalcular no sistema Lancer ou
                      atualizar a cópia antes de considerar os valores
                      definitivos.
                    </p>
                  </article>
                  <div className="ts-sheet-item-list">
                    <article className="ts-sheet-card">
                      <h3>Build do piloto</h3>
                      <p className="ts-sheet-muted">
                        {data.skills?.length || 0} gatilhos •{" "}
                        {data.talents?.length || 0} talentos •{" "}
                        {data.licenses?.length || 0} licenças •{" "}
                        {data.core_bonuses?.length || 0} core bonuses
                      </p>
                      {all
                        .filter((x) =>
                          ["talents", "core_bonuses"].includes(x.kind),
                        )
                        .map((x) => (
                          <p className="ts-sheet-muted" key={x.key}>
                            {x.name}
                            {x.item.rank ? ` • Rank ${x.item.rank}` : ""}
                          </p>
                        ))}
                    </article>
                    <article className="ts-sheet-card">
                      <h3>Loadout em uso</h3>
                      <p className="ts-sheet-muted">
                        {data.loadouts?.[data.active_index || 0]?.name ||
                          "Não informado"}
                      </p>
                      {all
                        .filter(
                          (x) =>
                            ["armor", "weapons", "gear"].includes(x.kind) &&
                            x.path[1] === (data.active_index || 0),
                        )
                        .map((x) => (
                          <p className="ts-sheet-muted" key={x.key}>
                            {x.name}
                          </p>
                        ))}
                    </article>
                  </div>
                </>
              )}
              {section === "pilot" && (
                <>
                  {title(
                    "Piloto e biografia",
                    "Identidade, nível, aparência e história.",
                  )}
                  <article className="ts-sheet-card">
                    <div className="ts-sheet-fields">
                      {[
                        ["name", "Nome"],
                        ["callsign", "Callsign"],
                        ["player_name", "Jogador"],
                        ["level", "License Level"],
                        ["status", "Situação"],
                      ].map(([k, label]) => (
                        <Field
                          key={k}
                          label={label}
                          value={data[k]}
                          disabled={!editing}
                          type={k === "level" ? "number" : "text"}
                          min={0}
                          max={12}
                          onChange={(v) => edit([k], v)}
                        />
                      ))}
                      {[
                        ["background", "Background"],
                        ["history", "História"],
                        ["text_appearance", "Aparência"],
                        ["notes", "Notas compartilhadas"],
                      ].map(([k, label]) => (
                        <RichField
                          key={k}
                          label={label}
                          value={data[k]}
                          editing={editing}
                          onChange={(v) => edit([k], v)}
                        />
                      ))}
                    </div>
                  </article>
                  <article className="ts-sheet-card">
                    <h3>Bond, ideais e progresso</h3>
                    {data.bond ? (
                      <RawTree
                        value={data.bond}
                        path={["bond"]}
                        edit={edit}
                        editing={editing}
                      />
                    ) : (
                      <p className="ts-sheet-muted">
                        Nenhum bond informado. O conteúdo personalizado pode ser
                        adicionado em Dados completos.
                      </p>
                    )}
                  </article>
                </>
              )}
              {section === "abilities" && (
                <>
                  {title(
                    "Habilidades e ações",
                    "Descrições completas, ranks e frequência de uso. Registrar uso é um contador; não executa automaticamente o efeito.",
                  )}
                  {search([
                    "skills",
                    "talents",
                    "licenses",
                    "core_bonuses",
                    "reserves",
                    "orgs",
                  ])}
                  <div className="ts-sheet-item-list">
                    {all
                      .filter(
                        (x) =>
                          [
                            "skills",
                            "talents",
                            "licenses",
                            "core_bonuses",
                            "reserves",
                            "orgs",
                          ].includes(x.kind) && filter(x),
                      )
                      .map((e) => (
                        <ItemCard
                          key={e.key}
                          entry={e}
                          editing={editing}
                          edit={edit}
                          remove={remove}
                          host={host}
                        />
                      ))}
                  </div>
                  <div className="ts-sheet-section-title ts-sheet-actions-title">
                    <h2>Ações de todos os equipamentos e talentos</h2>
                  </div>
                  <div className="ts-sheet-actions-grid">
                    {actions
                      .filter((a) =>
                        `${a.name} ${a.owner} ${plain(a.action.detail)}`
                          .toLowerCase()
                          .includes(query.toLowerCase()),
                      )
                      .map((a) => (
                        <article key={a.key} className="ts-sheet-card">
                          <div className="ts-sheet-row-head">
                            <h3>{a.name}</h3>
                            <span className="ts-sheet-chip">
                              {a.action.activation || "Não informado"}
                            </span>
                          </div>
                          <p className="ts-sheet-muted">{a.owner}</p>
                          <p className="ts-sheet-item-meta">
                            {a.action.frequency || "Frequência não informada"}
                            {!a.active ? " • Rank ou loadout inativo" : ""}
                            {a.action.heat_cost
                              ? ` • ${a.action.heat_cost} calor`
                              : ""}
                          </p>
                          <Rules value={a.action.terse} />
                          <details>
                            <summary>Gatilho e efeito completos</summary>
                            <Rules value={a.action.trigger} />
                            <Rules value={a.action.detail} />
                            {editing && (
                              <RawTree
                                value={a.action}
                                path={a.path}
                                edit={edit}
                                editing
                              />
                            )}
                          </details>
                          <div className="ts-sheet-action-footer">
                            <small>
                              {sheet.tracking?.uses?.[a.key] || 0} uso(s)
                              registrados
                            </small>
                            <button
                              className="ts-button"
                              disabled={
                                !editing ||
                                !a.active ||
                                (frequencyLimit(a.action.frequency) &&
                                  (sheet.tracking?.uses?.[a.key] || 0) >=
                                    frequencyLimit(a.action.frequency).limit)
                              }
                              onClick={() => useAction(a)}
                            >
                              Registrar uso
                            </button>
                          </div>
                        </article>
                      ))}
                  </div>
                </>
              )}
              {section === "equipment" && (
                <>
                  {title(
                    "Equipamentos do piloto",
                    "Armaduras, armas e gear; descrições, perfis, ações, tags e bônus preservados.",
                  )}
                  <div className="ts-sheet-unit-select">
                    <select
                      aria-label="Loadout do piloto"
                      value={Math.min(
                        loadoutIndex,
                        (data.loadouts?.length || 1) - 1,
                      )}
                      onChange={(e) => setLoadoutIndex(Number(e.target.value))}
                    >
                      {data.loadouts?.map((l, i) => (
                        <option value={i} key={i}>
                          {l.name || `Loadout ${i + 1}`}
                        </option>
                      ))}
                    </select>
                    {editing && data.loadouts?.length > 0 && (
                      <button
                        className="ts-button"
                        onClick={() => edit(["active_index"], loadoutIndex)}
                      >
                        Usar este loadout
                      </button>
                    )}
                  </div>
                  {search(["armor", "weapons", "gear"])}
                  <div className="ts-sheet-item-list">
                    {all
                      .filter(
                        (x) =>
                          ["armor", "weapons", "gear"].includes(x.kind) &&
                          x.path[1] ===
                            Math.min(
                              loadoutIndex,
                              (data.loadouts?.length || 1) - 1,
                            ) &&
                          filter(x),
                      )
                      .map((e) => (
                        <ItemCard
                          key={e.key}
                          entry={e}
                          editing={editing}
                          edit={edit}
                          remove={remove}
                          host={host}
                        />
                      ))}
                  </div>
                  {!data.loadouts?.length && (
                    <p className="ts-sheet-muted">Nenhum loadout informado.</p>
                  )}
                </>
              )}
              {section === "mechs" && (
                <>
                  {title(
                    "Mechas e montagens",
                    "Frames, traits, core system, armas, mods e sistemas de cada loadout.",
                  )}{" "}
                  {!data.mechs.length ? (
                    <article className="ts-sheet-card">
                      <h3>Nenhum mecha nesta ficha</h3>
                      <p className="ts-sheet-muted">
                        O compartilhamento importado não incluiu mechas.
                        Atualize o link ou importe um JSON que os contenha.
                        Nenhum mecha é criado por suposição.
                      </p>
                    </article>
                  ) : (
                    <>
                      {unitSelect()}
                      {data.mechs.map((m, i) => (
                        <article className="ts-sheet-card" key={m.id || i}>
                          <div className="ts-sheet-row-head">
                            <h3>{m.name}</h3>
                            <span className="ts-sheet-chip">
                              {m.frameData?.name || m.frame}
                            </span>
                          </div>
                          <Rules value={m.frameData?.description} />
                          <Field
                            label={`Nome do mecha ${i + 1}`}
                            value={m.name}
                            disabled={!editing}
                            onChange={(v) => edit(["mechs", i, "name"], v)}
                          />
                          <RawTree
                            value={m.frameData || {}}
                            path={["mechs", i, "frameData"]}
                            edit={edit}
                            editing={editing}
                          />
                          <RawTree
                            value={m.loadouts || []}
                            path={["mechs", i, "loadouts"]}
                            edit={edit}
                            editing={editing}
                          />
                          <RichField
                            label={`Notas de ${m.name}`}
                            value={m.notes}
                            editing={editing}
                            onChange={(v) => edit(["mechs", i, "notes"], v)}
                          />
                        </article>
                      ))}
                      <div className="ts-sheet-item-list">
                        {all
                          .filter(
                            (x) =>
                              x.path[0] === "mechs" &&
                              x.kind !== "frame" &&
                              filter(x),
                          )
                          .map((e) => (
                            <ItemCard
                              key={e.key}
                              entry={e}
                              editing={editing}
                              edit={edit}
                              remove={remove}
                              host={host}
                            />
                          ))}
                      </div>
                    </>
                  )}
                </>
              )}
              {section === "combat" && (
                <>
                  {title(
                    "Combate e recursos",
                    "Controle explícito de valores. Estrutura, stress, testes e efeitos especiais exigem resolução da regra pelo mestre.",
                  )}
                  {unitSelect()}
                  <article className="ts-sheet-card">
                    <h3>{unit?.name} • Recursos</h3>
                    <div className="ts-sheet-resource-grid">
                      {resourceKeys
                        .filter((k) => primaryResources.includes(k))
                        .map((k) => (
                          <Resource
                            key={k}
                            name={resourceNames[k] || k}
                            current={current[k]}
                            max={maximum[k]}
                            editing={editing}
                            onValue={(v) =>
                              edit([...unitPath, "stats", "current", k], v)
                            }
                            onMax={(v) =>
                              edit([...unitPath, "stats", "max", k], v)
                            }
                          />
                        ))}
                    </div>
                    <details>
                      <summary>
                        Outros valores e estatísticas importadas
                      </summary>
                      <p className="ts-sheet-muted">
                        Ajustes avançados da cópia; não recalculam bônus
                        automaticamente.
                      </p>
                      <div className="ts-sheet-resource-grid">
                        {resourceKeys
                          .filter((k) => !primaryResources.includes(k))
                          .map((k) => (
                            <Resource
                              key={k}
                              name={resourceNames[k] || k}
                              current={current[k]}
                              max={maximum[k]}
                              editing={editing}
                              onValue={(v) =>
                                edit([...unitPath, "stats", "current", k], v)
                              }
                              onMax={(v) =>
                                edit([...unitPath, "stats", "max", k], v)
                              }
                            />
                          ))}
                      </div>
                    </details>
                  </article>
                  <article className="ts-sheet-card">
                    <h3>Dano já resolvido / recuperação</h3>
                    <p className="ts-sheet-muted">
                      Informe o dano final depois de armadura, resistência e
                      efeitos. Overshield é consumido antes da vida. A
                      recuperação respeita o máximo. Não há rolagem automática
                      de estrutura.
                    </p>
                    <div className="ts-sheet-damage">
                      <Field
                        label="Quantidade de dano ou recuperação"
                        value={damage}
                        type="number"
                        min={0}
                        max={100000}
                        disabled={!editing}
                        onChange={setDamage}
                      />
                      <button
                        className="ts-button"
                        disabled={!editing}
                        onClick={() => {
                          try {
                            update(
                              applyResolvedDamage(
                                latest.current,
                                unitPath,
                                Number(damage),
                              ),
                            );
                          } catch (e) {
                            setError(e.message);
                          }
                        }}
                      >
                        Aplicar dano final
                      </button>
                      <button
                        className="ts-button"
                        disabled={!editing}
                        onClick={() => {
                          try {
                            update(
                              applyResolvedDamage(
                                latest.current,
                                unitPath,
                                Number(damage),
                                true,
                              ),
                            );
                          } catch (e) {
                            setError(e.message);
                          }
                        }}
                      >
                        Recuperar vida
                      </button>
                    </div>
                  </article>
                  <article className="ts-sheet-card">
                    <h3>Condições registradas</h3>
                    <div className="ts-sheet-conditions">
                      {[
                        "Impaired",
                        "Slowed",
                        "Immobilized",
                        "Jammed",
                        "Stunned",
                        "Prone",
                        "Exposed",
                        "Shredded",
                        "Lock On",
                        "Hidden",
                        "Invisible",
                      ].map((c) => (
                        <button
                          key={c}
                          aria-pressed={(unit.conditions || []).includes(c)}
                          disabled={!editing}
                          onClick={() =>
                            edit(
                              [...unitPath, "conditions"],
                              (unit.conditions || []).includes(c)
                                ? unit.conditions.filter((x) => x !== c)
                                : [...(unit.conditions || []), c],
                            )
                          }
                        >
                          {c}
                        </button>
                      ))}
                    </div>
                    <p className="ts-sheet-muted">
                      São marcadores da cópia de trabalho. Condições/effects
                      específicos do COMP/CON continuam preservados nos dados
                      completos.
                    </p>
                    <RawTree
                      value={unit.statuses || []}
                      path={[...unitPath, "statuses"]}
                      edit={edit}
                      editing={editing}
                    />
                    <RawTree
                      value={unit.counters || {}}
                      path={[...unitPath, "counters"]}
                      edit={edit}
                      editing={editing}
                    />
                  </article>
                  <article className="ts-sheet-card">
                    <h3>
                      Usos e períodos • Rodada {sheet.tracking?.round || 1}
                    </h3>
                    <div className="ts-sheet-header-actions">
                      {[
                        ["round", "Nova rodada"],
                        ["scene", "Nova cena"],
                        ["mission", "Nova missão"],
                      ].map(([p, name]) => (
                        <button
                          key={p}
                          className="ts-button"
                          disabled={!editing}
                          onClick={() => resetUses(p)}
                        >
                          {name}
                        </button>
                      ))}
                    </div>
                    <p className="ts-sheet-muted">
                      Rodada/cena reiniciam apenas ações com a frequência
                      correspondente. Missão limpa todos os registros de uso.
                      Não restaura vida, calor, cargas ou outros recursos.
                    </p>
                  </article>
                </>
              )}
              {section === "notes" && (
                <>
                  {title(
                    "Notas privadas do mestre",
                    "Guardadas fora da ficha compartilhada e dos arquivos exportados.",
                  )}
                  <article className="ts-sheet-card">
                    <Field
                      label="Anotações privadas"
                      value={gmNote}
                      multiline
                      live
                      onChange={setGmNote}
                    />
                    <p className="ts-sheet-muted">
                      {host.isFoundry
                        ? "Salvas neste navegador, para este usuário, mundo e personagem."
                        : "Salvas apenas neste navegador."}{" "}
                      Não são gravadas nos flags públicos do personagem nem
                      enviadas ao COMP/CON.
                    </p>
                  </article>
                </>
              )}
              {section === "source" && (
                <>
                  {title(
                    "Importação e histórico",
                    "Consulte a origem, revise novas versões e recupere uma edição desta sessão.",
                  )}
                  <article className="ts-sheet-card">
                    <h3>Origem atual</h3>
                    <p className="ts-sheet-muted">
                      {sheet.source.url ||
                        sheet.source.filename ||
                        sheet.source.kind ||
                        "Manual"}
                    </p>
                    <p className="ts-sheet-muted">
                      Importada em{" "}
                      {new Date(sheet.source.importedAt).toLocaleString(
                        "pt-BR",
                      )}{" "}
                      • {diffData(sheet.base, data).length} campos/grupos
                      alterados.
                    </p>
                    <div className="ts-sheet-header-actions">
                      <button
                        className="ts-button"
                        onClick={() => setModal("import")}
                      >
                        Atualizar origem
                      </button>
                      <button className="ts-button" onClick={compconExport}>
                        Exportar JSON COMP/CON
                      </button>
                      <button className="ts-button" onClick={portable}>
                        Exportar projeto completo
                      </button>
                    </div>
                  </article>
                  <article className="ts-sheet-card">
                    <h3>Histórico local • {history.past.length} versões</h3>
                    <p className="ts-sheet-muted">
                      Até 40 operações nesta sessão. O projeto exportado
                      preserva a origem e a edição atual. O histórico de sessão
                      não é compartilhado.
                    </p>
                    <div className="ts-sheet-version-list">
                      {history.past
                        .slice(-8)
                        .reverse()
                        .map((s, i) => (
                          <button
                            key={`${s.updatedAt}-${i}`}
                            onClick={() => {
                              update(copy(s));
                              setNotice(
                                "Versão anterior recuperada no rascunho.",
                              );
                            }}
                          >
                            <span>
                              {s.data.name} •{" "}
                              {new Date(s.updatedAt).toLocaleTimeString(
                                "pt-BR",
                              )}
                            </span>
                            <span>Recuperar cópia</span>
                          </button>
                        ))}
                    </div>
                  </article>
                  {host.isFoundry && (
                    <article className="ts-sheet-card">
                      <h3>Aplicação no Foundry</h3>
                      <p className="ts-sheet-muted">
                        O botão Revisar alterações prepara a lista de
                        documentos/campos. Nenhuma mudança de ficha é feita ao
                        carregar o link. Valores derivados são calculados pelo
                        sistema Lancer, usando os itens efetivamente aplicados.
                      </p>
                    </article>
                  )}
                </>
              )}
              {section === "advanced" && (
                <>
                  {title(
                    "Dados completos",
                    "Todos os campos importados permanecem aqui, inclusive homebrews e extensões.",
                  )}
                  <article className="ts-sheet-card">
                    <h3>Editor estruturado</h3>
                    <RawTree
                      value={data}
                      path={[]}
                      edit={edit}
                      editing={editing}
                    />
                  </article>
                  <article className="ts-sheet-card">
                    <h3>JSON da ficha</h3>
                    <p className="ts-sheet-muted">
                      Edição integral para campos ou extensões sem controle
                      específico. Aplicar JSON atualiza apenas o rascunho, com
                      validação.
                    </p>
                    <textarea
                      className="ts-sheet-json"
                      aria-label="JSON completo da ficha"
                      value={jsonText}
                      disabled={!editing}
                      onChange={(e) => setJsonText(e.target.value)}
                    />
                    <div className="ts-sheet-header-actions">
                      <button
                        className="ts-button"
                        disabled={!editing}
                        onClick={() => {
                          try {
                            const next = copy(latest.current);
                            next.data = parsePilot(jsonText);
                            update(next);
                            setNotice("JSON validado e aplicado ao rascunho.");
                          } catch (e) {
                            setError(e.message);
                          }
                        }}
                      >
                        Validar e aplicar JSON
                      </button>
                      <button
                        className="ts-button"
                        onClick={() =>
                          setJsonText(
                            JSON.stringify(latest.current.data, null, 2),
                          )
                        }
                      >
                        Recarregar JSON da cópia
                      </button>
                    </div>
                  </article>
                </>
              )}
            </main>
          </div>
          <footer className="ts-sheet-footer">
            <div className="ts-sheet-save-state">
              <Ic name={busy ? "spinner" : "circle-check"} />
              {busy ? "Processando…" : status}
            </div>
            <div className="ts-sheet-footer-actions">
              <button
                className="ts-button"
                disabled={!history.past.length || busy}
                onClick={undo}
              >
                <Ic name="rotate-left" /> Desfazer
              </button>
              <button
                className="ts-button"
                disabled={!history.future.length || busy}
                onClick={redo}
              >
                <Ic name="rotate-right" /> Refazer
              </button>
              <button className="ts-button" disabled={busy} onClick={portable}>
                Exportar
              </button>
              <button
                className="ts-button ts-primary"
                disabled={busy}
                onClick={() =>
                  host.isFoundry ? setModal("apply-options") : portable()
                }
              >
                {host.isFoundry ? "Vincular / atualizar ator…" : "Salvar projeto"}
              </button>
            </div>
          </footer>
        </>
      )}
      {modal === "import" && (
        <Dialog
          title="Carregar / atualizar ficha"
          onClose={() => setModal(null)}
          busy={busy}
        >
          <p>
            Importe a versão compartilhada e revise as diferenças. Sua edição
            local permanece guardada.
          </p>
          <div className="ts-sheet-import-box">
            <input
              aria-label="Link do COMP/CON"
              value={link}
              onChange={(e) => setLink(e.target.value)}
            />
            <button
              className="ts-button ts-primary"
              disabled={busy}
              onClick={importLink}
            >
              {busy ? "Carregando…" : "Consultar link"}
            </button>
          </div>
          <button
            className="ts-button"
            disabled={busy}
            onClick={() => fileInput.current.click()}
          >
            Importar JSON
          </button>
          {host.readActorSheet && (
            <button
              className="ts-button"
              disabled={busy}
              onClick={() =>
                run(async () =>
                  stage(await host.readActorSheet(), {
                    kind: "foundry",
                    actorUuid: host.actorUuid,
                  }),
                )
              }
            >
              Ler versão atual do Foundry
            </button>
          )}
        </Dialog>
      )}
      {modal === "merge" && staged && (
        <Dialog
          wide
          title="Revisar nova importação"
          busy={busy}
          onClose={() => {
            setModal(null);
            setStaged(null);
          }}
        >
          <p>
            {staged.samePilot
              ? "Atualização do mesmo piloto. Conflitos começam com sua edição local preservada."
              : "A origem contém outro piloto. Revise identidade, listas e mechas antes de substituir a cópia."}{" "}
            Listas são revisadas como grupos inteiros para preservar ordem e
            IDs.
          </p>
          <div className="ts-sheet-review-controls">
            <button
              className="ts-button"
              onClick={() =>
                setSelected(
                  new Set(
                    staged.changes.filter((c) => !c.conflict).map((c) => c.key),
                  ),
                )
              }
            >
              Selecionar sem conflitos
            </button>
            <button
              className="ts-button"
              onClick={() => setSelected(new Set())}
            >
              Manter tudo local
            </button>
            <button
              className="ts-button"
              onClick={() =>
                setSelected(new Set(staged.changes.map((c) => c.key)))
              }
            >
              Selecionar tudo da origem
            </button>
          </div>
          <div className="ts-sheet-review-list">
            {staged.changes.map((c) => (
              <label className="ts-sheet-review-row" key={c.key}>
                <input
                  type="checkbox"
                  checked={selected.has(c.key)}
                  onChange={(e) => {
                    const next = new Set(selected);
                    e.target.checked ? next.add(c.key) : next.delete(c.key);
                    setSelected(next);
                  }}
                />
                <div>
                  <code>{c.path.join(" › ")}</code>
                  {c.conflict && (
                    <span className="ts-sheet-review-conflict">
                      Conflito com sua edição
                    </span>
                  )}
                  <div className="ts-sheet-review-values">
                    <span>
                      Local: {JSON.stringify(c.before) ?? "Não existe"}
                    </span>
                    <span>
                      Origem: {JSON.stringify(c.after) ?? "Não existe"}
                    </span>
                  </div>
                </div>
              </label>
            ))}
          </div>
          {!staged.changes.length && <p>Nenhuma diferença encontrada.</p>}
          <div className="ts-dialog-actions">
            <button className="ts-button" onClick={() => setModal(null)}>
              Voltar
            </button>
            <button className="ts-button ts-primary" onClick={finishMerge}>
              Aplicar {selected.size} grupos ao rascunho
            </button>
          </div>
        </Dialog>
      )}
      {modal === "add" && (
        <Dialog
          title="Adicionar conteúdo personalizado"
          onClose={() => setModal(null)}
        >
          <p>
            Crie a entrada e depois edite as regras e valores. Nenhuma
            habilidade é inventada automaticamente.
          </p>
          <div className="ts-sheet-fields">
            <label className="ts-sheet-field">
              Categoria
              <select
                aria-label="Categoria do novo conteúdo"
                value={newKind}
                onChange={(e) => setNewKind(e.target.value)}
              >
                {[
                  "skills",
                  "talents",
                  "licenses",
                  "core_bonuses",
                  "reserves",
                  "armor",
                  "weapons",
                  "gear",
                ].map((k) => (
                  <option key={k} value={k}>
                    {labels[k]}
                  </option>
                ))}
              </select>
            </label>
            <Field
              label="Nome do novo conteúdo"
              value={newName}
              onChange={setNewName}
            />
          </div>
          <div className="ts-dialog-actions">
            <button
              className="ts-button ts-primary"
              disabled={!newName.trim()}
              onClick={addItem}
            >
              Adicionar ao rascunho
            </button>
          </div>
        </Dialog>
      )}
      {modal === "apply-options" && (
        <Dialog
          title="O que aplicar no Foundry?"
          onClose={() => setModal(null)}
          busy={busy}
        >
          <p>
            Destinos separados. Combate desmarcado preserva os recursos atuais
            do Foundry. A importação nunca depende do Tokenizer.
          </p>
          <div className="ts-destinations">
            {[
              ["identity", "Identidade, biografia e vínculo COMP/CON"],
              ["portrait", "Retrato do COMP/CON na ficha e no editor"],
              ["build", "Build, equipamentos e talentos"],
              ["combat", "Recursos atuais de combate"],
              ["mechs", "Mechas e seus loadouts"],
              ["adopt", "Adotar e atualizar itens existentes com o mesmo ID"],
              [
                "removeManaged",
                "Remover itens gerenciados ausentes na nova build",
              ],
            ].map(([k, label]) => (
              <label key={k}>
                <input
                  type="checkbox"
                  checked={!!applyParts[k]}
                  onChange={(e) =>
                    setApplyParts((p) => ({ ...p, [k]: e.target.checked }))
                  }
                />
                <span>{label}</span>
              </label>
            ))}
          </div>
          <p className="ts-sheet-muted">
            A sincronização de build atualiza apenas itens gerenciados pelo
            Token Studio. Itens externos são preservados e podem gerar avisos de
            duplicidade. O retrato é guardado no Foundry. Um token com imagem
            própria mantém sua arte, moldura e configurações; um token padrão
            recebe a imagem do piloto como ponto de partida.
          </p>
          <div className="ts-dialog-actions">
            <button
              className="ts-button ts-primary"
              disabled={busy || !Object.values(applyParts).some(Boolean)}
              onClick={reviewFoundry}
            >
              {busy ? "Preparando…" : "Preparar revisão"}
            </button>
          </div>
        </Dialog>
      )}
      {modal === "foundry" && foundryPlan && (
        <Dialog
          wide
          title="Revisão das alterações no Foundry"
          onClose={() => setModal(null)}
          busy={busy}
        >
          <p>{foundryPlan.summary}</p>
          {foundryPlan.warnings?.length > 0 && (
            <div className="ts-warning">
              {foundryPlan.warnings.map((w, i) => (
                <p key={i}>{w}</p>
              ))}
            </div>
          )}
          <div className="ts-sheet-review-list">
            {foundryPlan.changes.map((c, i) => (
              <div className="ts-sheet-review-row" key={i}>
                <div>
                  <strong>{c.document}</strong>
                  <code> • {c.field}</code>
                  <div className="ts-sheet-review-values">
                    <span>
                      Atual: {JSON.stringify(c.before) ?? "Não existe"}
                    </span>
                    <span>Após: {JSON.stringify(c.after) ?? "Não existe"}</span>
                  </div>
                </div>
              </div>
            ))}
          </div>
          <div className="ts-dialog-actions">
            <button
              className="ts-button"
              disabled={busy}
              onClick={() => setModal("apply-options")}
            >
              Rever destinos
            </button>
            <button
              className="ts-button ts-primary"
              disabled={busy || foundryPlan.blocked}
              onClick={applyFoundry}
            >
              {busy ? "Aplicando…" : "Aplicar alterações revisadas"}
            </button>
          </div>
        </Dialog>
      )}
    </section>
  );
}
