
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
        
        const curvature = Math.pow(2, s);
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
}
