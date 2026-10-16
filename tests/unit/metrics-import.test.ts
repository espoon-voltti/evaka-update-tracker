import { ImportError, maskToken, parseImport } from '../../site/js/metrics/import.js';

const KNOWN = ['espoo', 'tampere-region', 'oulu', 'turku'];
const FUNCTION_URL = 'https://abc.lambda-url.eu-north-1.on.aws/';
// {"v":1,"env":"staging","cities":{"espoo":{"url":FUNCTION_URL,"token":"secret123"}}}
const EXAMPLE_CODE =
  'eyJ2IjoxLCJlbnYiOiJzdGFnaW5nIiwiY2l0aWVzIjp7ImVzcG9vIjp7InVybCI6Imh0dHBzOi8vYWJjLmxhbWJkYS11cmwuZXUtbm9ydGgtMS5vbi5hd3MvIiwidG9rZW4iOiJzZWNyZXQxMjMifX19';
const EXAMPLE_RESULT = {
  env: 'staging',
  cities: [{ id: 'espoo', url: FUNCTION_URL, token: 'secret123' }],
  unknown: [],
};
const LINK = `https://espoon-voltti.github.io/evaka-update-tracker/#/settings?import=${EXAMPLE_CODE}`;

function encode(payload: unknown) {
  return Buffer.from(JSON.stringify(payload)).toString('base64url');
}

function encodeCities(cities: Record<string, unknown>) {
  return encode({ v: 1, env: 'prod', cities });
}

function expectError(text: string, message: string | RegExp) {
  const result = parseImport(text, KNOWN);
  expect(result).toBeInstanceOf(ImportError);
  expect((result as ImportError).message).toMatch(message);
}

describe('parseImport', () => {
  it('decodes the code that the import link script prints', () => {
    expect(parseImport(EXAMPLE_CODE, KNOWN)).toEqual(EXAMPLE_RESULT);
  });

  it('finds the code in a full link', () => {
    expect(parseImport(LINK, KNOWN)).toEqual(EXAMPLE_RESULT);
  });

  it('finds the code in a Slack message with text around the link', () => {
    const message = `Uudet mittariasetukset:\n<${LINK}|tuontilinkki> (staging), voimassa toistaiseksi.`;
    expect(parseImport(message, KNOWN)).toEqual(EXAMPLE_RESULT);
  });

  it('accepts the bare code with whitespace around it', () => {
    expect(parseImport(`  ${EXAMPLE_CODE}\n`, KNOWN)).toEqual(EXAMPLE_RESULT);
  });

  it('decodes a code of any length without padding', () => {
    for (const token of ['abcde', 'abcdef', 'abcdefg']) {
      const result = parseImport(encodeCities({ oulu: { url: FUNCTION_URL, token } }), KNOWN);
      expect(result).toMatchObject({ cities: [{ id: 'oulu', token }] });
    }
  });

  it('rejects text that is not base64url', () => {
    expectError('not a code', /virheellinen/);
    expectError(EXAMPLE_CODE.slice(0, 5), /virheellinen/);
  });

  it('rejects a code that is not JSON, such as a truncated one', () => {
    expectError(EXAMPLE_CODE.slice(0, 40), /virheellinen/);
    expectError(encode('just a string'), /virheellinen/);
  });

  it('rejects a version other than 1', () => {
    expectError(encode({ v: 2, env: 'prod', cities: {} }), 'Tuontikoodin versiota ei tueta.');
  });

  it('rejects a payload without env or cities', () => {
    expectError(encode({ v: 1, cities: {} }), /puutteellinen/);
    expectError(encode({ v: 1, env: 'prod', cities: [] }), /puutteellinen/);
  });

  it('rejects an http URL', () => {
    expectError(
      encodeCities({ espoo: { url: 'http://abc.lambda-url.eu-north-1.on.aws/', token: 'x' } }),
      'Kunnan espoo osoite ei ole Lambda-funktion https-osoite.'
    );
  });

  it('rejects a host that is not a Lambda Function URL', () => {
    for (const url of [
      'https://example.com/',
      'https://abc.lambda-url.eu-north-1.on.aws.example.com/',
      'https://lambda-url.eu-north-1.on.aws.example.com/',
      'https://example.com/.lambda-url.eu-north-1.on.aws',
      'https://x@example.com/',
      'https://example.com\\@abc.lambda-url.eu-north-1.on.aws/',
      'https://abc.lambda-url.eu-north-1.on.aws./',
      // A Cyrillic letter that looks like the "a" of "aws"
      'https://abc.lambda-url.eu-north-1.on.\u0430ws/',
      'javascript:alert(1)//abc.lambda-url.eu-north-1.on.aws',
      'data:text/html,abc.lambda-url.eu-north-1.on.aws',
      'not a url',
    ]) {
      expectError(encodeCities({ espoo: { url, token: 'x' } }), /Kunnan espoo osoite/);
    }
  });

  it('rejects a Function URL with credentials, a port, a path, a query or a fragment', () => {
    for (const url of [
      'https://example.com@abc.lambda-url.eu-north-1.on.aws/',
      'https://user:pass@abc.lambda-url.eu-north-1.on.aws/',
      'https://abc.lambda-url.eu-north-1.on.aws:8443/',
      'https://abc.lambda-url.eu-north-1.on.aws/files',
      'https://abc.lambda-url.eu-north-1.on.aws/?x=1',
      'https://abc.lambda-url.eu-north-1.on.aws/#x',
    ]) {
      expectError(encodeCities({ espoo: { url, token: 'x' } }), /Kunnan espoo osoite/);
    }
  });

  it('gives the Function URL in normal form', () => {
    for (const url of [
      'https://ABC.LAMBDA-URL.EU-NORTH-1.ON.AWS',
      'https://abc.lambda-url.eu-north-1.on.aws:443/',
      'https://abc.lambda-url.eu-north-1.on%2Eaws/',
    ]) {
      const result = parseImport(encodeCities({ espoo: { url, token: 'secret' } }), KNOWN);
      expect(result).toMatchObject({ cities: [{ id: 'espoo', url: FUNCTION_URL }] });
    }
  });

  it('rejects an empty or missing token', () => {
    expectError(encodeCities({ espoo: { url: FUNCTION_URL, token: ' ' } }), 'Kunnan espoo tunniste puuttuu.');
    expectError(encodeCities({ espoo: { url: FUNCTION_URL } }), 'Kunnan espoo tunniste puuttuu.');
  });

  it('lists a city that this page does not know as unknown', () => {
    const code = encodeCities({
      vantaa: { url: FUNCTION_URL, token: 'secret' },
      oulu: { url: FUNCTION_URL, token: 'secret' },
    });
    expect(parseImport(code, KNOWN)).toEqual({
      env: 'prod',
      cities: [{ id: 'oulu', url: FUNCTION_URL, token: 'secret' }],
      unknown: ['vantaa'],
    });
  });

  it('lists prototype property names as unknown cities without changing any prototype', () => {
    const json = `{"v":1,"env":"prod","cities":{"__proto__":{"url":"${FUNCTION_URL}","token":"a"},"constructor":{"url":"${FUNCTION_URL}","token":"b"},"oulu":{"url":"${FUNCTION_URL}","token":"c"}}}`;
    expect(parseImport(Buffer.from(json).toString('base64url'), KNOWN)).toEqual({
      env: 'prod',
      cities: [{ id: 'oulu', url: FUNCTION_URL, token: 'c' }],
      unknown: ['__proto__', 'constructor'],
    });
    expect(({} as Record<string, unknown>).url).toBeUndefined();
  });

  it('uses the last value of a city that appears twice', () => {
    const otherUrl = 'https://other.lambda-url.eu-north-1.on.aws/';
    const json = `{"v":1,"env":"prod","cities":{"oulu":{"url":"${otherUrl}","token":"first"},"oulu":{"url":"${FUNCTION_URL}","token":"last"}}}`;
    expect(parseImport(Buffer.from(json).toString('base64url'), KNOWN)).toMatchObject({
      cities: [{ id: 'oulu', url: FUNCTION_URL, token: 'last' }],
    });
  });

  it('rejects a code that is not UTF-8', () => {
    expectError(Buffer.from([0x7b, 0xe4, 0x7d]).toString('base64url'), /virheellinen/);
  });

  it('rejects a code that has only unknown cities', () => {
    expectError(encodeCities({ vantaa: { url: FUNCTION_URL, token: 'secret' } }), /ei ole yhtään/);
    expectError(encodeCities({}), /ei ole yhtään/);
  });

  it('rejects the whole import when one city is invalid', () => {
    const code = encodeCities({
      espoo: { url: FUNCTION_URL, token: 'secret' },
      oulu: { url: 'http://abc.lambda-url.eu-west-1.on.aws/', token: 'secret' },
    });
    expectError(code, /Kunnan oulu osoite/);
  });
});

describe('maskToken', () => {
  it('shows only the last 4 characters', () => {
    expect(maskToken('secret123')).toBe('••••t123');
  });

  it('hides a token of 4 characters or less completely', () => {
    expect(maskToken('abcd')).toBe('••••');
  });
});
