import { slackMrkdwnToMarkdown, blockKitToMarkdown } from '../../src/utils/slack-to-markdown';

describe('slackMrkdwnToMarkdown', () => {
  it('converts Slack links to Markdown links', () => {
    const input = '<https://github.com/espoon-voltti/evaka/pull/8628|#8628>';
    expect(slackMrkdwnToMarkdown(input)).toBe('[#8628](https://github.com/espoon-voltti/evaka/pull/8628)');
  });

  it('converts bare Slack links', () => {
    const input = '<https://example.com>';
    expect(slackMrkdwnToMarkdown(input)).toBe('https://example.com');
  });

  it('converts bold syntax', () => {
    expect(slackMrkdwnToMarkdown('*bold text*')).toBe('**bold text**');
  });

  it('converts italic syntax', () => {
    expect(slackMrkdwnToMarkdown('_italic text_')).toBe('*italic text*');
  });

  it('preserves em dashes', () => {
    const input = 'Title \u2014 Author';
    expect(slackMrkdwnToMarkdown(input)).toBe('Title \u2014 Author');
  });

  it('converts bullet points', () => {
    expect(slackMrkdwnToMarkdown('\u2022 item one\n\u2022 item two')).toBe('- item one\n- item two');
  });

  it('handles multi-line PR list', () => {
    const input = [
      '<https://github.com/espoon-voltti/evaka/pull/8573|#8573> Fix timestamp \u2014 _Tero Laakso_',
      '<https://github.com/espoon-voltti/evaka/pull/8560|#8560> Improve search \u2014 _Joosa Kurvinen_',
    ].join('\n');
    const expected = [
      '[#8573](https://github.com/espoon-voltti/evaka/pull/8573) Fix timestamp \u2014 *Tero Laakso*',
      '[#8560](https://github.com/espoon-voltti/evaka/pull/8560) Improve search \u2014 *Joosa Kurvinen*',
    ].join('\n');
    expect(slackMrkdwnToMarkdown(input)).toBe(expected);
  });

  it('handles combined bold and link', () => {
    const input = '*Versio:*\n<https://github.com/commit/abc1234|`abc1234`>';
    const expected = '**Versio:**\n[`abc1234`](https://github.com/commit/abc1234)';
    expect(slackMrkdwnToMarkdown(input)).toBe(expected);
  });
});

describe('blockKitToMarkdown', () => {
  it('converts header blocks', () => {
    const blocks = [
      { type: 'header', text: { type: 'plain_text', text: '\ud83d\ude80 Espoo \u2014 Tuotanto p\u00e4ivitetty' } },
    ];
    expect(blockKitToMarkdown(blocks)).toBe('# \ud83d\ude80 Espoo \u2014 Tuotanto p\u00e4ivitetty');
  });

  it('converts section with fields', () => {
    const blocks = [
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: '*Versio:*\n<https://github.com/commit/abc|`abc1234`>' },
          { type: 'mrkdwn', text: '*Havaittu:*\npe 6.3. klo 09.28' },
        ],
      },
    ];
    const result = blockKitToMarkdown(blocks);
    expect(result).toContain('**Versio:**');
    expect(result).toContain('[`abc1234`](https://github.com/commit/abc)');
    expect(result).toContain('**Havaittu:**');
  });

  it('converts section with mrkdwn text', () => {
    const blocks = [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Muutokset (ydin):*\n\u2022 <https://github.com/pull/1|#1> Fix bug \u2014 _Dev_',
        },
      },
    ];
    const result = blockKitToMarkdown(blocks);
    expect(result).toContain('**Muutokset (ydin):**');
    expect(result).toContain('- [#1](https://github.com/pull/1) Fix bug \u2014 *Dev*');
  });

  it('converts context blocks', () => {
    const blocks = [
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: '<https://dashboard.example.com#/city/espoo|Ymp\u00e4rist\u00f6jen tiedot>' },
        ],
      },
    ];
    const result = blockKitToMarkdown(blocks);
    expect(result).toContain('[Ymp\u00e4rist\u00f6jen tiedot](https://dashboard.example.com#/city/espoo)');
  });

  it('converts divider blocks', () => {
    const blocks = [{ type: 'divider' }];
    expect(blockKitToMarkdown(blocks)).toBe('---');
  });

  it('converts full deployment notification', () => {
    const blocks = [
      { type: 'header', text: { type: 'plain_text', text: '\ud83d\ude80 Espoo \u2014 Tuotanto p\u00e4ivitetty' } },
      {
        type: 'section',
        fields: [
          { type: 'mrkdwn', text: '*Versio:*\n<https://github.com/commit/abc|`abc1234`>' },
          { type: 'mrkdwn', text: '*Havaittu:*\npe 6.3. klo 09.28' },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Muutokset (ydin):*\n\u2022 <https://github.com/pull/8573|#8573> Fix DB \u2014 _Tero_',
        },
      },
      {
        type: 'context',
        elements: [
          { type: 'mrkdwn', text: '<https://dashboard#/city/espoo|Ymp\u00e4rist\u00f6jen tiedot>' },
        ],
      },
    ];
    const result = blockKitToMarkdown(blocks);
    expect(result).toContain('# \ud83d\ude80 Espoo');
    expect(result).toContain('**Versio:**');
    expect(result).toContain('**Muutokset (ydin):**');
    expect(result).toContain('[Ymp\u00e4rist\u00f6jen tiedot]');
  });
});
