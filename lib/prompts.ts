export interface PromptInput {
  templateName: string;
  templateDescription: string;
  templateHook: string;
  templateContent: string;
  templateCta: string;
  topic: string;
  documentText?: string;
  addressMode?: "du" | "sie";
  tone?: string;
}

const TEMPLATE_INSTRUCTIONS: Record<string, string> = {
  aida: "AIDA-Methode: Hook = Attention (ueberraschender Einstieg), Content = Interest + Desire (Relevanz aufzeigen, Wunsch wecken, Ergebnisse zeigen), CTA = Action (klare Handlungsaufforderung).",
  pas: "PAS-Methode: Hook = Problem (Schmerzpunkt benennen), Content = Agitate + Solve (Problem vertiefen, dann Loesung mit konkreten Schritten), CTA = Diskussionsfrage oder Handlungsaufforderung.",
  storytelling: "Storytelling: Hook = Neugier-Einstieg (Andeutung einer Veraenderung), Content = Situation + Wendepunkt + Erkenntnis (persoenliche Geschichte), CTA = Frage an die Community oder Repost-Aufforderung.",
  listicle: "Listicle: Hook = Zahl + Thema (z.B. '5 Dinge die...'), Content = Nummerierte Punkte mit kurzen Erklaerungen, CTA = Frage was die Leser ergaenzen wuerden.",
  controversial: "Kontroverse These: Hook = Provokante Aussage, Content = Begruendung mit Gegenargumenten zur gaengigen Meinung, CTA = Meinungsfrage an die Community.",
  experience: "Erfahrungsbericht: Hook = Vorher/Nachher-Kontrast, Content = Ausgangssituation + Wendepunkt + konkrete Veraenderungen + messbare Ergebnisse, CTA = Angebot zur Hilfe.",
  howto: "How-To: Hook = Ergebnis-Versprechen mit Zeitrahmen, Content = Problem benennen + Schritt-fuer-Schritt-Loesung + Profi-Tipp, CTA = Speichern-Aufforderung + Frage nach erstem Schritt.",
};

const TONE_INSTRUCTIONS: Record<string, string> = {
  professionell:
    "Schreibe sachlich, kompetent und serioes. Verwende Fachbegriffe wo passend. Sei praezise und fundiert. Keine Umgangssprache, keine uebertriebenen Emotionen.",
  inspirierend:
    "Schreibe motivierend und aufbauend. Teile Erkenntnisse, die zum Nachdenken anregen. Verwende bildhafte Sprache und positive Energie. Zeige Moeglichkeiten auf.",
  frech:
    "Schreibe provokant und unangepasst. Brich mit Erwartungen. Stelle unbequeme Fragen. Sei direkt, kantig und polarisierend -- aber immer mit Substanz hinter der Provokation.",
  clickbait:
    "Schreibe mit maximaler Neugier-Erzeugung. Verwende Zahlen, Superlative und Cliffhanger. Der Hook muss unwiderstehlich zum Weiterlesen animieren. Liefere dann aber echten Mehrwert im Content.",
  storyteller:
    "Schreibe wie ein Geschichtenerzaehler. Baue Spannung auf, nutze Wendepunkte und Emotionen. Ziehe den Leser in eine persoenliche Erzaehlung hinein. Schliesse mit einer klaren Lektion.",
  humorvoll:
    "Schreibe mit Witz und Selbstironie. Nutze ueberraschende Vergleiche, witzige Beobachtungen und lockere Sprache. Der Humor soll die Botschaft verstaerken, nicht ueberdecken.",
  analytisch:
    "Schreibe datengetrieben und faktenbasiert. Nutze Zahlen, Statistiken und logische Argumentationsketten. Strukturiere klar mit Aufzaehlungen. Jede Aussage muss belegbar klingen.",
  empathisch:
    "Schreibe mit Verstaendnis und Einfuehlungsvermoegen. Zeige, dass du die Herausforderungen deiner Zielgruppe verstehst. Verwende eine warme, unterstuetzende Sprache. Biete Hilfe an.",
  visionaer:
    "Schreibe zukunftsgerichtet und weitblickend. Male ein Bild davon, wie die Zukunft aussehen koennte. Verbinde aktuelle Trends mit langfristigen Entwicklungen. Inspiriere zum grossen Denken.",
  direkt:
    "Schreibe kurz, knapp und ohne Umschweife. Keine Floskel, kein Fuelltext. Jeder Satz muss sitzen. Sage klar was Sache ist -- auch wenn es unbequem ist. No-Bullshit-Mentalitaet.",
  motivierend:
    "Schreibe wie ein Coach der sein Team anfeuert. Verwende aktive Sprache, klare Handlungsaufforderungen und eine 'Du-schaffst-das'-Energie. Gib konkrete, umsetzbare Tipps.",
  thoughtleader:
    "Schreibe wie eine anerkannte Autoritaet auf deinem Gebiet. Teile einzigartige Perspektiven und Frameworks. Ordne aktuelle Entwicklungen ein. Zeige tiefes Verstaendnis und biete neue Denkansaetze.",
};

export const TONE_OPTIONS = [
  { id: "professionell", label: "Professionell" },
  { id: "inspirierend", label: "Inspirierend" },
  { id: "frech", label: "Frech / Provokant" },
  { id: "clickbait", label: "Clickbait" },
  { id: "storyteller", label: "Storyteller" },
  { id: "humorvoll", label: "Humorvoll" },
  { id: "analytisch", label: "Analytisch / Datengetrieben" },
  { id: "empathisch", label: "Empathisch" },
  { id: "visionaer", label: "Visionaer" },
  { id: "direkt", label: "Direkt / No-Bullshit" },
  { id: "motivierend", label: "Motivierend / Coach" },
  { id: "thoughtleader", label: "Thought Leader" },
];

export function buildSystemPrompt(addressMode: "du" | "sie" = "du", tone: string = "professionell"): string {
  const addressRule = addressMode === "sie"
    ? "Verwende AUSSCHLIESSLICH die formelle Sie-Anrede. Sieze den Leser konsequent."
    : "Verwende AUSSCHLIESSLICH die informelle Du-Anrede. Duze den Leser konsequent.";

  const toneInstruction = TONE_INSTRUCTIONS[tone] || TONE_INSTRUCTIONS.professionell;

  return `Du bist ein erfahrener LinkedIn Content-Stratege. Du schreibst Posts die organisch hohe Reichweite erzielen.

ANREDE:
${addressRule}

TONALITAET:
${toneInstruction}

REGELN:
- Schreibe auf Deutsch, es sei denn das Thema erfordert explizit eine andere Sprache
- Verwende kurze Absaetze (1-2 Saetze pro Absatz)
- Nutze Zeilenumbrueche fuer Lesbarkeit
- Der gesamte Post (Hook + Content + CTA) darf maximal 2800 Zeichen haben
- Verwende KEINE Hashtags im Text (die kommen spaeter)
- Verwende sparsam Emojis (max 3-5 im gesamten Post)
- Schreibe authentisch und persoenlich, nicht werblich
- Der Hook muss in den ersten 2 Zeilen zum Weiterlesen animieren
- Verwende Unicode-Sonderzeichen fuer Struktur: • → ✓ ★ wenn passend

AUSGABEFORMAT:
Antworte AUSSCHLIESSLICH mit einem validen JSON-Objekt in genau diesem Format:
{"hook": "...", "content": "...", "cta": "..."}

Kein Markdown, kein Codeblock, nur das reine JSON.`;
}

export function buildUserPrompt(input: PromptInput): string {
  const { templateName, templateDescription, templateHook, templateContent, templateCta, topic, documentText } = input;

  const templateInstruction = TEMPLATE_INSTRUCTIONS[templateName.toLowerCase()] || TEMPLATE_INSTRUCTIONS[Object.keys(TEMPLATE_INSTRUCTIONS).find(k =>
    templateName.toLowerCase().includes(k)
  ) || ""] || `Folge der Struktur: ${templateDescription}`;

  let prompt = `THEMA: ${topic}

VORLAGE: ${templateName} (${templateDescription})
${templateInstruction}

STRUKTUR-REFERENZ:
- Hook-Muster: ${templateHook || "(frei gestalten)"}
- Content-Muster: ${templateContent || "(frei gestalten)"}
- CTA-Muster: ${templateCta || "(frei gestalten)"}

Fulle die Vorlage mit konkretem, spezifischem Inhalt zum Thema. Ersetze alle Platzhalter durch echten Text. Behalte die Struktur der Vorlage bei, aber schreibe komplett eigene Formulierungen.`;

  if (documentText && documentText.trim().length > 0) {
    const truncated = documentText.length > 8000 ? documentText.slice(0, 8000) + "\n\n[... Dokument gekuerzt ...]" : documentText;
    prompt += `\n\nKONTEXT-DOKUMENT (nutze relevante Informationen daraus):\n---\n${truncated}\n---`;
  }

  prompt += `\n\nGeneriere jetzt den LinkedIn Post als JSON mit den Feldern "hook", "content" und "cta".`;

  return prompt;
}
