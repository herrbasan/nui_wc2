# GitHub Copilot Instructions

## User Preferences & Coding Ethics

### Coding Ethics Hierarchy (Priority Order)
1. **Reliability** → Code must work correctly and predictably
   - Prioritize simplicity over cleverness
   - Avoid syntactic sugar and abstractions that obscure intent
   - Iterate to find the most straightforward solution
   - Favor functional programming paradigm where practical
   - Keep functions mostly free of internal state
   - Pure functions preferred (same input → same output)
2. **Performance** → Optimize for speed and efficiency
   - Performance is critical—always consider it in decision-making
   - Test and measure performance; don't assume
   - Zero dependencies preferred—maintain full control of all code
   - Every dependency is a performance and reliability risk
3. **Readability** → Code should be clear and understandable
   - Natural outcome of simplicity and functional approach
   - Most "readability" advice is untested assumptions
   - Simple code is inherently understandable
4. **Maintainability** → Easy to modify and extend
   Ad- Focus on extensibility, not "clean code" dogma
   - "Easy to maintain" claims are often unproven
   - Well-structured code enables evolution

**Note:** While Reliability enables code to run at all, Performance is equally critical and should drive most architectural decisions. The two work together—reliable code that performs poorly is not truly reliable.

### Development Philosophy: DOM-First Approach

Based on the paper `reference/dom-first.md`, this project follows these core principles:

#### Core Principles
- **Direct DOM Manipulation**: Work with native APIs rather than frameworks
- **Element-Centric Architecture**: Encapsulate behavior within DOM elements themselves
- **Event-Driven Communication**: Use native DOM events for component interaction
- **Explicit State Management**: Manual, predictable updates over automatic reactivity
- **Platform-Native Solutions**: Prefer web standards and native APIs over abstractions
- **No Unnecessary Build Complexity**: Avoid build tooling unless specifically justified

#### Key Technical Guidelines

**Simplicity & Functional Approach:**
- Iterate to find the simplest, most straightforward solution
- Avoid syntactic sugar and clever abstractions
- Prefer pure functions without internal state
- Logic should be explicit and directly traceable
- Simple code naturally produces readable and maintainable results

**Performance First:**
- Performance is critical—always consider it in decision-making
- Virtual DOM and framework abstractions impose measurable overhead
- Direct DOM operations are faster, more predictable, and debuggable
- Aim for 10-50x smaller bundle sizes compared to framework approaches
- Profile and measure performance; don't assume
- Zero dependencies preferred—maintain full control

**Testable Over Theoretical:**
- Prefer empirically measurable solutions over unproven assumptions
- Use browser DevTools for direct measurement and debugging
- Code behavior must be observable through standard debugging tools
- Reject "clean code" dogma in favor of provable benefits

**Reliability & Debugging:**
- Platform APIs are stable and proven over decades
- Browser DevTools provide superior debugging for native code
- Errors should be predictable and traceable with standard tools
- Avoid abstraction leaks that obscure underlying behavior

**Code Organization:**
- Elements are complete components (logic + presentation together)
- Use custom events for loose coupling between components
- Encapsulate state within element closures
- CSS Variables for reactive styling without CSS-in-JS
- Focus on extensibility, not theoretical maintainability

#### What to Avoid
- ❌ Framework abstractions (React, Vue, Angular) unless specifically justified
- ❌ Virtual DOM implementations
- ❌ Complex build pipelines for simple tasks
- ❌ State management libraries for simple state needs
- ❌ CSS-in-JS when CSS Variables work
- ❌ Unproven assumptions about performance or organization

#### What to Prefer
- ✅ Direct `document.createElement()` and DOM manipulation
- ✅ Native event system (`addEventListener`, `CustomEvent`)
- ✅ ES6+ modules for code organization
- ✅ CSS Variables for dynamic styling
- ✅ Web Components only when genuinely needed (not by default)
- ✅ Browser-native features and APIs

### AI-Assisted Development Approach
- Leverage AI to provide DOM-first patterns and best practices
- Focus on platform-native solutions that AI understands deeply
- Use AI for instant guidance on optimization and debugging
- Prioritize solutions that work with standard browser tooling

### Development Environment & Preferences
- **Code Formatting**: Use tab indentation for all code files
- **Comments**: Only use comments to structure and separate blocks of code, not for explanations
- **Shell Commands**: Use PowerShell syntax (Windows environment in VS Code)
- **Testing/Preview**: VS Code built-in Live Server functionality for testing

### Project Context
- **Reference Material**: `reference/` folder contains the NUI library for reference only (not part of repo)
- **Instructions File**: `.github/copilot-instructions.md` - User preferences and coding guidelines (this file)
- **Project Documentation**: `README.md` - Project goals, aims, and documentation

---

## AI Contributor Notes

**#7K4mN9** - November 7, 2025  
Initial instructions established. Core philosophy crystallized: simplicity through iteration, performance through measurement, reliability through functional purity. Zero dependencies. DOM-first. The platform is enough.

---

**Last Updated:** November 7, 2025
