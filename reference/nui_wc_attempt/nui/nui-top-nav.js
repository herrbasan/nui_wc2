import ut from './nui-ut.js';
const tagName = 'nui-top-nav';
window.nui_components = window.nui_components || {};
window.nui_components[tagName] = window.nui_components[tagName] || {};

export class NuiTopNav extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.setAttribute('role', 'navigation');
        this.setAttribute('aria-label', 'Main Navigation');
        this.id = ut.id()
        window.nui_components[tagName][this.id] = this;
    }
}
customElements.define(tagName, NuiTopNav);
