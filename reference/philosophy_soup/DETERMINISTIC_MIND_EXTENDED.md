# Deterministic Mind: Extended Principles

> **This document extends [DETERMINISTIC_MIND.md](DETERMINISTIC_MIND.md)** — read that first.
>
> The original document makes the case for correctness — reliability and performance as the only goals that matter. This document extends that case to how code is organized: the structures and patterns that make reliability achievable and performance visible.

---

## Core Tenet: Code Is the Primary Truth

Source code is executable. It is the only artifact that actually runs. Comments, documentation, and specifications inform, but when they disagree with code, code wins — because code is what executes.

This is not a value judgment. It is a structural fact. Any reasoning about what software does must eventually trace to the code. The goal is to minimize the gap between reading and understanding — not because reading is hard, but because every layer of indirection creates space for mismatch.

---

## Extended Principles

### Principle 1: Prefer Self-Explanatory Code Over Comments

Comments drift. Not always, not maliciously, but inevitably. Code changes; comments are forgotten. The result is a comment that says one thing and code that does another. The reader must then verify: is the comment outdated, or is the code wrong?

**The case for this pattern:** Understanding a function requires engaging with its implementation. You must trace what it does with parameters. You must verify where those parameters come from, what shapes they take, what guarantees hold. A comment claiming `@param {string} userId` looks helpful, but is it actually a string? Is it validated? Can it be null? The comment claims. The code decides. You verify the claim against the code anyway — so the comment was a detour.

Comments that describe *what* code does compete with the code itself. Comments that describe *why* — regulatory requirements, historical context, non-obvious consequences, external references — carry information the code structurally cannot express. The distinction: comment what the code cannot say.

**On structured comments specifically:** JSDoc and similar annotation systems are a parallel type system that competes with the actual one. They look authoritative — structured syntax, tooling support, generated documentation — but nothing checks them against runtime reality. A `@param {string}` annotation is not a type; it is a claim wrapped in syntax that *looks* like a type. When the annotation disagrees with the code, the code runs and the annotation misleads. This is worse than no annotation, because false confidence is more dangerous than acknowledged uncertainty.

---

### Principle 2: Single Responsibility

A function that does one thing can be understood in isolation. A function that does many things creates entanglement — understanding one responsibility requires understanding all, because they share scope and may interact.

**The case for this pattern:** The test is simple: can you describe what the function does without using "and" or "or"? If you need "and," the function has multiple responsibilities. If you need "or," the function has multiple paths that might be separate.

This is not about function length. A long function that performs one coherent transformation is easier to verify than a short function that does three unrelated things. The goal is independence: can this responsibility be understood, tested, and replaced without reference to others?

Two operations that must always happen together are one responsibility. Two operations that might need to happen separately are not. The distinction is found by asking: would I ever need to do A without B?

**Valid exception:** Transactional operations. If A and B must succeed or fail together, keeping them in one function preserves atomicity. Splitting them creates a coordination problem that may be worse than the entanglement.

---

### Principle 3: Functional Purity

Prefer pure functions — those with no side effects and no hidden dependencies, where output is fully determined by visible inputs.

**The case for this pattern:** Pure functions enable local reasoning. To understand them, you examine only their parameters and body. Impure functions require understanding globals, external systems, concurrent operations, and side effects that later code might depend on. The scope of understanding expands without bound.

Local reasoning is faster and more reliable than global reasoning. When you can understand a function by reading it once, you can modify it with confidence. I/O, state changes, and randomness are inherently effectful — the pattern is to isolate impurity at the boundaries of the system, keeping the core pure. The more of the system that permits local reasoning, the more of the system you can verify.

**Acknowledged costs:**
- Passing everything as parameters can create long argument lists. Within a module, closures or carefully managed state may be preferable to explicit parameter passing for dependencies that are truly ubiquitous.
- Performance: pure functions with immutable data may allocate more. This is usually acceptable; optimize when measurement proves it necessary.

---

### Principle 4: Explicit Dependencies

Dependencies should be visible at the point of use. This does not mean every function must list every transitive dependency; it means the immediate dependencies should be clear.

**The case for this pattern:** When dependencies are implicit — accessed via globals, retrieved from registries, injected by frameworks based on type signatures — understanding requires external knowledge. You must consult configuration files, framework documentation, or environment state to know what a function actually uses.

Explicit dependencies make the contract clear: to call this function, you need these things. This is information density, not verbosity. A function whose dependencies are visible can be verified, moved, and replaced. A function with hidden dependencies is welded to its environment.

**But consider:** At system scale, passing every dependency explicitly creates boilerplate. A database connection or logger used by 90% of functions need not appear in every signature. The pattern applies most strongly at module boundaries. Within a module, conventions can reduce noise without sacrificing clarity.

---

### Principle 5: Immutability by Default

Prefer creating new data over modifying existing data.

**The case for this pattern:** Mutation creates temporal dependencies. A value at line 10 may differ from the same value at line 20, and determining this requires tracing every line between. Temporal reasoning is cognitively expensive.

With immutability, a value is the same everywhere it appears. This converts temporal reasoning into spatial reasoning — what is the structure? — which is generally easier. The reliability gain is direct: an entire class of bugs — stale references, concurrent mutation, order-dependent reads — cannot occur when values don't change.

**Acknowledged costs:**
- Performance: immutable updates allocate new structures. Modern runtimes use structural sharing to mitigate this, but the cost is not zero.
- Memory: more objects are created. Garbage collection handles this, but pressure increases.

Start immutable for clarity. When measurement identifies bottlenecks, optimize specific paths — possibly with mutation. The optimization is then localized, explicit, and justified by data.

---

### Principle 6: Fail Fast

When errors occur, detect them early and report them clearly. Avoid silent failures that propagate.

**The case for this pattern:** Silent failures continue execution with invalid state. The error propagates, accumulating consequences. By the time it surfaces — if it surfaces — the original cause is buried under layers of subsequent operations. Debugging traces symptoms, not causes.

An immediate failure stops the chain. It reports the location and nature of the problem. It creates pressure to fix the underlying issue rather than work around symptoms.

This principle complements the main document's Rule 1 (Design Failures Away). They are not in tension — they address different stages. Design failures away first: eliminate every failure condition you can. For the failures that remain — external systems, boundaries you don't control — fail fast. The worst outcome is a failure that neither was prevented nor was detected: a silent corruption that propagates.

**But consider:** In distributed systems, partial failure is normal. If service A needs data from B and C, and B is temporarily unavailable, failing fast aborts the entire operation — even though C might have provided partial value. Circuit breakers, graceful degradation, and partial results are correct handling of genuine external unreliability. The distinction is expected vs unexpected failure. Network timeout is expected; handle it. Null in validated data is unexpected; fail fast.

---

### Principle 7: Composition Over Inheritance

Build functionality by combining simple, independent units rather than inheriting from complex hierarchies.

**The case for this pattern:** Inheritance creates tight coupling. To understand a subclass, you must understand the superclass. Changes to the superclass affect all descendants — sometimes in ways the superclass author did not anticipate.

Composition creates looser coupling. The composer depends only on the interface of its components. Implementation can change without affecting the composer, provided the interface holds.

Inheritance also forces premature classification. You must decide "what this is" before you know what it does. Composition lets you define "what this does" and defer "what this is" indefinitely. Composed systems are easier to verify because each piece can be verified independently. Inherited systems require verifying the entire hierarchy.

**But consider:** Inheritance is appropriate for true taxonomies where substitutability is the point. A `FileInputStream` *is a* `InputStream`. The Liskov Substitution Principle holds. The problem is not inheritance itself but using it for code reuse rather than semantic relationships.

---

### Principle 8: Measure Before Optimizing

Do not change code for performance based on intuition. Change it based on measurement.

**The case for this pattern:** Intuition about performance is frequently wrong. Cache behavior, garbage collection, JIT optimization — these are complex and counter-intuitive. Changes made for supposed performance benefits often produce no benefit, or make performance worse, while complicating the code.

Measurement is the only reliable guide. Profile with real data. Identify actual bottlenecks. Optimize those.

**The process:**
1. Write clear code
2. Measure with realistic data
3. Optimize proven bottlenecks
4. Keep measurements as regression tests

Clear code is easier to profile — hotspots are visible, not buried in optimizations. Performance that matters is measurable. If you cannot measure the difference, the difference does not matter.

---

### Principle 9: Abstraction From Evidence

Abstract when the pattern is clear, not when you anticipate needing it.

**The case for this pattern:** Every abstraction is a bet that future changes will be easier. Most bets lose. Premature abstraction guesses at what will change, optimizing for flexibility in directions that may never be needed. It pays complexity cost today for benefit tomorrow — benefit that often never arrives. Every layer of abstraction is a layer between you and what the code actually does — a layer that must be justified by a real, demonstrated need.

**The Rule of Three:**
- First use case: Write it directly
- Second use case: Copy and modify
- Third use case: Now the pattern is visible. Abstract.

Two use cases might be coincidence. Three suggest structure. Abstraction based on actual patterns is more likely to be correct than abstraction based on speculation.

Wrong abstraction is harder to remove than no abstraction. By the time you discover the abstraction was wrong, code depends on it. The cost of removal increases with dependence.

**But consider:** Some abstractions are forced by the domain. If the design requires supporting multiple database backends from day one, the abstraction is not premature — it is the design. The principle applies to speculative abstraction, not required architecture.

---

### Principle 10: Know Your Data Shapes

Understand the structure and constraints of data at every point in the program.

**The case for this pattern:** Errors often arise from mismatched expectations about data. A function expects an object with property `id`, receives one without, and fails. The failure is downstream from the actual mistake — passing the wrong data. Tracing such errors wastes time.

Knowing data shapes means knowing: what properties exist, what types they have, what constraints apply, and what guarantees hold at each boundary. This knowledge enables local reasoning: you do not need to trace back through the call stack to understand what a parameter contains.

**Type systems are not understanding.** A type annotation claims a variable is a string, but is it? The claim may be wrong. The type checker may pass while the runtime fails. Type systems are tools; they do not replace knowing what the code actually does. When the type system and reality disagree, reality wins — because reality is what executes.

**Knowing shapes without type systems:**
- Runtime validation at boundaries — explicit, inspectable, runs what you wrote
- Assertions that verify assumptions — fail fast when reality diverges from expectation
- Consistent naming conventions that signal shape — `userId` implies a specific structure
- Careful tracing of data flow — know where values originate and what transforms them

The goal is certainty about what data contains. Certainty can come from analysis, from validation, from tests, or from careful tracing. The method matters less than the confidence. Every function that receives data it doesn't understand is a reliability risk. Every boundary where shapes are known and verified is a firewall against that risk.

**But consider:** Some constraints cannot be expressed structurally. "This integer must be positive" or "this list must be sorted" are semantic, not type-level. Runtime checks remain necessary. The principle is to know what you can know statically and verify what you must verify dynamically.

---

## Performance Considerations

### Memory Layout

For performance-critical code, how data is arranged in memory often matters more than algorithm choice. CPUs access memory in cache lines; data accessed together should be stored together.

This is measurable. Profile with real data. Optimize memory layout only where measurement shows cache misses.

### Allocation Patterns

Frequent allocation creates garbage collection pressure. But mutable reuse is harder to verify than immutable allocation. The tradeoff is verification cost vs runtime cost.

Start with immutability. Measure allocation patterns. Optimize hot paths where the runtime cost justifies the verification burden.

### Algorithmic Complexity

Big-O matters at scale. Constant factors matter at small scale. An O(n) algorithm with a large constant factor may be slower than an O(n²) algorithm for your actual data size.

Measure with realistic data volumes. Do not implement complex algorithms "because they scale" if you do not have the scale. Simple algorithms are easier to verify and replace when measurement proves necessary.

---

## Anti-Patterns

Each of these reduces reliability, performance, or both — by obscuring what the code does, hiding where failures originate, or creating coupling that makes verification impossible.

### The God Object
A class that holds references to everything and implements everything. Verification requires understanding the entire class and all interactions. Changes ripple unpredictably. A single point of failure for reliability; a single bottleneck for performance.

### The Manager Class
A class named for a role rather than a function. "UserManager" manages... what exactly? The vagueness hides multiple responsibilities. Each responsibility is harder to verify because it shares scope with every other. Each method likely belongs closer to the data it operates on.

### The Utility Dump
A module containing unrelated functions grouped only by not fitting elsewhere. This is not organization; it is absence of organization. Unrelated functions sharing a module create false coupling — changes to one require re-verifying all.

### The Abstract Factory Factory
Layers of abstraction with no concrete use case. Each layer adds indirection between you and what actually executes. The flexibility is speculative; the complexity is certain. Every layer is a place where bugs can hide.

### Stringly-Typed Code
Using strings where structured types would prevent errors. Moves error detection from development to production — the most expensive place to find bugs.

### Documentation That Lies
Comments, JSDoc, or external docs that no longer match the code. Worse than no documentation because they create false confidence. False confidence is a direct threat to reliability — decisions made on wrong information produce wrong outcomes.

### Type Theater
Using type annotations or documentation as a substitute for understanding. Claims about data shapes that are not verified against actual runtime behavior. Type systems are tools, not oracles — the code that runs is the truth. Treating annotations as proof when they are claims produces the same gap between assumption and reality that causes bugs.

---

## Verification Questions

Before committing to an implementation, consider:

1. **Can this function be understood by reading it once?** If not, can scope be reduced or responsibilities split?
2. **Are dependencies visible where they matter?** If not, would explicitness improve clarity?
3. **Does data flow clearly from input to output?** If not, would immutability help?
4. **Can invalid states be constructed?** If so, can validation or structure prevent them?
5. **Have I measured the performance concern?** If not, is the optimization speculative?
6. **Is this abstraction based on actual patterns or anticipation?** If anticipation, would direct implementation suffice?
7. **Does any comment explain something the code could express?** If so, can the code be clarified?

These questions target the same goal as every principle in this document: code that is reliable because it is understood, and performant because it is clear enough to optimize.

---

## Document Meta

- **Purpose:** Extend correctness-first philosophy with principles for how code organization serves reliability and performance
- **Core tenet:** Code is the primary truth; minimize the gap between reading and understanding
- **Approach:** Strong cases for patterns that produce measurable reliability and performance gains
- **Relationship:** Extends [DETERMINISTIC_MIND.md](DETERMINISTIC_MIND.md)
- **Success metric:** Code that is reliable because it is understood, and performant because it is clear enough to optimize
