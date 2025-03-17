import {
    CornerMath,
    CornerCurve,
    CornerUtils,
    cornerTopLeft,
    cornerTopRight,
    cornerBottomRight,
    cornerBottomLeft,    
} from "./improved-corner-math.js";

class Parameters {
    constructor()
    {
        // These are percentages.
        this.borderRadius = new Size(20, 20);
        this.borderLeftWidth = 0.2;
        this.borderTopWidth = 0.2;

        this.superEllipseS = 1;

        this.showClassicSE = true;
        this.showMathSE = true;
        this.showBezierSE = true;

        this.showControlPoints = true;
    }
}

class GraphRenderer {
    constructor(canvasElement)
    {
        this.canvasElement = canvasElement;

        this.#computeCanvasSize();
        
        this.boxMargin = 100;
    }
    
    set parameters(params)
    {
        this._parameters = params;
        this.drawGraph();
    }
    
    drawGraph()
    {
        const context = this.canvasElement.getContext('2d');
        context.clearRect(0, 0, this.renderingWidth, this.renderingHeight);

        const boxLeft = this.boxMargin;
        const boxTop = this.boxMargin;

        const boxSize = new Size(
            this.renderingWidth - 2 * this.boxMargin,
            this.renderingHeight - 2 * this.boxMargin
        );

        const graphScale = new Size(boxSize.width, boxSize.height);
        
        context.save();
        context.translate(boxLeft, boxTop);

        context.lineWidth = 4;
        context.strokeStyle = 'gray';
        
        // Box edge
        context.beginPath();
        context.moveTo(0, boxSize.height);
        context.lineTo(0, 0);
        context.lineTo(boxSize.width, 0);
        context.stroke();

        const s = this._parameters.superEllipseS;
        const k = CornerMath.sToK(s);

        const pointToGraph = (p) => {
            return p.scaledBy(graphScale);
        };

        const startPoint = pointToGraph(new Point(0, 1));
        const endPoint = pointToGraph(new Point(1, 0));
        
        const colorClassicSuperellipse = 'green';

        if (this._parameters.showMathSE) {
            context.save();
            
            context.beginPath();
            context.lineTo(0, 0);

            const steps = Math.floor(boxSize.width / 10);
            for (let i = 0; i < steps; ++i) {
                const t = i / (steps - 1);

                const p = CornerMath.superellipsePointAtProgress(s, t);
                const graphPoint = pointToGraph(new Point(1 - p.y, 1 - p.x)); // Map to top left.
                context.lineTo(graphPoint.x, graphPoint.y);
            }

            context.lineWidth = 2;
            context.strokeStyle = 'purple';
            context.stroke();

            context.restore();
        }

        if (this._parameters.showClassicSE) {
            context.save();
            
            context.beginPath();
            context.moveTo(startPoint.x, startPoint.y);

            for (let x = 0; x < boxSize.width; ++x) {
                const fraction = x / boxSize.width;
                const result = CornerMath.superellipseAtX(fraction, k);
                const point = new Point(1 - result, 1 - fraction); // Mapping to top left.
                const graphPoint = pointToGraph(point);
                context.lineTo(graphPoint.x, graphPoint.y);
            }

            context.lineTo(endPoint.x, endPoint.y);

            context.lineWidth = 2;
            context.strokeStyle = 'red';
            context.stroke();
            
            context.restore();
        }

        function showDot(p, color)
        {
            const dotRadius = 10;

            context.fillStyle = color;
            context.beginPath();
            context.arc(p.x, p.y, dotRadius, 0, 2 * Math.PI);
            context.fill();
        }

        function showControlPoint(anchorPoint, controlPoint, color)
        {
            const dotRadius = 10;

            context.beginPath();
            context.moveTo(anchorPoint.x, anchorPoint.y);
            context.lineTo(controlPoint.x, controlPoint.y);
            context.strokeStyle = 'rgba(0, 0, 0, 0.25)'
            context.lineWidth = 1;
            context.stroke();

            context.beginPath();
            context.arc(controlPoint.x, controlPoint.y, dotRadius, 0, 2 * Math.PI);
            context.fillStyle = `rgb(from ${color} r g b / 50%)`;
            context.fill();
        }

        const cornerCurve = CornerCurve.canonicalCurveForCorner(s, new Size(1, 1));

        if (this._parameters.showBezierSE) {
            const mappedPoints = cornerCurve.points.map((p) => pointToGraph(p));

            // showControlPoint(mappedPoints[0], mappedPoints[1], 'green')
            // showControlPoint(mappedPoints[3], mappedPoints[2], 'blue')
            showDot(mappedPoints[3], 'orange')
            // showControlPoint(mappedPoints[3], mappedPoints[4], 'pink')
            // showControlPoint(mappedPoints[6], mappedPoints[5], 'yellow')

            context.beginPath();
            context.moveTo(mappedPoints[0].x, mappedPoints[0].y);
            
            context.bezierCurveTo(mappedPoints[1].x, mappedPoints[1].y, mappedPoints[2].x, mappedPoints[2].y, mappedPoints[3].x, mappedPoints[3].y);
            context.bezierCurveTo(mappedPoints[4].x, mappedPoints[4].y, mappedPoints[5].x, mappedPoints[5].y, mappedPoints[6].x, mappedPoints[6].y);

            context.lineWidth = 2;
            context.strokeStyle = 'silver';
            context.stroke();
        }
        
        if (this._parameters.showBezierSE) {
            // Run the splitting logic in top right coordinates.
            const splitCurve = cornerCurve.cornerCurveTruncatingAtXAndY(this._parameters.borderLeftWidth, this._parameters.borderTopWidth);
            const mappedPoints = splitCurve.points.map((p) => pointToGraph(p));
            
            if (mappedPoints.length === 0) {
                context.beginPath();
            } else if (mappedPoints.length === 4) {
                // One segment.
                if (this._parameters.showControlPoints) {
                    showControlPoint(mappedPoints[0], mappedPoints[1], 'gray')
                    showControlPoint(mappedPoints[3], mappedPoints[2], 'gray')
                }

                context.beginPath();
                context.moveTo(mappedPoints[0].x, mappedPoints[0].y);
                context.bezierCurveTo(mappedPoints[1].x, mappedPoints[1].y, mappedPoints[2].x, mappedPoints[2].y, mappedPoints[3].x, mappedPoints[3].y);
            } else {
                // Two segments.

                if (this._parameters.showControlPoints) {
                    showControlPoint(mappedPoints[0], mappedPoints[1], 'gray')
                    showControlPoint(mappedPoints[3], mappedPoints[2], 'gray')
                    showDot(mappedPoints[3], 'orange')
                    showControlPoint(mappedPoints[3], mappedPoints[4], 'gray')
                    showControlPoint(mappedPoints[6], mappedPoints[5], 'gray')
                }

                context.beginPath();
                context.moveTo(mappedPoints[0].x, mappedPoints[0].y);
            
                context.bezierCurveTo(mappedPoints[1].x, mappedPoints[1].y, mappedPoints[2].x, mappedPoints[2].y, mappedPoints[3].x, mappedPoints[3].y);
                context.bezierCurveTo(mappedPoints[4].x, mappedPoints[4].y, mappedPoints[5].x, mappedPoints[5].y, mappedPoints[6].x, mappedPoints[6].y);
            }

            context.lineWidth = 4;
            context.strokeStyle = 'rgba(0, 128, 0, 0.75)';
            context.stroke();
        }
        
        {
            // Border lines.
            context.beginPath();
            const xOffset = boxSize.width * this._parameters.borderLeftWidth;
            context.moveTo(xOffset, 0);
            context.lineTo(xOffset, boxSize.height);

            const yOffset = boxSize.height * this._parameters.borderTopWidth; 
            context.moveTo(0, yOffset);
            context.lineTo(boxSize.width, yOffset);

            context.lineWidth = 2;
            context.strokeStyle = 'blue';
            context.stroke();
        }
        
        context.restore();
    }

    #computeCanvasSize()
    {
        const canvasRect = this.canvasElement.getBoundingClientRect();
        
        this.scale = window.devicePixelRatio;
        this.renderingWidth = canvasRect.width * this.scale;
        this.renderingHeight = canvasRect.height * this.scale;

        this.canvasElement.width = this.renderingWidth;
        this.canvasElement.height = this.renderingHeight;
    }  
};

class WindowController {
    constructor()
    {
        this.canvasElement = document.getElementById('preview-canvas');

        this.parameters = new Parameters();
        this.graphRenderer = new GraphRenderer(this.canvasElement);
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
        const setupSlider = (sliderID, paramName) => {
            const slider = document.getElementById(sliderID);
            slider.oninput = (event) => {
                this.parameters[paramName] = parseFloat(slider.value);
                this.#parametersChanged();
            }
            this.parameters[paramName] = parseFloat(slider.value);
        };

        setupSlider('s-slider', 'superEllipseS');
        setupSlider('border-left-width-slider', 'borderLeftWidth');
        setupSlider('border-top-width-slider', 'borderTopWidth');
        
        const setupCheckbox = (checkboxID, paramName) => {
            const checkbox = document.getElementById(checkboxID);
            checkbox.addEventListener('change', (event) => {
                this.parameters[paramName] = event.target.checked;
                this.#parametersChanged();
            });
            this.parameters[paramName] = checkbox.checked;
            
        };

        setupCheckbox('show-control-points', 'showControlPoints');
        setupCheckbox('show-classic-se', 'showClassicSE');
        setupCheckbox('show-math-se', 'showMathSE');
        setupCheckbox('show-bezier-se', 'showBezierSE');

        this.#parametersChanged();
    }

    #parametersChanged()
    {
        this.graphRenderer.parameters = this.parameters;
    }
}

let windowController;
window.addEventListener('load', () => {
    windowController = new WindowController();
}, false);
