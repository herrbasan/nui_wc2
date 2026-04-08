import ut from './nui-ut.js';
const tagName = 'nui-button';


export class NuiButton extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        this.setAttribute('role', 'button');
        this.setAttribute('aria-label', this.getAttribute('aria-label') || this.innerText);
        this.setAttribute('tabindex', '0');
        this.innerHTML = `<div class="nui-btn-text">${this.innerHTML}</div>`;

        let action = this.getAttribute('action');
        let icon = this.getAttribute('icon');

        // Add icon if icon attribute is present
        if (icon) {
            let iconEl = ut.icon(icon, false, true);
            if (iconEl) {
                iconEl.classList.add('nui-btn-icon');
                this.insertBefore(iconEl, this.firstChild);
            }
        }

        this.addEventListener('click', () => {
           if(!ut.baseActions(action)) {
               console.warn(`Action "${action}" is not defined in nui-ut.js`);
           }
        });
        const style = /*css*/ `
            ${tagName} {
                display: inline-flex;
                min-height: 1rem;
                border: solid thin var(--nui-shade3);
                background-color: var(--nui-shade5);
                border-radius: var(--nui-space-quarter);
                cursor: pointer;
                align-items: center;
                justify-content: center;
                padding: var(--nui-space-half) var(--nui-space);
                transition: background-color 0.15s ease, border-color 0.15s ease, color 0.15s ease;
            }
            ${tagName}:hover {
                border: solid thin var(--nui-shade2);
                background-color: var(--nui-shade4);
            }
            ${tagName}:active {
                color: white;
                border: solid thin var(--nui-shade2);
                background-color: var(--nui-shade2);
            }
            ${tagName} .nui-btn-icon {
                margin-right: var(--nui-space-half);
            }

           
            ${tagName}.iconOnly {
                padding: var(--nui-space-half);
                border: 0;
                background-color: transparent   ;
            }
            ${tagName}.iconOnly:hover {
                border: 0;
                background-color: var(--nui-shadeX);
            }   
            ${tagName}.iconOnly .nui-btn-icon {
                margin-right: 0;
            }
            ${tagName}.iconOnly .nui-btn-text {
                display: none;
            }
        `;
        ut.nui_init_component(this, tagName, style);
    }
}
customElements.define(tagName, NuiButton, );
