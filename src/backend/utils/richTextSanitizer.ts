import sanitizeHtml from 'sanitize-html';

export const RICH_TEXT_FIELDS = new Set([
  'description',
  'shortDescription',
  'content',
  'excerpt',
  'answer',
]);

export interface RichTextSanitizeOptions {
  allowImages?: boolean;
  allowLinks?: boolean;
}

/**
 * Centralized Rich-Text Sanitizer & Validator Utility
 * Prevents Stored XSS while preserving legitimate HTML formatting.
 */
export function sanitizeRichText(html: string | null | undefined, _options?: RichTextSanitizeOptions): string {
  if (html === null || html === undefined) return '';
  if (typeof html !== 'string') return String(html);
  if (!html.trim()) return '';

  return sanitizeHtml(html, {
    allowedTags: [
      // Formatting & Structure
      'p', 'br', 'span', 'div', 'hr',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
      'ul', 'ol', 'li',
      'strong', 'b', 'em', 'i', 'u', 's', 'strike', 'code', 'pre', 'mark', 'sub', 'sup', 'del', 'ins',
      'blockquote',
      // Links & Media
      'a', 'img',
      // Tables (if pasted into rich text)
      'table', 'thead', 'tbody', 'tfoot', 'tr', 'th', 'td',
    ],
    allowedAttributes: {
      a: ['href', 'name', 'target', 'rel', 'title', 'class'],
      img: ['src', 'alt', 'title', 'width', 'height', 'style', 'class', 'data-alignment'],
      p: ['class', 'style', 'data-alignment'],
      div: ['class', 'style', 'data-alignment'],
      span: ['class', 'style', 'data-alignment'],
      h1: ['class', 'style', 'data-alignment'],
      h2: ['class', 'style', 'data-alignment'],
      h3: ['class', 'style', 'data-alignment'],
      h4: ['class', 'style', 'data-alignment'],
      h5: ['class', 'style', 'data-alignment'],
      h6: ['class', 'style', 'data-alignment'],
      blockquote: ['class', 'style'],
      ul: ['class', 'style'],
      ol: ['class', 'style'],
      li: ['class', 'style'],
      code: ['class'],
      pre: ['class'],
      table: ['class', 'style'],
      td: ['colspan', 'rowspan', 'style', 'class'],
      th: ['colspan', 'rowspan', 'style', 'class'],
    },
    allowedSchemes: ['http', 'https', 'mailto', 'tel'],
    allowedSchemesByTag: {
      a: ['http', 'https', 'mailto', 'tel'],
      img: ['http', 'https', 'data'],
    },
    allowedSchemesAppliedToAttributes: ['href', 'src'],
    allowProtocolRelative: true,
    allowedStyles: {
      '*': {
        'text-align': [/^(left|right|center|justify)$/],
        'color': [/^#(?:[0-9a-fA-F]{3}){1,2}$/, /^rgb\(/, /^rgba\(/, /^hsl\(/, /^var\(--/],
        'background-color': [/^#(?:[0-9a-fA-F]{3}){1,2}$/, /^rgb\(/, /^rgba\(/, /^hsl\(/, /^var\(--/],
        'width': [/^\d+(?:px|em|rem|%|vw)$/],
        'max-width': [/^\d+(?:px|em|rem|%|vw)$/],
        'height': [/^\d+(?:px|em|rem|%|vh)$/],
        'float': [/^(left|right|none)$/],
        'margin': [/^[\d\s\w.px%rem-]{1,30}$/],
        'padding': [/^[\d\s\w.px%rem-]{1,30}$/],
      },
    },
    transformTags: {
      '*': (tagName, attribs) => {
        if (attribs.class) {
          attribs.class = attribs.class.replace(/\b(text-gray-\d+|text-muted-foreground|text-foreground|text-slate-\d+|text-zinc-\d+|text-neutral-\d+)\b/g, '').replace(/\s+/g, ' ').trim();
          if (!attribs.class) delete attribs.class;
        }
        if (attribs.style) {
          attribs.style = attribs.style.replace(/color:\s*(?:rgb|rgba|hsl|hsla|var|gray|transparent)[^;]*(;|$)/gi, '').replace(/\s+/g, ' ').trim();
          if (!attribs.style) delete attribs.style;
        }
        return { tagName, attribs };
      },
      a: (tagName, attribs) => {
        if (attribs.target === '_blank') {
          attribs.rel = 'noopener noreferrer';
        }
        if (attribs.href && /^(javascript|data):/i.test(attribs.href.trim())) {
          delete attribs.href;
        }
        return { tagName, attribs };
      },
      img: (tagName, attribs) => {
        if (attribs.src && /^javascript:/i.test(attribs.src.trim())) {
          delete attribs.src;
        }
        return { tagName, attribs };
      },
    },
  });
}

/**
 * Validates links and image URLs in a rich text string.
 * Returns true if all links/images use allowed schemes and valid syntax.
 */
export function validateRichTextUrls(html: string): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!html) return { isValid: true, errors: [] };

  if (/href\s*=\s*["']?\s*javascript:/i.test(html) || /src\s*=\s*["']?\s*javascript:/i.test(html)) {
    errors.push('javascript: protocol is not allowed in links or images');
  }

  if (/<script\b[^>]*>/i.test(html)) {
    errors.push('script tags are forbidden');
  }

  if (/\son[a-z]+\s*=/i.test(html)) {
    errors.push('event handler attributes are forbidden');
  }

  return {
    isValid: errors.length === 0,
    errors,
  };
}

/**
 * Recursively sanitizes objects, applying rich-text sanitization to designated fields
 */
export function sanitizeObjectWithRichText<T>(obj: T, richTextKeys: Set<string> = RICH_TEXT_FIELDS): T {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') {
    return obj as any;
  }

  if (Array.isArray(obj)) {
    return obj.map((item) => sanitizeObjectWithRichText(item, richTextKeys)) as any;
  }

  if (typeof obj === 'object') {
    const result: any = {};
    for (const key of Object.keys(obj)) {
      const val = (obj as any)[key];
      if (richTextKeys.has(key) && typeof val === 'string') {
        result[key] = sanitizeRichText(val);
      } else {
        result[key] = sanitizeObjectWithRichText(val, richTextKeys);
      }
    }
    return result;
  }

  return obj;
}
