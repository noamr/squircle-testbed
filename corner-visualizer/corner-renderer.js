import {
    CornerMath,
    CornerCurve,
    CornerUtils,
    cornerTopLeft,
    cornerTopRight,
    cornerBottomRight,
    cornerBottomLeft,    
} from "./improved-corner-math.js";

export const cornerStyleNone = 'none';
export const cornerStyleStraight = 'straight';
export const cornerStyleRound = 'round';
export const cornerStyleNotch = 'notch';
export const cornerStyleBevel = 'bevel';
export const cornerStyleScoop = 'scoop';
export const cornerStyleSuperellipse = 'superellipse';
export const cornerStyleSuperellipseApproximation = 'superellipseapprox';
export const cornerStyleContinuousRounded = 'continuous-rounded';

const shapeIDSample = 'sample';
const shapeIDReference = 'reference';

export class ShapeParameters {
    constructor()
    {
        // These are fractions.
        this.borderRadiusWidth = 0.2;
        this.borderRadiusHeight = 0.2;

        this.borderLeftWidth = 0.1;
        this.borderTopWidth = 0.1;

        this.superEllipseParam = 1;

        this.cornerStyle = cornerStyleRound;
        
        this.showControlPoints = true;
    }
}

export class BorderRenderer {
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
        
        this.#drawBox(context, boxSize);

        context.lineWidth = this.scale * 1;

        const outerBorderWidths = {
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
        };
        
        const outerShape = this.#createShape(this._parameters.cornerStyle, boxSize, outerBorderWidths);

        const leftBorderWidth = boxSize.width * this._parameters.borderLeftWidth;
        const topBorderWidth = boxSize.height * this._parameters.borderTopWidth;
        
        const borderWidths = {
            top: topBorderWidth,
            right: leftBorderWidth,
            bottom: topBorderWidth,
            left: leftBorderWidth,
        };

        const innerShape = this.#createInnerShape(this._parameters.cornerStyle, boxSize, borderWidths);

        const showFill = true;
        if (showFill) {
            const outerPath = this.#pathFromShape(outerShape);
            const innerPath = this.#pathFromShape(innerShape);
            
            outerPath.addPath(innerPath);
            
            context.fillStyle = 'rgba(0, 128, 0, 0.3)';
            context.fill(outerPath, "evenodd");
        }

        context.strokeStyle = 'black';
        this.#drawShape(context, outerShape, this._parameters.showControlPoints);

        {
            context.save();
            this.#drawShape(context, innerShape, this._parameters.showControlPoints);
            context.restore();
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
    
    // Top left of the box is assumed to be a 0,0
    #createShape(cornerStyle, outerBoxSize, borderWidths)
    {
        const shapeSegments = [];

        this.#addShapeCorner(shapeSegments, cornerStyle, outerBoxSize, borderWidths, cornerTopLeft);
        this.#addShapeCorner(shapeSegments, cornerStyle, outerBoxSize, borderWidths, cornerTopRight);
        this.#addShapeCorner(shapeSegments, cornerStyle, outerBoxSize, borderWidths, cornerBottomRight);
        this.#addShapeCorner(shapeSegments, cornerStyle, outerBoxSize, borderWidths, cornerBottomLeft);

        shapeSegments.push(new ShapeSegmentClose());

        const shape = new Shape();
        shape.segments = shapeSegments;
        return shape;
    }

    #createInnerShape(cornerStyle, outerBoxSize, borderWidths)
    {
        switch (cornerStyle) {
        case cornerStyleStraight:
        case cornerStyleRound:
        case cornerStyleContinuousRounded: {
            return this.#createShape(cornerStyle, outerBoxSize, borderWidths);
        }
        case cornerStyleScoop:
        case cornerStyleNotch:
        case cornerStyleBevel:
        case cornerStyleSuperellipse:
            break;
        }

        const shapeSegments = [];

        this.#addShapeSuperellipseInnerCorner(shapeSegments, outerBoxSize, borderWidths, cornerTopLeft);
        this.#addShapeSuperellipseInnerCorner(shapeSegments, outerBoxSize, borderWidths, cornerTopRight);
        this.#addShapeSuperellipseInnerCorner(shapeSegments, outerBoxSize, borderWidths, cornerBottomRight);
        this.#addShapeSuperellipseInnerCorner(shapeSegments, outerBoxSize, borderWidths, cornerBottomLeft);
        shapeSegments.push(new ShapeSegmentClose());

        const shape = new Shape();
        shape.segments = shapeSegments;
        return shape;
    }

    #addShapeCorner(shapeSegments, cornerStyle, outerBoxSize, borderWidths, corner)
    {
        switch (cornerStyle) {
        case cornerStyleStraight:
            this.#addShapeStraightCorner(shapeSegments, outerBoxSize, borderWidths, corner);
            break;
        case cornerStyleRound:
            this.#addShapeRoundedCorner(shapeSegments, outerBoxSize, borderWidths, corner);
            break;
        case cornerStyleScoop:
        case cornerStyleNotch:
        case cornerStyleBevel:
        case cornerStyleSuperellipse:
            this.#addShapeSuperellipseCorner(shapeSegments, outerBoxSize, borderWidths, corner);
            break;
        case cornerStyleContinuousRounded:
            this.#addShapeContinuousRoundedCorner(shapeSegments, outerBoxSize, borderWidths, corner);
            break;
        }
    }
        
    #addShapeStraightCorner(shapeSegments, outerBoxSize, borderWidths, corner)
    {
        const topLeftPoint = this.#pointForCorner(corner, borderWidths);
        const cornerPoint = CornerUtils.mapToCorner(corner, topLeftPoint, outerBoxSize);

        if (shapeSegments.length === 0)
            shapeSegments.push(new ShapeSegmentMove(Absolute, cornerPoint));
        else
            shapeSegments.push(new ShapeSegmentLine(Absolute, cornerPoint));
    }

    #addShapeRoundedCorner(shapeSegments, outerBoxSize, borderWidths, corner)
    {
        const topLeftPoint = this.#pointForCorner(corner, borderWidths);
        const cornerSize = this.#cornerSize(outerBoxSize, corner);
        const constrainedRadius = new Size(Math.max(cornerSize.width - topLeftPoint.x, 0), Math.max(cornerSize.height - topLeftPoint.y, 0));

        if (constrainedRadius.width == 0 || constrainedRadius.height === 0) {
            const cornerPoint = CornerUtils.mapToCorner(corner, topLeftPoint, outerBoxSize);

            if (shapeSegments.length === 0)
                shapeSegments.push(new ShapeSegmentMove(Absolute, cornerPoint));
            else
                shapeSegments.push(new ShapeSegmentLine(Absolute, cornerPoint));
            
            return;
        }
        
        const controlPointOffsetFromCorner = constrainedRadius.scaledBy(new Size(circleControlPoint, circleControlPoint));

        // p1, c1, c2, p2
        const points = [
            new Point(0, constrainedRadius.height),
            new Point(0, controlPointOffsetFromCorner.height),
            new Point(controlPointOffsetFromCorner.width, 0),
            new Point(constrainedRadius.width, 0),
        ];

        if (corner === cornerTopRight || corner == cornerBottomLeft)
            points.reverse();
        
        const cornerOffset = new Size(topLeftPoint.x, topLeftPoint.y);
        const mappedPoints = points.map(p => CornerUtils.mapToCorner(corner, p.movedBy(cornerOffset), outerBoxSize));

        if (shapeSegments.length === 0)
            shapeSegments.push(new ShapeSegmentMove(Absolute, mappedPoints[0]));
        else
            shapeSegments.push(new ShapeSegmentLine(Absolute, mappedPoints[0]));
        
        shapeSegments.push(new ShapeSegmentCurve(Absolute, mappedPoints[1], mappedPoints[2], mappedPoints[3]));
    }

    #addShapeSuperellipseCorner(shapeSegments, outerBoxSize, borderWidths, corner)
    {
        const cornerSize = this.#cornerSize(outerBoxSize, corner);

        const s = this._parameters.superEllipseParam;
        const cornerCurve = CornerCurve.canonicalCurveForCorner(s, cornerSize);
        const cornerPoints = cornerCurve.points.map(p => CornerUtils.mapToCorner(corner, p, outerBoxSize));
        
        if (corner === cornerTopRight || corner == cornerBottomLeft)
            cornerPoints.reverse();

        if (shapeSegments.length === 0)
            shapeSegments.push(new ShapeSegmentMove(Absolute, cornerPoints[0]));
        else
            shapeSegments.push(new ShapeSegmentLine(Absolute, cornerPoints[0]));

        shapeSegments.push(new ShapeSegmentCurve(Absolute, cornerPoints[1], cornerPoints[2], cornerPoints[3]));

        if (cornerPoints.length === 7)
            shapeSegments.push(new ShapeSegmentCurve(Absolute, cornerPoints[4], cornerPoints[5], cornerPoints[6]));
    }

    #addShapeSuperellipseInnerCorner(shapeSegments, outerBoxSize, borderWidths, corner)
    {
        const s = this._parameters.superEllipseParam;
        const cornerSize = this.#cornerSize(outerBoxSize, corner);
        const cornerPoint = this.#pointForCorner(corner, borderWidths);

        const addShapeSegments = (corner, points) => {
            if (corner === cornerTopLeft)
                shapeSegments.push(new ShapeSegmentMove(Absolute, points[0]));
            else
                shapeSegments.push(new ShapeSegmentLine(Absolute, points[0]));

            shapeSegments.push(new ShapeSegmentCurve(Absolute, points[1], points[2], points[3]));
            if (points.length === 7)
                shapeSegments.push(new ShapeSegmentCurve(Absolute, points[4], points[5], points[6]));
        };

        const renderInnerArc = (corner) => {
            // We compute in terms of (0, 0), then map to the appropriate corner.
            const startPoint = new Point(0, cornerSize.height);
            const endPoint = new Point(cornerSize.width, 0);

            const curvatureOffset = CornerMath.offsetForCurvature(s);
            const startOffsetPoint = startPoint.movedBy(curvatureOffset.scaledBy(new Size(cornerPoint.x, cornerPoint.x)));
            const endOffsetPoint = endPoint.movedBy(curvatureOffset.flipped().scaledBy(new Size(cornerPoint.y, cornerPoint.y)));

            const needsInnerArc = startOffsetPoint.y > cornerPoint.y && endOffsetPoint.x > cornerPoint.x;
            if (!needsInnerArc)
                return false;

            const innerCornerScale = new Size(Math.abs(startOffsetPoint.x - endOffsetPoint.x), Math.abs(startOffsetPoint.y - endOffsetPoint.y));
            
            // FIXME: We call `CornerCurve.canonicalCurveForCorner` for both inner and outer shapes. It would be more efficient to do it only once.
            let innerCornerCurve = CornerCurve.canonicalCurveForCorner(s, innerCornerScale);

            const needsTrimmedInnerArc = startOffsetPoint.x < cornerPoint.x || endOffsetPoint.y < cornerPoint.y;
            if (needsTrimmedInnerArc && startOffsetPoint.y > cornerPoint.y && endOffsetPoint.x > cornerPoint.x)
                innerCornerCurve = innerCornerCurve.cornerCurveTruncatingAtXAndY(Math.max(cornerPoint.x - startOffsetPoint.x, 0), Math.max(cornerPoint.y - endOffsetPoint.y, 0));

            const cornerInset = new Size(startOffsetPoint.x, endOffsetPoint.y);
            const mappedPoints = innerCornerCurve.points.map(p => CornerUtils.mapToCorner(corner, p.movedBy(cornerInset), outerBoxSize));
            if (mappedPoints.length === 0)
                return false;

            if (corner === cornerTopRight || corner == cornerBottomLeft)
                mappedPoints.reverse();

            addShapeSegments(corner, mappedPoints);
            return true;
        }
        
        if (!renderInnerArc(corner)) {
            const insideCorner = CornerUtils.mapToCorner(corner, cornerPoint, outerBoxSize);

            if (corner === cornerTopLeft)
                shapeSegments.push(new ShapeSegmentMove(Absolute, insideCorner));
            else
                shapeSegments.push(new ShapeSegmentLine(Absolute, insideCorner));
        }
    }
    
    #addShapeContinuousRoundedCorner(shapeSegments, outerBoxSize, borderWidths, corner)
    {
        const topLeftPoint = this.#pointForCorner(corner, borderWidths);
        const cornerSize = this.#cornerSize(outerBoxSize, corner);
        const constrainedRadius = new Size(Math.max(cornerSize.width - topLeftPoint.x, 0), Math.max(cornerSize.height - topLeftPoint.y, 0));

        if (constrainedRadius.width == 0 || constrainedRadius.height === 0) {
            const cornerPoint = CornerUtils.mapToCorner(corner, topLeftPoint, outerBoxSize);

            if (shapeSegments.length === 0)
                shapeSegments.push(new ShapeSegmentMove(Absolute, cornerPoint));
            else
                shapeSegments.push(new ShapeSegmentLine(Absolute, cornerPoint));
            
            return;
        }
        
        const unitPoints = [
            new Point(0, 1.528660),         // p1

            new Point(0, 1.08849),          // c1
            new Point(0, 0.868407),         // c2
            new Point(0.0749114, 0.631494), // p2

            new Point(0.169060, 0.372824),  // c3
            new Point(0.372824, 0.16906),   // c4
            new Point(0.631494, 0.0749114), // p3

            new Point(0.868407, 0),         // c5
            new Point(1.088490, 0),         // c6
            new Point(1.528660, 0)          // p4
        ];

        const scaledPoints = unitPoints.map(p => p.scaledBy(constrainedRadius));

        if (corner === cornerTopRight || corner == cornerBottomLeft)
            scaledPoints.reverse();
        
        const cornerOffset = new Size(topLeftPoint.x, topLeftPoint.y);
        const mappedPoints = scaledPoints.map(p => CornerUtils.mapToCorner(corner, p.movedBy(cornerOffset), outerBoxSize));

        if (shapeSegments.length === 0)
            shapeSegments.push(new ShapeSegmentMove(Absolute, mappedPoints[0]));
        else
            shapeSegments.push(new ShapeSegmentLine(Absolute, mappedPoints[0]));
        
        shapeSegments.push(new ShapeSegmentCurve(Absolute, mappedPoints[1], mappedPoints[2], mappedPoints[3]));
        shapeSegments.push(new ShapeSegmentCurve(Absolute, mappedPoints[4], mappedPoints[5], mappedPoints[6]));
        shapeSegments.push(new ShapeSegmentCurve(Absolute, mappedPoints[7], mappedPoints[8], mappedPoints[9]));
    }

    #pointForCorner(corner, borderWidths)
    {
        switch (corner) {
        case cornerTopLeft:
            return new Point(borderWidths.left, borderWidths.top);
        case cornerTopRight:
            return new Point(borderWidths.right, borderWidths.top);
        case cornerBottomRight:
            return new Point(borderWidths.right, borderWidths.bottom);
        case cornerBottomLeft:
            return new Point(borderWidths.left, borderWidths.bottom);
        }
        return new Point(0, 0);
    }

    #cornerSize(boxSize, corner)
    {
        return new Size(
            this._parameters.borderRadiusWidth * boxSize.width,
            this._parameters.borderRadiusHeight * boxSize.height
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

        const path = this.#pathFromShape(shape);
        context.stroke(path);

        if (showControlPoints)
            this.#drawControlPoints(context, shape);   
    }
    
    #pathFromShape(shape)
    {
        const path = new Path2D();

        const iterator = shape.iterator;
        let it;
        while (it = iterator.next()) {
            switch (it.segment.constructor) {
            case ShapeSegmentMove:
                path.moveTo(it.position.x, it.position.y);
                break;
            case ShapeSegmentLine:
                path.lineTo(it.position.x, it.position.y);
                break;
            case ShapeSegmentHorizontalLine:
            case ShapeSegmentVerticalLine:
                break;
            case ShapeSegmentCurve: {
                const controlPoints = it.segment.controlPointsWithCurrentPoint(it.position);
                path.bezierCurveTo(controlPoints[0].x, controlPoints[0].y, controlPoints[1].x, controlPoints[1].y, it.position.x, it.position.y);
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
                path.closePath();
                break;
            default:
                console.error('unknown segment type', segment);
                break;
            }
        }

        return path;
    }
}
