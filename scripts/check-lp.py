"""Static integrity checks for the public LP. Run: python scripts/check-lp.py."""
from collections import Counter
from html.parser import HTMLParser
from pathlib import Path
import json

ROOT = Path(__file__).resolve().parents[1]
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'param', 'source', 'track', 'wbr'}

class Page(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.elements, self.stack, self.errors = [], [], []

    def handle_starttag(self, tag, attrs):
        self.elements.append((tag, dict(attrs)))
        if tag not in VOID:
            self.stack.append(tag)

    def handle_endtag(self, tag):
        if not self.stack or self.stack[-1] != tag:
            self.errors.append(f'Unbalanced closing tag: {tag}')
        else:
            self.stack.pop()

page = Page()
page.feed((ROOT / 'index.html').read_text(encoding='utf-8'))
errors = page.errors
if page.stack:
    errors.append(f'Unclosed tags: {page.stack}')
ids = Counter(a['id'] for _, a in page.elements if 'id' in a)
errors += [f'Duplicate ID: {value}' for value, count in ids.items() if count > 1]
cta_count = 0
for tag, attrs in page.elements:
    for key in ('aria-controls', 'aria-labelledby'):
        for target in attrs.get(key, '').split():
            if target not in ids:
                errors.append(f'Broken {key}: {target}')
    for key in ('href', 'src'):
        value = attrs.get(key, '')
        if value.startswith('#') and value[1:] not in ids:
            errors.append(f'Broken anchor: {value}')
        elif value and not value.startswith(('#', 'https:', 'http:', 'data:', 'mailto:')):
            if not (ROOT / value.split('#')[0].split('?')[0]).is_file():
                errors.append(f'Missing local asset: {value}')
    if tag == 'img' and 'alt' not in attrs:
        errors.append(f'Missing image alt: {attrs.get("src")}')
    if tag == 'a' and attrs.get('href', '').startswith('https://lin.ee/'):
        cta_count += 1
        if not attrs.get('data-cta') or 'noopener' not in attrs.get('rel', ''):
            errors.append('LINE link missing tracking or rel')
    if tag == 'button' and 'faq-question' in attrs.get('class', ''):
        if not attrs.get('aria-controls') or attrs.get('aria-expanded') not in ('true', 'false'):
            errors.append('FAQ button missing accessible state')
print(json.dumps({'errors': errors, 'ids': len(ids), 'line_ctas': cta_count,
                  'elements': len(page.elements)}, ensure_ascii=False, indent=2))
raise SystemExit(bool(errors))
