"use strict";



const cornerTopLeft = 0;
const cornerTopRight = 1;
const cornerBottomRight = 2;
const cornerBottomLeft = 3;

const cornerStyleNone = 'none';
const cornerStyleRounded = 'rounded';
const cornerStyleSuperellipse = 'superellipse';
const cornerStyleContinuousRounded = 'continuous-rounded';


const shapeIDSample = 'sample';
const shapeIDReference = 'reference';

class ShapeParameters {
    constructor()
    {
        this.sampleBorderRadius = 0.25;
        this.referenceBorderRadius = 0.25;

        this.superEllipseK = 1.5;

        this.cornerStyle = cornerStyleRounded;
        this.referenceCornerStyle = cornerStyleRounded;
        
        this.showSample = true;
        this.showReference = true;

        this.showSampleControlPoints = true;
        this.showReferenceControlPoints = true;

        this.zoom = false;
    }
}

class BorderRenderer {
    constructor(canvasElement, parameters)
    {
        this.canvasElement = canvasElement;
        this._parameters = structuredClone(parameters);
        
        this.#computeCanvasSize();
        
        this.boxMargin = 50;
    }
    
    set parameters(parameters)
    {
        this._parameters = structuredClone(parameters);
        this.paint(); // FIXME: do on a rAF callback.
    }

    get parameters()
    {
        return this._parameters;
    }
    
    paint()
    {
        const context = this.canvasElement.getContext('2d');
        context.clearRect(0, 0, this.renderingWidth, this.renderingHeight);

        const boxLeft = this.boxMargin;
        const boxTop = this.boxMargin;
        
        context.save();
        context.translate(boxLeft, boxTop);

        const boxSize = new Size(
            this.renderingWidth - 2 * this.boxMargin,
            this.renderingHeight - 2 * this.boxMargin
        );
        
        //console.log(`boxSize ${boxSize.width} ${boxSize.height}`)

        if (this._parameters.zoom) {
            //context.translate(-boxSize.width / 2, boxSize.height / 2);

            const topRight = new Point(this.renderingWidth, 0);
            const scaleFactor = 1.7;

            context.translate(topRight.x, topRight.y);
            context.scale(scaleFactor, scaleFactor);
            context.translate(-topRight.x, -topRight.y);
        }

        const topLeft = new Point(0, 0);
        this.#drawBox(context, boxSize);

        context.lineWidth = this.scale * 1;
        
        if (this._parameters.showReference) {
            const shape = this.#createShape(shapeIDReference, this._parameters.referenceCornerStyle, topLeft, boxSize);

            context.strokeStyle = 'gray';
            this.#drawShape(context, shape, this._parameters.showReferenceControlPoints);
        }

        if (this._parameters.showSample) {
            const shape = this.#createShape(shapeIDSample, this._parameters.cornerStyle, topLeft, boxSize);

            context.strokeStyle = 'red';
            this.#drawShape(context, shape, this._parameters.showSampleControlPoints);
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
    
    #drawBox(context, boxSize)
    {
        context.fillStyle = 'rgba(0, 0, 0, 0.04)';
        context.fillRect(0, 0, boxSize.width, boxSize.height);
    }
    
    #createShape(shapeID, cornerStyle, topLeft, boxSize)
    {
        const shapeSegments = [];

        let cornerConstant = 1;
        if (cornerStyle === cornerStyleContinuousRounded)
            cornerConstant = 1.52866;

        // Top left
        const topLeftCornerSize = this.#cornerSize(shapeID, boxSize, cornerTopLeft);
        
        let start = topLeftCornerSize.height * cornerConstant;
        shapeSegments.push(new ShapeSegmentMove(Absolute, new Point(topLeft.x, topLeft.y + start)));

        this.#addShapeCorner(shapeSegments, cornerStyle, topLeft, topLeftCornerSize, cornerTopLeft);

        // Top edge
        const topRight = new Point(topLeft.x + boxSize.width, topLeft.y);
        const topRightCornerSize = this.#cornerSize(shapeID, boxSize, cornerTopRight);
        
        start = topRightCornerSize.width * cornerConstant;
        shapeSegments.push(new ShapeSegmentLine(Absolute, new Point(topRight.x - start, topRight.y)));

        // Top right
        this.#addShapeCorner(shapeSegments, cornerStyle, topRight, topRightCornerSize, cornerTopRight);

        // Right edge
        const bottomRight = topLeft.movedBy(boxSize);
        const bottomRightCornerSize = this.#cornerSize(shapeID, boxSize, cornerBottomRight);
        start = bottomRightCornerSize.height * cornerConstant;
        shapeSegments.push(new ShapeSegmentLine(Absolute, new Point(bottomRight.x, bottomRight.y - start)));
        
        // Bottom right
        this.#addShapeCorner(shapeSegments, cornerStyle, bottomRight, bottomRightCornerSize, cornerBottomRight);
        
        // Bottom edge
        const bottomLeft = new Point(topLeft.x, topLeft.y + boxSize.height);
        const bottomLeftCornerSize = this.#cornerSize(shapeID, boxSize, cornerBottomLeft);
        start = bottomLeftCornerSize.width * cornerConstant;
        shapeSegments.push(new ShapeSegmentLine(Absolute, new Point(bottomLeft.x + start, bottomLeft.y)));
        
        // Bottom left
        this.#addShapeCorner(shapeSegments, cornerStyle, bottomLeft, bottomLeftCornerSize, cornerBottomLeft);
        
        // Left edge
        shapeSegments.push(new ShapeSegmentClose());

        const shape = new Shape();
        shape.segments = shapeSegments;
        return shape;
    }
    
    #addShapeCorner(shapeSegments, cornerStyle, cornerPoint, cornerSize, corner)
    {
        switch (cornerStyle) {
        case cornerStyleNone:
            this.#addShapeNormalCorner(shapeSegments, cornerPoint, cornerSize, corner);
            break;
        case cornerStyleRounded:
            this.#addShapeRoundedCorner(shapeSegments, cornerPoint, cornerSize, corner);
            break;
        case cornerStyleSuperellipse:
            this.#addShapeSuperellipseCorner(shapeSegments, cornerPoint, cornerSize, corner);
            break;
        case cornerStyleContinuousRounded:
            this.#addShapeContinuousRoundedCorner(shapeSegments, cornerPoint, cornerSize, corner);
            break;
        }
    }
        
    #addShapeNormalCorner(shapeSegments, cornerPoint, cornerSize, corner)
    {
        switch (corner) {
        case cornerTopLeft: {
            shapeSegments.push(new ShapeSegmentLine(Absolute, cornerPoint));
            shapeSegments.push(new ShapeSegmentLine(Absolute, new Point(cornerPoint.x + cornerSize.width, cornerPoint.y)));
            break;
        }
        case cornerTopRight: {
            shapeSegments.push(new ShapeSegmentLine(Absolute, cornerPoint));
            shapeSegments.push(new ShapeSegmentLine(Absolute, new Point(cornerPoint.x, cornerPoint.y + cornerSize.height)));
            break;
        }
        case cornerBottomRight: {
            shapeSegments.push(new ShapeSegmentLine(Absolute, cornerPoint));
            shapeSegments.push(new ShapeSegmentLine(Absolute, new Point(cornerPoint.x - cornerSize.width, cornerPoint.y)));
            break;
        }
        case cornerBottomLeft: {
            shapeSegments.push(new ShapeSegmentLine(Absolute, cornerPoint));
            shapeSegments.push(new ShapeSegmentLine(Absolute, new Point(cornerPoint.x, cornerPoint.y - cornerSize.height)));
            break;
        }
        }
    }

    #addShapeRoundedCorner(shapeSegments, cornerPoint, cornerSize, corner)
    {
        let firstEdgeScale;
        let secondEdgeScale;

        switch (corner) {
        case cornerTopLeft: {
            firstEdgeScale = new Size(0, 1)
            secondEdgeScale = new Size(1, 0)
            break;
        }
        case cornerTopRight: {
            firstEdgeScale = new Size(-1, 0)
            secondEdgeScale = new Size(0, 1)
            break;
        }
        case cornerBottomRight: {
            firstEdgeScale = new Size(0, -1)
            secondEdgeScale = new Size(-1, 0)
            break;
        }
        case cornerBottomLeft: {
            firstEdgeScale = new Size(1, 0)
            secondEdgeScale = new Size(0, -1)
            break;
        }
        }
        
        const controlPointOffsetFromCorner = cornerSize.scaledBy(new Size(circleControlPoint, circleControlPoint));

        const fromControlPointOffset = controlPointOffsetFromCorner.scaledBy(firstEdgeScale);
        const toControlPointOffset = controlPointOffsetFromCorner.scaledBy(secondEdgeScale);

        const fromControlPoint = cornerPoint.movedBy(fromControlPointOffset);
        const toControlPoint = cornerPoint.movedBy(toControlPointOffset);

        const targetOffset = cornerSize.scaledBy(secondEdgeScale);
        const targetPoint = cornerPoint.movedBy(targetOffset);

        shapeSegments.push(new ShapeSegmentCurve(Absolute, fromControlPoint, toControlPoint, targetPoint));
    }

    #addShapeSuperellipseCorner(shapeSegments, cornerPoint, cornerSize, corner)
    {
        let cornerScale;
        switch (corner) {
        case cornerTopLeft:
            cornerScale = new Size(1, 1)
            break;
        case cornerTopRight:
            cornerScale = new Size(-1, 1)
            break;
        case cornerBottomRight:
            cornerScale = new Size(-1, -1)
            break;
        case cornerBottomLeft:
            cornerScale = new Size(1, -1)
            break;
        }

        function superellipse(s, t)
        {
            const n = Math.pow(1/2, s);
            const x = Math.pow(t, 1 / n);
            const y = Math.pow(1 - t, 1 / n);
            return new Size(x, y);
        }

        const steps = Math.floor(Math.max(cornerSize.width, cornerSize.height) / 2);
        const s = this._parameters.superEllipseK;

        for (let i = 0; i < steps; ++i) {
            let t = i / (steps - 1);

            if (corner === cornerTopRight || corner === cornerBottomLeft)
                t = 1 - t;

            const p = superellipse(s, t);
            let offset = cornerSize.scaledBy(p);
            offset = offset.scaledBy(cornerScale);

            const point = cornerPoint.movedBy(offset);
            shapeSegments.push(new ShapeSegmentLine(Absolute, point));

        }
    }
    
    #addShapeContinuousRoundedCorner(shapeSegments, cornerPoint, cornerSize, corner)
    {
        let cornerScale;

        switch (corner) {
        case cornerTopLeft: {
            cornerScale = new Size(1, 1)
            break;
        }
        case cornerTopRight: {
            cornerScale = new Size(-1, 1)
            break;
        }
        case cornerBottomRight: {
            cornerScale = new Size(-1, -1)
            break;
        }
        case cornerBottomLeft: {
            cornerScale = new Size(1, -1)
            break;
        }
        }
        
        // Need flipping per corner
        const tlbrSegments = [
            {
                cp1: new Size(0, 1.08849),
                cp2: new Size(0, 0.868407),
                end: new Size(0.0749114, 0.631494)
            },
            {
                cp1: new Size(0.169060, 0.372824),
                cp2: new Size(0.372824, 0.16906),
                end: new Size(0.631494, 0.0749114)
            },
            {
                cp1: new Size(0.868407, 0),
                cp2: new Size(1.088490, 0),
                end: new Size(1.528660, 0)
            }
        ];

        const trblSegments = [
            {
                cp1: new Size(1.088490, 0),
                cp2: new Size(0.868407, 0),
                end: new Size(0.631494, 0.0749114)
            },
            {
                cp1: new Size(0.372824, 0.169060),
                cp2: new Size(0.169060, 0.372824),
                end: new Size(0.0749114, 0.631494)
            },
            {
                cp1: new Size(0, 0.868407),
                cp2: new Size(0, 1.088490),
                end: new Size(0, 1.528660)
            }
        ];

        const curveSegments = (corner === cornerTopLeft || corner === cornerBottomRight) ? tlbrSegments : trblSegments;

        const flippedCornerSize = cornerSize.scaledBy(cornerScale);

        for (const segment of curveSegments) {

            const fromControlPointOffset = segment.cp1.scaledBy(flippedCornerSize);
            const toControlPointOffset = segment.cp2.scaledBy(flippedCornerSize);

            const fromControlPoint = cornerPoint.movedBy(fromControlPointOffset);
            const toControlPoint = cornerPoint.movedBy(toControlPointOffset);

            const targetOffset = segment.end.scaledBy(flippedCornerSize);
            const targetPoint = cornerPoint.movedBy(targetOffset);
            
            shapeSegments.push(new ShapeSegmentCurve(Absolute, fromControlPoint, toControlPoint, targetPoint));
        }

    }

    #cornerSize(shapeID, boxSize, corner)
    {
        const radius = (shapeID === shapeIDSample) ? this._parameters.sampleBorderRadius : this._parameters.referenceBorderRadius;
        // FIXME: Support variable corner radius.
        return new Size(
            radius * boxSize.width,
            radius * boxSize.height
        );
    }

    #drawControlPoints(context, shape)
    {
        const pointRadius = 10;
        const controlPointLineWidth = 1;

        const iterator = shape.iterator;
        let it;
        
        let previousPosition;
        
        while (it = iterator.next()) {
            switch (it.segment.constructor) {
            case ShapeSegmentMove:
            case ShapeSegmentLine:
                context.beginPath();
                context.moveTo(it.position.x, it.position.y);
                context.arc(it.position.x, it.position.y, pointRadius, 0, 2 * Math.PI);
                context.fillStyle = 'rgba(0, 0, 0, 0.5)';
                context.fill();
                break;
            case ShapeSegmentHorizontalLine:
            case ShapeSegmentVerticalLine:
                break;
            case ShapeSegmentCurve: {
                const controlPoints = it.segment.controlPointsWithCurrentPoint(it.position);

                context.beginPath();
                context.moveTo(it.position.x, it.position.y);
                context.arc(it.position.x, it.position.y, pointRadius, 0, 2 * Math.PI);
                context.fillStyle = 'rgba(0, 0, 0, 0.5)';
                context.fill();

                // Line from previous point to first control point.
                context.beginPath();
                context.moveTo(previousPosition.x, previousPosition.y);
                context.lineTo(controlPoints[0].x, controlPoints[0].y);
                context.lineWidth = controlPointLineWidth;
                context.stroke();

                context.beginPath();
                context.moveTo(controlPoints[0].x, controlPoints[0].y);
                context.arc(controlPoints[0].x, controlPoints[0].y, pointRadius, 0, 2 * Math.PI);
                context.fillStyle = 'rgba(0, 0, 255, 0.5)';
                context.fill();

                // Line from current point to second control point.
                context.beginPath();
                context.moveTo(it.position.x, it.position.y);
                context.lineTo(controlPoints[1].x, controlPoints[1].y);
                context.lineWidth = controlPointLineWidth;
                context.stroke();

                context.moveTo(controlPoints[1].x, controlPoints[1].y);
                context.arc(controlPoints[1].x, controlPoints[1].y, pointRadius, 0, 2 * Math.PI);

                context.fillStyle = 'rgba(0, 0, 255, 0.5)';
                context.fill();
                break;
            }
            case ShapeSegmentQuadraticCurve:
                break;
            case ShapeSegmentSmooth:
                break;
            case ShapeSegmentQuadraticSmooth:
                break;
            case ShapeSegmentArc:
                break;
            case ShapeSegmentClose:
                context.closePath();
                break;
            default:
                console.error('unknown segment type', segment);
                break;
            }
            
            previousPosition = it.position;
        }
    }
    
    #drawShape(context, shape, showControlPoints)
    {
        context.beginPath();

        const iterator = shape.iterator;
        let it;
        while (it = iterator.next()) {
            switch (it.segment.constructor) {
            case ShapeSegmentMove:
                context.moveTo(it.position.x, it.position.y);
                break;
            case ShapeSegmentLine:
                context.lineTo(it.position.x, it.position.y);
                break;
            case ShapeSegmentHorizontalLine:
            case ShapeSegmentVerticalLine:
                break;
            case ShapeSegmentCurve: {
                const controlPoints = it.segment.controlPointsWithCurrentPoint(it.position);
                context.bezierCurveTo(controlPoints[0].x, controlPoints[0].y, controlPoints[1].x, controlPoints[1].y, it.position.x, it.position.y);
                break;
            }
            case ShapeSegmentQuadraticCurve:
                break;
            case ShapeSegmentSmooth:
                break;
            case ShapeSegmentQuadraticSmooth:
                break;
            case ShapeSegmentArc:
                break;
            case ShapeSegmentClose:
                context.closePath();
                break;
            default:
                console.error('unknown segment type', segment);
                break;
            }
        }

        context.stroke();

        if (showControlPoints)
            this.#drawControlPoints(context, shape);
        
    }
}
