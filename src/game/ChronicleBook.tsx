import { useState } from "react";
import { ChevronLeft, ChevronRight, X } from "lucide-react";
import { chronicleBook, type ShelfPage } from "@/game/chronicle";
import { publicUrl } from "@/lib/public-url";

const seal = publicUrl("/game/scroll.webp");

export function ChronicleBook({ onClose }: { onClose: () => void }) {
  const book = chronicleBook();
  const [chapterId, setChapterId] = useState(book.chapters[0]?.id ?? "");
  const [pageId, setPageId] = useState<string | null>(null);
  const chapter = book.chapters.find((item) => item.id === chapterId) ?? book.chapters[0];
  const flat = book.chapters.flatMap((item) => item.pages.map((page) => ({ chapterId: item.id, page })));
  const index = flat.findIndex((item) => item.page.id === pageId);
  const current = index >= 0 ? flat[index] : null;

  function openSlot(nextChapter: string, page: ShelfPage) {
    setChapterId(nextChapter);
    setPageId(page.id);
  }

  function step(dir: -1 | 1) {
    const next = flat[index + dir];
    if (!next) return;
    openSlot(next.chapterId, next.page);
  }

  return (
    <div className="absolute inset-0 z-50 flex bg-ink/55 p-2 sm:p-4" onClick={onClose}>
      <section
        className="story-leaf mx-auto flex h-full w-full max-w-lg flex-col overflow-hidden rounded-[1.6rem] border-4 border-ink text-left shadow-lg ring-4 ring-gold"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex shrink-0 items-center gap-3 px-4 pt-4">
          <img src={seal} alt="" className="size-14 shrink-0 object-contain drop-shadow-md" />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-extrabold tracking-[0.22em] text-bow">KNIHA O KOPIDLNĚ</p>
            <h2 className="font-display text-4xl leading-none">Kronika</h2>
            <p className="mt-1 font-display text-sm text-ink-soft">
              {book.total > 0 ? `${book.known} otevřených z ${book.total}` : "Zatím prázdné desky"}
            </p>
          </div>
          <button
            type="button"
            className="flex size-11 shrink-0 items-center justify-center rounded-full border-2 border-ink bg-gold text-ink"
            aria-label="Zavřít kroniku"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>
        <Flourish />

        {book.chapters.length > 0 && (
          <div className="flex shrink-0 gap-2 overflow-x-auto px-4 pb-1">
            {book.chapters.map((item) => {
              const active = item.id === chapter?.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={`shrink-0 border-2 border-ink px-3 py-1.5 font-display text-sm ${
                    active ? "bg-gold text-ink" : "bg-cream-deep/70 text-ink-soft"
                  }`}
                  onClick={() => {
                    setChapterId(item.id);
                    setPageId(null);
                  }}
                >
                  {item.name}
                  <span className="ml-1 text-xs font-extrabold">
                    {item.known}/{item.total}
                  </span>
                </button>
              );
            })}
          </div>
        )}

        <div className="mt-2 min-h-0 flex-1 overflow-y-auto px-4 pb-4">
          {!current && chapter && (
            <ul className="flex flex-col">
              {chapter.pages.map((page) => (
                <li key={page.id} className="border-b border-ink/15">
                  <button
                    type="button"
                    className="flex min-h-14 w-full items-center gap-3 py-2 text-left"
                    onClick={() => openSlot(chapter.id, page)}
                  >
                    {page.open ? (
                      <>
                        <span className="font-display text-2xl leading-none text-bow" aria-hidden="true">
                          {page.title.slice(0, 1)}
                        </span>
                        <span className="min-w-0">
                          <span className="block font-display text-lg leading-tight">{page.title}</span>
                          <span className="block text-xs font-extrabold text-ink-soft">{page.on}</span>
                        </span>
                      </>
                    ) : (
                      <>
                        <img src={seal} alt="" className="size-9 shrink-0 object-contain opacity-70" />
                        <span className="font-display text-lg text-ink-soft">Zapečetěno</span>
                      </>
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {current && !current.page.open && (
            <div className="flex min-h-56 flex-col items-center justify-center px-4 text-center">
              <img src={seal} alt="" className="h-36 w-auto object-contain drop-shadow-md" />
              <p className="mt-3 font-display text-4xl leading-none">Zapečetěno</p>
              <p className="mt-2 max-w-xs text-sm leading-relaxed text-ink-soft">
                Pečeť se zlomí, až Drběna najde další pergamen.
              </p>
            </div>
          )}

          {current?.page.open && <PageReading page={current.page} />}
        </div>

        {current && (
          <div className="grid shrink-0 grid-cols-3 gap-2 border-t-2 border-gold/70 bg-cream-deep/50 px-3 py-3">
            <button
              type="button"
              className="flex h-12 items-center justify-center gap-1 rounded-full border-2 border-ink bg-cream font-display disabled:opacity-35"
              aria-label="Předchozí stránka"
              disabled={index <= 0}
              onClick={() => step(-1)}
            >
              <ChevronLeft className="size-5" />
              zpět
            </button>
            <button
              type="button"
              className="flex h-12 items-center justify-center rounded-full border-2 border-ink bg-gold font-display"
              onClick={() => setPageId(null)}
            >
              obsah
            </button>
            <button
              type="button"
              className="flex h-12 items-center justify-center gap-1 rounded-full border-2 border-ink bg-cream font-display disabled:opacity-35"
              aria-label="Další stránka"
              disabled={index < 0 || index >= flat.length - 1}
              onClick={() => step(1)}
            >
              dál
              <ChevronRight className="size-5" />
            </button>
          </div>
        )}
      </section>
    </div>
  );
}

function Flourish() {
  return (
    <div className="mx-4 my-3 flex items-center gap-3" aria-hidden="true">
      <span className="h-px flex-1 bg-gold" />
      <span className="size-2 rotate-45 border-2 border-gold bg-bow" />
      <span className="h-px flex-1 bg-gold" />
    </div>
  );
}

function PageReading({ page }: { page: Extract<ShelfPage, { open: true }> }) {
  const body = page.page;
  return (
    <article>
      <p className="text-xs font-extrabold tracking-[0.18em] text-bow">{page.on}</p>
      <h3 className="mt-1 font-display text-4xl leading-none">{body.title}</h3>
      <Flourish />
      {body.intro && <DropLead text={body.intro} />}
      {body.paragraphs.map((paragraph, index) => (
        <p key={index} className="mt-3 font-display text-lg leading-relaxed">
          {paragraph}
        </p>
      ))}
      {body.curiosities.length > 0 && (
        <section className="mt-5 rounded-2xl border-2 border-gold/80 bg-cream/70 px-3 py-3">
          <h4 className="font-display text-xl leading-none text-bow">Zajímavosti</h4>
          <ul className="mt-2 flex flex-col gap-2">
            {body.curiosities.map((item, index) => (
              <li key={index} className="text-sm leading-relaxed">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
      {body.sources.length > 0 && (
        <section className="mt-5">
          <h4 className="text-xs font-extrabold tracking-[0.18em] text-bow">ZDROJE</h4>
          <ul className="mt-2 flex flex-col gap-2">
            {body.sources.map((item, index) => (
              <li key={index} className="text-sm leading-relaxed text-ink-soft">
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
      {body.link && (
        <a
          href={body.link.href}
          target="_blank"
          rel="noreferrer"
          className="mt-5 inline-block font-display text-lg text-bow underline decoration-gold decoration-2 underline-offset-4"
        >
          {body.link.label}
        </a>
      )}
    </article>
  );
}

function DropLead({ text }: { text: string }) {
  const first = text.slice(0, 1);
  const rest = text.slice(1);
  if (!first || first === " ") {
    return <p className="text-base leading-relaxed">{text}</p>;
  }
  return (
    <p className="text-base leading-relaxed">
      <span className="float-left mr-2 mt-1 font-display text-5xl leading-[0.75] text-bow">{first}</span>
      {rest}
    </p>
  );
}
