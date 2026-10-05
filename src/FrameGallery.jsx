import React, { useMemo, useState } from "react";
import catalog from "./frame-catalog.json";
export function FrameGallery({ assetsBase, onChoose, onClose, busy }) {
  const [query, setQuery] = useState(""),
    [author, setAuthor] = useState(""),
    [page, setPage] = useState(0),
    [onlyFavorites, setOnlyFavorites] = useState(false),
    [favorites, setFavorites] = useState(() => {
      try {
        return JSON.parse(
          localStorage.getItem("token-studio-frame-favorites") || "[]",
        );
      } catch {
        return [];
      }
    });
  const items = useMemo(
    () =>
      catalog.filter(
        (f) =>
          f.kind === "frame" &&
          (!author || f.author === author) &&
          (!onlyFavorites || favorites.includes(f.id)) &&
          `${f.name} ${f.author} ${f.original}`
            .toLowerCase()
            .includes(query.toLowerCase()),
      ),
    [query, author, onlyFavorites, favorites],
  );
  const pages = Math.max(1, Math.ceil(items.length / 24)),
    current = Math.min(page, pages - 1);
  function favorite(id) {
    const next = favorites.includes(id)
      ? favorites.filter((x) => x !== id)
      : [...favorites, id];
    setFavorites(next);
    try {
      localStorage.setItem(
        "token-studio-frame-favorites",
        JSON.stringify(next),
      );
    } catch {}
  }
  return (
    <div className="ts-modal-backdrop">
      <section
        className="ts-dialog ts-gallery"
        role="dialog"
        tabIndex={-1}
        aria-modal="true"
        aria-labelledby="ts-dialog-title"
      >
        <button
          className="ts-dialog-close ts-info"
          aria-label="Fechar catálogo"
          onClick={onClose}
          disabled={busy}
        >
          <i className="fa-solid fa-xmark" />
        </button>
        <h2 id="ts-dialog-title">Suas molduras</h2>
        <p>
          {catalog.filter((f) => f.kind === "frame").length} molduras do pacote.
          O original só é carregado quando você escolhe.
        </p>
        <div className="ts-gallery-filters">
          <input
            aria-label="Buscar moldura"
            placeholder="Buscar nome ou coleção…"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(0);
            }}
          />
          <select
            aria-label="Coleção de molduras"
            value={author}
            onChange={(e) => {
              setAuthor(e.target.value);
              setPage(0);
            }}
          >
            <option value="">Todas as coleções</option>
            {[...new Set(catalog.map((f) => f.author))].sort().map((a) => (
              <option key={a}>{a}</option>
            ))}
          </select>
          <button
            className="ts-button"
            aria-pressed={onlyFavorites}
            onClick={() => {
              setOnlyFavorites(!onlyFavorites);
              setPage(0);
            }}
          >
            <i className="fa-solid fa-star" /> Favoritas
          </button>
        </div>
        <div className="ts-gallery-grid">
          {items.slice(current * 24, current * 24 + 24).map((f) => (
            <article key={f.id}>
              <button
                className="ts-gallery-choice"
                aria-label={`Usar moldura ${f.author} ${f.name}`}
                disabled={busy}
                onClick={() => onChoose(f)}
              >
                <img
                  src={assetsBase + f.thumb}
                  alt=""
                  loading="lazy"
                  width="100"
                  height="100"
                />
                <strong>{f.name}</strong>
                <small>
                  {f.author} • {f.width} px
                </small>
              </button>
              <button
                className="ts-gallery-star ts-info"
                aria-label={`Favoritar ${f.name}`}
                aria-pressed={favorites.includes(f.id)}
                onClick={() => favorite(f.id)}
              >
                <i
                  className={`fa-solid fa-${favorites.includes(f.id) ? "star" : "bookmark"}`}
                />
              </button>
            </article>
          ))}
        </div>
        {!items.length && (
          <p className="ts-empty">
            Nenhuma moldura encontrada. Ajuste a busca.
          </p>
        )}
        <footer className="ts-gallery-footer">
          <small>
            {items.length} resultados • página {current + 1} de {pages}
          </small>
          <button
            className="ts-button"
            disabled={current === 0 || busy}
            onClick={() => setPage(current - 1)}
          >
            Anterior
          </button>
          <button
            className="ts-button"
            disabled={current >= pages - 1 || busy}
            onClick={() => setPage(current + 1)}
          >
            Próxima
          </button>
        </footer>
        <p className="ts-gallery-note">
          Fundos opacos e máscaras de apoio estão preservados no pacote, mas não
          aparecem como moldura. Bordas abertas permitem ajustar o recorte
          manualmente.
        </p>
      </section>
    </div>
  );
}
