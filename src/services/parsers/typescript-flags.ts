/**
 * Parse featureFlags.tsx to extract prod environment feature flag values.
 *
 * Handles two patterns:
 * - Pattern A (Espoo): inline `prod: { ... }` block within `features` object
 * - Pattern B (trevaka cities): standalone `const prod: FeatureFlags = { ... }`
 */
export function parseTypeScriptFeatureFlags(
  source: string
): Record<string, boolean | null> {
  // Try Pattern B first: `const prod: FeatureFlags = {`
  let prodBlock = extractPatternB(source);

  // Fall back to Pattern A: `prod: {` within the features object
  if (prodBlock === null) {
    prodBlock = extractPatternA(source);
  }

  if (prodBlock === null) {
    throw new Error(
      'Could not find prod feature flags block in source (neither Pattern A nor Pattern B)'
    );
  }

  return parseBlock(prodBlock);
}

/**
 * Pattern B: `const prod: FeatureFlags = { ... }`
 */
function extractPatternB(source: string): string | null {
  const match = source.match(/const\s+prod\s*:\s*FeatureFlags\s*=\s*\{/);
  if (!match || match.index === undefined) return null;

  const startIdx = match.index + match[0].length - 1; // position of `{`
  return extractBalancedBlock(source, startIdx);
}

/**
 * Pattern A: `prod: { ... }` within the features object
 */
function extractPatternA(source: string): string | null {
  // Find the features object first
  const featuresMatch = source.match(/const\s+features\s*:\s*Features\s*=\s*\{/);
  if (!featuresMatch || featuresMatch.index === undefined) return null;

  const featuresStart = featuresMatch.index + featuresMatch[0].length - 1;
  const featuresBlock = extractBalancedBlock(source, featuresStart);
  if (!featuresBlock) return null;

  // Within the features block, find `prod: {`
  const prodMatch = featuresBlock.match(/\bprod\s*:\s*\{/);
  if (!prodMatch || prodMatch.index === undefined) return null;

  const prodStart = prodMatch.index + prodMatch[0].length - 1;
  return extractBalancedBlock(featuresBlock, prodStart);
}

/**
 * Extract a balanced `{ ... }` block starting at the given index.
 */
function extractBalancedBlock(source: string, startIdx: number): string | null {
  if (source[startIdx] !== '{') return null;

  let depth = 0;
  for (let i = startIdx; i < source.length; i++) {
    if (source[i] === '{') depth++;
    else if (source[i] === '}') {
      depth--;
      if (depth === 0) {
        return source.slice(startIdx, i + 1);
      }
    }
  }
  return null;
}

/**
 * Parse a `{ key: value, ... }` block, handling nested objects with dot notation.
 * Only extracts boolean values; skips environmentLabel and null values.
 */
function parseBlock(
  block: string,
  prefix = ''
): Record<string, boolean | null> {
  const result: Record<string, boolean | null> = {};

  // Remove outer braces
  const inner = block.slice(1, -1);

  let i = 0;
  while (i < inner.length) {
    // Skip whitespace and comments
    if (/\s/.test(inner[i])) {
      i++;
      continue;
    }
    if (inner[i] === '/' && inner[i + 1] === '/') {
      while (i < inner.length && inner[i] !== '\n') i++;
      continue;
    }

    // Match a key
    const keyMatch = inner.slice(i).match(/^([a-zA-Z_]\w*)\s*:\s*/);
    if (!keyMatch) {
      i++;
      continue;
    }

    const key = keyMatch[1];
    i += keyMatch[0].length;

    // Skip environmentLabel
    if (key === 'environmentLabel') {
      // Skip until next comma or end
      i = skipValue(inner, i);
      continue;
    }

    // Check what the value is
    const remaining = inner.slice(i);

    if (remaining.startsWith('{')) {
      // Nested object — extract and recurse with dot notation
      const nestedBlock = extractBalancedBlock(inner, i);
      if (nestedBlock) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        const nested = parseBlock(nestedBlock, fullKey);
        Object.assign(result, nested);
        i += nestedBlock.length;
        // Skip trailing comma
        if (i < inner.length && inner[i] === ',') i++;
      } else {
        i++;
      }
    } else {
      // Simple value
      const valueMatch = remaining.match(/^(true|false|null)\b/);
      if (valueMatch) {
        const fullKey = prefix ? `${prefix}.${key}` : key;
        if (valueMatch[1] === 'true') {
          result[fullKey] = true;
        } else if (valueMatch[1] === 'false') {
          result[fullKey] = false;
        }
        // null values are skipped (not set)
        i += valueMatch[0].length;
      }
      // Skip to next comma or end
      i = skipValue(inner, i);
    }
  }

  return result;
}

/**
 * Skip past the current value to the next comma or end of block.
 */
function skipValue(source: string, startIdx: number): number {
  let i = startIdx;
  let depth = 0;
  while (i < source.length) {
    if (source[i] === '{' || source[i] === '[' || source[i] === '(') depth++;
    else if (source[i] === '}' || source[i] === ']' || source[i] === ')') {
      if (depth === 0) return i;
      depth--;
    } else if (source[i] === ',' && depth === 0) {
      return i + 1;
    }
    i++;
  }
  return i;
}
