import {
    CornerMath,
} from "./improved-corner-math.js";


class Parameters {
    constructor()
    {
        // These are percentages.
        this.borderRadius = new Size(20, 20);
        this.borderWidth = 0.2;

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

        const graphScale = new Size(boxSize.width, -boxSize.height);
        
        context.save();
        context.translate(boxLeft, boxTop);

        context.lineWidth = 4;
        context.strokeStyle = 'gray';
        
        // Y axis
        context.beginPath();
        context.moveTo(0, 0);
        context.lineTo(0, boxSize.height);
        
        // X axis
        context.lineTo(boxSize.width, boxSize.height);
        context.stroke();
        
        const textLeft = -(boxLeft - 20);
        context.font = '32pt sans-serif';
        context.fillText('1', textLeft, 0);
        context.fillText('0', textLeft, boxSize.height);

        const s = this._parameters.superEllipseS;
        const k = CornerMath.sToK(s);

        console.log(`param s ${this._parameters.superEllipseS} k ${k.toFixed(3)}`);
        
        const pointToGraph = (p) => {
            const offset = p.scaledBy(graphScale);
            return offset.movedBy(new Size(0, boxSize.height));
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
                const graphPoint = pointToGraph(p);
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
                const point = new Point(fraction, result);
                const graphPoint = pointToGraph(point);
                context.lineTo(graphPoint.x, graphPoint.y);
            }

            context.lineTo(endPoint.x, endPoint.y);

            context.lineWidth = 2;
            context.strokeStyle = 'green';
            context.stroke();
            
            context.restore();
        }

        if (this._parameters.showBezierSE) {
            const controlPoints = CornerMath.controlPointsForSuperellipse(s);
            const graphPoints = controlPoints.map((p) => pointToGraph(p));

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

            showControlPoint(startPoint, graphPoints[0], 'green')
            showControlPoint(graphPoints[2], graphPoints[1], 'blue')
            showDot(graphPoints[2], 'orange')
            showControlPoint(graphPoints[2], graphPoints[3], 'pink')
            showControlPoint(endPoint, graphPoints[4], 'yellow')

            context.beginPath();
            context.moveTo(startPoint.x, startPoint.y);
            
            context.bezierCurveTo(graphPoints[0].x, graphPoints[0].y, graphPoints[1].x, graphPoints[1].y, graphPoints[2].x, graphPoints[2].y);
            context.bezierCurveTo(graphPoints[3].x, graphPoints[3].y, graphPoints[4].x, graphPoints[4].y, endPoint.x, endPoint.y);

            context.lineWidth = 2;
            context.strokeStyle = 'silver';
            context.stroke();
        }
        
        {
            // intersection line

            context.beginPath();
            const xOffset = boxSize.width * this._parameters.borderWidth; 
            context.moveTo(xOffset, 0);
            context.lineTo(xOffset, boxSize.height);

            context.lineWidth = 2;
            context.strokeStyle = 'blue';
            context.stroke();
            
            const yPos = CornerMath.superellipseAtXForS(this._parameters.borderWidth, s);
            const dotPosition = pointToGraph(new Point(this._parameters.borderWidth, yPos));

            context.fillStyle = 'red';
            context.beginPath();
            context.arc(dotPosition.x, dotPosition.y, 10, 0, 2 * Math.PI);
            context.fill();
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
        this.kSlider = document.getElementById('s-slider');
        this.kSlider.oninput = (event) => {
            this.#sValueChanged(event.target.value);
        }
        this.parameters.superEllipseS = parseFloat(this.kSlider.value);

        this.widthSlider = document.getElementById('border-left-width-slider');
        this.widthSlider.oninput = (event) => {
            this.#widthChanged(parseFloat(event.target.value));
        }

        this.parameters.borderWidth = parseFloat(this.widthSlider.value);
        
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

    #sValueChanged(newValue)
    {
        this.parameters.superEllipseS = parseFloat(newValue);
        this.#parametersChanged();
    }

    #widthChanged(newWidth)
    {
        this.parameters.borderWidth = parseFloat(newWidth);
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
