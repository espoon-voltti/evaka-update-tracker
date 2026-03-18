/**
 * Convert Slack Block Kit blocks and mrkdwn text to standard Markdown.
 */

interface TextObject {
  type: string;
  text: string;
}

interface Block {
  type: string;
  text?: TextObject;
  fields?: TextObject[];
  elements?: TextObject[];
}

/**
 * Convert Slack mrkdwn syntax to standard Markdown.
 * - <url|text> → [text](url)
 * - <url> → <url>
 * - *bold* → **bold**
 * - _italic_ → *italic*
 * - • (bullet) preserved as-is
 * - — (em dash) preserved as-is
 */
export function slackMrkdwnToMarkdown(text: string): string {
  let result = text;

  // Convert Slack links: <url|text> → [text](url)
  result = result.replace(/<([^|>]+)\|([^>]+)>/g, '[$2]($1)');

  // Convert bare Slack links: <url> → url
  result = result.replace(/<([^|>]+)>/g, '$1');

  // Convert bold: *text* → **text**
  // Only match when * is not preceded/followed by space (Slack bold semantics)
  result = result.replace(/(?<!\*)\*([^\s*](?:[^*]*[^\s*])?)\*(?!\*)/g, '**$1**');

  // Convert italic: _text_ → *text*
  result = result.replace(/(?<!_)_([^\s_](?:[^_]*[^\s_])?)_(?!_)/g, '*$1*');

  // Convert bullet points: • → -
  result = result.replace(/•/g, '-');

  return result;
}

/**
 * Convert Slack Block Kit blocks to standard Markdown.
 */
export function blockKitToMarkdown(blocks: Block[]): string {
  const sections: string[] = [];

  for (const block of blocks) {
    switch (block.type) {
      case 'header':
        if (block.text) {
          sections.push(`# ${block.text.text}`);
        }
        break;

      case 'section':
        if (block.fields) {
          const fieldTexts = block.fields
            .map((f) => slackMrkdwnToMarkdown(f.text))
            .join('\n\n');
          sections.push(fieldTexts);
        } else if (block.text) {
          sections.push(slackMrkdwnToMarkdown(block.text.text));
        }
        break;

      case 'context':
        if (block.elements) {
          const contextText = block.elements
            .map((e) => slackMrkdwnToMarkdown(e.text))
            .join(' | ');
          sections.push(`*${contextText}*`);
        }
        break;

      case 'divider':
        sections.push('---');
        break;
    }
  }

  return sections.join('\n\n');
}
