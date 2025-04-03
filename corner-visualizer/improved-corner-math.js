
export const cornerTopLeft = 0;
export const cornerTopRight = 1;
export const cornerBottomRight = 2;
export const cornerBottomLeft = 3;

export class CornerMath {

    // t is distance along the curve. Useful to compute at 0.5.
    static superellipsePointAtProgress(s, t)
    {
        const result = this.#superellipsePointAtProgress(Math.abs(s), t);
        // For s < 0 use the positive s range, flipped around.
        if (s < 0)
            return new Point(1 - result.y, 1 - result.x);
        
        return result;
    }

    static superellipseAtX(x, k)
    {
        // x^k + y^k = 1
        // Solve for x.
        return Math.pow(1 - Math.pow(x, k), 1 / k);
    }

    static superellipseAtXForS(x, s)
    {
        // For s < 0 use the positive s range, flipped around.
        if (s < 0) {
            const flippedK = this.sToK(Math.abs(s));
            return 1 - this.superellipseAtX(1 - x, flippedK);
        }

        const k = this.sToK(s);
        return this.superellipseAtX(x, k);
    }

    static controlPointsForSuperellipse(s)
    {
        const p = [
            1.2430920942724248,
            2.010479023614843,
            0.32922901179443753,
            0.2823023142212073,
            1.3473704261055421,
            2.9149468637949814,
            0.9106507102917086
        ];

        const absS = Math.abs(s);
        const slope = p[0] + (p[6] - p[0]) * 0.5 * (1 + Math.tanh(p[5] * (absS - p[1])));
        const base = 1 / (1 + Math.exp(-slope * (0 - p[1])));
        const logistic = 1 / (1 + Math.exp(-slope * (absS - p[1])));

        const a = (logistic - base) / (1 - base);
        const b = p[2] * Math.exp(-p[3] * absS ** p[4]);

        let P3 = this.#superellipsePointAtProgress(absS, 0.5);
        let P1 = new Point (a, 1);
        let P5 = new Point (1, a);
        
        if (s < 0) {
            P1 = new Point(1 - P1.y, 1 - P1.x);
            P3 = new Point(1 - P3.y, 1 - P3.x);
            P5 = new Point(1 - P5.y, 1 - P5.x);
        }

        const P2 = new Point(P3.x - b, P3.y + b);
        const P4 = new Point(P3.x + b, P3.y - b);
        return [P1, P2, P3, P4, P5];
    }

    // t is distance along the curve. Useful to compute at 0.5.
    static #superellipsePointAtProgress(s, t)
    {
        function superellipseAtProgress(curvature, t)
        {
            return Math.pow(t, 1 / curvature)
        }
        
        const curvature = this.sToK(s);
        const x = superellipseAtProgress(curvature, t);
        const y = superellipseAtProgress(curvature, 1 - t);
        
        return new Point(x, y);
    }

    static sToK(s)
    {
        return Math.pow(2, s);
    }

    static kToS(k)
    {
        return Math.log2(k);
    }

    // We arbitrarily decide that fraction 0 is "square", fraction 1 is "notch".
    static sForFraction(fraction)
    {
        if (fraction === 0)
            return -Infinity;
        
        if (fraction === 1)
            return Infinity;

        // See https://github.com/w3c/csswg-drafts/issues/11608
        
        if (fraction < 0.5) {
            fraction = 1 - fraction;
            const k = Math.log(0.5) / Math.log(fraction);
            return -this.kToS(k);
        }

        const k = Math.log(0.5) / Math.log(fraction);
        return this.kToS(k);
    }

    static offsetForCurvature(s)
    {
      // Find the superellipse's control point.
      // we do that by approximating the superellipse as a quadratic
      // curve that has the same point at t = 0.5.
      // if (s <= 0.001)
      //     return new Point(1, -1);

      const x = this.superellipsePointAtProgress(s, 0.5).x;
      const offset = 2 - Math.sqrt(2); // Chosen so that with s=1 (k = 2) this returns { 1, 0 } which is necessary to match historical `corner-shape: round` behavior.
      const [a, b] = [x, 1 - x].map(m => 2 * m - offset);
      const result = new Size(Math.max(a, 0), Math.max(b, 0));
      return result.normalized();
    }
}

export class CornerUtils {
    static mapToCorner(corner, p, boxSize)
    {
        // Map a top left point to another corner.
        switch (corner) {
        case cornerTopLeft:
            return p;
        case cornerTopRight:
            return new Point(boxSize.width - p.x, p.y);
        case cornerBottomLeft:
            return new Point(p.x, boxSize.height - p.y);
        case cornerBottomRight:
            return new Point(boxSize.width - p.x, boxSize.height - p.y);
        }
        return p;
    }
}

// Represents the Bezier curve for a corner, which consists of one or two cubic beziers (4 or 7 points).
// Point ordering is p1, c1, c2, p2, c3, c4, p3.
export class CornerCurve {
    // The canonical curve matches the top left corner, where 0,0 is the outside corner.
    static canonicalCurveForCorner(s, cornerRadius)
    {
        const controlPoints = CornerMath.controlPointsForSuperellipse(s);
        
        const curvePoints = [new Point(0, 1)].concat(controlPoints);
        curvePoints.push(new Point(1, 0));
        
        // Maybe we can just do this math as part of controlPointsForSuperellipse.
        const points = curvePoints.map(p => new Point(1 - p.y, 1 - p.x).scaledBy(cornerRadius));
        return new CornerCurve(points);
    }
    
    constructor(points)
    {
        this._points = points;
    }

    get points()
    {
        return this._points;
    }
    
    cornerCurveTruncatingAtXAndY(x, y)
    {
        // We only expect to truncate if we have two segments.
        if (this._points.length < 7)
            return this;

        const segment1Points = () => {
            return this._points.slice(0, 4);
        };

        const segment2Points = () => {
            return this._points.slice(3);
        };

        // We want the part of the curve in the px > x && py > y area.
        const midpoint = this._points[3];
        let points = [];

        if (midpoint.x > x && midpoint.y > y) {
            // Split both segments.
            const seg1TforX = BezierUtils.tForX(segment1Points(), x);
            const seg2TforX = BezierUtils.tForX(segment2Points(), x);

            const seg1TforY = BezierUtils.tForY(segment1Points(), y);
            const seg2TforY = BezierUtils.tForY(segment2Points(), y);

            points = BezierUtils.splitSecond(segment1Points(), Math.max(seg1TforX, seg1TforY));
            if (points.length === 0)
                points = segment1Points();

            const segment2 = BezierUtils.splitFirst(segment2Points(), Math.max(seg2TforX, seg2TforY));
            if (segment2.length > 0)
                points = points.concat(segment2.slice(1)); // The first point is a duplicate.
            else
                points = points.concat(segment2Points().slice(1)); // The first point is a duplicate.
        } else if (midpoint.x > x) {
            // Split the first segment.
            const firstSegment = segment1Points();
            const tForX = BezierUtils.tForX(firstSegment, x);
            const tForY = BezierUtils.tForY(firstSegment, y);

            if (x === firstSegment[0].x)
                points = BezierUtils.splitFirst(firstSegment, tForY);
             else if (tForX > 0 && tForY > tForX) {
                const subsegment = BezierUtils.splitSecond(firstSegment, tForX);
                const t = BezierUtils.tForY(subsegment, y);
                points = BezierUtils.splitFirst(subsegment, t);
            }
        } else if (midpoint.y > y) {
            // Split the second segment.
            const secondSegment = segment2Points();
            const tForX = BezierUtils.tForX(secondSegment, x);
            const tForY = BezierUtils.tForY(secondSegment, y);
            
            if (y === secondSegment[3].y)
                points = BezierUtils.splitSecond(secondSegment, tForX);
            else if (tForX > 0 && tForY > tForX) {
                const subsegment = BezierUtils.splitSecond(secondSegment, tForX);
                const t = BezierUtils.tForY(subsegment, y);
                points = BezierUtils.splitFirst(subsegment, t);
            }
        }

        return new CornerCurve(points);
    }
}

// Adapted from https://github.com/Pomax/bezierjs 

const p1Index = 0;
const c1Index = 1;
const c2Index = 2;
const p2Index = 3;

class BezierUtils {

    static approximately(a, b, precision)
    {
        const epsilon = 0.000001;
        return Math.abs(a - b) <= (precision || epsilon);
    }

    // cube root function yielding real roots
    static crt(v)
    {
        return v < 0 ? -Math.pow(-v, 1 / 3) : Math.pow(v, 1 / 3);
    }


    static align(points, line)
    {
        const tx = line.p1.x
        const ty = line.p1.y;
        const a = -Math.atan2(line.p2.y - ty, line.p2.x - tx);
        const d = function(v) {
            return {
                x: (v.x - tx) * Math.cos(a) - (v.y - ty) * Math.sin(a),
                y: (v.x - tx) * Math.sin(a) + (v.y - ty) * Math.cos(a),
            };
        };
      return points.map(d);
    }

    static roots(points, line)
    {
        line = line || { p1: { x: 0, y: 0 }, p2: { x: 1, y: 0 } };

        const order = points.length - 1;
        const aligned = BezierUtils.align(points, line);
        const reduce = function(t) {
            return 0 <= t && t <= 1;
        };

        if (order === 2) {
            const a = aligned[0].y;
            const b = aligned[1].y;
            const c = aligned[2].y;
            const d = a - 2 * b + c;
            if (d !== 0) {
                  const m1 = -Math.sqrt(b * b - a * c);
                  const m2 = -a + b;
                  const v1 = -(m1 + m2) / d;
                  const v2 = -(-m1 + m2) / d;
              return [v1, v2].filter(reduce);
          }
          
          if (b !== c && d === 0)
              return [(2 * b - c) / (2 * b - 2 * c)].filter(reduce);

          return [];
        }

        // see http://www.trans4mind.com/personal_development/mathematics/polynomials/cubicAlgebra.htm
        const pa = aligned[0].y;
        const pb = aligned[1].y;
        const pc = aligned[2].y;
        const pd = aligned[3].y;

        const d = -pa + 3 * pb - 3 * pc + pd;
        let a = 3 * pa - 6 * pb + 3 * pc;
        let b = -3 * pa + 3 * pb;
        let c = pa;

        if (BezierUtils.approximately(d, 0)) {
              // this is not a cubic curve.
              if (BezierUtils.approximately(a, 0)) {
                  // in fact, this is not a quadratic curve either.
                  if (BezierUtils.approximately(b, 0)) {
                      // in fact in fact, there are no solutions.
                      return [];
                  }
                  // linear solution:
                  return [-c / b].filter(reduce);
              }
              // quadratic solution:
              const q = Math.sqrt(b * b - 4 * a * c);
              const a2 = 2 * a;
              return [(q - b) / a2, (-b - q) / a2].filter(reduce);
        }

        // at this point, we know we need a cubic solution:
        a /= d;
        b /= d;
        c /= d;

        const p = (3 * b - a * a) / 3;
        const p3 = p / 3;
        const q = (2 * a * a * a - 9 * a * b + 27 * c) / 27;
        const q2 = q / 2;
        const discriminant = q2 * q2 + p3 * p3 * p3;
        
        const tau = 2 * Math.PI;

        if (discriminant < 0) {
            const mp3 = -p / 3;
            const mp33 = mp3 * mp3 * mp3;
            const r = Math.sqrt(mp33);
            const t = -q / (2 * r);
            const cosphi = t < -1 ? -1 : t > 1 ? 1 : t;
            const phi = Math.acos(cosphi);
            const crtr = BezierUtils.crt(r);

            const t1 = 2 * crtr;
            const x1 = t1 * Math.cos(phi / 3) - a / 3;
            const x2 = t1 * Math.cos((phi + tau) / 3) - a / 3;
            const x3 = t1 * Math.cos((phi + 2 * tau) / 3) - a / 3;
            return [x1, x2, x3].filter(reduce);
        }
        
        if (discriminant === 0) {
            const u1 = q2 < 0 ? BezierUtils.crt(-q2) : -BezierUtils.crt(q2);
            const x1 = 2 * u1 - a / 3;
            const x2 = -u1 - a / 3;
            return [x1, x2].filter(reduce);
        }
        
        const sd = Math.sqrt(discriminant);
        const u1 = BezierUtils.crt(-q2 + sd);
        const v1 = BezierUtils.crt(q2 + sd);
        
        const root = u1 - v1 - a / 3;
        return [root].filter(reduce);
    }

    static tForX(points, x)
    {
        const line = {
            p1: new Point(x, 0),
            p2: new Point(x, 1)
        };
        const roots = BezierUtils.roots(points, line);
        if (roots.length === 0)
            return 0;
        return roots[0];
    }

    static tForY(points, y)
    {
        const line = {
            p1: new Point(0, y),
            p2: new Point(1, y)
        };
        const roots = BezierUtils.roots(points, line);
        if (roots.length === 0)
            return 0;
        return roots[0];
    }

    static splitFirst(points, t)
    {
        if (t === 0)
            return [];

        // Split using matrix math.
        // https://pomax.github.io/bezierinfo/#splitting
        const z = t;
        
        const first = function(z, p1, p2, p3, p4) {
            const zMinusOne = z - 1;
            return z * p2 - zMinusOne * p1;
        };

        const second = function(z, p1, p2, p3, p4) {
            const zMinusOne = z - 1;
            return z * z * p3 - 2 * z * zMinusOne * p2 + zMinusOne * zMinusOne * p1;
        };

        const third = function(z, p1, p2, p3, p4) {
            const zMinusOne = z - 1;
            return z * z * z * p4 - 3 * z * z * zMinusOne * p3 + 3 * z * zMinusOne * zMinusOne * p2 - zMinusOne * zMinusOne * zMinusOne * p1;
        };

        const startPoint = points[p1Index];
        const endPoint = new Point(third(z, points[p1Index].x, points[c1Index].x, points[c2Index].x, points[p2Index].x), third(z, points[p1Index].y, points[c1Index].y, points[c2Index].y, points[p2Index].y));
        const c1 = new Point(first(z, points[p1Index].x, points[c1Index].x, points[c2Index].x, points[p2Index].x), first(z, points[p1Index].y, points[c1Index].y, points[c2Index].y, points[p2Index].y));
        const c2 = new Point(second(z, points[p1Index].x, points[c1Index].x, points[c2Index].x, points[p2Index].x), second(z, points[p1Index].y, points[c1Index].y, points[c2Index].y, points[p2Index].y));
        return [startPoint, c1, c2, endPoint];
    }

    static splitSecond(points, t)
    {
        if (t === 0)
            return [];

        // Split using matrix math.
        // https://pomax.github.io/bezierinfo/#splitting
        const z = t;
        
        const first = function(z, p1, p2, p3, p4) {
            const zMinusOne = z - 1;
            return z * z * z * p4 - 3 * z * z * zMinusOne * p3 + 3 * z * zMinusOne * zMinusOne * p2 - zMinusOne * zMinusOne * zMinusOne * p1;
        };

        const second = function(z, p1, p2, p3, p4) {
            const zMinusOne = z - 1;
            return z * z * p4 - 2 * z * zMinusOne * p3 + zMinusOne * zMinusOne * p2;
        };

        const third = function(z, p1, p2, p3, p4) {
            const zMinusOne = z - 1;
            return z * p4 - zMinusOne * p3;
        };

        const startPoint = new Point(first(z, points[p1Index].x, points[c1Index].x, points[c2Index].x, points[p2Index].x), first(z, points[p1Index].y, points[c1Index].y, points[c2Index].y, points[p2Index].y));
        const endPoint = points[p2Index];
        const c1 = new Point(second(z, points[p1Index].x, points[c1Index].x, points[c2Index].x, points[p2Index].x), second(z, points[p1Index].y, points[c1Index].y, points[c2Index].y, points[p2Index].y));
        const c2 = new Point(third(z, points[p1Index].x, points[c1Index].x, points[c2Index].x, points[p2Index].x), third(z, points[p1Index].y, points[c1Index].y, points[c2Index].y, points[p2Index].y));
        return [startPoint, c1, c2, endPoint];
    }
    
}
