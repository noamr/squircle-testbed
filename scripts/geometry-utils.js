"use strict";

class Point {
    constructor(x = 0, y = 0)
    {
        this.x = x;
        this.y = y;
        Object.freeze(this);
    }
    
    offsetFromPoint(otherPoint)
    {
        return new Size(this.x - otherPoint.x, this.y - otherPoint.y);
    }
    
    movedBy(size)
    {
        return new Point(this.x + size.width, this.y + size.height);
    }

    scaledBy(scale)
    {
        return new Point(this.x * scale.width, this.y * scale.height);
    }

    addedTo(point)
    {
        return new Point(this.x + point.x, this.y + point.y);
    }
    
    clone()
    {
        return new Point(this.x, this.y);
    }
    
    toString()
    {
        return `x: ${this.x.toFixed(3)}, y: ${this.y.toFixed(3)}`;
    }
}

class Size {
    constructor(width = 0, height = 0)
    {
        this.width = width;
        this.height = height;
        Object.freeze(this);
    }
    
    scaledBy(scale)
    {
        return new Size(this.width * scale.width, this.height * scale.height);
    }

    addedTo(size)
    {
        return new Size(this.width + size.width, this.height + size.height);
    }
    
    flipped()
    {
        return new Size(this.height, this.width);
    }

    clone()
    {
        return new Size(this.width, this.height);
    }
    
    normalized()
    {
        const hypot = Math.hypot(this.width, this.height);
        return new Size(this.width / hypot, this.height / hypot);
    }

    toString()
    {
        return `x: ${this.width.toFixed(5)}, y: ${this.height.toFixed(5)}`;
    }
}

class Rect {
    constructor(x = 0, y = 0, width = 0, height = 0)
    {
        this.location = new Point(x, y);
        this.size = new Size(width, height);
    }
    
    get x()
    {
        return this.location.x;
    }

    set x(newX)
    {
        this.location = new Point(newX, this.y);
    }

    get y()
    {
        return this.location.y;
    }

    set y(newY)
    {
        this.location = new Point(this.x, newY);
    }

    get width()
    {
        return this.size.width;
    }
    
    set width(newWidth)
    {
        this.size = new Size(newWidth, this.size.height);
    }

    get height()
    {
        return this.size.height;
    }

    set height(newHeight)
    {
        this.size = new Size(this.size.width, newHeight);
    }
}

// Approximation of control point positions on a bezier to simulate a quarter of a circle.
// This is 1-kappa, where kappa = 4 * (sqrt(2) - 1) / 3
const circleControlPoint = 0.447715;
