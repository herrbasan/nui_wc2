
import { highlight } from './NUI/lib/modules/nui-syntax-highlight.js';

const code = `<!-- Default (No Type) -->
<nui-button>
  <button type="button">Default</button>
</nui-button>

<!-- Primary (Explicit) -->
<nui-button type="primary">
  <button type="button">Primary</button>
</nui-button>`;

const highlighted = highlight(code, 'html');
console.log(highlighted);
