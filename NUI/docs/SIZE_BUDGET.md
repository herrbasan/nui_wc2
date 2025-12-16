# NUI Size Budget & Performance Targets

## Current Status (November 12, 2025)

**Core Library:**
- `nui.js`: **31 KB** (1,026 lines)
- `material-icons-sprite.svg`: **29.57 KB** (72 icons)
- **Total Core**: ~60 KB uncompressed

**Budget Tracking:**
- ✅ **Target**: 64 KB uncompressed
- ✅ **Remaining**: ~4 KB for additional core features
- 🎯 **HTTP/2 Frame Alignment**: 64 KB = 1 frame

## HTTP/2 Performance Boundaries

**Optimal size boundaries (powers of 2):**
- 16 KB → Single frame (very fast)
- 32 KB → 2 frames (fast)
- 64 KB → 4 frames (target) ← **We are here**
- 128 KB → 8 frames (acceptable with compression)

**Philosophy:**
- Uncompressed target: 64 KB (meaningful boundary for planning)
- Compressed delivery: gzip typically achieves 3-4x reduction
- 64 KB uncompressed → ~16-20 KB gzipped (fits in single frame!)

## Size Budget Breakdown

### Core Library Components (31 KB)

**Infrastructure (~12 KB):**
- Component factory and registration
- Attribute proxy system
- The Knower (state management)
- Event attribute processing
- Action system (toggle, set-attr, remove-attr)

**Accessibility Utilities (~5 KB):**
- Centralized a11y object
- hasLabel, hasFocusableChild, getTextLabel
- makeInteractive, generateIconLabel
- ensureButtonLabel, ensureLandmarkLabel
- upgrade() main entry point

**Core Components (~14 KB):**
- nui-button (minimal wrapper)
- nui-icon (sprite system with attribute proxy)
- nui-app (layout system with responsive breakpoints)
- nui-top-nav (banner landmark)
- nui-side-nav (navigation landmark)
- nui-link-list (tree mode with accordion, ~8 KB)
- nui-content (positioning context)
- nui-main (scroll container with main landmark)
- nui-app-footer (contentinfo landmark)

### Planned Additions (Budget Available: ~4 KB)

**High Priority (Essential):**
- ✅ None - core is complete!

**Future Considerations (Module System):**
- nui-modal (~2-3 KB) → Optional module
- nui-tabs (~1-2 KB) → Optional module
- nui-tooltip (~1 KB) → Optional module
- nui-dropdown (~1-2 KB) → Optional module

**Strategy:**
- Keep core minimal and proven
- Additional components as optional modules
- Developers load only what they need
- Each module: independent, self-contained, <5 KB

## Compression Analysis

**Expected gzip ratios:**
```
Component Type          Compression
────────────────────────────────────
Infrastructure          3.5-4x (repetitive patterns)
Accessibility           3.5x (function calls, string constants)
DOM manipulation        3x (varied logic)
Navigation trees        3.5x (repetitive structure)
────────────────────────────────────
Overall estimate:       ~3.5x average
```

**Projected compressed sizes:**
- nui.js: 31 KB → ~9 KB gzipped
- icons: 29.57 KB → ~8 KB gzipped
- **Total: ~17 KB gzipped** (single HTTP/2 frame!)

## Size Optimization Strategies

### Already Applied ✅
- Removed verbose comments (~3 KB saved)
- Centralized a11y utilities (eliminated duplication)
- Efficient attribute proxy (no MutationObserver overhead)
- Smart tree mode setup (reusable functions)
- Minimal DOM queries (early exits, caching)

### Available if Needed
- **Variable name shortening** (save ~1-2 KB)
  - `setupAttributeProxy` → `setupAttrProxy`
  - `hasFocusableChild` → `hasFocusable`
  - `generateIconLabel` → `genIconLabel`
  - Only if approaching limit

- **Function extraction** (improve compression)
  - Repeated patterns → named functions
  - Better gzip compression ratio
  - Marginal gains, already well-structured

- **Literal deduplication** (save ~0.5-1 KB)
  - Repeated strings → constants
  - e.g., 'aria-label', 'aria-expanded'
  - Only if needed for budget

### NOT Recommended
- ❌ Removing section headers (hurts readability)
- ❌ Single-letter variables (destroys clarity)
- ❌ Aggressive minification by hand (let tools handle it)
- ❌ Removing early returns (clarity > bytes)
- ❌ Cryptic abbreviations (maintainability matters)

## Module System Strategy

**Core Principle:**
> If it's not essential for 80% of projects, it's a module.

**Core (31 KB):**
- Layout system (nui-app, nui-top-nav, nui-side-nav, nui-content)
- Button primitives (nui-button)
- Icon system (nui-icon with sprite)
- Navigation (nui-link-list with tree mode)
- Accessibility utilities (a11y)

**Modules (Pay-per-use):**
- nui-modal.js (~2-3 KB) - Dialog/modal overlays
- nui-tabs.js (~1-2 KB) - Tab navigation
- nui-tooltip.js (~1 KB) - Contextual tooltips
- nui-dropdown.js (~1-2 KB) - Dropdown menus
- nui-forms.js (~3-4 KB) - Form validation and enhancement
- nui-table.js (~2-3 KB) - Sortable, filterable tables
- nui-charts.js (~4-5 KB) - Simple data visualization

**Module Loading Pattern:**
```html
<!-- Core (required) -->
<script type="module" src="/NUI/nui.js"></script>

<!-- Modules (optional) -->
<script type="module" src="/NUI/modules/nui-modal.js"></script>
<script type="module" src="/NUI/modules/nui-tabs.js"></script>
```

Each module:
- Calls `registerComponent()` from core
- Self-contained with no cross-dependencies
- Uses core a11y utilities
- Can be loaded dynamically on-demand

## Performance Monitoring

**Metrics to Track:**
- Uncompressed size (for planning)
- Gzipped size (for delivery)
- Brotli size (modern alternative)
- Parse time (Chrome DevTools)
- HTTP/2 frame count

**Targets:**
- ✅ Uncompressed: <64 KB
- 🎯 Gzipped: <20 KB (currently ~17 KB projected)
- 🎯 Brotli: <15 KB (better than gzip)
- 🎯 Parse time: <10ms on average device

**Tools:**
```bash
# Check uncompressed size
ls -lh nui.js

# Check gzipped size (simulation)
gzip -c nui.js | wc -c

# Check brotli size (if available)
brotli -c nui.js | wc -c
```

## Historical Size Growth

**Timeline:**
- Initial framework setup: ~10 KB
- Added icon system: +8 KB (sprite integration)
- Added navigation tree: +8 KB (tree mode, accordion)
- Added accessibility: +5 KB (a11y utilities, upgrades)
- **Current**: 31 KB

**Growth Rate:**
- Average: ~1 KB per component
- Navigation was larger due to tree complexity
- Future components should be ~1-2 KB each with current architecture

## Decision Framework

**When adding new features:**

1. **Is it core?**
   - Used by >80% of projects? → Core
   - Nice-to-have? → Module
   - Project-specific? → Custom extension

2. **What's the cost?**
   - <1 KB → Acceptable for core
   - 1-3 KB → Consider carefully, maybe module
   - >3 KB → Definitely a module

3. **Can we reuse existing code?**
   - Leverage a11y utilities
   - Use component factory patterns
   - Share DOM manipulation patterns

4. **Compression factor?**
   - Repetitive code → Good compression
   - Varied logic → Lower compression
   - String literals → Medium compression

## 56k Modem Nostalgia 📞

**Historical context:**
- 56k modem: ~7 KB/s actual throughput
- Our 17 KB gzipped: ~2.4 seconds download
- Feels like instant in modern context
- Respect for global users on slow connections

**Modern reality:**
- 4G mobile: <100ms
- Home broadband: <50ms
- HTTP/2 + gzip: Single round trip

**Philosophy:**
> Size discipline isn't just nostalgia—it's respect for users worldwide and mobile data costs.

## Conclusion

**Current Status: 🟢 Excellent**
- 31 KB core is lean and feature-complete
- 4 KB budget remaining for careful additions
- Compression will deliver ~17 KB to users
- Single HTTP/2 frame delivery achievable

**Strategy: 🎯 Module System**
- Core is complete and stable
- Future features as optional modules
- Users load only what they need
- Each module independently sized and budgeted

**Philosophy: ✨ Quality over Quantity**
- Better to have 8 rock-solid components than 20 mediocre ones
- Size constraints drive better design decisions
- Performance budget maintained through discipline
- Zero dependencies = full control = predictable size

---

**Last Updated:** November 12, 2025  
**Next Review:** When considering new core features
