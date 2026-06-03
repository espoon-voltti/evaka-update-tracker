/**
 * Parse Action.kt to extract every employee-side action and its default rules.
 *
 * The file structure (espoon-voltti/evaka master) is:
 *   sealed interface Employee {
 *     enum class Global(override vararg val defaultRules: UnscopedActionRule) : UnscopedAction {
 *       APPLICATIONS_PAGE(HasGlobalRole(ADMIN, SERVICE_WORKER, ...)),
 *       ...
 *     }
 *     enum class Application(override vararg val defaultRules: ScopedActionRule<in ApplicationId>) : ... {
 *       ...
 *     }
 *     ...
 *   }
 *   sealed interface Citizen { ... }   // ignored
 *
 * We skip the Citizen subinterface entirely and return all employee-side actions.
 */

const ROLES = new Set([
  'ADMIN',
  'REPORT_VIEWER',
  'DIRECTOR',
  'FINANCE_ADMIN',
  'FINANCE_STAFF',
  'SERVICE_WORKER',
  'MESSAGING',
  'UNIT_SUPERVISOR',
  'STAFF',
  'SPECIAL_EDUCATION_TEACHER',
  'EARLY_CHILDHOOD_EDUCATION_SECRETARY',
]);

const CATEGORY_RE = /^\s*enum class (\w+)\s*\(/gm;
const CITIZEN_START_RE = /^\s*sealed interface Citizen\b/m;

/**
 * Yksi rooli-konteksti-yhdistelmä yhdestä Has(Global|Unit|Group)Role-säännöstä:
 *   - HasGlobalRole(ADMIN, SERVICE_WORKER) → { kind: 'global', roles: [ADMIN, SW], contextNotes: [] }
 *   - HasUnitRole(STAFF).inPlacementUnitOfChild() → { kind: 'unit', roles: [STAFF], contextNotes: ['inPlacementUnitOfChild'] }
 * `contextNotes` on tyhjä globaaleille rooleille (ei rajoitusta).
 */
export interface RoleRule {
  kind: 'global' | 'unit' | 'group';
  roles: string[];
  contextNotes: string[];
}

export interface ParsedAction {
  category: string;
  name: string;
  shortName: string;
  defaultRulesText: string;
  defaultRoles: string[];
  /** Lista rooli-sääntöjä joista action koostuu. Sama rooli voi esiintyä monessa säännössä. */
  defaultRoleRules: RoleRule[];
}

export function parseActionKt(source: string): ParsedAction[] {
  const text = source;
  // Find Citizen section bounds and skip categories within it
  let citizenStart = -1;
  let citizenEnd = -1;
  const citizenMatch = text.match(CITIZEN_START_RE);
  if (citizenMatch && citizenMatch.index !== undefined) {
    const braceIdx = text.indexOf('{', citizenMatch.index + citizenMatch[0].length);
    if (braceIdx !== -1) {
      citizenStart = citizenMatch.index;
      citizenEnd = findMatchingBrace(text, braceIdx);
    }
  }

  const actions: ParsedAction[] = [];
  CATEGORY_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = CATEGORY_RE.exec(text)) !== null) {
    const pos = match.index;
    if (citizenStart !== -1 && pos >= citizenStart && pos <= citizenEnd) {
      continue;
    }
    const categoryName = match[1];

    const parenOpen = text.indexOf('(', pos + match[0].length - 1);
    if (parenOpen === -1) continue;
    const parenClose = findMatchingParen(text, parenOpen);
    if (parenClose === -1) continue;
    const braceOpen = text.indexOf('{', parenClose);
    if (braceOpen === -1) continue;
    const braceClose = findMatchingBrace(text, braceOpen);
    if (braceClose === -1) continue;

    const body = text.substring(braceOpen + 1, braceClose);
    const entries = parseEnumEntries(body);
    for (const { name, rulesText } of entries) {
      const roleRules = parseRoleRules(rulesText);
      actions.push({
        category: categoryName,
        name: `Action.${categoryName}.${name}`,
        shortName: name,
        defaultRulesText: rulesText,
        defaultRoles: rolesFromRules(rulesText),
        defaultRoleRules: roleRules,
      });
    }
  }
  return actions;
}

function findMatchingBrace(text: string, startIdx: number): number {
  return findMatching(text, startIdx, '{', '}');
}

function findMatchingParen(text: string, startIdx: number): number {
  return findMatching(text, startIdx, '(', ')');
}

function findMatching(text: string, startIdx: number, opener: string, closer: string): number {
  let depth = 0;
  for (let i = startIdx; i < text.length; i++) {
    const c = text[i];
    if (c === opener) depth++;
    else if (c === closer) {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

function stripComments(text: string): string {
  let out = '';
  let i = 0;
  const n = text.length;
  while (i < n) {
    if (text[i] === '/' && text[i + 1] === '/') {
      while (i < n && text[i] !== '\n') i++;
    } else if (text[i] === '/' && text[i + 1] === '*') {
      i += 2;
      while (i + 1 < n && !(text[i] === '*' && text[i + 1] === '/')) i++;
      i += 2;
    } else {
      out += text[i];
      i++;
    }
  }
  return out;
}

interface EnumEntry {
  name: string;
  rulesText: string;
}

function parseEnumEntries(body: string): EnumEntry[] {
  const stripped = stripComments(body);
  const n = stripped.length;
  const entries: EnumEntry[] = [];
  let i = 0;

  const skipWs = (j: number) => {
    while (j < n && /\s/.test(stripped[j])) j++;
    return j;
  };

  while (i < n) {
    i = skipWs(i);
    if (i >= n) break;
    if (stripped[i] === ';') break;
    const match = stripped.substring(i).match(/^[A-Z_][A-Z0-9_]*/);
    if (!match) break;
    const name = match[0];
    i += name.length;
    i = skipWs(i);
    let rulesText = '';
    if (i < n && stripped[i] === '(') {
      const close = findMatchingParen(stripped, i);
      if (close === -1) break;
      rulesText = stripped.substring(i + 1, close);
      i = close + 1;
    }
    i = skipWs(i);
    if (i < n && stripped[i] === ',') i++;
    entries.push({ name, rulesText: rulesText.trim() });
  }
  return entries;
}

const HAS_ROLE_CALL_RE = /Has(?:GlobalRole|UnitRole|GroupRole)\s*\(([^)]*)\)/g;

/**
 * Parssi yksittäiset HasGlobalRole/HasUnitRole/HasGroupRole-kutsut säilyttäen
 * yhteyden rooleista niiden kontekstirajoituksiin (chaining-suffiksiin kuten
 * `.inPlacementUnitOfChild()`).
 *
 * Lähestymistapa: skannataan teksti läpi, ja jokaiselle Has(Global|Unit|Group)Role
 * -esiintymälle: 1) parssi argumenttilista (roolit), 2) skannaa eteenpäin
 * sulkujen päättymisen jälkeen seuraaviin ketjutuskutsuihin (`.foo(...)`) joista
 * tunnistetaan kontekstinotteet samalla logiikalla kuin ActionRuleMappingissa.
 */
export function parseRoleRules(rulesText: string): RoleRule[] {
  const out: RoleRule[] = [];
  const re = /(HasGlobalRole|HasUnitRole|HasGroupRole)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(rulesText)) !== null) {
    const kindName = m[1];
    const kind: 'global' | 'unit' | 'group' =
      kindName === 'HasGlobalRole' ? 'global' :
      kindName === 'HasUnitRole' ? 'unit' : 'group';
    const argOpen = re.lastIndex - 1;
    const argClose = findMatchingParen(rulesText, argOpen);
    if (argClose === -1) break;
    const args = rulesText.substring(argOpen + 1, argClose);
    const roles: string[] = [];
    for (const tok of args.split(/[\s,]+/)) {
      const cleaned = tok.replace(/^UserRole\./, '').replace(/[^A-Z_]/g, '');
      if (ROLES.has(cleaned) && !roles.includes(cleaned)) roles.push(cleaned);
    }
    // Skaanaa eteenpäin chaining-suffiksia: kutsut .foo(...) kunnes saavutetaan
    // `,`, `+`, tai `)` joka on omalla tasolla.
    const suffixStart = argClose + 1;
    let suffixEnd = suffixStart;
    let depth = 0;
    while (suffixEnd < rulesText.length) {
      const c = rulesText[suffixEnd];
      if (c === '(') depth++;
      else if (c === ')') {
        if (depth === 0) break;
        depth--;
      } else if ((c === ',' || c === '+') && depth === 0) {
        break;
      }
      suffixEnd++;
    }
    const suffix = rulesText.substring(suffixStart, suffixEnd);
    const contextNotes = parseContextNotesFromSuffix(suffix);
    out.push({ kind, roles, contextNotes });
    // Siirry seuraavaan Has*Role-esiintymään
    re.lastIndex = suffixEnd;
  }
  // Yhdistä saman (kind, kontekstijoukko)-yhdistelmät rooli-listat yhteen
  return mergeRoleRules(out);
}

function mergeRoleRules(rules: RoleRule[]): RoleRule[] {
  const merged = new Map<string, RoleRule>();
  for (const r of rules) {
    const key = `${r.kind}|${[...r.contextNotes].sort().join(',')}`;
    const existing = merged.get(key);
    if (existing) {
      for (const role of r.roles) {
        if (!existing.roles.includes(role)) existing.roles.push(role);
      }
    } else {
      merged.set(key, { kind: r.kind, roles: [...r.roles], contextNotes: [...r.contextNotes] });
    }
  }
  for (const r of merged.values()) r.roles.sort();
  return Array.from(merged.values());
}

/**
 * Tunnistaa kontekstirajoitukset ketjutuskutsuista suffiksissa, esim.
 * `.inPlacementUnitOfChild()` tai `.withUnitProviderTypes(ProviderType.MUNICIPAL).inUnit()`.
 * Sama logiikka kuin kotlin-action-rule-mapping.ts:n classifyBody.
 */
export function parseContextNotesFromSuffix(suffix: string): string[] {
  const notes: string[] = [];
  for (const m of suffix.matchAll(/withUnitProviderTypes\(([^)]+)\)/g)) {
    const types = (m[1].match(/ProviderType\.(\w+)/g) || [])
      .map((s) => s.replace(/^ProviderType\./, ''));
    if (types.length) notes.push(`providerTypes=${types.join(',')}`);
  }
  for (const m of suffix.matchAll(/withUnitFeatures\(([^)]+)\)/g)) {
    const feats = (m[1].match(/PilotFeature\.(\w+)/g) || [])
      .map((s) => s.replace(/^PilotFeature\./, ''));
    if (feats.length) notes.push(`features=${feats.join(',')}`);
  }
  if (/inPlacementPlanUnitOfApplication/.test(suffix)) notes.push('inPlacementPlanUnitOfApplication');
  if (/inPlacementUnitOfChildOfBackupCare/.test(suffix)) notes.push('inPlacementUnitOfChildOfBackupCare');
  if (/inPlacementUnitOfChild\b/.test(suffix) && !notes.includes('inPlacementUnitOfChildOfBackupCare')) {
    notes.push('inPlacementUnitOfChild');
  }
  if (/inUnitOfGroup/.test(suffix)) notes.push('inUnitOfGroup');
  if (/\binUnit\(\)/.test(suffix)) notes.push('inUnit');
  if (/\binAnyUnit\(\)/.test(suffix)) notes.push('inAnyUnit');
  return notes;
}

export function rolesFromRules(rulesText: string): string[] {
  const found = new Set<string>();
  let m: RegExpExecArray | null;
  HAS_ROLE_CALL_RE.lastIndex = 0;
  while ((m = HAS_ROLE_CALL_RE.exec(rulesText)) !== null) {
    for (const tok of m[1].split(/[\s,]+/)) {
      const cleaned = tok.replace(/^UserRole\./, '').replace(/[^A-Z_]/g, '');
      if (ROLES.has(cleaned)) found.add(cleaned);
    }
  }
  // Fallback heuristic: if Has*Role mentioned but regex missed (multiline args),
  // scan bare role tokens.
  if (found.size === 0 && /Has(?:Global|Unit|Group)Role/.test(rulesText)) {
    for (const tok of rulesText.match(/\b[A-Z_][A-Z0-9_]+\b/g) || []) {
      if (ROLES.has(tok)) found.add(tok);
    }
  }
  return Array.from(found).sort();
}
