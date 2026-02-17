export interface PostTemplate {
  id: string;
  name: string;
  description: string;
  icon: string;
  hook: string;
  content: string;
  cta: string;
}

export const TEMPLATES: PostTemplate[] = [
  {
    id: "empty",
    name: "Leerer Post",
    description: "Alle Felder zurücksetzen",
    icon: "📝",
    hook: "",
    content: "",
    cta: "",
  },
  {
    id: "aida",
    name: "AIDA",
    description: "Attention → Interest → Desire → Action",
    icon: "🎯",
    hook: "Wusstest du, dass [überraschende Statistik/Fakt]?\n\nDie meisten [Zielgruppe] übersehen das komplett.",
    content: "Hier ist, warum das wichtig ist:\n\n[Fakt erklären und Relevanz aufzeigen]\n\nStell dir vor, du könntest [Wunschergebnis].\n\nGenau das habe ich in den letzten [Zeitraum] erreicht, indem ich [Methode/Ansatz] angewendet habe.\n\nDas Ergebnis?\n→ [Ergebnis 1]\n→ [Ergebnis 2]\n→ [Ergebnis 3]",
    cta: "Willst du wissen, wie du das auch schaffst?\n\nKommentiere \"JA\" und ich schicke dir [Ressource].",
  },
  {
    id: "pas",
    name: "PAS",
    description: "Problem → Agitate → Solve",
    icon: "🔥",
    hook: "[Problem beschreiben] ist der Grund, warum [Zielgruppe] nicht [gewünschtes Ergebnis] erreicht.",
    content: "Und das Schlimmste daran?\n\nJe länger du wartest, desto [negative Konsequenz].\n\nIch habe das selbst erlebt:\n• [Persönliche Erfahrung]\n• [Konsequenz]\n• [Wendepunkt]\n\nDie Lösung ist einfacher als du denkst:\n\n1. [Schritt 1]\n2. [Schritt 2]\n3. [Schritt 3]\n\nSeit ich das umgesetzt habe, ist [positives Ergebnis].",
    cta: "Was ist deine größte Herausforderung mit [Thema]?\n\nTeile es in den Kommentaren 👇",
  },
  {
    id: "storytelling",
    name: "Storytelling",
    description: "Situation → Wendepunkt → Erkenntnis",
    icon: "📖",
    hook: "Vor [Zeitraum] stand ich vor einer Entscheidung, die alles verändert hat.",
    content: "Die Situation:\n[Ausgangslage beschreiben]\n\nIch hatte zwei Optionen:\na) [Sichere Option]\nb) [Riskante Option]\n\nIch habe mich für b) entschieden.\n\nUnd dann passierte etwas Unerwartetes:\n[Wendepunkt beschreiben]\n\nDie wichtigste Lektion, die ich daraus gelernt habe:\n\n[Erkenntnis in einem Satz]\n\nHeute weiß ich: [Abschlussgedanke]",
    cta: "Was war die mutigste Entscheidung in deiner Karriere?\n\n♻️ Reposte das, wenn es dir hilft.",
  },
  {
    id: "listicle",
    name: "Listicle",
    description: "Nummerierte Liste mit starkem Hook",
    icon: "📋",
    hook: "[Zahl] Dinge, die ich gerne gewusst hätte, bevor ich [Tätigkeit/Rolle] gestartet habe:",
    content: "1. [Punkt 1]\n→ [Kurze Erklärung]\n\n2. [Punkt 2]\n→ [Kurze Erklärung]\n\n3. [Punkt 3]\n→ [Kurze Erklärung]\n\n4. [Punkt 4]\n→ [Kurze Erklärung]\n\n5. [Punkt 5]\n→ [Kurze Erklärung]\n\nNummer [X] hat den größten Unterschied gemacht.",
    cta: "Welchen Punkt würdest du hinzufügen?\n\nSpeichere diesen Post für später 🔖",
  },
  {
    id: "controversial",
    name: "Kontroverse These",
    description: "Provokante These → Begründung → Diskussion",
    icon: "⚡",
    hook: "Unpopuläre Meinung: [Kontroverse These].\n\nUnd ich stehe dazu.",
    content: "Warum?\n\nWeil [Begründung 1].\n\nDie meisten [Zielgruppe] glauben, dass [verbreitete Annahme].\n\nAber die Realität sieht anders aus:\n\n• [Gegenargument 1]\n• [Gegenargument 2]\n• [Gegenargument 3]\n\nIch sage nicht, dass [Einschränkung].\n\nAber ich sage: [Kernbotschaft nochmal auf den Punkt].",
    cta: "Stimmt ihr mir zu oder liege ich falsch?\n\nIch bin gespannt auf eure Meinung 👇",
  },
  {
    id: "experience",
    name: "Erfahrungsbericht",
    description: "Vorher → Nachher → Lektion",
    icon: "🔄",
    hook: "Vor [Zeitraum]: [Vorher-Zustand]\nHeute: [Nachher-Zustand]\n\nWas dazwischen passiert ist:",
    content: "Die Ausgangssituation:\n[Detaillierte Beschreibung des Vorher]\n\nDer Wendepunkt kam, als [Auslöser].\n\nWas ich verändert habe:\n✓ [Veränderung 1]\n✓ [Veränderung 2]\n✓ [Veränderung 3]\n\nDas Ergebnis nach [Zeitraum]:\n→ [Messbares Ergebnis 1]\n→ [Messbares Ergebnis 2]\n\nDie wichtigste Erkenntnis:",
    cta: "Wer steht gerade vor einer ähnlichen Situation?\n\nSchreib mir eine Nachricht – ich helfe gerne.",
  },
  {
    id: "howto",
    name: "How-To",
    description: "Problem → Schritte → Ergebnis",
    icon: "🛠️",
    hook: "So [erreichst du Ergebnis] in [Zeitraum] – Schritt für Schritt:",
    content: "Das Problem:\n[Warum scheitern die meisten daran?]\n\nDie Lösung in [Zahl] Schritten:\n\n𝗦𝗰𝗵𝗿𝗶𝘁𝘁 𝟭: [Titel]\n[Beschreibung]\n\n𝗦𝗰𝗵𝗿𝗶𝘁𝘁 𝟮: [Titel]\n[Beschreibung]\n\n𝗦𝗰𝗵𝗿𝗶𝘁𝘁 𝟯: [Titel]\n[Beschreibung]\n\nProfi-Tipp: [Zusätzlicher Tipp]",
    cta: "Speichere dir diesen Post und setze es diese Woche um.\n\nWelchen Schritt startest du zuerst? 👇",
  },
];
