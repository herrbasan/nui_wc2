import ut from './nui-ut.js';
const tagName = 'nui-app';

export class NuiApp extends HTMLElement {
    constructor() {
        super();
    }

    connectedCallback() {
        let sideNav = this.querySelector('nui-side-nav');
        let content = this.querySelector('nui-content');
        let topNav = this.querySelector('nui-top-nav');
    
        if (sideNav) {
            let sideNavWidth = ut.parseCssUnit(ut.getAttributes(sideNav).width);
            ut.log(`Setting side nav width to ${sideNavWidth.computed}`);
        }
        
        const style = /*css*/ `
            
        `;
            
        ut.nui_init_component(this, tagName, style);
    }
}

customElements.define(tagName, NuiApp);