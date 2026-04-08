# Mobile Select Design Plan

## Design Foundation: Bottom Sheet Pattern

Following the [Material Design Bottom Sheet pattern](https://mobbin.com/glossary/bottom-sheet) and matching native `<select>` behavior on iOS/Android.

**Native select behavior reference:**
- iOS: Scrollable picker wheel slides up from bottom
- Android: Bottom sheet with list of options
- Both: Backdrop overlay, dismiss by tapping outside or explicit close
- Single select: Closes on selection
- Multi-select: Requires explicit "Done" action

**Our implementation:** Match this familiar pattern while adding enhanced features (search, tags, custom styling).

## Problem Statement

The current `nui-select` popup needs a mobile-specific UI pattern that:
- Works independently of scroll position and viewport constraints
- Covers the entire screen including app-layout elements (topbar, sidebar)
- Provides optimal UX for touch interaction and on-screen keyboard
- Handles both single and multi-select modes appropriately
- **Matches platform expectations** - users already understand this pattern from native selects

## Design Requirements

### Structure Overview

A completely independent modal structure that:
1. **Backdrop**: Full-page overlay covering all content
2. **Modal Container**: Anchored at bottom of viewport, independent of scroll
3. **Content Order** (top-to-bottom within modal):
   - Selected tags (if multi-select) - collapsed by default at top
   - Options list (primary interaction) - scrollable, main area
   - Search input (if searchable) - near the bottom
   - Label/Name with close control - bottom edge (anchor/handle)

**Rationale for order:**
- **Label/Close at bottom** = Natural anchor point for bottom sheet (like a handle)
- **Search near bottom** = Easy thumb reach, close to where fingers naturally rest
- **Options in middle** = Main scrollable area, gets most space
- **Tags at top** = Collapsed status, out of primary interaction zone
- When keyboard opens (search focused), tags scroll up and may be partially hidden (fine - not needed during typing)

### Interaction Patterns

**Single Select Mode:**
- Selecting an option immediately closes the modal
- Close control (down arrow/X) dismisses without selection

**Multi-Select Mode:**
- Selecting options toggles checkboxes, modal stays open
- Close control required to confirm and dismiss
- Selected tags visible in modal for immediate feedback

### Visual Positioning

- **Bottom Sheet**: Anchored to bottom of viewport (matches native select behavior)
- **Slide-up animation**: Mimics iOS/Android native sheet behavior
- **Max-height**: ~80vh to allow scrolling while preventing full-screen takeover
- Backdrop fades in simultaneously
- Z-index above all app-layout elements (topbar: z-index 10, select should be 9999+)
- **Rounded top corners**: Visual cue that it's a sheet sitting on top of content

## Technical Approach

### DOM Structure

```html
<!-- Appended to document.body on mobile open -->
<div class="nui-select-mobile-backdrop"></div>
<div class="nui-select-mobile-modal">
  <div class="nui-select-tags-header">            <!-- If multi-select, at top -->
    <button class="nui-select-tags-toggle">
      <span>3 items selected</span>
      <span class="chevron">⌄</span>
    </button>
    <div class="nui-select-popup-tags" hidden>...</div>  <!-- Expandable -->
  </div>
  <div class="nui-select-options">...</div>       <!-- Primary interaction, scrollable -->
  <div class="nui-select-search">...</div>        <!-- If searchable, near bottom -->
  <div class="nui-select-mobile-footer">
    <span class="nui-select-mobile-label">Select Option</span>
    <button class="nui-select-mobile-close">Done / ↓</button>
  </div>
</div>
```

**Visual representation:**
```
┌─────────────────────────┐ ← Top of modal
│ 3 items selected    ⌄  │   Tags (collapsed)
├─────────────────────────┤
│ ☑ Apple                 │
│ ☐ Apricot               │   Options (scrollable)
│ ☑ Banana                │
│ ...                     │
├─────────────────────────┤
│ [Search...          🔍] │   Search
├─────────────────────────┤
│ Select Fruits      Done │   Label/Close (anchor)
└─────────────────────────┘ ← Bottom of screen
```

### Detection & Activation

**Opt-in via attribute (recommended for testing):**
```html
<nui-select mobile-sheet>
  <select>...</select>
</nui-select>
```

**When to use mobile mode:**
- Element has `mobile-sheet` attribute (opt-in)
- AND viewport width < 400px (safety check)

**Future: Make it default behavior**
- After testing confirms it works well
- Remove attribute requirement
- Auto-activate on mobile viewports

**DOM manipulation:**
1. Create modal container on first mobile open (element reuse pattern)
2. Move/copy necessary elements into modal
3. Append backdrop + modal to `document.body`
4. On close: remove from body, return elements to original location

### Test Cases for Demo

Create dedicated demo section: **"Mobile Bottom Sheet (Experimental)"**

**Test Case 1: Single Select (No Search)**
```html
<nui-select mobile-sheet>
  <select>
    <option value="apple">Apple</option>
    <option value="banana">Banana</option>
    <option value="cherry">Cherry</option>
    <!-- 20-30 options to test scrolling -->
  </select>
</nui-select>
```
- Tests: Bottom sheet behavior, backdrop, slide animation
- Tests: Selection closes immediately
- Tests: Keyboard-free interaction
- Tests: Scrolling with many options

**Test Case 2: Single Select (With Search)**
```html
<nui-select mobile-sheet searchable>
  <select>
    <option value="">Select a country</option>
    <!-- 100+ countries to test search necessity -->
  </select>
</nui-select>
```
- Tests: Search filtering behavior
- Tests: Keyboard appearance/dismissal
- Tests: Space allocation with keyboard
- Tests: Search → select → close flow

**Test Case 3: Multi-Select (Search + Tags)**
```html
<nui-select mobile-sheet searchable>
  <select multiple>
    <option value="">Select technologies</option>
    <!-- 50+ options -->
  </select>
</nui-select>
```
- Tests: Collapsible tags (collapsed by default)
- Tests: Tag expand/collapse interaction
- Tests: Tag removal (× button)
- Tests: Search + select multiple items
- Tests: Space with keyboard + tags
- Tests: "Done" button closes
- Tests: Most complex scenario

### Styling Strategy

**Fixed positioning:**
```css
.nui-select-mobile-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 9998;
}

.nui-select-mobile-modal {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  max-height: 80vh; /* Allow content area scrolling */
  background: var(--color-white);
  z-index: 9999;
  border-radius: var(--border-radius2) var(--border-radius2) 0 0;
}
```

**Animation:**
- Backdrop: fade in opacity
- Modal: slide up `translateY(100%) → translateY(0)`
- Duration: ~200ms to match dialog pattern

## Discussion Points

### 1. Element Reuse vs Recreation

**Option A: Reuse existing popup elements**
- Move `nui-select-options`, `nui-select-search`, etc. into modal
- Advantage: Single source of truth, no duplication
- Challenge: Need to move elements back on close

**Option B: Create parallel mobile structure**
- Build separate mobile DOM with same data
- Advantage: Clean separation, no DOM juggling
- Challenge: Duplicate code, sync issues

**Recommendation:** Option A with careful DOM management. Align with "element reuse" pattern.

### 2. Keyboard Behavior

**On-screen keyboard considerations:**
- **Critical constraint:** Keyboard takes ~40-50% of viewport height
- **Available space with keyboard open:** ~300-350px on typical phone
- **Space allocation:**
  - Header: ~48px
  - Search: ~48px (if searchable)
  - Tags: Variable (could be 50-150px with multiple selections)
  - Options: Whatever remains (~150-200px)

**Space Optimization Strategies:**

**Option A: Collapsible Tags** (Recommended)
```
┌─────────────────────────┐
│ Select Fruits      Done │ 48px
├─────────────────────────┤
│ [Search...          🔍] │ 48px
├─────────────────────────┤
│ 3 items selected    ⌄  │ 32px ← Collapsed by default
└─────────────────────────┘
│ ☑ Apple                 │ ~200px available for scrolling
│ ☐ Apricot               │
```
- Tags collapsed to count badge by default
- Tap to expand and see full tag list
- Saves ~50-100px of precious vertical space

**Option B: Smart Visibility**
- Hide tags section when search input is focused
- Show tags when search is blurred
- Problem: User can't see what they've selected while searching

**Option C: Limited Tag Display**
```
┌─────────────────────────┐
│ [Apple ×] [Banana ×]    │
│ +3 more                 │ ← Fixed 2-line max
└─────────────────────────┘
```
- Show max 2 lines of tags
- "+N more" indicator
- Tap to expand to full list

**Recommendation:** 
- Start with **Option A** (collapsible tags)
- Default state: collapsed (just shows "N items selected")
- Expandable if user needs to review/remove specific items
- Maximizes space for options list (the primary interaction)

**Question:** Should search auto-focus (shows keyboard immediately) or wait for user tap?
- **Don't auto-focus** - Let user see full list first, then search if needed
- Keyboard only appears when user taps search input
- Preserves vertical space for browsing options

### 3. Viewport Breakpoint

Current plan: `< 400px` triggers mobile mode.

**Alternatives:**
- Use `max-width: 430px` to catch more phones
- Combine width + touch detection: `window.matchMedia('(pointer: coarse)')`
- User override: `<nui-select force-mobile>` attribute?

**Question:** Should we also consider landscape orientation? Small width + landscape = cramped.

### 4. Close Gesture

**Current plan:** Down arrow (↓) button in header

**Native select behavior:**
- iOS: "Done" button (text)
- Android: Tap backdrop or back button
- Both: Tapping outside (backdrop) dismisses

**Recommendation for our implementation:**
- **Button**: Down chevron (↓) or "Done" text for multi-select
- **Backdrop tap**: Always closes (matches native)
- **Swipe down**: Future enhancement (v2) - adds polish but not critical

**Question:** For single-select, should we show close button at all? (Selection auto-closes anyway)

### 5. Animation Exit

**On close:**
- Should we animate out (slide down + fade)?
- Or instant removal for faster interaction?

**Dialog pattern:** Uses closing animation with `closing` class

**Recommendation:** Match dialog pattern with exit animation for consistency.

### 6. Integration with Existing Code

**Current open() function:**
```javascript
const open = () => {
  const isMobile = window.innerWidth < 400;
  if (isMobile) {
    openMobileModal();
  } else {
    // existing desktop logic
  }
};
```

**Separate functions:**
- `openMobileModal()` - Handle mobile-specific DOM setup
- `closeMobileModal()` - Cleanup and animate out
- `openDesktop()` / `closeDesktop()` - Current implementation

**Clean separation of concerns**

## Implementation Phases

### Phase 1: Basic Structure (Opt-in)
- Add `mobile-sheet` attribute detection
- Create mobile modal container (reusable element)
- Backdrop with click-to-close
- Header with label and close button
- Bottom-anchored positioning
- Simple show/hide (no animation yet)
- **Demo:** Test Case 1 (single select, no search)

### Phase 2: Content Integration
- Move options list into modal
- Wire up selection handlers
- Single-select: close on selection
- Multi-select: "Done" button required
- **Demo:** Test Case 1 complete

### Phase 3: Search Support
- Move search input into modal
- Keyboard show/hide handling
- Filter options based on search
- **Demo:** Test Case 2 (single + search)

### Phase 4: Multi-Select + Tags
- Collapsed tags by default ("N items selected")
- Expandable tags section
- Tag removal (×) functionality
- Space optimization with keyboard
- **Demo:** Test Case 3 (multi + search + tags)

### Phase 5: Polish
- Slide-up animation
- Backdrop fade
- Close animation
- Smooth transitions
- **All test cases** with animations

### Phase 6: Real Device Testing
- Test on actual iOS device
- Test on actual Android device
- Adjust spacing/sizing based on real behavior
- Fix any keyboard interaction issues
- Iterate based on findings

### Phase 7: Production Ready (Optional)
- Remove `mobile-sheet` requirement
- Make it default for mobile viewports
- Update all existing demos
- Document in main README

## Open Questions

1. **Label source priority:**
   - `element.getAttribute('label')`
   - `select.getAttribute('aria-label')`
   - `placeholder`
   - First option text
   - Fallback: "Select"

2. **Search behavior:**
   - Auto-focus on open (triggers keyboard immediately)?
   - Or wait for user interaction?
   - **Recommendation:** Don't auto-focus - let user tap search when ready

3. **Tags in multi-select:**
   - Show selected count badge in header?
   - Full tag list above options?
   - Both?
   - **Recommendation:** Full tag list (like desktop), gives visual feedback and allows removal

4. **Search + Multi-Select Interaction:**
   - **Scenario:** User searches "Apple", selects it. Then searches "Banana", selects it.
   - **Question:** Do tags show all selected items, or only those matching current search?
   - **Recommendation:** Tags section always shows ALL selected items (persistent feedback)
   - Options list filters based on search
   - This creates clear separation: "What I've selected" vs "What I can select"

5. **Tag Removal:**
   - Can user remove tags directly from mobile sheet?
   - **Native behavior:** Uncheck in list only
   - **Our enhancement:** Allow removal from tags section too (better UX)
   - Click × on tag = remove from selection immediately

6. **Accessibility:**
   - Trap focus within modal when open?
   - Announce state changes to screen readers?
   - ARIA roles: `role="dialog"` or `role="listbox"`?

7. **Performance:**
   - Create modal DOM once and reuse?
   - Or create/destroy each time?
   - Element reuse pattern suggests: create once, reuse forever.

## Native Multi-Select Reference

**iOS Native Behavior:**
```
┌─────────────────────────┐
│ Select Items     Done   │ ← Header with done button
├─────────────────────────┤
│ ☑ Apple                 │ ← Checkboxes in list
│ ☐ Banana                │
│ ☑ Cherry                │
│ ☐ Date                  │
│ ...                     │
└─────────────────────────┘
```

**Our Enhanced Version (Space-Optimized):**
```
┌─────────────────────────┐ ← Top of modal
│ 3 items selected    ⌄  │   Tags collapsed (32px)
├─────────────────────────┤
│ ☑ Apple                 │
│ ☐ Apricot               │   Options scrollable (~200px)
│ ☑ Banana                │
│ ☑ Cherry                │
│ ...                     │
├─────────────────────────┤
│ [Search...          🔍] │   Search (48px)
├─────────────────────────┤
│ Select Fruits      Done │   Footer/Handle (48px)
└─────────────────────────┘ ← Bottom of screen
                            Total: ~328px (fits with keyboard!)
```

**With Keyboard Open (search focused):**
```
┌═════════════════════════┐
│       KEYBOARD          │ ← Tags may be pushed off-screen
└═════════════════════════┘   (fine - not needed while typing)
│ ☑ Apple                 │
│ ☐ Apricot               │   Filtered options visible
│ ...                     │
├─────────────────────────┤
│ [app_               🔍] │   User typing (focused)
├─────────────────────────┤
│ Select Fruits      Done │   Footer stays anchored
└─────────────────────────┘ ← Bottom of screen
```

**Expanded Tags View (when user taps "3 items selected"):**
```
┌─────────────────────────┐ ← Top of modal
│ 3 items selected    ⌃  │   Toggle expanded
│ [Apple ×] [Banana ×]    │
│ [Cherry ×]              │   Full tag list (60-120px)
├─────────────────────────┤
│ ☑ Apple                 │
│ ☐ Apricot               │   Options (less space)
│ ...                     │
├─────────────────────────┤
│ [Search...          🔍] │   Keyboard dismissed
├─────────────────────────┤
│ Select Fruits      Done │   Footer
└─────────────────────────┘ ← Bottom of screen
```

**Key Differences from Native:**
- ✅ Search filtering (enhancement over native)
- ✅ Tag visualization + direct removal (enhancement)
- ✅ Clear separation: selected items vs available items
- ✅ Better visual feedback than checkmarks alone

## Success Criteria

- ✅ Modal covers entire viewport, above all app elements
- ✅ Independent of scroll position
- ✅ Bottom-anchored for thumb-friendly interaction
- ✅ Smooth animations matching dialog pattern
- ✅ Single-select closes immediately on selection
- ✅ Multi-select requires explicit close
- ✅ Keyboard doesn't obscure critical UI
- ✅ Clean code separation (mobile vs desktop logic)
- ✅ No memory leaks or orphaned DOM elements

## Next Steps

Before implementation:
1. Review and discuss this document
2. Answer open questions
3. Validate technical approach
4. Agree on implementation phases

Then:
1. Start with Phase 1 (basic structure)
2. Test on actual device
3. Iterate based on real-world behavior
4. Add polish only after foundation is solid
