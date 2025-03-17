import {
    CornerMath,
    CornerCurve,
    CornerUtils,
    cornerTopLeft,
    cornerTopRight,
    cornerBottomRight,
    cornerBottomLeft,    
} from "./improved-corner-math.js";

const corners = [
    {
        name: 'top left',
        value: 'topleft',
        data: cornerTopLeft
    },
    {
        name: 'top right',
        value: 'topright',
        data: cornerTopRight
    },
    {
        name: 'bottom right',
        value: 'bottomright',
        data: cornerBottomRight
    },
    {
        name: 'bottom left',
        value: 'bottomleft',
        data: cornerBottomLeft
    }
];

class Parameters {
    constructor()
    {
        this.corner = cornerTopLeft;

        // These are fractions.
        this.verticalBorderRadius = 0.2;
        this.horizontalBorderRadius = 0.2;

        this.verticalBorderWidth = 0.2;
        this.horizontalBorderWidth = 0.2;

        this.superEllipseS = 1;

        this.showControlPoints = true;
        this.showCornerDetails = true;
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
        this.draw();
    }
    
    draw()
    {
        const context = this.canvasElement.getContext('2d');
        context.clearRect(0, 0, this.renderingWidth, this.renderingHeight);

        const boxLeft = this.boxMargin;
        const boxTop = this.boxMargin;

        const boxSize = new Size(
            this.renderingWidth - 2 * this.boxMargin,
            this.renderingHeight - 2 * this.boxMargin
        );

        const boxRight = boxSize.width;
        const boxBottom = boxSize.height;

        const topEdge = -this.boxMargin;
        const leftEdge = -this.boxMargin;
        const bottomEdge = boxSize.height + this.boxMargin;
        const rightEdge = boxSize.width + this.boxMargin;
        
        const verticalBorderWidth = this._parameters.verticalBorderWidth * boxSize.width;
        const horizontalBorderWidth = this._parameters.horizontalBorderWidth * boxSize.height;

        const verticalRadius = this._parameters.verticalBorderRadius * boxSize.width;
        const horizontalRadius = this._parameters.horizontalBorderRadius * boxSize.height;

        const radiusSize = new Size(horizontalRadius, verticalRadius);

        const graphScale = new Size(boxSize.width, -boxSize.height);
        
        context.save();
        context.translate(boxLeft, boxTop);

        const pointToGraph = (p) => {
            const offset = p.scaledBy(graphScale);
            return offset.movedBy(new Size(0, boxSize.height));
        };
        
        const mapToCorner = (p) => {
            return CornerUtils.mapToCorner(this._parameters.corner, p, boxSize);
        };

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

            context.save();
            context.beginPath();
            context.moveTo(anchorPoint.x, anchorPoint.y);
            context.lineTo(controlPoint.x, controlPoint.y);
            context.strokeStyle = 'rgba(0, 0, 0, 0.25)'
            context.lineWidth = 1;
            context.stroke();

            context.beginPath();
            context.arc(controlPoint.x, controlPoint.y, dotRadius, 0, 2 * Math.PI);
            context.fillStyle = color;
            context.fill();
            context.restore();
        }
        
        const showCurve = (graphPoints, lineWidth, strokeStyle) => {
            context.save();

            if (this._parameters.showControlPoints) {
                showControlPoint(graphPoints[0], graphPoints[1], controlPointColor);
                showControlPoint(graphPoints[3], graphPoints[2], controlPointColor);

                if (graphPoints.length > 4) {
                    showDot(graphPoints[3], controlPointColor);
                    showControlPoint(graphPoints[3], graphPoints[4], controlPointColor);
                    showControlPoint(graphPoints[6], graphPoints[5], controlPointColor);
                }
            }

            context.beginPath();
            context.moveTo(graphPoints[0].x, graphPoints[0].y);
            context.bezierCurveTo(graphPoints[1].x, graphPoints[1].y, graphPoints[2].x, graphPoints[2].y, graphPoints[3].x, graphPoints[3].y);

            if (graphPoints.length > 4)
                context.bezierCurveTo(graphPoints[4].x, graphPoints[4].y, graphPoints[5].x, graphPoints[5].y, graphPoints[6].x, graphPoints[6].y);

            context.lineWidth = lineWidth;
            context.strokeStyle = strokeStyle;
            context.stroke();
            context.restore();
        };

        // Box outline
        {
            context.save();
            context.lineWidth = 1;
            context.strokeStyle = '#ccc';
            
            const outsideTopLeftPoints = [
                new Point(0, bottomEdge),
                new Point(0, 0),
                new Point(rightEdge, 0),
            ];

            const insideTopLeftPoints = [
                new Point(verticalBorderWidth, bottomEdge),
                new Point(verticalBorderWidth, horizontalBorderWidth),
                new Point(rightEdge, horizontalBorderWidth),
            ];
            
            const outsidePoints = outsideTopLeftPoints.map(p => mapToCorner(p));
            const insidePoints = insideTopLeftPoints.map(p => mapToCorner(p));
        
            // Outside
            context.beginPath();
            context.moveTo(outsidePoints[0].x, outsidePoints[0].y);
            context.lineTo(outsidePoints[1].x, outsidePoints[1].y);
            context.lineTo(outsidePoints[2].x, outsidePoints[2].y);

            // Inside
            context.moveTo(insidePoints[0].x, insidePoints[0].y);
            context.lineTo(insidePoints[1].x, insidePoints[1].y);
            context.lineTo(insidePoints[2].x, insidePoints[2].y);

            context.stroke();
            context.restore();
        }

        const cornerStartPoint = new Point(0, verticalRadius);
        const cornerEndPoint = new Point(horizontalRadius, 0);

        const startPoint = mapToCorner(cornerStartPoint);
        const endPoint = mapToCorner(cornerEndPoint);
        
        // Corner joins
        const controlPointColor = 'rgba(0, 0, 0, 0.35)';
        {
            context.save();
            showDot(startPoint, controlPointColor);
            showDot(endPoint, controlPointColor);
            context.restore();
        }

        const s = this._parameters.superEllipseS;
        const k = CornerMath.sToK(s);

        const cornerCurve = CornerCurve.canonicalCurveForCorner(s, radiusSize);

        // Outer curve
        {
            const graphPoints = cornerCurve.points.map(p => mapToCorner(p));
            showCurve(graphPoints, 2, 'silver');
        }
        
        const curvatureOffset = CornerMath.offsetForCurvature(s);
        const canonicalStartOffsetPoint = cornerStartPoint.movedBy(curvatureOffset.scaledBy(new Size(verticalBorderWidth, verticalBorderWidth)));
        const canonicalEndOffsetPoint = cornerEndPoint.movedBy(curvatureOffset.flipped().scaledBy(new Size(horizontalBorderWidth, horizontalBorderWidth)));

        const startOffsetPoint = mapToCorner(canonicalStartOffsetPoint);
        const endOffsetPoint = mapToCorner(canonicalEndOffsetPoint);
        showDot(startOffsetPoint, 'red');
        showDot(endOffsetPoint, 'blue');

        const canonicalAdjustedInnerCorner = new Point(canonicalStartOffsetPoint.x, canonicalEndOffsetPoint.y);
        const needsInnerArc = canonicalStartOffsetPoint.y > horizontalBorderWidth && canonicalEndOffsetPoint.x > verticalBorderWidth;
        const needsTrimmedInnerArc = canonicalStartOffsetPoint.x < verticalBorderWidth || canonicalEndOffsetPoint.y < horizontalBorderWidth;

        if (needsInnerArc) {
            const innerCornerScale = new Size(Math.abs(startOffsetPoint.x - endOffsetPoint.x), Math.abs(startOffsetPoint.y - endOffsetPoint.y));
            const innerCornerCurve = CornerCurve.canonicalCurveForCorner(s, innerCornerScale);
            const graphPoints = innerCornerCurve.points.map(p => mapToCorner(p.movedBy(new Size(canonicalStartOffsetPoint.x, canonicalEndOffsetPoint.y))));

            if (needsTrimmedInnerArc) {
                showCurve(graphPoints, 2, 'silver');

                const innerCornerScale = new Size(Math.abs(canonicalStartOffsetPoint.x - canonicalEndOffsetPoint.x), Math.abs(canonicalStartOffsetPoint.y - canonicalEndOffsetPoint.y));
                const innerCornerCurve = CornerCurve.canonicalCurveForCorner(s, innerCornerScale);

                if (canonicalStartOffsetPoint.y > horizontalBorderWidth && canonicalEndOffsetPoint.x > verticalBorderWidth) {
                    const splitCurve = innerCornerCurve.cornerCurveTruncatingAtXAndY(Math.max(verticalBorderWidth - canonicalStartOffsetPoint.x, 0), Math.max(horizontalBorderWidth - canonicalEndOffsetPoint.y, 0));
                    const mappedPoints = splitCurve.points.map(p => mapToCorner(p.movedBy(new Size(canonicalStartOffsetPoint.x, canonicalEndOffsetPoint.y))));

                    if (mappedPoints.length)
                        showCurve(mappedPoints, 4, 'green');
                }
            } else {
                showCurve(graphPoints, 4, 'green');
            }
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
        }

        setupSlider('s-slider', 'superEllipseS');

        setupSlider('border-left-width-slider', 'verticalBorderWidth');
        setupSlider('border-top-width-slider', 'horizontalBorderWidth');

        setupSlider('border-left-radius-slider', 'verticalBorderRadius');
        setupSlider('border-top-radius-slider', 'horizontalBorderRadius');

        const setupCheckbox = (checkboxID, paramName) => {
            const checkbox = document.getElementById(checkboxID);
            checkbox.addEventListener('change', (event) => {
                this.parameters[paramName] = event.target.checked;
                this.#parametersChanged();
            });
            this.parameters[paramName] = checkbox.checked;
            
        };

        const cornerSelect = document.getElementById('corner-select');
        cornerSelect.setValues(corners);
        cornerSelect.addEventListener('change', () => {
            for (const item of corners) {
                if (item.value === cornerSelect.currentValue) {
                    this.#cornerChanged(item.data);
                    break;
                }
            }
        });
        cornerSelect.selectedIndex = 0;

        setupCheckbox('show-control-points', 'showControlPoints');
        setupCheckbox('show-corner-details', 'showCornerDetails');

        this.#parametersChanged();
    }
    
    #cornerChanged(value)
    {
        this.parameters.corner = value;
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
