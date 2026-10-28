import React, { useState } from "react";
import { createRoot } from "react-dom/client";
import { BookOpen, RotateCcw, Share2 } from "lucide-react";
import { FitOverlay } from "../src/game/FitOverlay";
import { UntangleCard } from "../src/game/UntangleCard";
import "../src/styles.css";

function Fixture() {
  const [mode, setMode] = useState<"over" | "bonus">("over");
  const [rows, setRows] = useState(5);
  const [bonusStage, setBonusStage] = useState<"play" | "done" | "offer">("play");
  return (
    <div className="relative h-dvh w-full bg-day font-sans">
      <div className="absolute right-1 top-1 z-40 flex gap-2">
        <button type="button" className="bg-white p-1" data-testid="switch-mode" onClick={() => setMode(mode === "over" ? "bonus" : "over")}>Přepnout</button>
        <button type="button" className="bg-white p-1" data-testid="add-row" onClick={() => setRows(Math.min(10, rows + 1))}>Více</button>
        <button type="button" className="bg-white p-1" data-testid="switch-bonus-stage" onClick={() => setBonusStage(bonusStage === "play" ? "done" : bonusStage === "done" ? "offer" : "play")}>Fáze</button>
      </div>
      <FitOverlay testId={mode} fitKey={`${mode}:${rows}:${bonusStage}`} className="bg-ink/35">
        {mode === "over" ? (
          <section className="w-full max-w-sm rounded-3xl border-2 border-ink bg-cream p-6 text-center" data-testid="actual-panel">
            <p className="text-sm font-extrabold text-bow">Příhoda</p>
            <h2 className="mt-1 whitespace-nowrap font-display text-[clamp(1rem,5vw,1.625rem)] leading-none">Drběna se nevzdává!</h2>
            <p className="mt-2 text-ink-soft">Drběna se protáhla kolem plotu, ale husa už ji dneska nepustila dál.</p>
            <p className="mt-4 font-display text-5xl leading-none">12540</p>
            <p className="mt-1 font-extrabold">86 drbů · nový rekord</p>
            <div className="mt-3 rounded-2xl border-2 border-gold bg-cream-deep/70 p-3 text-left">
              <div className="flex items-center gap-2">
                <BookOpen className="size-6 shrink-0 text-bow" aria-hidden="true"/>
                <p className="font-display text-lg leading-tight">Drběna našla 3 nové příběhy!</p>
              </div>
              <p className="mt-1 text-sm font-extrabold text-ink-soft">Už znáš 28 z 60 příběhů Kopidlna.</p>
              <button type="button" className="mt-2 flex h-11 w-full items-center justify-center gap-2 rounded-full border-2 border-ink bg-gold font-extrabold">Prohlédnout nové příběhy</button>
            </div>
            <p className="mt-2 text-sm font-extrabold text-ink-soft">Hrálo už 253 sousedů</p>
            <ol className="mt-3 text-left text-sm font-extrabold">
              {Array.from({length:rows},(_,i)=><li key={i} className="flex justify-between gap-3"><span>{i+1}. Hráč {i+1}</span><span>{13000-i*400}</span></li>)}
            </ol>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-ink bg-bow font-extrabold text-cream"><RotateCcw className="size-4" />Znovu</button>
              <button type="button" className="flex h-12 items-center justify-center gap-2 rounded-full border-2 border-ink bg-cream font-extrabold"><Share2 className="size-4" />Sdílet</button>
            </div>
            <a href="https://www.kopidlenskadrbna.org" className="mt-4 inline-block text-sm font-extrabold text-bow underline">www.kopidlenskadrbna.org</a>
          </section>
        ) : (
          <UntangleCard
            bonus={{
              stage: bonusStage,
              id: "untangle",
              title: "Rozpleť drb!",
              prompt: "Drběno! Mám drb tak zamotaný, že se mi do něj chytily vlastní ploutve! Pomůžeš?",
              cards: [
                "V Kopidlně stojí známá radnice na náměstí, " + "všichni to moc dobře vědí, ".repeat(Math.max(0, rows - 4)),
                "nad kterou se tyčí místní erb s kozlí hlavou, " + "tak prý to bylo odjakživa, ".repeat(Math.max(0, rows - 4)),
                "a Drběna tam má podle svých slov příbuzného!",
              ],
              picked: 1,
              wrong: rows > 5 ? "Bubliny moje! Takhle zamotaný drb jsem ještě neviděla!" : "",
              success: "Drběna tvrdí, že na radnici má příbuzného! A ryba se tomu pořád směje.",
              reward: 50,
            }}
            lives={3}
            gained={true}
            onAct={() => undefined}
          />
        )}
      </FitOverlay>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<Fixture />);
