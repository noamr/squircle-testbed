import {
    cornerStyleNone,
    cornerStyleStraight,
    cornerStyleRound,
    cornerStyleNotch,
    cornerStyleBevel,
    cornerStyleScoop,
    cornerStyleSuperellipse,
    cornerStyleSuperellipseApproximation,
    cornerStyleContinuousRounded,
    ShapeParameters,
    BorderRenderer,
} from "./corner-renderer.js";

const cornerStyles = [
    {
        name: 'Straight',
        value: 'straight',
        data: cornerStyleStraight
    },
    {
        name: 'Round',
        value: 'rounde',
        data: cornerStyleRound
    },
    {
        name: 'Scoop',
        value: 'scoop',
        data: cornerStyleScoop
    },
    {
        name: 'Notch',
        value: 'notch',
        data: cornerStyleNotch
    },
    {
        name: 'Bevel',
        value: 'bevel',
        data: cornerStyleBevel
    },
    {
        name: 'Superellipse',
        value: 'superellipse',
        data: cornerStyleSuperellipse
    },
    {
        name: 'Continuous Rounded (Apple)',
        value: 'continuous-rounded',
        data: cornerStyleContinuousRounded
    },
];

class WindowController {
    constructor()
    {
        this.canvasElement = document.getElementById('preview-canvas');
        
        this.parameters = new ShapeParameters();
        this.previewRenderer = new BorderRenderer(this.canvasElement, this.parameters);
        
        this.#registerCustomElements();
        this.#connectControls();
    }

    #registerCustomElements()
    {
        window.customElements.define("custom-popup", PopupElement);   
        window.customElements.define("value-slider", ValueSlider);   
    }
    
    #connectControls()
    {
        this.sSlider = document.getElementById('s-slider');

        const setupSlider = (sliderID, paramName) => {
            const slider = document.getElementById(sliderID);
            slider.oninput = (event) => {
                this.parameters[paramName] = parseFloat(slider.value);
                this.#parametersChanged();
            }
            this.parameters[paramName] = parseFloat(slider.value);
        };

        setupSlider('s-slider', 'superEllipseParam');
        setupSlider('border-radius-x-slider', 'borderRadiusWidth');
        setupSlider('border-radius-y-slider', 'borderRadiusHeight');

        setupSlider('border-left-width-slider', 'borderLeftWidth');
        setupSlider('border-top-width-slider', 'borderTopWidth');

        const cornerStyleSelect = document.getElementById('corner-style-select');
        cornerStyleSelect.setValues(cornerStyles);
        cornerStyleSelect.addEventListener('change', () => {
            for (const style of cornerStyles) {
                if (style.value === cornerStyleSelect.currentValue) {
                    this.#cornerStyleChanged(style.data);
                    break;
                }
            }
        });
        cornerStyleSelect.selectedIndex = 5;

        const showControlPointsCheckbox = document.getElementById('show-control-points');
        showControlPointsCheckbox.addEventListener('change', (event) => {
            this.parameters.showControlPoints = event.target.checked;
            this.#parametersChanged();
        });
        this.parameters.showControlPoints = showControlPointsCheckbox.checked;

        this.#parametersChanged();
    }
    
    #cornerStyleChanged(newStyle)
    {
        this.parameters.cornerStyle = newStyle;
        
        switch (newStyle) {
        case cornerStyleStraight:
            this.parameters.superEllipseParam = 15;
            break;
        case cornerStyleRound:
            this.parameters.superEllipseParam = 1;
            break;
        case cornerStyleScoop:
            this.parameters.superEllipseParam = -1;
            break;
        case cornerStyleNotch:
            this.parameters.superEllipseParam = -15;
            break;
        case cornerStyleBevel:
            this.parameters.superEllipseParam = 0;
            break;
        }
        
        this.sSlider.value = this.parameters.superEllipseParam;
        this.#parametersChanged();
    }

    #parametersChanged()
    {
        this.previewRenderer.parameters = this.parameters;
    }
}

let windowController;
window.addEventListener('load', () => {
    windowController = new WindowController();
}, false);
