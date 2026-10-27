import { useState } from "react";
import { Check, Dices, Pencil, Plus, Trash2, X } from "lucide-react";
import { NicknameField } from "@/game/NicknameField";
import { randomName } from "@/game/names";
import { MAX_PROFILES, type Profiles } from "@/game/profiles";

type Props = {
  profiles: Profiles;
  onSelect: (id: string) => void;
  onRename: (id: string, name: string) => void;
  onAdd: (name: string) => void;
  onRemove: (id: string) => void;
  onClose: () => void;
};

type Editing = { id: string; draft: string } | null;

/** "Kdo hraje?": players sharing this device, each with their own nickname and record (src/game/profiles.ts). */
export function PlayersSheet({ profiles, onSelect, onRename, onAdd, onRemove, onClose }: Props) {
  const [editing, setEditing] = useState<Editing>(null);
  const [removing, setRemoving] = useState("");
  const taken = (name: string, except = "") =>
    profiles.list.some((p) => p.id !== except && p.name.toLocaleLowerCase("cs") === name.trim().toLocaleLowerCase("cs"));

  function save() {
    if (!editing) return;
    const name = editing.draft.trim();
    if (name && taken(name, editing.id)) return;
    if (editing.id === "new") onAdd(name);
    else onRename(editing.id, name);
    setEditing(null);
  }

  const clash = editing ? taken(editing.draft, editing.id) : false;
  const editor = (label: string) => (
    <div className="mt-2">
      <div className="flex gap-2">
        <NicknameField
          value={editing?.draft ?? ""}
          label={label}
          placeholder="Přezdívka"
          className="h-11 min-w-0 flex-1 py-2.5"
          onChange={(draft) => setEditing((current) => (current ? { ...current, draft } : current))}
          onEnter={save}
        />
        <button
          type="button"
          aria-label="Vymyslet jiné jméno"
          title="Vymyslet jiné jméno"
          className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-gold"
          onClick={() => setEditing((current) => (current ? { ...current, draft: randomName() } : current))}
        >
          <Dices className="size-5" />
        </button>
      </div>
      {clash && <p className="mt-1 text-xs font-extrabold text-bow-deep">Tuhle přezdívku už tu někdo má.</p>}
      <div className="mt-2 flex gap-2">
        <button
          type="button"
          disabled={clash}
          className="flex h-10 flex-1 items-center justify-center gap-1.5 rounded-xl border-2 border-ink bg-bow font-extrabold text-cream disabled:opacity-50"
          onClick={save}
        >
          <Check className="size-4" /> {editing?.id === "new" ? "Přidat a vybrat" : "Uložit"}
        </button>
        <button type="button" className="h-10 rounded-xl border-2 border-ink bg-cream-deep px-4 font-extrabold" onClick={() => setEditing(null)}>
          Zrušit
        </button>
      </div>
    </div>
  );

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-ink/55 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Kdo hraje?"
        className="menu-pop max-h-full w-full max-w-sm overflow-y-auto rounded-[1.75rem] border-2 border-ink bg-cream p-5 shadow-[0_6px_0_#241c16]"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between">
          <h2 className="font-display text-2xl">Kdo hraje?</h2>
          <button
            type="button"
            aria-label="Zavřít"
            className="flex size-9 items-center justify-center rounded-full border-2 border-ink bg-cream-deep"
            onClick={onClose}
          >
            <X className="size-5" />
          </button>
        </div>
        <p className="mt-1 text-sm font-extrabold text-ink-soft">Každý hráč na tomhle zařízení má svůj rekord i řádek v žebříčku.</p>

        <ul className="mt-4 space-y-2">
          {profiles.list.map((player) => {
            const selected = player.id === profiles.current;
            if (editing?.id === player.id) return <li key={player.id}>{editor(`Nová přezdívka pro ${player.name}`)}</li>;
            if (removing === player.id) {
              return (
                <li key={player.id} className="rounded-xl border-2 border-bow bg-cream-deep/70 p-3">
                  <p className="text-sm font-extrabold">
                    Odebrat {player.name} z tohohle zařízení? Výsledky v žebříčku zůstanou, rekord na zařízení zmizí.
                  </p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      className="h-10 flex-1 rounded-xl border-2 border-ink bg-bow font-extrabold text-cream"
                      onClick={() => {
                        onRemove(player.id);
                        setRemoving("");
                      }}
                    >
                      Odebrat
                    </button>
                    <button type="button" className="h-10 rounded-xl border-2 border-ink bg-cream px-4 font-extrabold" onClick={() => setRemoving("")}>
                      Nechat
                    </button>
                  </div>
                </li>
              );
            }
            return (
              <li key={player.id} className={`flex items-center gap-2 rounded-xl border-2 p-1.5 ${selected ? "border-bow bg-bow/10" : "border-ink/15 bg-cream-deep/60"}`}>
                <button
                  type="button"
                  aria-pressed={selected}
                  className="flex min-w-0 flex-1 items-center gap-2 rounded-lg px-2 py-1.5 text-left"
                  onClick={() => onSelect(player.id)}
                >
                  <span className={`flex size-6 shrink-0 items-center justify-center rounded-full border-2 ${selected ? "border-bow bg-bow text-cream" : "border-ink/30"}`}>
                    {selected && <Check className="size-4" />}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-extrabold">{player.name}</span>
                    <span className="block text-xs font-extrabold text-ink-soft">{player.best ? `Rekord ${player.best}` : "Zatím bez rekordu"}</span>
                  </span>
                </button>
                <button
                  type="button"
                  aria-label={`Přejmenovat ${player.name}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-cream"
                  onClick={() => {
                    setRemoving("");
                    setEditing({ id: player.id, draft: player.name });
                  }}
                >
                  <Pencil className="size-4" />
                </button>
                <button
                  type="button"
                  aria-label={`Odebrat ${player.name}`}
                  className="flex size-9 shrink-0 items-center justify-center rounded-lg text-ink-soft hover:bg-cream"
                  onClick={() => {
                    setEditing(null);
                    setRemoving(player.id);
                  }}
                >
                  <Trash2 className="size-4" />
                </button>
              </li>
            );
          })}
        </ul>

        {editing?.id === "new" ? (
          editor("Přezdívka nového hráče")
        ) : profiles.list.length < MAX_PROFILES ? (
          <button
            type="button"
            className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/40 font-extrabold text-ink-soft hover:border-ink hover:text-ink"
            onClick={() => {
              setRemoving("");
              setEditing({ id: "new", draft: randomName() });
            }}
          >
            <Plus className="size-4" /> Přidat hráče
          </button>
        ) : (
          <p className="mt-3 text-center text-xs font-extrabold text-ink-soft">Na jednom zařízení může být nejvýš {MAX_PROFILES} hráčů.</p>
        )}
      </div>
    </div>
  );
}
