/**
 * Parses the metrics settings import code that scripts/metrics-import-link.sh
 * prints as part of a #/settings?import=<code> link.
 */

const LAMBDA_FUNCTION_URL_HOST = /^[a-z0-9]+\.lambda-url\.[a-z0-9-]+\.on\.aws$/;
const BROKEN_CODE = 'Tuontikoodi on virheellinen. Tarkista, että kopioit koko linkin.';

export class ImportError extends Error {
  constructor(message) {
    super(message);
    this.name = 'ImportError';
  }
}

function extractCode(text) {
  return text.match(/import=([A-Za-z0-9_-]+)/)?.[1] ?? text.trim();
}

/** Returns the decoded text, or null when the code is not base64url of UTF-8. */
function decodeBase64Url(code) {
  if (!/^[A-Za-z0-9_-]+$/.test(code)) return null;
  const base64 = code.replace(/-/g, '+').replace(/_/g, '/');
  try {
    const binary = atob(base64.padEnd(Math.ceil(base64.length / 4) * 4, '='));
    const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
    return new TextDecoder('utf-8', { fatal: true }).decode(bytes);
  } catch {
    return null;
  }
}

function parseJson(text) {
  try {
    return JSON.parse(text);
  } catch {
    return undefined;
  }
}

function isObject(value) {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Returns the URL in normal form, or null when it is not the root of an https Lambda Function URL. */
function parseFunctionUrl(value) {
  let url;
  try {
    url = new URL(value);
  } catch {
    return null;
  }
  const isBareOrigin =
    !url.username && !url.password && !url.port && url.pathname === '/' && !url.search && !url.hash;
  const isFunctionUrl = url.protocol === 'https:' && LAMBDA_FUNCTION_URL_HOST.test(url.hostname);
  return isBareOrigin && isFunctionUrl ? `${url.origin}/` : null;
}

function parseCity(id, value) {
  const url = isObject(value) && typeof value.url === 'string' ? parseFunctionUrl(value.url.trim()) : null;
  if (!url) {
    return new ImportError(`Kunnan ${id} osoite ei ole Lambda-funktion https-osoite.`);
  }
  if (typeof value.token !== 'string' || !value.token.trim()) {
    return new ImportError(`Kunnan ${id} tunniste puuttuu.`);
  }
  return { id, url, token: value.token.trim() };
}

/**
 * Accepts the bare code, the link, or a whole message that contains the link.
 * One invalid city rejects the whole import. Returns an ImportError with a
 * message for the user instead of throwing.
 */
export function parseImport(text, knownCityIds) {
  const decoded = decodeBase64Url(extractCode(text));
  const payload = decoded === null ? undefined : parseJson(decoded);
  if (!isObject(payload)) return new ImportError(BROKEN_CODE);
  if (payload.v !== 1) return new ImportError('Tuontikoodin versiota ei tueta.');
  if (typeof payload.env !== 'string' || !isObject(payload.cities)) {
    return new ImportError('Tuontikoodin sisältö on puutteellinen.');
  }

  const cities = [];
  for (const [id, value] of Object.entries(payload.cities)) {
    const city = parseCity(id, value);
    if (city instanceof ImportError) return city;
    cities.push(city);
  }
  const known = cities.filter((city) => knownCityIds.includes(city.id));
  if (known.length === 0) {
    return new ImportError('Tuontikoodissa ei ole yhtään tämän sivun kuntaa.');
  }
  return {
    env: payload.env,
    cities: known,
    unknown: cities.filter((city) => !knownCityIds.includes(city.id)).map((city) => city.id),
  };
}

export function maskToken(token) {
  return token.length > 4 ? `••••${token.slice(-4)}` : '••••';
}
