import ut from './nui-ut.js';
const tagName = 'nui-content';

export class NuiContent extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.setAttribute('role', 'region');
        this.setAttribute('aria-label', 'Main Content');

        const style = /*css*/ `
            body {
                overflow: hidden;
                margin: 0;
                padding: 0;
            }
            ${tagName} {
               position: absolute;
               top: var(--nui-top-nav-height);
               bottom: 0;
               left: 0;
               right: 0;
               overflow: auto;
               transition: left var(--nui-transition-duration) var(--nui-transition-timing);
            }
            .nui-side-menu-state-forced ${tagName} {
                left: var(--nui-side-nav-width);
            }
        `;
            
        ut.nui_init_component(this, tagName, style);
    }
}

customElements.define(tagName, NuiContent);
