/**
 * Parse Kotlin FeatureConfig bean constructor call to extract config values.
 *
 * Finds `FeatureConfig(` after `featureConfig()` declaration,
 * extracts named parameters, and parses their values.
 */

import { FeatureFlagValue } from '../../types.js';

/** Fields excluded per FR-009 (operational strings) and function fields */
const EXCLUDED_FIELDS = new Set([
  'postOffice',
  'municipalMessageAccountName',
  'serviceWorkerMessageAccountName',
  'financeMessageAccountName',
  'archiveMetadataOrganization',
  'archiveMetadataConfigs',
]);

/** Default values from the FeatureConfig data class for optional fields */
const DEFAULTS: Record<string, FeatureFlagValue> = {
  temporaryDaycarePartDayAbsenceGivesADailyRefund: true,
  freeJulyStartOnSeptember: false,
  daycarePlacementPlanEndMonthDay: '07-31',
  placementToolApplicationStatus: 'SENT',
  holidayQuestionnaireType: 'FIXED_PERIOD',
  minimumInvoiceAmount: 0,
  skipGuardianPreschoolDecisionApproval: false,
};

export function parseKotlinFeatureConfig(
  source: string
): Record<string, FeatureFlagValue> {
  // Find FeatureConfig( constructor call
  const configBlock = extractFeatureConfigBlock(source);
  if (!configBlock) {
    throw new Error('Could not find FeatureConfig constructor call in source');
  }

  // Split on top-level commas to get individual `key = value` pairs
  const pairs = splitTopLevelCommas(configBlock);
  const result: Record<string, FeatureFlagValue> = {};

  for (const pair of pairs) {
    const trimmed = pair.trim();
    if (!trimmed) continue;

    // Match `key = value`
    const match = trimmed.match(/^(\w+)\s*=\s*([\s\S]*)$/);
    if (!match) continue;

    const key = match[1];
    const rawValue = match[2].trim();

    // Skip excluded fields
    if (EXCLUDED_FIELDS.has(key)) continue;

    // Skip lambda values (start with `{`)
    if (rawValue.startsWith('{')) continue;

    const value = parseValue(rawValue);
    if (value !== undefined) {
      result[key] = value;
    }
  }

  // Apply defaults for fields not explicitly set
  for (const [key, defaultValue] of Object.entries(DEFAULTS)) {
    if (!(key in result)) {
      result[key] = defaultValue;
    }
  }

  return result;
}

/**
 * Extract the content between FeatureConfig( and its matching closing paren.
 */
function extractFeatureConfigBlock(source: string): string | null {
  // Find `FeatureConfig(` — could appear after `featureConfig()` or directly
  const match = source.match(/FeatureConfig\s*\(/);
  if (!match || match.index === undefined) return null;

  const startIdx = match.index + match[0].length;
  let depth = 1;

  for (let i = startIdx; i < source.length; i++) {
    const ch = source[i];
    if (ch === '(') depth++;
    else if (ch === ')') {
      depth--;
      if (depth === 0) {
        return source.slice(startIdx, i);
      }
    }
  }

  return null;
}

/**
 * Split on commas at depth 0 (not inside parens, braces, or brackets).
 * This handles expressions like `MonthDay.of(8, 15)` as a single value.
 */
function splitTopLevelCommas(source: string): string[] {
  const parts: string[] = [];
  let current = '';
  let depth = 0;
  let inString = false;
  let stringChar = '';

  for (let i = 0; i < source.length; i++) {
    const ch = source[i];

    // Handle string literals
    if (!inString && (ch === '"' || ch === '\'')) {
      inString = true;
      stringChar = ch;
      current += ch;
      continue;
    }
    if (inString) {
      current += ch;
      if (ch === stringChar && source[i - 1] !== '\\') {
        inString = false;
      }
      continue;
    }

    // Handle line comments
    if (ch === '/' && source[i + 1] === '/') {
      // Skip to end of line
      while (i < source.length && source[i] !== '\n') i++;
      continue;
    }

    // Handle block comments
    if (ch === '/' && source[i + 1] === '*') {
      i += 2;
      while (i < source.length && !(source[i] === '*' && source[i + 1] === '/')) i++;
      i++; // skip past '/'
      continue;
    }

    if (ch === '(' || ch === '{' || ch === '[') {
      depth++;
      current += ch;
    } else if (ch === ')' || ch === '}' || ch === ']') {
      depth--;
      current += ch;
    } else if (ch === ',' && depth === 0) {
      parts.push(current);
      current = '';
    } else {
      current += ch;
    }
  }

  if (current.trim()) {
    parts.push(current);
  }

  return parts;
}

/**
 * Parse a Kotlin value expression into a JS value.
 */
function parseValue(raw: string): FeatureFlagValue | undefined {
  // Remove trailing inline comments
  const value = raw.replace(/\/\/.*$/, '').trim();

  if (value === 'true') return true;
  if (value === 'false') return false;
  if (value === 'null') return null;

  // Numeric: integer or long (may have expressions like `6 * 24`)
  const numericResult = tryParseNumericExpression(value);
  if (numericResult !== null) return numericResult;

  // MonthDay.of(m, d) → "MM-DD"
  const monthDayMatch = value.match(/MonthDay\.of\s*\(\s*(\d+)\s*,\s*(\d+)\s*\)/);
  if (monthDayMatch) {
    const month = monthDayMatch[1].padStart(2, '0');
    const day = monthDayMatch[2].padStart(2, '0');
    return `${month}-${day}`;
  }

  // Enum references: `SomeEnum.VALUE` → "VALUE"
  const enumMatch = value.match(/^[A-Z]\w*\.([A-Z_]+)$/);
  if (enumMatch) {
    return enumMatch[1];
  }

  // Quoted string
  const stringMatch = value.match(/^"([^"]*)"$/);
  if (stringMatch) {
    return stringMatch[1];
  }

  // Unrecognized value — skip
  return undefined;
}

/**
 * Try to evaluate simple numeric expressions like `6 * 24`, `7 * 24 - 9`, etc.
 */
function tryParseNumericExpression(value: string): number | null {
  // Check if it looks like a numeric expression (digits, operators, spaces only)
  if (!/^[\d\s+\-*/()]+$/.test(value)) return null;

  // Simple evaluation of basic arithmetic
  try {
    // Only allow safe numeric expressions
    const sanitized = value.replace(/\s+/g, '');
    if (!/^[\d+\-*/()]+$/.test(sanitized)) return null;

    // Use Function constructor for safe numeric evaluation
    const result = new Function(`return (${sanitized})`)() as unknown;
    if (typeof result === 'number' && Number.isFinite(result)) {
      return result;
    }
  } catch {
    // Not a valid expression
  }
  return null;
}
