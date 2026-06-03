/**
 * Parse a {City}ActionRuleMapping.kt file to extract per-action overrides
 * over the base Espoo defaults.
 *
 * Each `when (action) { ... }` branch is classified as either:
 *   - "extend_default": body contains `action.defaultRules.asSequence()` so the
 *     extra HasGlobalRole/HasUnitRole/HasGroupRole entries are appended to the
 *     defaults.
 *   - "replace": body returns a fresh sequence (no defaultRules) and the
 *     listed roles become the entire rule set. Empty sequences (sequenceOf())
 *     mean nobody is permitted.
 *
 * For Trevaka (Tampere region) the file contains an extra layer of indirection
 * — the per-city mapping (e.g. TampereActionRuleMapping) calls
 * `Trevaka.rulesOf(action)` and adds more overrides on top. This parser
 * extracts only the local file's branches; composition with TrevakaBase happens
 * in the collector.
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

const ACTION_REF_RE = /Action\.([A-Z][A-Za-z]+)\.([A-Z_][A-Z0-9_]+)/g;

export type OverrideMode = 'extend_default' | 'replace';

export interface RoleRule {
  kind: 'global' | 'unit' | 'group';
  roles: string[];
  contextNotes: string[];
}

export interface ActionOverride {
  /** Full action name, e.g. `Action.Child.READ_ASSISTANCE`. */
  action: string;
  category: string;
  shortName: string;
  mode: OverrideMode;
  /** Empty when mode === 'replace' and body is sequenceOf(). */
  added: string[];
  /** Per-sääntö (kind+roolit+konteksti) — säilyttää yhteyden roolista sen rajoituksiin. */
  addedRoleRules: RoleRule[];
  /** True when the branch returns sequenceOf() with no rules — nobody allowed. */
  isEmpty: boolean;
  /** Whether the override delegates to another mapping (e.g. trevaka.rulesOf). */
  delegatesTo?: string;
  /** Free-form context hints (inPlacementUnitOfChild, providerTypes, ...). DEPRECATED: käytä addedRoleRules. */
  contextNotes: string[];
  /** Raw branch body — useful for debugging / future analysis. */
  branchBody: string;
}

export interface ParsedMapping {
  overrides: ActionOverride[];
  /** True if file delegates to another mapping (Trevaka per-city files do). */
  delegatesTo?: string;
}

export function parseActionRuleMapping(source: string): ParsedMapping {
  const text = stripComments(source);
  const overrides = new Map<string, ActionOverride>();
  let delegatesTo: string | undefined;

  // Detect delegation pattern: `private val base = TrevakaActionRuleMapping()` or
  // `base.rulesOf(action)` inside the override
  const delegationMatch = text.match(/(\w+)ActionRuleMapping\s*\(\s*\)/g);
  if (delegationMatch) {
    for (const m of delegationMatch) {
      const name = m.replace(/ActionRuleMapping\s*\(\s*\)/, '');
      // Skip the class's own constructor reference (rare)
      if (/private\s+val\s+\w+\s*=\s*new?\s*\w*ActionRuleMapping/.test(text) ||
          /val\s+\w+\s*=\s*\w+ActionRuleMapping\(\)/.test(text)) {
        delegatesTo = name.toLowerCase();
        break;
      }
    }
  }

  const whenRe = /\bwhen\s*\(\s*action\s*\)\s*\{/g;
  let whenMatch: RegExpExecArray | null;
  while ((whenMatch = whenRe.exec(text)) !== null) {
    const brace = text.indexOf('{', whenMatch.index + whenMatch[0].length - 1);
    if (brace === -1) continue;
    const end = findMatching(text, brace, '{', '}');
    if (end === -1) continue;
    const body = text.substring(brace + 1, end);
    const branches = splitWhenBranches(body);
    for (const { condition, branchBody } of branches) {
      if (/^\s*else\b/.test(condition)) continue;
      const actionRefs = extractActionRefs(condition);
      if (actionRefs.length === 0) continue;
      const { mode, added, isEmpty, contextNotes, addedRoleRules } = classifyBody(branchBody);
      for (const ref of actionRefs) {
        const fullName = `Action.${ref.category}.${ref.shortName}`;
        overrides.set(fullName, {
          action: fullName,
          category: ref.category,
          shortName: ref.shortName,
          mode,
          added,
          addedRoleRules,
          isEmpty,
          contextNotes,
          branchBody: branchBody.trim(),
        });
      }
    }
  }

  return {
    overrides: Array.from(overrides.values()),
    delegatesTo,
  };
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

interface WhenBranch {
  condition: string;
  branchBody: string;
}

function splitWhenBranches(body: string): WhenBranch[] {
  const branches: WhenBranch[] = [];
  const n = body.length;
  let i = 0;
  let last = 0;
  let depthCurly = 0;
  let depthParen = 0;

  while (i < n) {
    const c = body[i];
    if (c === '{') depthCurly++;
    else if (c === '}') depthCurly--;
    else if (c === '(') depthParen++;
    else if (c === ')') depthParen--;
    else if (c === '-' && body[i + 1] === '>' && depthCurly === 0 && depthParen === 0) {
      const condition = body.substring(last, i).trim();
      let j = i + 2;
      while (j < n && /\s/.test(body[j])) j++;
      let bodyText = '';
      let nextPos = j;
      if (j < n && body[j] === '{') {
        const k = findMatching(body, j, '{', '}');
        if (k === -1) {
          i++;
          continue;
        }
        bodyText = body.substring(j + 1, k);
        nextPos = k + 1;
      } else {
        // Branch body without braces: read until next top-level "Action." or "else"
        let k = j;
        let dC = 0;
        let dP = 0;
        while (k < n) {
          const c2 = body[k];
          if (c2 === '{') dC++;
          else if (c2 === '}') dC--;
          else if (c2 === '(') dP++;
          else if (c2 === ')') dP--;
          else if (c2 === '\n' && dC === 0 && dP === 0) {
            let kk = k + 1;
            while (kk < n && (body[kk] === ' ' || body[kk] === '\t')) kk++;
            const rest = body.substring(kk, kk + 8);
            if (rest.startsWith('Action.') || rest.startsWith('else')) break;
          }
          k++;
        }
        bodyText = body.substring(j, k);
        nextPos = k;
      }
      branches.push({ condition, branchBody: bodyText });
      i = nextPos;
      last = nextPos;
      continue;
    }
    i++;
  }
  return branches;
}

function extractActionRefs(condition: string): Array<{ category: string; shortName: string }> {
  const refs: Array<{ category: string; shortName: string }> = [];
  ACTION_REF_RE.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = ACTION_REF_RE.exec(condition)) !== null) {
    refs.push({ category: m[1], shortName: m[2] });
  }
  return refs;
}

interface ClassifiedBody {
  mode: OverrideMode;
  added: string[];
  addedRoleRules: RoleRule[];
  isEmpty: boolean;
  contextNotes: string[];
}

/**
 * Parse jokaisen `Has(Global|Unit|Group)Role(...)`-kutsun erikseen ja säilyttää
 * yhteyden rooleista niiden kontekstirajoituksiin (ketjutuskutsuissa).
 * Sama logiikka kuin kotlin-actions.ts:n parseRoleRules.
 */
function parseRoleRulesFromBranch(body: string): RoleRule[] {
  const out: RoleRule[] = [];
  const re = /(HasGlobalRole|HasUnitRole|HasGroupRole)\s*\(/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(body)) !== null) {
    const kindName = m[1];
    const kind: 'global' | 'unit' | 'group' =
      kindName === 'HasGlobalRole' ? 'global' :
      kindName === 'HasUnitRole' ? 'unit' : 'group';
    const argOpen = re.lastIndex - 1;
    const argClose = findMatching(body, argOpen, '(', ')');
    if (argClose === -1) break;
    const args = body.substring(argOpen + 1, argClose);
    const roles: string[] = [];
    for (const tok of args.split(/[\s,]+/)) {
      const cleaned = tok.replace(/^UserRole\./, '').replace(/[^A-Z_]/g, '');
      if (ROLES.has(cleaned) && !roles.includes(cleaned)) roles.push(cleaned);
    }
    // Skaanaa eteenpäin chaining-suffiksia kunnes saavutetaan `,`/`+`/`)`
    const suffixStart = argClose + 1;
    let suffixEnd = suffixStart;
    let depth = 0;
    while (suffixEnd < body.length) {
      const c = body[suffixEnd];
      if (c === '(') depth++;
      else if (c === ')') {
        if (depth === 0) break;
        depth--;
      } else if ((c === ',' || c === '+') && depth === 0) {
        break;
      }
      suffixEnd++;
    }
    const suffix = body.substring(suffixStart, suffixEnd);
    const contextNotes = extractContextNotes(suffix);
    out.push({ kind, roles, contextNotes });
    re.lastIndex = suffixEnd;
  }
  // IsEmployee.any() → kaikki työntekijä-roolit ilman rajoitusta
  if (/IsEmployee\.any\(\)/.test(body)) {
    out.push({ kind: 'global', roles: Array.from(ROLES).sort(), contextNotes: [] });
  }
  return mergeRoleRules(out);
}

function mergeRoleRules(rules: RoleRule[]): RoleRule[] {
  const merged = new Map<string, RoleRule>();
  for (const r of rules) {
    const key = `${r.kind}|${[...r.contextNotes].sort().join(',')}`;
    const existing = merged.get(key);
    if (existing) {
      for (const role of r.roles) if (!existing.roles.includes(role)) existing.roles.push(role);
    } else {
      merged.set(key, { kind: r.kind, roles: [...r.roles], contextNotes: [...r.contextNotes] });
    }
  }
  for (const r of merged.values()) r.roles.sort();
  return Array.from(merged.values());
}

function extractContextNotes(text: string): string[] {
  const notes: string[] = [];
  for (const m of text.matchAll(/withUnitProviderTypes\(([^)]+)\)/g)) {
    const types = (m[1].match(/ProviderType\.(\w+)/g) || [])
      .map((s) => s.replace(/^ProviderType\./, ''));
    if (types.length) notes.push(`providerTypes=${types.join(',')}`);
  }
  for (const m of text.matchAll(/withUnitFeatures\(([^)]+)\)/g)) {
    const feats = (m[1].match(/PilotFeature\.(\w+)/g) || [])
      .map((s) => s.replace(/^PilotFeature\./, ''));
    if (feats.length) notes.push(`features=${feats.join(',')}`);
  }
  if (/inPlacementPlanUnitOfApplication/.test(text)) notes.push('inPlacementPlanUnitOfApplication');
  if (/inPlacementUnitOfChildOfBackupCare/.test(text)) notes.push('inPlacementUnitOfChildOfBackupCare');
  if (/inPlacementUnitOfChild\b/.test(text) && !notes.includes('inPlacementUnitOfChildOfBackupCare')) {
    notes.push('inPlacementUnitOfChild');
  }
  if (/inUnitOfGroup/.test(text)) notes.push('inUnitOfGroup');
  if (/\binUnit\(\)/.test(text)) notes.push('inUnit');
  if (/\binAnyUnit\(\)/.test(text)) notes.push('inAnyUnit');
  return notes;
}

function classifyBody(body: string): ClassifiedBody {
  const trimmed = body.trim();
  const extendsDefaults = /action\.defaultRules\.asSequence\(\)/.test(body);
  const isEmpty = /^\s*sequenceOf\s*\(\s*\)\s*$/.test(trimmed) ||
    /^\s*emptySequence\s*\(\s*\)\s*$/.test(trimmed);

  const roles = new Set<string>();
  for (const m of body.matchAll(/Has(?:GlobalRole|UnitRole|GroupRole)\s*\(([^)]*)\)/g)) {
    for (const tok of m[1].split(/[\s,]+/)) {
      const cleaned = tok.replace(/^UserRole\./, '').replace(/[^A-Z_]/g, '');
      if (ROLES.has(cleaned)) roles.add(cleaned);
    }
  }
  if (roles.size === 0 && /Has(?:Global|Unit|Group)Role/.test(body)) {
    for (const tok of body.match(/\b[A-Z_][A-Z0-9_]+\b/g) || []) {
      if (ROLES.has(tok)) roles.add(tok);
    }
  }
  if (roles.size === 0) {
    // Bare UserRole.X references (e.g. when constructor takes UserRole.STAFF)
    for (const m of body.matchAll(/UserRole\.([A-Z_][A-Z0-9_]+)/g)) {
      if (ROLES.has(m[1])) roles.add(m[1]);
    }
  }

  // IsEmployee.any() pattern — permits all employee roles
  if (/IsEmployee\.any\(\)/.test(body)) {
    for (const r of ROLES) roles.add(r);
  }

  const contextNotes: string[] = [];
  for (const m of body.matchAll(/withUnitProviderTypes\(([^)]+)\)/g)) {
    const types = (m[1].match(/ProviderType\.(\w+)/g) || [])
      .map((s) => s.replace(/^ProviderType\./, ''));
    if (types.length) contextNotes.push(`providerTypes=${types.join(',')}`);
  }
  for (const m of body.matchAll(/withUnitFeatures\(([^)]+)\)/g)) {
    const feats = (m[1].match(/PilotFeature\.(\w+)/g) || [])
      .map((s) => s.replace(/^PilotFeature\./, ''));
    if (feats.length) contextNotes.push(`features=${feats.join(',')}`);
  }
  if (/inPlacementPlanUnitOfApplication/.test(body)) contextNotes.push('inPlacementPlanUnitOfApplication');
  if (/inPlacementUnitOfChildOfBackupCare/.test(body)) contextNotes.push('inPlacementUnitOfChildOfBackupCare');
  if (/inPlacementUnitOfChild\b/.test(body)) contextNotes.push('inPlacementUnitOfChild');
  if (/inUnitOfGroup/.test(body)) contextNotes.push('inUnitOfGroup');
  if (/\binUnit\(\)/.test(body)) contextNotes.push('inUnit');
  if (/\binAnyUnit\(\)/.test(body)) contextNotes.push('inAnyUnit');

  return {
    mode: extendsDefaults ? 'extend_default' : 'replace',
    added: Array.from(roles).sort(),
    addedRoleRules: parseRoleRulesFromBranch(body),
    isEmpty,
    contextNotes,
  };
}
