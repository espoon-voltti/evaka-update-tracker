import { escapeHtml } from '../../site/js/utils.js';

describe('escapeHtml', () => {
  it('returns empty string for null', () => {
    expect(escapeHtml(null)).toBe('');
  });

  it('returns empty string for undefined', () => {
    expect(escapeHtml(undefined)).toBe('');
  });

  it('returns empty string for empty input', () => {
    expect(escapeHtml('')).toBe('');
  });

  it('passes through plain text unchanged', () => {
    expect(escapeHtml('Hello, world!')).toBe('Hello, world!');
  });

  it('escapes ampersand', () => {
    expect(escapeHtml('a & b')).toBe('a &amp; b');
  });

  it('escapes less-than', () => {
    expect(escapeHtml('a < b')).toBe('a &lt; b');
  });

  it('escapes greater-than', () => {
    expect(escapeHtml('a > b')).toBe('a &gt; b');
  });

  it('escapes double quote (safe for attribute interpolation)', () => {
    expect(escapeHtml('say "hi"')).toBe('say &quot;hi&quot;');
  });

  it('escapes ampersand before other entities (no double-escaping)', () => {
    expect(escapeHtml('&lt;')).toBe('&amp;lt;');
  });

  it('escapes a script tag injection attempt', () => {
    expect(escapeHtml('<script>alert(1)</script>')).toBe(
      '&lt;script&gt;alert(1)&lt;/script&gt;'
    );
  });

  it('escapes attribute-injection payload', () => {
    expect(escapeHtml('" onerror="x"')).toBe('&quot; onerror=&quot;x&quot;');
  });

  it('escapes all special characters in one string', () => {
    expect(escapeHtml('<a href="b&c">x</a>')).toBe(
      '&lt;a href=&quot;b&amp;c&quot;&gt;x&lt;/a&gt;'
    );
  });
});
