/**
 * NUI Web Components Library
 * DOM-first web component framework with intelligent accessibility
 */

// =============================================================================
// Core Configuration
// =============================================================================

export interface NuiConfig {
	/** Path to icon sprite SVG file */
	iconSpritePath?: string;
}

// =============================================================================
// Content Loader
// =============================================================================

export interface PageModule {
	/** Called once when page is first loaded */
	init?: (container: HTMLElement, nui: NuiAPI, params: Record<string, string>) => void | Promise<void>;
	
	/** Called every time page is shown */
	onShow?: (container: HTMLElement, params: Record<string, string>) => void;
}

export interface PageInfo {
	element: HTMLElement;
	module: PageModule | null;
	params: Record<string, string>;
}

export interface ContentLoader {
	/** Load a page by ID, cache it, and show it */
	load(pageId: string, params?: Record<string, string>): Promise<boolean>;
	
	/** Show a previously loaded page */
	show(pageId: string, params?: Record<string, string>): boolean;
	
	/** Get the currently visible page ID */
	getCurrent(): string | null;
	
	/** Get page info by ID */
	getPage(pageId: string): PageInfo | undefined;
}

export interface ContentLoaderOptions {
	/** Base path for page HTML and JS files (default: '/pages') */
	basePath?: string;
	
	/** Custom error handler for page load failures */
	onError?: (pageId: string, error: Error) => void;
}

// =============================================================================
// Router
// =============================================================================

export interface Router {
	/** Navigate to a page with optional parameters */
	navigate(page: string, id?: string | null, otherParams?: Record<string, string>): void;
	
	/** Start listening to hash changes */
	start(): void;
	
	/** Stop listening to hash changes */
	stop(): void;
	
	/** Parse current URL hash into parameters */
	parseHash(): Record<string, string> | null;
}

export interface RouterOptions {
	/** Link list element for automatic active state sync */
	linkList?: NuiLinkListElement | null;
	
	/** Default page to navigate to if no hash present */
	defaultPage?: string | null;
	
	/** Custom error handler for routing failures */
	onError?: (pageId: string, error: Error) => void;
}

// =============================================================================
// Content Loading Setup
// =============================================================================

export interface ContentLoadingOptions {
	/** Container selector or element (default: 'nui-content main') */
	container?: string | HTMLElement;
	
	/** Navigation selector or element for active sync (default: 'nui-side-nav') */
	navigation?: string | HTMLElement | null;
	
	/** Base path for page files (default: '/pages') */
	basePath?: string;
	
	/** Default page to load (default: null) */
	defaultPage?: string | null;
	
	/** Custom error handler */
	onError?: (pageId: string, error: Error) => void;
}

export interface ContentLoadingResult {
	loader: ContentLoader;
	router: Router;
}

// =============================================================================
// Main NUI API
// =============================================================================

export interface NuiAPI {
	/** Configure NUI library settings */
	configure(config: NuiConfig): void;
	
	/** Register a custom component */
	registerComponent(name: string, setup: (element: HTMLElement) => void | (() => void)): void;
	
	/** Attribute proxy system for reactive attributes */
	setupAttributeProxy(
		element: HTMLElement,
		handlers: Record<string, (newValue: string | null, oldValue: string | null) => void>
	): void;
	
	/** Define property descriptor mapping attribute to property */
	defineAttributeProperty(
		element: HTMLElement,
		propName: string,
		attrName: string
	): void;

	/** Create a content loader for managing page fragments */
	createContentLoader(container: HTMLElement, options?: ContentLoaderOptions): ContentLoader;
	
	/** Create a router for URL-based navigation */
	createRouter(loader: ContentLoader, options?: RouterOptions): Router;
	
	/** Enable content loading with simplified setup (recommended) */
	enableContentLoading(options?: ContentLoadingOptions): ContentLoadingResult | null;
}

declare global {
	interface Window {
		nui: NuiAPI;
	}
}

// =============================================================================
// Accessibility Utilities
// =============================================================================

export interface AccessibilityHelpers {
	/** Check if element has accessible label (aria-label, aria-labelledby, or title) */
	hasLabel(element: HTMLElement): boolean;
	
	/** Check if element contains native focusable child (button, link, input, etc.) */
	hasFocusableChild(element: HTMLElement): boolean;
	
	/** Extract text label from span or element's text content */
	getTextLabel(element: HTMLElement): string;
	
	/** 
	 * Make element interactive with proper role, tabindex, and label
	 * Returns the target element that receives focus (native button or container)
	 */
	makeInteractive(element: HTMLElement, label?: string | null): HTMLElement;
	
	/** Generate human-readable label from icon name with context awareness */
	generateIconLabel(iconName: string, element: HTMLElement): string;
	
	/** Ensure button has accessible label, auto-generate for icon-only buttons */
	ensureButtonLabel(button: HTMLButtonElement): void;
	
	/** Ensure landmark (nav) has accessible label, use heading or fallback */
	ensureLandmarkLabel(landmark: HTMLElement, fallbackLabel?: string): void;
	
	/** Run all accessibility checks and upgrades on element and descendants */
	upgrade(element: HTMLElement): void;
}

declare global {
	const a11y: AccessibilityHelpers;
}

// =============================================================================
// Custom Elements
// =============================================================================

/**
 * Main application container with dual-mode layout system
 * App mode: CSS Grid layout with sidebar/topbar/content
 * Page mode: Normal document flow (without nui-app wrapper)
 */
export interface NuiAppElement extends HTMLElement {
	/** Toggle sidebar visibility */
	toggleSideNav(): void;
}

/**
 * Top navigation bar
 * Automatically adds role="banner" if main site header
 */
export interface NuiTopNavElement extends HTMLElement {}

/**
 * Side navigation container
 * Automatically adds role="navigation" and aria-label
 */
export interface NuiSideNavElement extends HTMLElement {}

/**
 * Navigation link list with tree mode and accordion support
 */
export interface NuiLinkListElement extends HTMLElement {
	/**
	 * Find item by ID or position
	 * @param topId - Top-level item ID or index
	 * @param subId - Sub-item ID or index (optional)
	 */
	findItem(topId: string | number, subId?: string | number): HTMLElement | undefined;
	
	/**
	 * Set active navigation item
	 * @param topId - Top-level item ID or index
	 * @param subId - Sub-item ID or index (optional)
	 */
	setActive(topId: string | number, subId?: string | number): void;
	
	/** Clear all active states */
	clearActive(): void;
	
	/** Collapse all expanded groups */
	clearSubs(): void;
}

/**
 * Main content area
 * Ensures proper main landmark with id="main-content" for skip links
 */
export interface NuiContentElement extends HTMLElement {}

/**
 * Application footer
 * Automatically adds role="contentinfo" if main site footer
 */
export interface NuiAppFooterElement extends HTMLElement {}

/**
 * Button wrapper component
 * Contains native button element, dispatches nui-click events
 */
export interface NuiButtonElement extends HTMLElement {}

/**
 * Icon component using SVG sprite system
 */
export interface NuiIconElement extends HTMLElement {
	/** Icon name from sprite */
	name: string;
}

/**
 * Loading indicator component
 * Modes: "bar" (top of page) or "overlay" (full page)
 */
export interface NuiLoadingElement extends HTMLElement {
	/** Display mode: "bar" | "overlay" */
	mode: 'bar' | 'overlay';
	
	/** Active state (shown when present) */
	active: boolean;
}

// =============================================================================
// Custom Events
// =============================================================================

export interface NuiClickEventDetail {
	/** Element that dispatched the event */
	source: HTMLElement;
}

export interface NuiClickEvent extends CustomEvent<NuiClickEventDetail> {
	type: 'nui-click';
}

declare global {
	interface HTMLElementEventMap {
		'nui-click': NuiClickEvent;
	}
	
	interface HTMLElementTagNameMap {
		'nui-app': NuiAppElement;
		'nui-top-nav': NuiTopNavElement;
		'nui-side-nav': NuiSideNavElement;
		'nui-link-list': NuiLinkListElement;
		'nui-content': NuiContentElement;
		'nui-app-footer': NuiAppFooterElement;
		'nui-button': NuiButtonElement;
		'nui-icon': NuiIconElement;
	}
}

// =============================================================================
// Attribute Namespaces
// =============================================================================

/**
 * CSS Variable attributes (nui-vars-*)
 * Converted to CSS custom properties
 * Example: nui-vars-sidebar_width="15rem" → --nui-sidebar-width: 15rem
 */
export type NuiVarsAttributes = `nui-vars-${string}`;

/**
 * State management attributes (nui-state-*)
 * Component state flags
 * Example: nui-state-visible="false"
 */
export type NuiStateAttributes = `nui-state-${string}`;

/**
 * Event handling attributes (nui-event-*)
 * Declarative event binding
 * Example: nui-event-click="toggle-theme"
 */
export type NuiEventAttributes = `nui-event-${string}`;

/**
 * URL/Resource attributes (nui-url-*)
 * Resource references and API endpoints
 * Example: nui-url-data="api/users.json"
 */
export type NuiUrlAttributes = `nui-url-${string}`;

/**
 * Data binding attributes (nui-data-*)
 * Data sources and content binding
 * Example: nui-data-source="users"
 */
export type NuiDataAttributes = `nui-data-${string}`;

// =============================================================================
// Utility Types
// =============================================================================

/** Function that sets up a component and optionally returns cleanup function */
export type ComponentSetup = (element: HTMLElement) => void | (() => void);

/** Attribute change handler function */
export type AttributeHandler = (newValue: string | null, oldValue: string | null) => void;
