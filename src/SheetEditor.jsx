import React, { useEffect, useMemo, useRef, useState } from "react";
import {loadoutEntries,unitActions,mountTitle,sheetUnitIndex} from "./sheet-navigation.js";
import {ruleGroups,sheetDiagnostics,originLabels,ruleLabels} from './sheet-rules.js';
import {ImageURLForm} from './ImageURLForm.jsx';
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
function LazyDetails({summary,children,className=''}) {
  const [open,setOpen]=useState(false);
  return <details className={className} onToggle={e=>setOpen(e.currentTarget.open)}><summary>{summary}</summary>{open && children()}</details>;
}
function RuleOrigin({group,sheet,editing,edit,useAction}) {
  const [open,setOpen]=useState(false);
  const counts=Object.entries(group.counts).filter(([,n])=>n).map(([kind,n])=>`${n} ${n===1?({action:'ação',passive:'passiva',effect:'efeito',info:'descrição'})[kind]:ruleLabels[kind].toLowerCase()}`).join(' · ');
  return <article className={`ts-rule-origin ${!group.active?'ts-sheet-inactive':''}`}>
    <button className="ts-rule-origin-toggle" aria-expanded={open} onClick={()=>setOpen(!open)}>
      <Ic name={open?'chevron-down':'chevron-right'}/><span><strong>{group.name}</strong><small>{originLabels[group.origin]}{group.loadout?` • ${group.loadout}`:''}{!group.active?' • Inativo':''}</small></span><span className="ts-rule-counts">{counts||'Dados adicionais'}</span>
    </button>
    {open && <div className="ts-rule-origin-body">
      {['action','passive','effect','info'].map(type=>group.rules.some(r=>r.type===type) && <section key={type} aria-label={`${ruleLabels[type]} de ${group.name}`}>
        <h3>{ruleLabels[type]} <small>{group.counts[type]}</small></h3>
        <div className="ts-sheet-actions-grid">{group.rules.filter(r=>r.type===type).map(r=><article key={r.key} className={`ts-sheet-card ${!r.active?'ts-sheet-inactive':''}`}>
          <div className="ts-sheet-row-head"><h4>{r.action?r.name:r.name.replace(`${group.name} • `,'')}</h4>{r.action && <span className="ts-sheet-chip">{r.action.activation==='None'?'Sem custo de ação':r.action.activation||'Ativação não informada'}</span>}</div>
          <p className="ts-sheet-item-meta">{r.owner}{!r.active?' • Rank ou loadout inativo':''}{r.action?.frequency?` • ${r.action.frequency}`:''}{r.action?.heat_cost?` • ${r.action.heat_cost} calor`:''}</p>
          <div className="ts-sheet-rule-preview"><Rules value={r.action?.terse || (!r.action?r.value:'')}/></div>
          <LazyDetails summary="Regra completa">{()=> <><Rules value={r.action?.trigger}/><Rules value={r.action?.detail}/><Rules value={r.action?.effect}/>{!r.action && <Rules value={r.value}/>}</>}</LazyDetails>
          {editing && <LazyDetails summary="Editar esta regra">{()=> <RawTree value={r.action||r.value} path={r.path} edit={edit} editing/>}</LazyDetails>}
          {r.action && (r.type==='action'||frequencyLimit(r.action.frequency)) && <div className="ts-sheet-action-footer"><small>{sheet.tracking?.uses?.[r.key]||0} uso(s) registrados</small><button className="ts-button" disabled={!editing||!r.active||Boolean(frequencyLimit(r.action.frequency)&&(sheet.tracking?.uses?.[r.key]||0)>=frequencyLimit(r.action.frequency).limit)} onClick={()=>useAction(r)}>Registrar uso</button></div>}
        </article>)}</div>
      </section>)}
      {!group.rules.length && <p className="ts-sheet-muted">Esta origem contém dados adicionais. Abra o conteúdo abaixo para consultar ou editar.</p>}
      <LazyDetails summary="Todos os dados desta origem">{()=> <RawTree value={group.entry.data} path={group.entry.dataPath} edit={edit} editing={editing}/>}</LazyDetails>
    </div>}
  </article>;
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
  if (disabled) return <div className="ts-sheet-field ts-sheet-value"><span>{label}</span><strong>{type==='boolean' ? (value?'Sim':'Não') : (value ?? '—')}</strong></div>;
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
        {Array.isArray(d.damage) && (
          <span>{d.damage.map((x) => `${x.val} ${x.type}`).join(" • ")}</span>
        )}
        {Array.isArray(d.range) && (
          <span>{d.range.map((x) => `${x.type} ${x.val}`).join(" • ")}</span>
        )}
      </div>
      <div className="ts-sheet-rule-preview"><Rules value={d.terse || d.effect || d.description} /></div>
      {entry.item.rank!=null && entry.kind!=='skills' && <div className="ts-sheet-rank-track" aria-label={`Rank adquirido: ${entry.item.rank}`}>{[1,2,3].map(rank=><span key={rank} className={rank<=entry.item.rank?'is-acquired':''}><Ic name={rank<=entry.item.rank?'check':'lock'}/> {rank}</span>)}</div>}
      {(d.actions?.length > 0 || d.ranks?.length > 0) && (
        <p className="ts-sheet-muted">
          {d.actions?.length
            ? `${d.actions.length} ações`
            : `${d.ranks.length} ranks descritos`}{" "}
          • detalhes abaixo
        </p>
      )}
      <LazyDetails summary="Descrição e regras completas">{()=> <>
        <Rules value={d.description} />
        <Rules value={d.effect} />
        <Rules value={d.detail} />
        {d.profiles?.map((profile,i)=><section className="ts-sheet-profile" key={i}><h4>{profile.name||`Perfil ${i+1}`}</h4><p>{profile.damage?.map(x=>`${x.val} ${x.type}`).join(" • ")}{profile.range?.length ? " · "+profile.range.map(x=>`${x.type} ${x.val}`).join(" • ") : ""}</p><Rules value={profile.effect}/><Rules value={profile.description}/></section>)}
        {d.ranks?.map((r, i) => (
          <section key={i} className={`ts-sheet-card ${entry.item.rank<=i?"ts-sheet-inactive":""}`}>
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
      </>}</LazyDetails>
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
  if (!editing) return <article className="ts-sheet-resource"><h3>{name}</h3><div className="ts-sheet-resource-reading"><strong>{current??0}</strong>{max!=null && <small>/ {max}</small>}</div></article>;
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
    [abilityTab,setAbilityTab] = useState('talents'),
    [includeInactive,setIncludeInactive] = useState(false),
    [activation,setActivation] = useState(''),
    [ruleKind,setRuleKind]=useState(''),
    [focusedIssue,setFocusedIssue]=useState(null),
    [portraitFailures,setPortraitFailures]=useState({}),
    [unitSelection, setUnitIndex] = useState(-1),
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
      combat: false,
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
      .then(async ([stored, note]) => {
        if (!alive) return;
        if (
          stored &&
          (!host.sheetProject || stored.updatedAt > host.sheetProject.updatedAt)
        )
          setSheet(validateSheet(stored));
        if (note?.text != null) setGmNote(note.text);
        if(!stored&&!host.sheetProject&&host.readActorSheet){
          try{const native=await host.readActorSheet();if(alive&&!latest.current)setSheet(validateSheet(native));}
          catch(error){if(alive)setNotice('Não foi possível ler a ficha do ator: '+error.message);}
        }
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
  const unitIndex = sheetUnitIndex(data,unitSelection);
  const unit = unitIndex < 0 ? data : data?.mechs?.[unitIndex],
    unitPath = unitIndex < 0 ? [] : ["mechs", unitIndex];
  useEffect(()=>{if(data){setUnitIndex(-1);setLoadoutIndex(data.active_index||0);}},[data?.id]);
  const diagnostics=useMemo(()=>data?sheetDiagnostics(data):[],[data]);
  const groups=useMemo(()=>data?ruleGroups(data,unitIndex,{includeInactive,origin:category,kind:ruleKind,activation,query}):[],[data,unitIndex,includeInactive,category,ruleKind,activation,query]);
  const portraitOverride=useRef({source:null,original:null});
  const portrait = useMemo(()=>{
    try { const original=pilotPortrait(data);if(portraitOverride.current.source!==host.appliedPortrait)portraitOverride.current={source:host.appliedPortrait,original};return (unitIndex<0&&original===portraitOverride.current.original?host.appliedPortrait:'') || pilotPortrait(unit) || (unitIndex < 0 ? host.source || '' : ''); }
    catch { return ''; }
  },[unit,data,unitIndex,host.source,host.appliedPortrait]);
  const portraitFailure=portraitFailures[portrait]||'';
  const imageIssues=Object.entries(portraitFailures).filter(([src])=>[data,...(data?.mechs||[])].some(unit=>{try{return pilotPortrait(unit)===src;}catch{return false;}})||host.source===src);
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
    if(!editing || action.type==='passive' && !frequencyLimit(action.action.frequency))return;
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
  function chooseUnit(index) {
    setUnitIndex(index); setQuery('');setCategory('');setActivation('');setRuleKind('');
    setLoadoutIndex(index<0 ? data.active_index||0 : data.mechs[index]?.active_loadout_index||0);
    if(index>=0 && ['pilot','abilities','equipment'].includes(section))setSection('mechs');
  }
  function selectSection(s) {
    if(['pilot','abilities','equipment'].includes(s) && unitIndex>=0) chooseUnit(-1);
    if(s==='equipment')setLoadoutIndex(data.active_index||0);
    root.current?.querySelector('.ts-sheet-content')?.scrollTo({top:0});
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
    ["overview", "Resumo", "table-cells-large"],
    ["pilot", "Perfil narrativo", "user-astronaut"],
    ["abilities", "Perfil tático", "bolt"],
    ["equipment", "Loadout do piloto", "toolbox"],
    ["mechs", "Hangar", "robot"],
    ["actions", "Ações e efeitos", "bolt"],
    ["combat", "Combate e recursos", "shield-halved"],
    ["notes", "Notas do mestre", "lock"],
    ["source", "Importação e histórico", "cloud-arrow-down"],
    ["diagnostics", "Pendências", "list-check"],
    ["advanced", "Dados completos", "sliders"],
  ];
  const scopedActions = unitActions(actions,unitIndex,{includeInactive,activation,query});
  const viewedLoadout=Math.min(loadoutIndex,Math.max(0,(unit?.loadouts?.length||1)-1));
  const equipmentEntries=loadoutEntries(all,unitIndex,viewedLoadout).filter(filter);
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
          onChange={(e) => chooseUnit(Number(e.target.value))}
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
            {portrait && !portraitFailure && <img className="ts-sheet-avatar" src={portrait} loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setPortraitFailures(previous=>({...previous,[portrait]:`Retrato de ${unit?.name||data.name} não carregou. Confira a URL e o acesso à imagem.`}))} alt={`Retrato de ${unit?.name || data.name}`} />}
            {portraitFailure && <button className="ts-sheet-avatar ts-avatar-failed" aria-label="Retrato indisponível: ver pendência" title={portraitFailure} onClick={()=>selectSection('diagnostics')}><Ic name="image"/></button>}
            <div>
              <div className="ts-sheet-eyebrow">
                {unitIndex<0 ? "Piloto" : "Mecha"} •{" "}
                {sheet.source?.code ? "COMP/CON" : "Cópia de trabalho"}
              </div>
              <h1>{unitIndex<0 ? data.callsign || data.name : unit?.name}</h1>
              <p className="ts-sheet-subtitle">
                {unitIndex<0 ? data.name : `${unit?.frameData?.name || unit?.frame || "Frame"} • Piloto: ${data.callsign || data.name}`} {data.player_name ? `• ${data.player_name}` : ""} •{" "}
                {unitActions(actions,unitIndex,{includeInactive:true}).length} habilidades descritas
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
          <div className="ts-sheet-context" inert={busy?true:undefined}>
            {unitSelect()}
            {editing && <button className="ts-button" onClick={()=>setModal('portrait-url')}><Ic name="link"/> Retrato por URL</button>}
            <span className={`ts-sheet-mode ${editing?'is-editing':''}`}><Ic name={editing?'pen-to-square':'eye'}/>{editing?'Editando rascunho':'Modo leitura'}</span>
            <button className="ts-button ts-diagnostic-shortcut" onClick={()=>selectSection('diagnostics')}><Ic name="list-check"/> {diagnostics.length+imageIssues.length} pendência(s)</button>
            <span className="ts-sheet-context-hint">{host.isFoundry ? 'Aplique ao ator para confirmar as alterações.' : 'Alterações ficam na sua cópia local.'}</span>
          </div>
          <div className="ts-sheet-layout" inert={busy ? true : undefined}>
            <aside className="ts-sheet-sidebar" aria-label="Seções da ficha">
              {navigation.map(([id, name, icon],index) => (
                <React.Fragment key={id}>
                {[0,4,7].includes(index) && <span className="ts-sheet-nav-group">{index===0?'Perfil do piloto':index===4?'Mecha e sessão':'Ferramentas do mestre'}</span>}
                <button
                  key={id}
                  aria-pressed={section === id}
                  onClick={() => selectSection(id)}
                >
                  <Ic name={icon} />
                  {name}
                  {id === "actions" && <small>{unitActions(actions,unitIndex).length}</small>}
                  {id === 'diagnostics' && <small>{diagnostics.length+imageIssues.length}</small>}
                  {id === 'mechs' && <small>{data.mechs.length}</small>}
                </button>
                </React.Fragment>
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
                    "Resumo",
                    "Valores da última importação ou da sua edição. As regras completas estão nas seções ao lado.",
                  )}
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
                    <h3>Mech Skills • HASE</h3>
                    <div className="ts-sheet-hase">
                      {["Hull", "Agility", "Systems", "Engineering"].map(
                        (name, i) => (
                          <Field
                            key={name}
                            label={`${name} • ${{Hull:"Casco",Agility:"Agilidade",Systems:"Sistemas",Engineering:"Engenharia"}[name]}`}
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
                      <h3>{unitIndex<0 ? "Build do piloto" : "Frame do mecha"}</h3>
                      <p className="ts-sheet-muted">
                        {unitIndex>=0 ? unit?.frameData?.name||unit?.frame||"Frame não informado" : ""}
                        {unitIndex<0 ? `${data.skills?.length || 0} gatilhos • ${data.talents?.length || 0} talentos • ${data.licenses?.length || 0} licenças • ${data.core_bonuses?.length || 0} core bonuses` : ""}
                      </p>
                      {all
                        .filter((x) =>
                          unitIndex<0 && ["talents", "core_bonuses"].includes(x.kind),
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
                        {unit?.loadouts?.[unitIndex<0 ? data.active_index||0 : unit.active_loadout_index||0]?.name ||
                          "Não informado"}
                      </p>
                      {loadoutEntries(all,unitIndex,unitIndex<0 ? data.active_index||0 : unit.active_loadout_index||0)
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
                    "Perfil narrativo",
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
                  <div className="ts-sheet-section-title"><h3>Gatilhos de perícia</h3><button className="ts-button" onClick={()=>{setAbilityTab('skills');selectSection('abilities');}}>Abrir gatilhos</button></div>
                  <div className="ts-sheet-item-list">{all.filter(e=>e.kind==='skills').map(e=><ItemCard key={e.key} entry={e} editing={editing} edit={edit} remove={remove} host={host}/>)}</div>
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
                    "Perfil tático",
                    "Gatilhos, talentos, licenças e core bonuses. Abra um cartão para consultar suas regras ou editar o conteúdo.",
                  )}
                  <div className="ts-sheet-tabs" role="tablist" aria-label="Categorias do perfil tático">
                    {['skills','talents','licenses','core_bonuses','reserves','orgs'].map(kind=><button role="tab" key={kind} id={`ts-ability-${kind}`} aria-controls="ts-ability-panel" tabIndex={abilityTab===kind?0:-1} aria-selected={abilityTab===kind} onKeyDown={event=>{const tabs=['skills','talents','licenses','core_bonuses','reserves','orgs'];let index=tabs.indexOf(kind);if(event.key==='ArrowRight')index=(index+1)%tabs.length;else if(event.key==='ArrowLeft')index=(index+tabs.length-1)%tabs.length;else if(event.key==='Home')index=0;else if(event.key==='End')index=tabs.length-1;else return;event.preventDefault();setAbilityTab(tabs[index]);setCategory('');setQuery('');event.currentTarget.parentElement.querySelectorAll('[role="tab"]')[index].focus();}} onClick={()=>{setAbilityTab(kind);setCategory('');setQuery('');}}>{labels[kind]} <small>{all.filter(e=>e.kind===kind).length}</small></button>)}
                  </div>
                  {search([abilityTab])}
                  <div className="ts-sheet-item-list" id="ts-ability-panel" role="tabpanel" aria-labelledby={`ts-ability-${abilityTab}`}>
                    {all.filter(e=>e.kind===abilityTab && filter(e)).map(e=><ItemCard key={e.key} entry={e} editing={editing} edit={edit} remove={remove} host={host}/>)}
                  </div>
                  {!all.some(e=>e.kind===abilityTab && filter(e)) && <div className="ts-sheet-empty-category"><Ic name="folder-open"/><p>Nenhum conteúdo nesta categoria{query?' para a busca atual':''}.</p>{editing && <button className="ts-button" onClick={()=>{setNewKind(abilityTab);setModal('add');}}>Adicionar {labels[abilityTab].toLowerCase()}</button>}</div>}
                </>
              )}
              {section === 'actions' && <>
                {title('Ações e efeitos',`Regras de ${unit?.name||data.name}, agrupadas por origem. Abra uma arma, sistema ou talento para consultar suas regras.`)}
                <div className="ts-rule-filters">
                  <input aria-label="Buscar ação" placeholder="Buscar equipamento, ação ou regra…" value={query} onChange={e=>setQuery(e.target.value)}/>
                  <select aria-label="Origem das regras" value={category} onChange={e=>setCategory(e.target.value)}><option value="">Todas as origens</option>{Object.entries(originLabels).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select>
                  <select aria-label="Categoria da regra" value={ruleKind} onChange={e=>{setRuleKind(e.target.value);setActivation('');}}><option value="">Todas as regras</option>{Object.entries(ruleLabels).map(([key,label])=><option value={key} key={key}>{label}</option>)}</select>
                  <select aria-label="Tipo de ação" value={activation} onChange={e=>setActivation(e.target.value)}><option value="">Todas as ativações</option>{[...new Set(unitActions(actions,unitIndex,{includeInactive:true}).map(a=>a.action.activation).filter(Boolean))].map(type=><option key={type}>{type}</option>)}</select>
                  <button className="ts-button" disabled={!query&&!category&&!ruleKind&&!activation&&!includeInactive} onClick={()=>{setQuery('');setCategory('');setRuleKind('');setActivation('');setIncludeInactive(false);}}>Limpar filtros</button><button className="ts-button" aria-pressed={includeInactive} onClick={()=>setIncludeInactive(!includeInactive)}>Mostrar inativas</button>
                </div>
                <p className="ts-sheet-muted">{groups.length} origem(ns) • {groups.reduce((sum,g)=>sum+g.rules.length,0)} regras encontradas • {includeInactive?'Inclui ranks e loadouts inativos':'Ranks adquiridos e loadouts ativos'}</p>
                <div className="ts-rule-origins">{groups.map(group=><RuleOrigin key={group.key} group={group} sheet={sheet} editing={editing} edit={edit} useAction={useAction}/>)}</div>
                {!groups.length && <div className="ts-sheet-empty-category"><Ic name="magnifying-glass"/><p>Nenhuma origem corresponde aos filtros.</p><button className="ts-button" onClick={()=>{setQuery('');setCategory('');setRuleKind('');setActivation('');}}>Limpar filtros</button></div>}
              </>}
              {section==='diagnostics' && <>
                {title('Pendências da ficha','Confira a origem de cada problema. Esta lista cobre piloto e todos os mechas; os dados originais continuam acessíveis.')}
                {imageIssues.map(([src,message])=><article className="ts-sheet-card ts-diagnostic" key={src}><h3>Imagem indisponível</h3><p>{message}</p><small className="ts-url-address">{src}</small><button className="ts-button" onClick={()=>setPortraitFailures(previous=>{const next={...previous};delete next[src];return next;})}>Tentar carregar novamente</button></article>)}
                {diagnostics.map(issue=><article className="ts-sheet-card ts-diagnostic" key={issue.key}><div className="ts-sheet-row-head"><h3>{issue.name}</h3><span className="ts-sheet-chip">{issue.unitIndex<0?'Piloto':data.mechs[issue.unitIndex]?.name||'Mecha'}</span></div><p>{issue.reason}</p><button className="ts-button" onClick={()=>{setFocusedIssue(issue);setModal('issue');}}>Ver origem e dados</button></article>)}
                {!diagnostics.length && !imageIssues.length && <div className="ts-sheet-empty-category"><Ic name="circle-check"/><p>Nenhuma pendência estrutural detectada.</p><small>A organização não valida automaticamente todas as regras e derivados do Lancer.</small></div>}
              </>}
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
                          {l.name || `Loadout ${i + 1}`}{i===(data.active_index||0)?" • Ativo":""}
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
                  {title('Hangar', 'Escolha um mecha para consultar seu frame, montagens e sistemas. Cada loadout tem seus próprios equipamentos.')}
                  <div className="ts-sheet-hangar">
                    {data.mechs.map((mech,i)=><button className="ts-sheet-mech-choice" key={mech.id||i} aria-pressed={unitIndex===i} onClick={()=>chooseUnit(i)}><Ic name="robot"/><span><strong>{mech.name||`Mecha ${i+1}`}</strong><small>{mech.frameData?.name||mech.frame||'Frame não informado'}</small></span></button>)}
                  </div>
                  {!data.mechs.length && <article className="ts-sheet-card"><h3>Nenhum mecha nesta ficha</h3><p className="ts-sheet-muted">Importe um compartilhamento ou JSON que inclua os mechas do piloto.</p></article>}
                  {unitIndex<0 && data.mechs.length>0 && <p className="ts-sheet-muted">Escolha um mecha acima para abrir sua ficha.</p>}
                  {unitIndex>=0 && unit && <>
                    <article className="ts-sheet-card">
                      <div className="ts-sheet-row-head"><h3>{unit.frameData?.name||unit.frame||'Frame'}</h3><span className="ts-sheet-chip">Frame</span></div>
                      <Field label="Nome do mecha" value={unit.name} disabled={!editing} onChange={v=>edit([...unitPath,'name'],v)}/>
                      <Rules value={unit.frameData?.description}/>
                      {unit.frameData?.traits?.map((trait,i)=><details key={i}><summary>{trait.name||`Trait ${i+1}`}</summary><Rules value={trait.description||trait.effect}/></details>)}
                      {unit.frameData?.core_system && <details><summary>Core system • {unit.frameData.core_system.name}</summary><Rules value={unit.frameData.core_system.description}/><Rules value={unit.frameData.core_system.passive_effect}/><Rules value={unit.frameData.core_system.active_effect}/></details>}
                      {editing && <details><summary>Editar definição do frame</summary><RawTree value={unit.frameData||{}} path={[...unitPath,'frameData']} edit={edit} editing/></details>}
                    </article>
                    <div className="ts-sheet-unit-select"><label>Loadout <select aria-label="Loadout do mecha" value={viewedLoadout} onChange={e=>setLoadoutIndex(Number(e.target.value))}>{unit.loadouts?.map((l,i)=><option key={i} value={i}>{l.name||`Loadout ${i+1}`}{i===(unit.active_loadout_index||0)?' • Ativo':''}</option>)}</select></label>{editing && unit.loadouts?.length>0 && <button className="ts-button" disabled={viewedLoadout===(unit.active_loadout_index||0)} onClick={()=>edit([...unitPath,'active_loadout_index'],viewedLoadout)}>Usar este loadout</button>}</div>
                    {search(['mech_weapons','weapon_mods','systems'])}
                    <div className="ts-sheet-item-list">{equipmentEntries.map(entry=><div key={entry.key}><p className="ts-sheet-mount-label">{mountTitle(entry,unit)}</p><ItemCard entry={entry} editing={editing} edit={edit} remove={remove} host={host}/></div>)}</div>
                    {!equipmentEntries.length && <p className="ts-sheet-muted">Nenhum equipamento neste loadout para a busca atual.</p>}
                    <RichField label={`Notas de ${unit.name}`} value={unit.notes} editing={editing} onChange={v=>edit([...unitPath,'notes'],v)}/>
                    <details><summary>{editing?'Editar montagens e campos adicionais':'Dados adicionais do mecha'}</summary><RawTree value={unit.loadouts||[]} path={[...unitPath,'loadouts']} edit={edit} editing={editing}/></details>
                  </>}
                </>
              )}
              {section === "combat" && (
                <>
                  {title(
                    "Combate e recursos",
                    "Controle explícito de valores. Estrutura, stress, testes e efeitos especiais exigem resolução da regra pelo mestre.",
                  )}
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
      {modal==='portrait-url' && <Dialog title="Retrato por URL" onClose={()=>setModal(null)}><ImageURLForm portraitOnly initial={/^https:/.test(portrait)?portrait:''} onClose={()=>setModal(null)} onUse={async url=>{edit([...unitPath,'img'],{...(typeof unit?.img==='object'?unit.img:{}),cloud_portrait:url});setModal(null);setNotice('Retrato por URL atualizado na cópia. Aplique ao ator para confirmar o vínculo.');}}/></Dialog>}
      {modal==='issue' && focusedIssue && <Dialog title={`Origem: ${focusedIssue.name}`} onClose={()=>setModal(null)} wide><p>{focusedIssue.reason}</p><p className="ts-sheet-muted">Localização: {focusedIssue.path.join(' → ')}</p><RawTree value={getPath(data,focusedIssue.path)} path={focusedIssue.path} edit={edit} editing={editing}/></Dialog>}
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
                  <details className="ts-sheet-review-values"><summary>Ver valores atuais e novos</summary>
                    <span>
                      Local: {JSON.stringify(c.before) ?? "Não existe"}
                    </span>
                    <span>
                      Origem: {JSON.stringify(c.after) ?? "Não existe"}
                    </span>
                  </details>
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
            do Foundry. Revise os destinos antes de confirmar.
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
            duplicidade. O retrato usa sua URL pública, sem cópia local. URLs temporárias podem expirar. Um token com imagem
            própria mantém sua arte, moldura e configurações; um token padrão
            recebe a imagem do piloto como ponto de partida.
          </p>
          <div className="ts-dialog-actions">
            <button
              className="ts-button ts-primary"
              disabled={busy || !['identity','portrait','build','combat','mechs'].some(k=>applyParts[k])}
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
                  <details className="ts-sheet-review-values"><summary>Ver valores atuais e novos</summary>
                    <span>
                      Atual: {JSON.stringify(c.before) ?? "Não existe"}
                    </span>
                    <span>Após: {JSON.stringify(c.after) ?? "Não existe"}</span>
                  </details>
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
