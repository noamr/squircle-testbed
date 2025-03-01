import {
    cornerStyleNone,
    cornerStyleRounded,
    cornerStyleSuperellipse,
    cornerStyleSuperellipseApproximation,
    cornerStyleContinuousRounded,
    ShapeParameters,
    BorderRenderer,
} from "./border-renderer.js";

const cornerStyles = [
    {
        name: 'Normal',
        value: 'normal',
        data: cornerStyleNone
    },
    {
        name: 'Rounded',
        value: 'rounded',
        data: cornerStyleRounded
    },
    {
        name: 'Superellipse',
        value: 'superellipse',
        data: cornerStyleSuperellipse
    },
    {
        name: 'Superellipse Approximation',
        value: 'superellipseaprox',
        data: cornerStyleSuperellipseApproximation
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
        this.kSlider = document.getElementById('k-slider');
        this.kSlider.oninput = (event) => {
            this.#kValueChanged(event.target.value);
        }
        this.parameters.superEllipseK = parseFloat(this.kSlider.value);

        this.sampleRadiusSlider = document.getElementById('sample-radius-slider');
        this.sampleRadiusSlider.oninput = (event) => {
            this.#sampleRadiusValueChanged(event.target.value);
        }
        this.parameters.sampleBorderRadius = this.sampleRadiusSlider.value / 100;

        this.referenceRadiusSlider = document.getElementById('reference-radius-slider');
        this.referenceRadiusSlider.oninput = (event) => {
            this.#referenceRadiusValueChanged(event.target.value);
        }
        this.parameters.referenceBorderRadius = this.referenceRadiusSlider.value / 100;

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
        cornerStyleSelect.selectedIndex = 2;

        const referenceCornerStyleSelect = document.getElementById('reference-corner-style-select');
        referenceCornerStyleSelect.setValues(cornerStyles);
        referenceCornerStyleSelect.addEventListener('change', () => {
            for (const style of cornerStyles) {
                if (style.value === referenceCornerStyleSelect.currentValue) {
                    this.#referenceCornerStyleChanged(style.data);
                    break;
                }
            }
        });
        referenceCornerStyleSelect.selectedIndex = 3;

        const showSampleCheckbox = document.getElementById('show-sample');
        showSampleCheckbox.addEventListener('change', (event) => {
            this.parameters.showSample = event.target.checked;
            this.#parametersChanged();
        });
        this.parameters.showSample = showSampleCheckbox.checked;

        const showReferenceCheckbox = document.getElementById('show-reference');
        showReferenceCheckbox.addEventListener('change', (event) => {
            this.parameters.showReference = event.target.checked;
            this.#parametersChanged();
        });

        this.parameters.showReference = showReferenceCheckbox.checked;


        const showSampleControlPointsCheckbox = document.getElementById('show-sample-control-points');
        showSampleControlPointsCheckbox.addEventListener('change', (event) => {
            this.parameters.showSampleControlPoints = event.target.checked;
            this.#parametersChanged();
        });
        this.parameters.showSampleControlPoints = showSampleControlPointsCheckbox.checked;


        const showReferenceControlPointsCheckbox = document.getElementById('show-reference-control-points');
        showReferenceControlPointsCheckbox.addEventListener('change', (event) => {
            this.parameters.showReferenceControlPoints = event.target.checked;
            this.#parametersChanged();
        });
        this.parameters.showReferenceControlPoints = showReferenceControlPointsCheckbox.checked;


        const zoomCheckbox = document.getElementById('zoom');
        zoomCheckbox.addEventListener('change', (event) => {
            this.parameters.zoom = event.target.checked;
            this.#parametersChanged();
        });
        this.parameters.zoom = zoom.checked;


        this.#parametersChanged();
    }
    
    #cornerStyleChanged(newStyle)
    {
        this.parameters.cornerStyle = newStyle;
        this.#parametersChanged();
    }

    #referenceCornerStyleChanged(newStyle)
    {
        this.parameters.referenceCornerStyle = newStyle;
        this.#parametersChanged();
    }
    
    #kValueChanged(newValue)
    {
        this.parameters.superEllipseK = parseFloat(newValue);
        this.#parametersChanged();
    }

    #sampleRadiusValueChanged(newRadius)
    {
        this.parameters.sampleBorderRadius = newRadius / 100;
        this.#parametersChanged();
    }

    #referenceRadiusValueChanged(newRadius)
    {
        this.parameters.referenceBorderRadius = newRadius / 100;
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
