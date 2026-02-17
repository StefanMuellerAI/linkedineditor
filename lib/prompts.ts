interface PromptInput {
  templateName: string;
  templateDescription: string;
  templateHook: string;
  templateContent: string;
  templateCta: string;
  topic: string;
  documentText?: string;
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

export function buildSystemPrompt(): string {
  return `Du bist ein erfahrener LinkedIn Content-Stratege. Du schreibst Posts die organisch hohe Reichweite erzielen.

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
