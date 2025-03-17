"use strict";

class PopupElement extends HTMLElement {

    constructor()
    {
        super();
    }

    connectedCallback()
    {
        this.attachShadow({ mode: 'open' });

        const style = document.createElement("style");
        style.innerHTML = `
            select {
                margin: 10px;
                font-size: 16px;
            }
        `;
        this.shadowRoot.appendChild(style);

        this.select = document.createElement("select");
        this.select.className = 'popup-select'
        this.select.addEventListener('change', (event) => {
            this.valueChanged();
        });
        this.shadowRoot.appendChild(this.select);
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
        console.log(`Attribute ${name} has changed.`);
    }
    
    set selectedIndex(index)
    {
        this.select.selectedIndex = index;
        this.valueChanged();
    }

    setValues(values)
    {
        DOMUtils.removeAllChildren(this.select);
        
        for (const curValue of values) {
            const option = document.createElement('option');
            option.dataValue = curValue;
            option.textContent = curValue.name;
            this.select.appendChild(option);
        }
        this._updateCurrentValue();
    }
    
    valueChanged()
    {
        this._updateCurrentValue();
        this.dispatchEvent(new Event('change'));
    }
    
    _updateCurrentValue()
    {
        const firstOption = this.select.selectedOptions[0];
        this.currentValue = firstOption.dataValue.value;
    }
}
