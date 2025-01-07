"use strict";

const Relative = 0;
const Absolute = 1;

const NonZero = 0;
const EvenOdd = 1;


class ShapeIterator {
    constructor(shape)
    {
        this.shape = shape;
        this.segmentIndex = 0;
        
        this._currentPosition = new Point(0, 0);
    }
    
    next()
    {
        if (this.segmentIndex === this.shape.segments.length)
            return null;

        const segment = this.shape.segments[this.segmentIndex];
        this._currentPosition = segment.apply(this._currentPosition);
        ++this.segmentIndex;
        return { position: this._currentPosition, segment: segment };
    }    
}

class Shape extends Observable {
    constructor()
    {
        super();
        this.startPoint = new Point(0, 0);
        this._segments = [];
        this.windRule = NonZero;
    }
    
    get segments()
    {
        return this._segments.slice(0);
    }

    set segments(newSegments)
    {
        this._segments = newSegments.slice(0);
        this.#shapeChanged();
    }
    
    get iterator()
    {
        return new ShapeIterator(this);
    }

    static shapeFromSVGPath(svgPathString)
    {
        let shape;
        try {
            shape = ShapeConverter.shapeFromSVGPathString(svgPathString);
        } catch (error) {
            console.log(`Failed to parse SVG path: ${error}`);
            return null;
        }
        return shape;        
    }
    
    static shapeFromShapeFunction(shapeFunctionString)
    {
        let shape;
        try {
            shape = ShapeConverter.shapeFromShapeFunction(shapeFunctionString);
        } catch (error) {
            console.log(`Failed to parse shape function string: ${error}`);
            return null;
        }
        return shape;        
    }

    changePointPosition(segmentIndex, originalSegmentOffset, delta)
    {
        // FIXME: Maybe moving an hline or vline should convert the point type.
        const segment = this._segments[segmentIndex];

        const newOffset = originalSegmentOffset.movedBy(delta);
        const incrementalDelta = newOffset.offsetFromPoint(segment.offset);

        if (segment.affinity === Relative) {
            segment.offset = newOffset;
            // FIXME: Control points?
        } else {
            segment.move(incrementalDelta);
        }
        
        const nextSegment = this._segments[(segmentIndex + 1) % this._segments.length];
        if (!(nextSegment instanceof ShapeSegmentClose))
            nextSegment.previousSegmentMovedBy(incrementalDelta); // FIXME for relative

        this.#shapeChanged();
    }

    changeControlPointPosition(segmentIndex, controlPointIndex, originalOffset, delta)
    {
        const newOffset = originalOffset.movedBy(delta);
        const segment = this._segments[segmentIndex];
        switch (controlPointIndex) {
        case 0:
            segment.c1 = newOffset;
            break;
        case 1:
            segment.c2 = newOffset;
            break;
        }
        
        this.#shapeChanged();
    }
    
    move(originalPosition, delta)
    {
        const newPosition = originalPosition.movedBy(delta);
        const incrementalDelta = newPosition.offsetFromPoint(this.startPoint);

        for (const segment of this._segments) {
            if (segment.affinity === Relative)
                continue;

            segment.move(incrementalDelta);
        }
        
        this.startPoint = newPosition;
        this.#shapeChanged();
    }
    
    fastBoundingRect()
    {
        let minX = 0, minY = 0;
        let maxX = 0, maxY = 0;
        let currentPoint = new Point;

        for (const segment of this._segments) {
            currentPoint = segment.apply(currentPoint);
            
            minX = Math.min(minX, currentPoint.x);
            minY = Math.min(minY, currentPoint.y);

            maxX = Math.max(maxX, currentPoint.x);
            maxY = Math.max(maxY, currentPoint.y);

            if (segment instanceof ShapeSegmentArc) {
                // Fudge. Need to figure out the extremes of the parts of the arc that are present, including rotation.
                minX = Math.min(minX, currentPoint.x - Math.abs(segment.rx));
                minY = Math.min(minY, currentPoint.y - Math.abs(segment.ry));

                maxX = Math.max(maxX, currentPoint.x + Math.abs(segment.rx));
                maxY = Math.max(maxY, currentPoint.y + Math.abs(segment.ry));
            }
        }
        
        return new Rect(minX, minY, maxX - minX, maxY - minY);
    }

    scaleToFitSize(size)
    {
        const bounds = this.fastBoundingRect();
        
        const scale = new Size(size.width / bounds.width, size.height / bounds.height);
        
        const xOffset = 0;
        const yOffset = 0;
        
        for (const segment of this._segments) {
            if (segment instanceof ShapeSegmentMove) {
                segment.offset = segment.offset.scaledBy(scale);
            }
            else if (segment instanceof ShapeSegmentLine) {
                segment.offset = segment.offset.scaledBy(scale);
            }
            else if (segment instanceof ShapeSegmentHorizontalLine) {
                segment.offset = new Point(segment.x * scale.width, segment.offset.y);
            }
            else if (segment instanceof ShapeSegmentVerticalLine) {
                segment.offset = new Point(segment.offset.x, segment.y * scale.height);
            }
            else if (segment instanceof ShapeSegmentCurve) {
                segment.offset = segment.offset.scaledBy(scale);
                segment.c1 = segment.c1.scaledBy(scale);
                segment.c2 = segment.c2.scaledBy(scale);
            }
            else if (segment instanceof ShapeSegmentQuadraticCurve) {
                segment.offset = segment.offset.scaledBy(scale);
                segment.c1 = segment.c1.scaledBy(scale);
            }
            else if (segment instanceof ShapeSegmentSmooth) {
                segment.offset = segment.offset.scaledBy(scale);
                segment.c1 = segment.c1.scaledBy(scale);
            }
            else if (segment instanceof ShapeSegmentQuadraticSmooth) {
                segment.offset = segment.offset.scaledBy(scale);
            }
            else if (segment instanceof ShapeSegmentArc) {
                segment.offset = segment.offset.scaledBy(scale);

                const radius = new Size(segment.rx, segment.ry).scaledBy(scale);
                segment.rx = radius.width;
                segment.ry = radius.height;
            }
            else if (segment instanceof ShapeSegmentClose) {
            } else
                console.log('unknown segment type', segment);
        }
        
        this.#shapeChanged();
    }
    
    #updateImplicitControlPoints()
    {
        let lastControlPoint = this.startPoint;

        let currentPoint = this.startPoint;
        for (let segment of this._segments) {

            switch (segment.constructor) {
            case ShapeSegmentMove:
            case ShapeSegmentLine:
            case ShapeSegmentHorizontalLine:
            case ShapeSegmentVerticalLine:
            case ShapeSegmentArc:
                lastControlPoint = segment.apply(lastControlPoint);
                break;
            case ShapeSegmentCurve: {
                    const absoluteControlPoints = segment.controlPointsWithCurrentPoint(currentPoint);
                    lastControlPoint = absoluteControlPoints[1];
                }
                break;
            case ShapeSegmentQuadraticCurve: {
                    const absoluteControlPoints = segment.controlPointsWithCurrentPoint(currentPoint);
                    lastControlPoint = absoluteControlPoints[0];
                }
                break;
            case ShapeSegmentSmooth: {
                    const reflectedLastControlPoint = this.#reflectedControlPoint(currentPoint, lastControlPoint);
                    segment.implicitControlPoint = segment.adjustedForAffinity(currentPoint, reflectedLastControlPoint);
                    lastControlPoint = segment.controlPointsWithCurrentPoint(currentPoint)[0];
                }
                break;
            case ShapeSegmentQuadraticSmooth: {
                    const reflectedLastControlPoint = this.#reflectedControlPoint(currentPoint, lastControlPoint);
                    segment.implicitControlPoint = segment.adjustedForAffinity(currentPoint, reflectedLastControlPoint);
                    lastControlPoint = segment.absolutePoint(currentPoint, segment.implicitControlPoint);
                }
                break;
            case ShapeSegmentClose:
                break;
            }

            currentPoint = segment.apply(currentPoint);
        }
    }
    
    #reflectedControlPoint(origin, controlPoint)
    {
        const delta = controlPoint.offsetFromPoint(origin);
        return origin.movedBy(new Size(-delta.width, -delta.height));
    }

    #shapeChanged()
    {
        this.#updateImplicitControlPoints();
        this.notify();
    }
}

class ShapeSegmentBase {
    apply(currentPoint)
    {
        return currentPoint;
    }
    
    controlPointsWithCurrentPoint(currentPoint)
    {
        return [];
    }
}

class ShapeSegmentClose extends ShapeSegmentBase {

    minX(currentX)
    {
        return currentX;
    }
    
    maxX(currentX)
    {
        return currentX;
    }    

    minY(currentY)
    {
        return currentY;
    }
    
    maxY(currentY)
    {
        return currentY;
    }

    move(size)
    {
    }
}

class ShapeSegment extends ShapeSegmentBase {
    constructor(affinity, offset)
    {
        super();
        this.affinity = affinity;
        
        if (!(offset instanceof Point))
            throw new Error(`ShapeSegment argument should be a Point`);

        this._offset = offset;
    }

    // Using "offset" as the generic term for absolute or relative position.
    get offset()
    {
        return this._offset;
    }
    
    set offset(p)
    {
        this._offset = p;
    }

    get x()
    {
        return this._offset.x;
    }

    set x(value)
    {
        this._offset = new Point(value, this.y);
    }

    get y()
    {
        return this._offset.y;
    }

    set y(value)
    {
        this._offset = new Point(this.x, value);
    }
    
    get controlPointOffsets()
    {
        return [];
    }
    
    minX(currentX)
    {
        return this._offset.x;
    }
    
    maxX(currentX)
    {
        return this._offset.x;
    }    

    minY(currentY)
    {
        return this._offset.y;
    }
    
    maxY(currentY)
    {
        return this._offset.y;
    }
    
    move(size)
    {
        this._offset = this._offset.movedBy(size);
    }

    previousSegmentMovedBy(offset)
    {
    }
    
    adjustedForAffinity(currentPoint, p)
    {
        if (this.affinity === Relative)
            return p.movedBy(new Size(-currentPoint.x, -currentPoint.y));

        return p;
    }

    absolutePoint(currentPoint, p)
    {
        if (this.affinity === Relative)
            return currentPoint.movedBy(new Size(p.x, p.y));

        return p;
    }
    
    _applyAffinity(currentPoint, p)
    {
        if (this.affinity === Relative)
            return currentPoint.movedBy(new Size(p.x, p.y));
        
        return p;
    }
}

class ShapeSegmentLine extends ShapeSegment {
    constructor(affinity, offset)
    {
        super(affinity, offset);
    }
    
    apply(currentPoint)
    {
        return this._applyAffinity(currentPoint, this._offset)
    }
}

class ShapeSegmentHorizontalLine extends ShapeSegment {
    constructor(affinity, lineLength)
    {
        super(affinity, new Point(lineLength, undefined));
    }

    apply(currentPoint)
    {
        if (this.affinity === Relative)
            return new Point(currentPoint.x + this._offset.x, currentPoint.y);

        return new Point(this._offset.x, currentPoint.y);
    }
}

class ShapeSegmentVerticalLine extends ShapeSegment {
    constructor(affinity, lineLength)
    {
        super(affinity, new Point(undefined, lineLength));
    }

    apply(currentPoint)
    {
        if (this.affinity === Relative)
            return new Point(currentPoint.x, currentPoint.y + this._offset.y);

        return new Point(currentPoint.x, this._offset.y);
    }
}

class ShapeSegmentMove extends ShapeSegment {
    constructor(affinity, offset)
    {
        super(affinity, offset);
    }

    apply(currentPoint)
    {
        return this._applyAffinity(currentPoint, this._offset);
    }
}

class ShapeSegmentCurve extends ShapeSegment {
    constructor(affinity, c1, c2, offset)
    {
        super(affinity, offset);
        this.c1 = c1;
        this.c2 = c2;
    }

    get controlPointOffsets()
    {
        return [
            this.c1,
            this.c2
        ];
    }

    apply(currentPoint)
    {
        return this._applyAffinity(currentPoint, this._offset);
    }

    move(size)
    {
        super.move(size);
        this.c1 = this.c1.movedBy(size);
        this.c2 = this.c2.movedBy(size);
    }

    previousSegmentMovedBy(size)
    {
        this.c1 = this.c1.movedBy(size);
    }

    controlPointsWithCurrentPoint(currentPoint)
    {
        return [
            this._applyAffinity(currentPoint, this.c1),
            this._applyAffinity(currentPoint, this.c2)
        ];
    }
}

class ShapeSegmentQuadraticCurve extends ShapeSegment {
    constructor(affinity, c1, offset)
    {
        super(affinity, offset);
        this.c1 = c1;
    }

    get controlPointOffsets()
    {
        return [ this.c1 ];
    }

    apply(currentPoint)
    {
        return this._applyAffinity(currentPoint, this._offset);
    }

    move(size)
    {
        super.move(size);
        this.c1 = this.c1.movedBy(size);
    }

    controlPointsWithCurrentPoint(currentPoint)
    {
        return [ this._applyAffinity(currentPoint, this.c1) ];
    }
}

class ShapeSegmentSmooth extends ShapeSegment {
    constructor(affinity, c1, offset)
    {
        super(affinity, offset);
        this.c1 = c1;
    }

    get controlPointOffsets()
    {
        return [ this.c1 ];
    }

    get implicitControlPoint()
    {
        return this.c0;
    }

    set implicitControlPoint(point)
    {
        this.c0 = point;
    }

    absoluteImplicitControlPoint(currentPoint)
    {
        return this._applyAffinity(currentPoint, this.c0);
    }

    apply(currentPoint)
    {
        return this._applyAffinity(currentPoint, this._offset);
    }

    move(size)
    {
        super.move(size);
        this.c1 = this.c1.movedBy(size);
    }

    controlPointsWithCurrentPoint(currentPoint)
    {
        return [ this._applyAffinity(currentPoint, this.c1) ];
    }
};

class ShapeSegmentQuadraticSmooth extends ShapeSegment {
    constructor(affinity, offset)
    {
        super(affinity, offset);
    }

    get implicitControlPoint()
    {
        return this.c0;
    }

    set implicitControlPoint(point)
    {
        this.c0 = point;
    }

    absoluteImplicitControlPoint(currentPoint)
    {
        return this._applyAffinity(currentPoint, this.c0);
    }

    apply(currentPoint)
    {
        return this._applyAffinity(currentPoint, this._offset);
    }
}

class ShapeSegmentArc extends ShapeSegment {
    constructor(affinity, rx, ry, angle, largeArcFlag, sweepFlag, offset)
    {
        super(affinity, offset);
        this.rx = rx;
        this.ry = ry;
        this.angle = angle;
        this.largeArcFlag = largeArcFlag;
        this.sweepFlag = sweepFlag;
    }

    apply(currentPoint)
    {
        return this._applyAffinity(currentPoint, this._offset);
    }
}
