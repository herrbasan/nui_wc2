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
	
	/** Enable or disable debug warnings (default: true) */
	debug?: boolean;
	
	/** Accessibility configuration */
	a11y?: {
		/** Warning verbosity: 'verbose' | 'auto' | 'silent' */
		warnings?: 'verbose' | 'auto' | 'silent';
		/** Automatically add missing aria labels (default: true) */
		autoLabel?: boolean;
	};
}

// =============================================================================
// Content Loader
// =============================================================================

export interface PageModule {
	/** Called once when page is first loaded */
	init?: (container: HTMLElement, nui: NuiAPI, params: Record<string, string>) => void | Promise<void>;
	
	/** Called every time page is shown */
	onShow?: (container: HTMLElement, params: Record<string, string>) => void;
	
	/** Called when page is hidden (navigating away) */
	onHide?: (container: HTMLElement) => void;
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
	/** Container selector or element (default: 'nui-content nui-main') */
	container?: string | HTMLElement;
	
	/** Navigation selector or element for active sync (default: 'nui-sidebar') */
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
	config: NuiConfig;
	util: NuiUtilities;
	components: NuiComponents;

	/** Initialize the library and register components */
	init(options?: Partial<NuiConfig> & Record<string, unknown>): void;

	/** Update configuration */
	configure(config: Partial<NuiConfig>): void;

	/** Register a feature initializer */
	registerFeature(name: string, initFn: () => void): void;

	/** Register a type handler */
	registerType(type: string, handler: (value: string) => unknown): void;

	/** Create a router for URL-based navigation */
	createRouter(container: HTMLElement, options?: RouterOptions): Router;

	/** Enable content loading with simplified setup (recommended) */
	enableContentLoading(options?: ContentLoadingOptions): ContentLoadingResult | null;
}

declare global {
	interface Window {
		nui: NuiAPI;
	}
}

// =============================================================================
// Utilities Namespace (nui.util)
// =============================================================================

export interface NuiCreateOptions {
	id?: string;
	class?: string | string[];
	style?: Partial<CSSStyleDeclaration>;
	data?: Record<string, string>;
	attrs?: Record<string, string | number | boolean | null | undefined>;
	events?: Record<string, EventListener>;
	text?: string;
	content?: string | Element | Element[];
	target?: Element;
}

export interface NuiStorageOptions {
	name: string;
	value?: string;
	target?: 'cookie' | 'localStorage';
	ttl?: number | string | Date | 'forever';
}

export interface NuiStorageAPI {
	set(options: NuiStorageOptions): boolean;
	get(options: { name: string; target?: 'cookie' | 'localStorage' }): string | undefined;
	remove(options: { name: string; target?: 'cookie' | 'localStorage' }): boolean;
}

export interface NuiUtilities {
	createElement<K extends keyof HTMLElementTagNameMap>(tag: K, options?: NuiCreateOptions): HTMLElementTagNameMap[K];
	createElement(tag: string, options?: NuiCreateOptions): HTMLElement;

	createSvgElement<K extends keyof SVGElementTagNameMap>(tag: K, attrs?: Record<string, string | number>): SVGElementTagNameMap[K];
	createSvgElement(tag: string, attrs?: Record<string, string | number>): SVGElement;

	cssAnimation(element: HTMLElement, className: string, callback?: (el: HTMLElement) => void): () => void;

	storage: NuiStorageAPI;
}

// =============================================================================
// Components Namespace (nui.components)
// =============================================================================

export interface NuiBannerOptions {
	placement?: 'top' | 'bottom';
	target?: Element;
	priority?: string;
	autoClose?: number;
	showCloseButton?: boolean;
	showProgress?: boolean;
	content?: string | Element;
}

export interface NuiBannerController {
	element: NuiBannerElement;
	close(action?: string): void;
	update(content: string | Element): void;
	onClose(callback: (action?: string) => void): void;
}

export interface NuiDialogButton {
	id?: string;
	label: string;
	type?: 'primary' | 'outline' | string;
	icon?: string;
	value?: unknown;
}

export interface NuiDialogField {
	id: string;
	label: string;
	type?: string;
	value?: string;
	placeholder?: string;
	required?: boolean;
	pattern?: string;
	min?: number;
	max?: number;
	minlength?: number;
	maxlength?: number;
	checked?: boolean;
}

export interface NuiDialogShowOptions {
	classes?: string[];
	target?: Element;
	placement?: string;
	modal?: boolean;
	blocking?: boolean;
}

export interface NuiDialogOptions {
	buttons?: NuiDialogButton[];
	fields?: NuiDialogField[];
	classes?: string[];
	target?: Element;
	placement?: string;
	modal?: boolean;
	blocking?: boolean;
}

export interface NuiLinkListCreateOptions {
	mode?: string;
	id?: string;
	class?: string | string[];
	attrs?: Record<string, string | number | boolean | null | undefined>;
}

export interface NuiComponents {
	dialog: {
		show(content: string | Element, options?: NuiDialogShowOptions): NuiDialogElement;
		alert(title: string, message: string, options?: NuiDialogOptions): Promise<unknown>;
		confirm(title: string, message: string, options?: NuiDialogOptions): Promise<boolean>;
		prompt(title: string, message: string, options?: NuiDialogOptions): Promise<Record<string, unknown> | null>;
	};

	banner: {
		show(options: NuiBannerOptions): NuiBannerController;
		hide(ref?: NuiBannerController | NuiBannerElement | HTMLElement | 'all' | null): boolean;
		hideAll(): boolean;
	};

	linkList: {
		create(data: unknown[], options?: NuiLinkListCreateOptions): NuiLinkListElement;
	};
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
 * App header component
 * Automatically adds role="banner" if main site header
 */
export interface NuiAppHeaderElement extends HTMLElement {}

/**
 * Sidebar container
 * Automatically adds role="navigation" and aria-label
 */
export interface NuiSidebarElement extends HTMLElement {}

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

/**
 * Tooltip component
 * Provides accessible, hover/focus-triggered contextual information
 */
export interface NuiTooltipElement extends HTMLElement {
	/** Optional position attribute overriding default (top, bottom, left, right) */
	position?: string;
	/** Optional ID of target element */
	for?: string;
}

/**
 * Progress indicating component
 * Types: "bar" | "circular" | "busy" | "circular-busy"
 */
export interface NuiProgressElement extends HTMLElement {
	/** Type of progress indicator: "bar" (default), "circular", "busy", "circular-busy" */
	type: 'bar' | 'circular' | 'busy' | 'circular-busy';

	/** Current progress value (0 to max) */
	value: number;

	/** Maximum progress value (default 100) */
	max: number;

	/** Hides the text percentage label when visually active */
	hideText: boolean;

	/** Changes the thickness of the track (bar) or diameter (circular) using CSS values */
	size?: string;
}

/**
 * Tabs component
 * Manages tab panels and navigation
 */
export interface NuiTabsElement extends HTMLElement {}

/**
 * Accordion component
 * Manages collapsible details elements
 */
export interface NuiAccordionElement extends HTMLElement {}

/**
 * Dialog component
 * Wrapper for native <dialog> with animations and backdrop support
 */
export interface NuiDialogElement extends HTMLElement {
	/** Show the dialog as a modal */
	showModal(): void;
	
	/** Show the dialog (non-modal) */
	show(): void;
	
	/** Close the dialog */
	close(returnValue?: string): void;
	
	/** Check if dialog is open */
	isOpen(): boolean;
}

/**
 * Overlay component
 * Provides a generic modal container over a shaded backdrop
 */
export interface NuiOverlayElement extends HTMLElement {
	/** Show the overlay as a modal */
	showModal(): void;
	
	/** Close the overlay */
	close(action?: string): void;
	
	/** Check if overlay is open */
	isOpen(): boolean;
}

/**
 * Banner component
 * Toast/Notification system
 */
export interface NuiBannerElement extends HTMLElement {
	/** Show the banner */
	show(): void;
	
	/** Close the banner */
	close(action?: string): void;
	
	/** Update banner content */
	update(content: string): void;
	
	/** Check if banner is open */
	isOpen(): boolean;
}

// =============================================================================
// Input Components
// =============================================================================

/**
 * Input group component for wrapping inputs with label and description
 */
export interface NuiInputGroupElement extends HTMLElement {}

/**
 * Text input component
 * Wraps native input element with validation and optional clear button
 */
export interface NuiInputElement extends HTMLElement {
	/** Validate the input and return validity state */
	validate(): boolean;
	
	/** Clear the input value */
	clear(): void;
	
	/** Focus the input */
	focus(): void;
}

/**
 * Textarea component
 * Wraps native textarea with auto-resize and character count features
 */
export interface NuiTextareaElement extends HTMLElement {
	/** Validate the textarea and return validity state */
	validate(): boolean;
	
	/** Clear the textarea value */
	clear(): void;
	
	/** Focus the textarea */
	focus(): void;
}

/**
 * Checkbox component
 * Custom-styled checkbox with native accessibility
 */
export interface NuiCheckboxElement extends HTMLElement {}

/**
 * Radio button component
 * Custom-styled radio button with native accessibility
 */
export interface NuiRadioElement extends HTMLElement {}

// =============================================================================
// Select Component
// =============================================================================

export interface NuiSelectItem {
	/** Option value */
	value: string;
	/** Option display label */
	label?: string;
	/** Whether the option is disabled */
	disabled?: boolean;
}

export interface NuiSelectGroup {
	/** Group label */
	group: string;
	/** Options in this group */
	options?: NuiSelectItem[];
}

export interface NuiSelectAddOptions {
	/** Whether the new item should be disabled */
	disabled?: boolean;
	/** Whether the new item should be selected */
	selected?: boolean;
	/** Group name to add item to (creates group if not exists) */
	group?: string;
}

export interface NuiSelectSelected {
	/** Selected option value */
	value: string;
	/** Selected option display label */
	label: string;
	/** Reference to the native option element */
	element: HTMLOptionElement;
}

/**
 * Enhanced select component with search, multi-select, and mobile bottom sheet
 */
export interface NuiSelectElement extends HTMLElement {
	// Popup Control
	/** Open the select dropdown/mobile sheet */
	open(): void;
	/** Close the select dropdown/mobile sheet */
	close(): void;
	/** Check if select is currently open */
	isOpen(): boolean;

	// Value Management
	/** 
	 * Get current value(s)
	 * @returns Single value for single-select, array for multi-select
	 */
	getValue(): string | string[];
	/** 
	 * Set value(s) programmatically
	 * @param value - Single value, array (multi), or null/empty to clear
	 */
	setValue(value: string | string[] | null | undefined): void;
	/** Get detailed info about selected options */
	getSelected(): NuiSelectSelected[];
	/** Select a specific value (adds to selection in multi-select) */
	select(value: string): void;
	/** Unselect a specific value (multi-select only) */
	unselect(value: string): void;
	/** Clear all selections */
	clear(): void;

	// Options Management
	/** 
	 * Add a new option
	 * @param value - Option value
	 * @param label - Display label (defaults to value)
	 * @param options - Additional options
	 * @returns true if added, false if value already exists
	 */
	addItem(value: string, label?: string, options?: NuiSelectAddOptions): boolean;
	/** 
	 * Remove an option by value
	 * @param value - Option value to remove
	 * @returns true if removed, false if not found
	 */
	removeItem(value: string): boolean;
	/** Replace all options */
	setItems(items: (string | NuiSelectItem | NuiSelectGroup)[]): void;
	/** Get all current options */
	getItems(): NuiSelectItem[];

	// State Management
	/** Enable the select */
	enable(): void;
	/** Disable the select */
	disable(): void;
	/** Set disabled state */
	setDisabled(disabled: boolean): void;
	/** Check if select is disabled */
	isDisabled(): boolean;
	/** Check if select is multi-select mode */
	isMulti(): boolean;
	/** Check if select has search enabled */
	isSearchable(): boolean;

	// Validation & Refresh
	/** Validate the select (for required fields) */
	validate(): boolean;
	/** Sync the custom UI with native select options (use after DOM manipulation) */
	syncOptions(): void;
	/** @deprecated Use syncOptions() instead */
	refresh(): void;
}

// =============================================================================
// Select Events
// =============================================================================

export interface NuiSelectChangeEventDetail {
	/** Selected values */
	values: string[];
	/** Selected display labels */
	labels: string[];
	/** Full selected option details */
	options: { value: string; label: string }[];
}

export interface NuiSelectSelectEventDetail {
	/** Selected option value */
	value: string;
	/** Selected option label */
	label: string;
	/** Whether the option is now selected */
	selected: boolean;
}

export interface NuiSelectItemAddEventDetail {
	value: string;
	label: string;
	options: NuiSelectAddOptions;
}

export interface NuiSelectItemRemoveEventDetail {
	value: string;
}

export interface NuiSelectItemsReplaceEventDetail {
	count: number;
}

// =============================================================================
// Input Events
// =============================================================================

export interface NuiInputEventDetail {
	/** Current input value */
	value: string;
	/** Validity state */
	valid: boolean;
	/** Input name attribute */
	name: string;
}

export interface NuiChangeEventDetail {
	/** Current value */
	value: string;
	/** Validity state */
	valid: boolean;
	/** Input name attribute */
	name: string;
}

export interface NuiCheckboxChangeEventDetail {
	/** Checked state */
	checked: boolean;
	/** Input value attribute */
	value: string;
	/** Input name attribute */
	name: string;
}

export interface NuiClearEventDetail {
	/** Input name attribute */
	name: string;
}

export interface NuiValidateEventDetail {
	/** Validity state */
	valid: boolean;
	/** Validation message */
	message: string;
	/** Input name attribute */
	name: string;
}

export interface NuiInputEvent extends CustomEvent<NuiInputEventDetail> {
	type: 'nui-input';
}

export interface NuiChangeEvent extends CustomEvent<NuiChangeEventDetail | NuiCheckboxChangeEventDetail> {
	type: 'nui-change';
}

export interface NuiClearEvent extends CustomEvent<NuiClearEventDetail> {
	type: 'nui-clear';
}

export interface NuiValidateEvent extends CustomEvent<NuiValidateEventDetail> {
	type: 'nui-validate';
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
		'nui-input': NuiInputEvent;
		'nui-change': NuiChangeEvent;
		'nui-clear': NuiClearEvent;
		'nui-validate': NuiValidateEvent;
		'nui-open': CustomEvent;
		'nui-close': CustomEvent;
		'nui-select': CustomEvent<NuiSelectSelectEventDetail>;
		'nui-enable': CustomEvent;
		'nui-disable': CustomEvent;
		'nui-item-add': CustomEvent<NuiSelectItemAddEventDetail>;
		'nui-item-remove': CustomEvent<NuiSelectItemRemoveEventDetail>;
		'nui-items-replace': CustomEvent<NuiSelectItemsReplaceEventDetail>;
	}
	
	interface HTMLElementTagNameMap {
		'nui-app': NuiAppElement;
		'nui-app-header': NuiAppHeaderElement;
		'nui-sidebar': NuiSidebarElement;
		'nui-skip-links': HTMLElement;
		'nui-link-list': NuiLinkListElement;
		'nui-content': NuiContentElement;
		'nui-app-footer': NuiAppFooterElement;
		'nui-button': NuiButtonElement;
		'nui-icon': NuiIconElement;
		'nui-tabs': NuiTabsElement;
		'nui-accordion': NuiAccordionElement;
		'nui-overlay': NuiOverlayElement;
		'nui-dialog': NuiDialogElement;
		'nui-banner': NuiBannerElement;
		'nui-tooltip': NuiTooltipElement;
		'nui-progress': NuiProgressElement;
		'nui-input-group': NuiInputGroupElement;
		'nui-input': NuiInputElement;
		'nui-textarea': NuiTextareaElement;
		'nui-checkbox': NuiCheckboxElement;
		'nui-radio': NuiRadioElement;
		'nui-select': NuiSelectElement;
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
 * Data-action attribute for CSP-safe event delegation
 * Action strings are handled by app-level JavaScript
 * Syntax: "actionName" or "actionName@targetSelector:param"
 * Example: data-action="toggle-theme"
 * Example: data-action="open@#my-dialog"
 * Example: data-action="update@#user-list:sort=name"
 */
export type DataActionAttribute = 'data-action';

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
