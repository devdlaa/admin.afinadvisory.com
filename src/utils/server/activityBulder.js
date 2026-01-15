
export const buildActivityMessage = (changes) => {
  if (!Array.isArray(changes) || changes.length === 0) {
    return "updated the task";
  }

  const formatValue = (v) => {
    if (v === null || v === undefined) return "None";

    // Prisma Decimal support
    if (typeof v === "object" && v?.d && Array.isArray(v.d)) {
      return v.d.join("");
    }

    if (typeof v === "object") {
      if ("name" in v) return v.name;
      return JSON.stringify(v);
    }

    return String(v);
  };

  const diffObjects = (from = {}, to = {}) => {
    const keys = new Set([...Object.keys(from), ...Object.keys(to)]);
    const parts = [];

    for (const key of keys) {
      const a = from[key];
      const b = to[key];

      if (a !== b && JSON.stringify(a) !== JSON.stringify(b)) {
        parts.push(`${key}: ${formatValue(a)} → ${formatValue(b)}`);
      }
    }

    return parts;
  };

  const summarizeObject = (obj = {}) => {
    return Object.entries(obj)
      .map(([k, v]) => `${k}: ${formatValue(v)}`)
      .join(", ");
  };

  const sentences = [];

  for (const change of changes) {
    const from = change.from ?? null;
    const to = change.to ?? null;

    // UPDATE
    if (from && to) {
      const diffs = diffObjects(from, to);
      sentences.push(
        diffs.length > 0 ? `updated ${diffs.join(", ")}` : "updated"
      );
      continue;
    }

    // CREATE
    if (!from && to) {
      sentences.push(`added ${summarizeObject(to)}`);
      continue;
    }

    // DELETE
    if (from && !to) {
      sentences.push(`deleted ${summarizeObject(from)}`);
      continue;
    }

    sentences.push("updated");
  }

  if (sentences.length === 1) return sentences[0];
  if (sentences.length === 2) return `${sentences[0]} and ${sentences[1]}`;
  return `${sentences.slice(0, -1).join(", ")}, and ${sentences.at(-1)}`;
};
