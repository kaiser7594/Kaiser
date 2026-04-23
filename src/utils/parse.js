const ID_RE = /^\d{17,20}$/;
const MENTION_RE = /^<@!?(\d{17,20})>$/;

export function extractUserId(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (ID_RE.test(s)) return s;
  const m = s.match(MENTION_RE);
  if (m) return m[1];
  return null;
}

export function extractChannelId(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (/^\d{17,20}$/.test(s)) return s;
  const m = s.match(/^<#(\d{17,20})>$/);
  return m ? m[1] : null;
}

export function extractRoleId(input) {
  if (!input) return null;
  const s = String(input).trim();
  if (/^\d{17,20}$/.test(s)) return s;
  const m = s.match(/^<@&(\d{17,20})>$/);
  return m ? m[1] : null;
}

export function extractRoleIds(args) {
  return args.map(extractRoleId).filter(Boolean);
}
