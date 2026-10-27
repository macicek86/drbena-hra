import { useState } from "react";
import { Dices, Play, Plus, Settings2 } from "lucide-react";
import { NicknameField } from "@/game/NicknameField";
import { randomName } from "@/game/names";
import { MAX_PROFILES, type Profiles } from "@/game/profiles";

type Props = {
  profiles: Profiles;
  /** Tap on a player: select them and start the game. */
  onPlay: (id: string) => void;
  /** New player from here: add, select and start. */
  onAddAndPlay: (name: string) => void;
  /** Rename or remove players: the full "Kdo hraje?" manager. */
  onManage: () => void;
  onClose: () => void;
};

/**
 * Quick "Kdo hraje?" shown before every game started from the main menu. One tap on a name starts the game as
 * that player, so a shared phone never credits a score to whoever played last, and a newcomer sees they can join.
 */
export function WhoPlays({ profiles, onPlay, onAddAndPlay, onManage, onClose }: Props) {
  const [adding, setAdding] = useState<string | null>(null);
  const taken = (name: string) => profiles.list.some((p) => p.name.toLocaleLowerCase("cs") === name.trim().toLocaleLowerCase("cs"));
  const clash = adding !== null && adding.trim() !== "" && taken(adding);
  // Last selected player first: the usual player is one tap away at the top.
  const ordered = [...profiles.list].sort((a, b) => Number(b.id === profiles.current) - Number(a.id === profiles.current));

  function add() {
    if (adding === null || clash) return;
    onAddAndPlay(adding);
  }

  return (
    <div className="absolute inset-0 z-30 flex items-end justify-center bg-ink/55 p-3 pb-[calc(0.75rem+env(safe-area-inset-bottom,0px))] backdrop-blur-sm sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-label="Kdo hraje?"
        className="menu-pop max-h-full w-full max-w-sm overflow-y-auto rounded-[1.75rem] border-2 border-ink bg-cream p-5 text-center shadow-[0_6px_0_#241c16]"
        onClick={(event) => event.stopPropagation()}
      >
        <h2 className="font-display text-2xl">Kdo hraje?</h2>
        <p className="mt-1 text-sm font-extrabold text-ink-soft">Klepni na sebe a jde se na to.</p>

        <ul className="mt-4 space-y-2">
          {ordered.map((player) => (
            <li key={player.id}>
              <button
                type="button"
                className="flex w-full items-center gap-3 rounded-xl border-2 border-ink bg-cream-deep/60 px-4 py-3 text-left shadow-[0_3px_0_#241c16] transition-transform hover:bg-bow/10 active:translate-y-[3px] active:shadow-none"
                onClick={() => onPlay(player.id)}
              >
                <span className="flex size-9 shrink-0 items-center justify-center rounded-full bg-bow text-cream">
                  <Play className="size-4 translate-x-px fill-current" aria-hidden="true" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-lg font-extrabold leading-tight">{player.name}</span>
                  <span className="block text-xs font-extrabold text-ink-soft">{player.best ? `Rekord ${player.best}` : "Zatím bez rekordu"}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>

        {adding !== null ? (
          <div className="mt-3 text-left">
            <div className="flex gap-2">
              <NicknameField
                value={adding}
                label="Přezdívka nového hráče"
                placeholder="Přezdívka"
                className="h-11 min-w-0 flex-1 py-2.5"
                onChange={setAdding}
                onEnter={add}
              />
              <button
                type="button"
                aria-label="Vymyslet jiné jméno"
                title="Vymyslet jiné jméno"
                className="flex size-11 shrink-0 items-center justify-center rounded-xl border-2 border-ink bg-gold"
                onClick={() => setAdding(randomName())}
              >
                <Dices className="size-5" />
              </button>
            </div>
            {clash && <p className="mt-1 text-xs font-extrabold text-bow-deep">Tuhle přezdívku už tu někdo má.</p>}
            <button
              type="button"
              disabled={clash}
              className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-ink bg-bow font-extrabold text-cream disabled:opacity-50"
              onClick={add}
            >
              <Play className="size-4 fill-current" /> Přidat a hrát
            </button>
          </div>
        ) : (
          profiles.list.length < MAX_PROFILES && (
            <button
              type="button"
              className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-ink/40 font-extrabold text-ink-soft hover:border-ink hover:text-ink"
              onClick={() => setAdding(randomName())}
            >
              <Plus className="size-4" /> Přidat hráče
            </button>
          )
        )}

        <button
          type="button"
          className="mx-auto mt-3 flex items-center gap-1.5 text-xs font-extrabold text-ink-soft underline-offset-2 hover:underline"
          onClick={onManage}
        >
          <Settings2 className="size-3.5" /> Přejmenovat nebo odebrat hráče
        </button>
      </div>
    </div>
  );
}
