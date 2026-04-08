import ut from './nui-ut.js';
const tagName = 'nui-side-nav';


export class NuiSideNav extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {

        this.setAttribute('role', this.getAttribute('role') || 'navigation');
        this.setAttribute('aria-label', this.getAttribute('aria-label') || 'Main Navigation');

        if (this.hasAttribute('width')) { document.body.style.setProperty('--nui-side-nav-width', this.getAttribute('width')); }

        let forceBreakpoint = ut.parseCssUnit(this.getAttribute('force-breakpoint') || '0px').computed;
        window.addEventListener('resize', () => {
            document.body.classList.remove('nui-side-menu-state-open');
            this.setMenuState();
        });

        this.setMenuState = () => {
            if (window.innerWidth > parseInt(forceBreakpoint)) {
                document.body.classList.add('nui-side-menu-state-forced');
            } else {
                document.body.classList.remove('nui-side-menu-state-forced');
            }
        };

        this.setMenuState();
        
        const style = /*css*/ `
            ${tagName} {
                position: absolute;
                width: var(--nui-side-nav-width);
                top: var(--nui-top-nav-height);
                bottom: 0;
                left: calc(var(--nui-side-nav-width) * -1);
                background-color: var(--nui-shade5);
                border-right: solid thin var(--nui-shade3);
                transition: left var(--nui-transition-duration) var(--nui-transition-timing);
            }
            .nui-side-menu-state-forced ${tagName},
            .nui-side-menu-state-open ${tagName} {
                left: 0;
            }
        `;
            
        ut.nui_init_component(this, tagName, style);
    }
}
customElements.define(tagName, NuiSideNav);
