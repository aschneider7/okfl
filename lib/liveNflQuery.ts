export type LiveNflIntent = {
  player: string;
  season: number;
  week: number;
  scoring: "ppr" | "half-ppr" | "standard";
};

const normalizeScoring = (value?: string | null): LiveNflIntent["scoring"] => {
  const clean = String(value || "ppr").toLowerCase().replace(/\s+/g, "-");
  if (clean === "standard") return "standard";
  if (clean === "half-ppr" || clean === "halfppr" || clean === "half") return "half-ppr";
  return "ppr";
};

export function parseLiveNflQuery(raw: string): LiveNflIntent | null {
  const query = raw.trim().replace(/[?]+$/g, "");
  if (!query) return null;

  const patterns: Array<{
    regex: RegExp;
    map: (match: RegExpMatchArray) => LiveNflIntent;
  }> = [
    {
      regex: /^(.+?)\s+(20\d{2})\s+(?:week|wk)\s*(\d{1,2})(?:\s+(ppr|half[- ]?ppr|standard))?(?:\s+(?:fantasy\s+)?(?:points?|stats?|score))?$/i,
      map: (m) => ({ player: m[1].trim(), season: Number(m[2]), week: Number(m[3]), scoring: normalizeScoring(m[4]) }),
    },
    {
      regex: /^(.+?)\s+(?:week|wk)\s*(\d{1,2})\s+(20\d{2})(?:\s+(ppr|half[- ]?ppr|standard))?(?:\s+(?:fantasy\s+)?(?:points?|stats?|score))?$/i,
      map: (m) => ({ player: m[1].trim(), season: Number(m[3]), week: Number(m[2]), scoring: normalizeScoring(m[4]) }),
    },
    {
      regex: /^(20\d{2})\s+(?:week|wk)\s*(\d{1,2})\s+(.+?)(?:\s+(ppr|half[- ]?ppr|standard))?(?:\s+(?:fantasy\s+)?(?:points?|stats?|score))?$/i,
      map: (m) => ({ player: m[3].trim(), season: Number(m[1]), week: Number(m[2]), scoring: normalizeScoring(m[4]) }),
    },
    {
      regex: /^how many\s+(?:(ppr|half[- ]?ppr|standard)\s+)?(?:fantasy\s+)?points did\s+(.+?)\s+(?:score|have)(?:\s+in)?\s+(20\d{2})\s+(?:week|wk)\s*(\d{1,2})$/i,
      map: (m) => ({ player: m[2].trim(), season: Number(m[3]), week: Number(m[4]), scoring: normalizeScoring(m[1]) }),
    },
    {
      regex: /^(.+?)\s+(?:fantasy\s+)?(?:points?|stats?|score)\s+(20\d{2})\s+(?:week|wk)\s*(\d{1,2})(?:\s+(ppr|half[- ]?ppr|standard))?$/i,
      map: (m) => ({ player: m[1].trim(), season: Number(m[2]), week: Number(m[3]), scoring: normalizeScoring(m[4]) }),
    },
  ];

  for (const pattern of patterns) {
    const match = query.match(pattern.regex);
    if (!match) continue;
    const intent = pattern.map(match);
    if (intent.week < 1 || intent.week > 22 || intent.season < 1999 || intent.season > 2100) return null;
    return intent;
  }

  return null;
}
