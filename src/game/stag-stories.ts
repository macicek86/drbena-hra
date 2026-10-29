/**
 * Pohádková setkání Drběny s bílým jelenem. Nejde o historické svědectví ani
 * o doloženou konkrétní pověst; jde o původní dialogy zasazené do herní obory.
 */
export type StagLine = { speaker: "Drběna" | "Bílý jelen"; text: string };
export type StagStory = { id: string; title: string; lines: readonly StagLine[] };

export const STAG_STORIES: readonly StagStory[] = [
  {
    id: "prvni-setkani",
    title: "První setkání",
    lines: [
      { speaker: "Drběna", text: "Méé! Bílý jelen! Drběna si myslela, že takoví žijí jen v pověstech!" },
      { speaker: "Bílý jelen", text: "Pověsti se někdy ukážou těm, kdo se umějí dobře dívat." },
      { speaker: "Drběna", text: "O bílém jelenovi se říká, že přináší štěstí. Je to pravda?" },
      { speaker: "Bílý jelen", text: "Tak se vypráví. Ale štěstí se nedá chytit ani schovat za plot." },
      { speaker: "Drběna", text: "A nedalo by se aspoň zapsat do kroniky? Drběna by měla opravdu vzácný příběh!" },
      { speaker: "Bílý jelen", text: "Zapiš, co jsi viděla. A nezapomeň odlišit pravdu od toho, co se jen povídá." },
      { speaker: "Drběna", text: "To Drběna umí! V Kopidlně a okolních vesnicích je příběh na každém rohu." },
      { speaker: "Bílý jelen", text: "Tak běž dál. Některá tajemství čekají hned za dalším stromem." },
      { speaker: "Drběna", text: "Mééj se, bílý jelene! A díky za drb, který vlastně není drb!" },
    ],
  },
  {
    id: "stary-dub",
    title: "Tajemství starého dubu",
    lines: [
      { speaker: "Drběna", text: "Drběna tě zase našla! Proč se držíš právě toho mohutného dubu?" },
      { speaker: "Bílý jelen", text: "Stojí tu dlouho. Pamatuje vítr, déšť i kroky těch, kdo šli kolem." },
      { speaker: "Drběna", text: "Takže ví úplně všechno? Drběna by ho potřebovala jako dopisovatele!" },
      { speaker: "Bílý jelen", text: "Strom nemluví. Přesto se u něj lidé často rozpomenou na staré příběhy." },
      { speaker: "Drběna", text: "Drběna si jeden zapíše. A na oplátku mu nesní ani lístek. Skoro." },
      { speaker: "Bílý jelen", text: "To je od tebe na kozu velký slib." },
    ],
  },
  {
    id: "ztracene-stopy",
    title: "Stopy v trávě",
    lines: [
      { speaker: "Drběna", text: "Drběna sledovala tvoje stopy. Pak najednou zmizely. Umíš létat?" },
      { speaker: "Bílý jelen", text: "Ne. Jen chodím tišeji, než se díváš." },
      { speaker: "Drběna", text: "To je nespravedlivé! Drběnu prozradí i jediný krok po kamínku." },
      { speaker: "Bílý jelen", text: "Když spěcháš za každou stopou, přehlédneš cestu kolem sebe." },
      { speaker: "Drběna", text: "Takže příště pomaleji? To se jí bude těžko vysvětlovat jejím kopýtkům." },
      { speaker: "Bílý jelen", text: "Nemusíš běžet pomalu. Stačí se někdy zastavit." },
    ],
  },
  {
    id: "odraz",
    title: "Co ukáže hladina",
    lines: [
      { speaker: "Drběna", text: "Jelen prý zná všechna tajemství obory. Viděl i rybník Zrcadlo?" },
      { speaker: "Bílý jelen", text: "Voda umí ukázat oblohu i tvář toho, kdo se nad ni nakloní." },
      { speaker: "Drběna", text: "Drběna se naklonila. Uviděla rohy. To tedy bylo překvapení!" },
      { speaker: "Bílý jelen", text: "Některé odpovědi máme celou dobu přímo před očima." },
      { speaker: "Drběna", text: "A některé se schovávají pod hladinou. Tam má ale Drběna svou známou rybu!" },
      { speaker: "Bílý jelen", text: "Pak víš, že každý vypráví příběh po svém." },
    ],
  },
  {
    id: "stesti",
    title: "Komu patří štěstí",
    lines: [
      { speaker: "Drběna", text: "Drběna má důležitou otázku. Když tě zahlédne celé Kopidlno, bude mít štěstí každý?" },
      { speaker: "Bílý jelen", text: "O setkání s bílým jelenem se vyprávějí všelijaké věci." },
      { speaker: "Drběna", text: "Takže žádné jisté štěstí? Drběna už chtěla svolat celé náměstí!" },
      { speaker: "Bílý jelen", text: "Možná je štěstí už to, že máš s kým sdílet pěkný okamžik." },
      { speaker: "Drběna", text: "To by fungovalo. Drběna má sousedů dost. A drbů ještě víc!" },
      { speaker: "Bílý jelen", text: "Jen ten pěkný okamžik neproměň v nepěkný drb." },
    ],
  },
  {
    id: "pribeh-obory",
    title: "Příběh, který pokračuje",
    lines: [
      { speaker: "Drběna", text: "Už jsme si tolikrát povídali. A co je tedy největší tajemství obory?" },
      { speaker: "Bílý jelen", text: "Že nikdy neznáš všechny její příběhy. Každý den může začít nový." },
      { speaker: "Drběna", text: "Takže poslední stránka kroniky nikdy nebude opravdu poslední?" },
      { speaker: "Bílý jelen", text: "Dokud se někdo ptá a někdo vzpomíná, příběhy nekončí." },
      { speaker: "Drběna", text: "Pak má Drběna pořád co dělat. A občas se staví na kus řeči!" },
      { speaker: "Bílý jelen", text: "Budu naslouchat. Ale další příběh už musíš objevit sama." },
    ],
  },
];

const SMALL_TALK: readonly StagStory[] = [
  {
    id: "listi",
    title: "Kozí svačina",
    lines: [
      { speaker: "Drběna", text: "Drběna si tentokrát přišla jen popovídat. A možná ochutnat dubový lístek." },
      { speaker: "Bílý jelen", text: "Povídat si můžeš. Listí nech dubu." },
      { speaker: "Drběna", text: "Tak dobře. Drběna si dá raději něco, co neroste nad hlavou." },
    ],
  },
  {
    id: "ticho",
    title: "Nejtišší drb",
    lines: [
      { speaker: "Drběna", text: "Drběna má nový drb! V oboře je dneska nějaké podezřelé ticho." },
      { speaker: "Bílý jelen", text: "To je tím, že všichni poslouchají, co budeš říkat." },
      { speaker: "Drběna", text: "Méé! To je velká odpovědnost. Radši chvíli pomlčí." },
    ],
  },
  {
    id: "rohy",
    title: "Rohy a parohy",
    lines: [
      { speaker: "Drběna", text: "Drběna má rohy a ty parohy. Kdo má větší starosti s nízkými dveřmi?" },
      { speaker: "Bílý jelen", text: "V oboře si raději vybírám cesty bez dveří." },
      { speaker: "Drběna", text: "Chytré. Drběna to zkusí i v Kopidlně. Přes plot to ale nepůjde." },
    ],
  },
  {
    id: "kronika",
    title: "Nedopsaná kronika",
    lines: [
      { speaker: "Drběna", text: "Drběna už našla tolik příběhů, že jí kronika skoro nestačí!" },
      { speaker: "Bílý jelen", text: "To nevadí. Důležité je, aby v ní zůstalo místo i pro další." },
      { speaker: "Drběna", text: "A taky místo pro záložku. Nejlépe nejedlou." },
    ],
  },
  {
    id: "potkani",
    title: "Starý známý",
    lines: [
      { speaker: "Drběna", text: "Zase ty? Drběna začíná mít podezření, že ji sleduješ." },
      { speaker: "Bílý jelen", text: "Spíš se pořád potkáváme na stejných cestách." },
      { speaker: "Drběna", text: "To dává smysl. V Kopidlně se taky každý nakonec potká u plotu!" },
    ],
  },
  {
    id: "srdce",
    title: "Cesta k Pševsi",
    lines: [
      { speaker: "Drběna", text: "Drběna viděla v Pševsi lipovou alej a kamenné srdce. Pěkná práce!" },
      { speaker: "Bílý jelen", text: "Některá místa jsou vzácná tím, že na nich lidem záleží." },
      { speaker: "Drběna", text: "Tohle si Drběna zapamatuje. A žádný lístek z aleje neukousne!" },
    ],
  },
  {
    id: "radnice",
    title: "Kozel ve štítu",
    lines: [
      { speaker: "Drběna", text: "Na kopidlenské radnici má Drběna příbuzného. Kozla, přímo ve štítu!" },
      { speaker: "Bílý jelen", text: "Tak to je v rodině slavnější než já. Mě nikdo do znaku nedal." },
      { speaker: "Drběna", text: "Neboj, Drběna o tobě aspoň poví celému Kopidlnu." },
    ],
  },
  {
    id: "ryba",
    title: "Zpráva od rybníka",
    lines: [
      { speaker: "Drběna", text: "Ryba ze zámeckého rybníka tě pozdravuje. Prý víš, proč." },
      { speaker: "Bílý jelen", text: "Jednou jsem se nad ní napil a ona mi celou dobu vyprávěla o kaprech." },
      { speaker: "Drběna", text: "To je celá ona. Drběna má konkurenci i pod vodou!" },
    ],
  },
  {
    id: "rano",
    title: "Ranní mlha",
    lines: [
      { speaker: "Bílý jelen", text: "Ráno, když leží nad oborou mlha, vypadá všechno jako z pohádky." },
      { speaker: "Drběna", text: "Ráno Drběna spí. Ale zítra si přivstane. Možná. Spíš ne." },
    ],
  },
  {
    id: "jablka",
    title: "Jablka z Drahorazi",
    lines: [
      { speaker: "Drběna", text: "Neviděl jsi tu košík jablek? Drběna se ptá jen tak, ze zvědavosti." },
      { speaker: "Bílý jelen", text: "Ten, co jsi v Drahorazi převrhla? Ten už si odnesli zpátky." },
      { speaker: "Drběna", text: "Škoda. Tedy, chtěla jsem říct: to je dobře!" },
    ],
  },
  {
    id: "hvezdy",
    title: "Hvězdy nad oborou",
    lines: [
      { speaker: "Bílý jelen", text: "V noci je nad oborou vidět víc hvězd než nad náměstím." },
      { speaker: "Drběna", text: "Drběna je počítala. Došla do tří a pak jí jedna mrkla a musela začít znovu." },
    ],
  },
  {
    id: "slovo",
    title: "Na slovíčko",
    lines: [
      { speaker: "Drběna", text: "Mám pro tebe drb. Ale nesmíš ho nikomu říct!" },
      { speaker: "Bílý jelen", text: "Komu bych ho tady v oboře říkal? Snad jen stromům." },
      { speaker: "Drběna", text: "No právě. Stromy jsou ty nejhorší drbny. Šumí o všem!" },
    ],
  },
];

/** První setkání mají návazný děj; pak se opakují krátká, různá povídání. */
export function stagStoryFor(completedMeetings: number): StagStory {
  const n = Math.max(0, Math.floor(Number.isFinite(completedMeetings) ? completedMeetings : 0));
  if (n < STAG_STORIES.length) return STAG_STORIES[n]!;
  return SMALL_TALK[(n - STAG_STORIES.length) % SMALL_TALK.length]!;
}
