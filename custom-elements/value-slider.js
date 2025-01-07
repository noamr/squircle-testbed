"use strict";

class ValueSlider extends HTMLElement {

    static observedAttributes = ["value", "min", "max", "step"];

    constructor()
    {
        super();
        
        this.rangeSlider = document.createElement("input");
        this.rangeSlider.setAttribute("type", "range");
        this.rangeSlider.className = 'value-slider'

        this.valueLabel = document.createElement('span');
        this.valueLabel.className = 'value-label';
    }

    connectedCallback()
    {
        this.attachShadow({ mode: 'open' });

        const style = document.createElement("style");
        style.innerHTML = `
            .container {
                display: flex;
                width: 100%;
                height: 100%
            }
            
            .value-label {
                width: 4em;
                margin-left: 0.5em;
            }

            input[type="range"] {
                flex-grow: 1;
            }
        `;
        this.shadowRoot.appendChild(style);
        
        const container = document.createElement('div');
        container.className = 'container';

        this.rangeSlider.addEventListener('input', (event) => {
            this.value = this.rangeSlider.value;
            this.dispatchEvent(new Event('input'));
        });

        container.appendChild(this.rangeSlider);
        container.appendChild(this.valueLabel);

        this.shadowRoot.appendChild(container);
    }

    disconnectedCallback()
    {
        console.log("Custom element removed from page.");
    }

    adoptedCallback()
    {
        console.log("Custom element moved to new page.");
    }

    attributeChangedCallback(name, oldValue, newValue)
    {
        switch (name) {
        case "value":
            this.value = newValue;
            break;
        case "min":
            this.rangeSlider.min = newValue;
            break;
        case "max":
            this.rangeSlider.max = newValue;
            break;
        case "step":
            this.rangeSlider.step = newValue;
            break;
        }
        
        // this.rangeSlider.setAttribute(name, newValue);
    }
    
    set value(value)
    {
        this.rangeSlider.value = value;
        this.valueLabel.textContent = value;
    }
    
    get value()
    {
        return this.rangeSlider.value;
    }

    #updateCurrentValue()
    {
        
    }
    
}
