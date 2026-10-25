import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { chronicleBook, type ShelfPage } from "@/game/chronicle";
import { publicUrl } from "@/lib/public-url";

const seal = publicUrl("/game/scroll.webp");
const OPEN = "otevrene";

export function ChronicleBook({ onClose }: { onClose: () => void }) {
  const book = chronicleBook();
  const placeName = new Map(book.chapters.map((chapter) => [chapter.id, chapter.name]));
  const shelves =
    book.opened.length > 0
      ? [{ id: OPEN, name: "Otevřené", known: book.opened.length, total: book.opened.length, pages: book.opened }, ...book.chapters]
      : book.chapters;
  const [chapterId, setChapterId] = useState(shelves[0]?.id ?? "");
  const [pageId, setPageId] = useState<string | null>(null);
  const chapter = shelves.find((item) => item.id === chapterId) ?? shelves[0];
  const chapterIndex = shelves.findIndex((item) => item.id === chapter?.id);
  const openedFlat = book.opened.map((page) => ({ chapterId: OPEN, page }));
  const flat = book.chapters.flatMap((item) => item.pages.map((page) => ({ chapterId: item.id, page })));
  const reading = chapter?.id === OPEN ? openedFlat : flat;
  const index = reading.findIndex((item) => item.page.id === pageId);
  const current = index >= 0 ? reading[index] : null;
  const rows = Math.max(1, ...book.chapters.map((item) => Math.ceil(item.pages.length / 2)));

  function showContents(nextChapter = chapter?.id) {
    if (nextChapter) setChapterId(nextChapter);
    setPageId(null);
  }

  function openSlot(nextChapter: string, page: ShelfPage) {
    setChapterId(nextChapter);
    setPageId(page.id);
  }

  function step(dir: -1 | 1) {
    if (!current) {
      const next = shelves[chapterIndex + dir];
      if (next) showContents(next.id);
      return;
    }
    const next = reading[index + dir];
    if (!next) return;
    openSlot(next.chapterId, next.page);
  }

  const atStart = current ? index <= 0 : chapterIndex <= 0;
  const atEnd = current ? index >= reading.length - 1 : chapterIndex >= shelves.length - 1;

  return (
    <div className="absolute inset-0 z-50 flex bg-ink/55 p-[0.4em] sm:p-[0.8em]" onClick={onClose}>
      <section
        className="chronicle-fit story-leaf mx-auto flex h-full w-full max-w-[46em] flex-col overflow-hidden rounded-[1.2em] border-4 border-ink text-left shadow-lg ring-4 ring-gold"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-[0.6em] px-[0.8em] pt-[0.7em]">
          <img src={seal} alt="" className="size-[2.4em] shrink-0 object-contain" />
          <div className="min-w-0 flex-1">
            <h2 className="font-display text-[1.7em] leading-none">Kronika</h2>
            <p className="text-[0.75em] font-extrabold text-ink-soft">
              {book.total > 0 ? `${book.known} z ${book.total}` : "Zatím prázdné desky"}
            </p>
          </div>
          <button
            type="button"
            className="flex size-[2.5em] shrink-0 items-center justify-center rounded-full border-2 border-ink bg-gold text-ink"
            aria-label="Zavřít kroniku"
            onClick={onClose}
          >
            <X className="size-[1.1em]" />
          </button>
        </div>

        {chapter && (
          <div className="flex shrink-0 items-center gap-[0.4em] px-[0.8em] pt-[0.45em]">
            <p className="min-w-0 flex-1 truncate text-center font-display text-[1.15em] leading-tight">{chapter.name}</p>
            <p className="shrink-0 text-[0.75em] font-extrabold text-ink-soft">
              {current ? `${index + 1}/${reading.length}` : chapter.id === OPEN ? `${chapter.known}` : `${chapter.known}/${chapter.total}`}
            </p>
          </div>
        )}
        <Flourish />

        <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-[0.8em] pb-[0.4em]">
          {!current && chapter && (
            <div
              className={`grid min-h-0 flex-1 gap-[0.35em] ${chapter.id === OPEN ? "chronicle-scroll content-start" : "overflow-hidden"}`}
              style={
                chapter.id === OPEN
                  ? {
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gridAutoRows: `calc((100% - ${(rows - 1) * 0.35}em) / ${rows})`,
                    }
                  : {
                      gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
                      gridTemplateRows: `repeat(${rows}, minmax(0, 1fr))`,
                    }
              }
            >
              {chapter.pages.map((page) => (
                <button
                  key={page.id}
                  type="button"
                  className="flex h-full min-h-0 items-center gap-[0.45em] overflow-hidden rounded-[0.7em] border-2 border-ink/30 px-[0.55em] text-left"
                  onClick={() => openSlot(chapter.id, page)}
                >
                  {page.open ? (
                    <span className="min-w-0">
                      <span className="line-clamp-2 font-display text-[0.95em] leading-tight">{page.title}</span>
                      <span className="block truncate text-[0.68em] font-extrabold text-ink-soft">
                        {chapter.id === OPEN && page.page.place ? `${placeName.get(page.page.place) ?? ""} · ` : ""}
                        {page.fresh ? "nové" : page.on}
                      </span>
                    </span>
                  ) : (
                    <>
                      <img src={seal} alt="" className="size-[1.5em] shrink-0 object-contain opacity-70" />
                      <span className="truncate font-display text-[0.95em] text-ink-soft">Zapečetěno</span>
                    </>
                  )}
                </button>
              ))}
            </div>
          )}

          {current && !current.page.open && (
            <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-[0.5em] text-center">
              <img src={seal} alt="" className="h-[7em] w-auto object-contain" />
              <p className="mt-[0.4em] font-display text-[2em] leading-none">Zapečetěno</p>
              <p className="mt-[0.35em] max-w-[16em] text-[0.9em] leading-snug text-ink-soft">
                Pečeť se zlomí, až Drběna najde další pergamen.
              </p>
            </div>
          )}

          {current?.page.open && <ArticleView page={current.page} />}
        </div>

        <div className="grid shrink-0 grid-cols-3 gap-[0.4em] border-t-2 border-gold/70 bg-cream-deep/50 px-[0.6em] py-[0.55em]">
          <button
            type="button"
            className="flex h-[2.6em] items-center justify-center gap-[0.15em] rounded-full border-2 border-ink bg-cream font-display disabled:opacity-35"
            aria-label={current ? "Předchozí článek" : "Předchozí kapitola"}
            disabled={atStart}
            onClick={() => step(-1)}
          >
            <ChevronLeft className="size-[1.1em]" />
            zpět
          </button>
          <button
            type="button"
            className="flex h-[2.6em] items-center justify-center rounded-full border-2 border-ink bg-gold font-display disabled:opacity-35"
            disabled={!current}
            onClick={() => showContents()}
          >
            obsah
          </button>
          <button
            type="button"
            className="flex h-[2.6em] items-center justify-center gap-[0.15em] rounded-full border-2 border-ink bg-cream font-display disabled:opacity-35"
            aria-label={current ? "Další článek" : "Další kapitola"}
            disabled={atEnd}
            onClick={() => step(1)}
          >
            dál
            <ChevronRight className="size-[1.1em]" />
          </button>
        </div>
      </section>
    </div>
  );
}

function Flourish() {
  return (
    <div className="mx-[0.8em] my-[0.35em] flex items-center gap-[0.6em]" aria-hidden="true">
      <span className="h-px flex-1 bg-gold" />
      <span className="size-[0.45em] rotate-45 border-2 border-gold bg-bow" />
      <span className="h-px flex-1 bg-gold" />
    </div>
  );
}

function ArticleView({ page }: { page: Extract<ShelfPage, { open: true }> }) {
  const body = page.page;
  return (
    <article className="flex min-h-0 flex-1 flex-col overflow-hidden">
      <p className="text-[0.68em] font-extrabold tracking-[0.16em] text-bow">{page.on}</p>
      <h3 className="mt-[0.1em] shrink-0 font-display text-[1.45em] leading-tight">{body.title}</h3>
      <div className="chronicle-scroll mt-[0.45em] min-h-0 flex-1 pr-[0.7em]">
        <Part label="Úvod" lines={body.intro ? [body.intro] : []} />
        <Part label="Příběh" lines={body.paragraphs} />
        <Part label="Zajímavost" lines={body.curiosities} />
        <Part label="Zdroj" lines={body.sources} />
        {body.link && (
          <a
            href={body.link.href}
            target="_blank"
            rel="noreferrer"
            className="mt-[0.7em] inline-block font-display text-[1.05em] leading-tight text-bow underline decoration-gold decoration-2 underline-offset-4"
          >
            {body.link.label}
          </a>
        )}
      </div>
    </article>
  );
}

function Part({ label, lines }: { label: string; lines: string[] }) {
  if (lines.length === 0) return null;
  return (
    <section className="mt-[0.45em] first:mt-0">
      <h4 className="text-[0.68em] font-extrabold tracking-[0.14em] text-bow">{label}</h4>
      {lines.map((line, index) => (
        <p key={index} className="mt-[0.25em] text-[0.95em] leading-relaxed">
          {line}
        </p>
      ))}
    </section>
  );
}
