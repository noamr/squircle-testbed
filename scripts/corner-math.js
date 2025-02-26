function superellipse_at(curvature, t = 0.5) {
  return Math.pow(t, 1 / curvature)
}

/**
 * @param {number} s
 * @param {number} t
 * @returns {x: number, y: number}
 */
export function se(s, t = 0.5) {
  const curvature = Math.pow(2, s);
  const x = superellipse_at(curvature);
  const y = superellipse_at(curvature, 1 - t);
  return { x, y };
}

/**
 *
 * @param {number} k
 * @returns Array<[number, number]>
 */
export function control_points_for_superellipse(k) {
  const p = [
    1.2430920942724248,
    2.010479023614843,
    0.32922901179443753,
    0.2823023142212073,
    1.3473704261055421,
    2.9149468637949814,
    0.9106507102917086
  ];

  const s = Math.log2(k);
  const absS = Math.abs(s);
  const slope =
    p[0] + (p[6] - p[0]) * 0.5 * (1 + Math.tanh(p[5] * (absS - p[1])));
  const base = 1 / (1 + Math.exp(-slope * (0 - p[1])));
  const logistic = 1 / (1 + Math.exp(-slope * (absS - p[1])));

  const a = (logistic - base) / (1 - base);
  const b = p[2] * Math.exp(-p[3] * absS ** p[4]);

  const P3 = se(absS, 0.5);
  const P1 = { x: a, y: 1 };
  const P5 = { x: 1, y: a };

  if (s < 0) {
    [P1.x, P1.y] = [1 - P1.y, 1 - P1.x];
    [P3.x, P3.y] = [1 - P3.y, 1 - P3.x];
    [P5.x, P5.y] = [1 - P5.y, 1 - P5.x];
  }

  const P2 = { x: P3.x - b, y: P3.y + b };
  const P4 = { x: P3.x + b, y: P3.y - b };
  return [P1, P2, P3, P4, P5].map(({ x, y }) => [
   x, 1 - y]);
}

/**
 *
 * @param {number} curvature
 * @returns number
 */
export function offset_for_curvature(curvature) {
  if (curvature < 0.5)
    return 1;
  if (curvature > 2)
    return 0;
  // Find the superellipse's control point.
  // we do that by approximating the superellipse as a quadratic
  // curve that has the same point at t = 0.5.
  const x = superellipse_at(curvature);
  const [a, b] = [x, 1 - x].map(m => 2 * m - 0.5);

  const slope = a / b;
  const magnitude = Math.hypot(a, b);
  // Normalize a & b
  const norm_a = a / magnitude;
  const norm_b = b / magnitude;

  // The outer normal offset is the intercept of the line
  // parallel to the tangent, at distance.
  const value = norm_b + slope * (norm_a - 1);
  return value;
}

export function correct_inner_curvature(curvature, [ox0, oy0, ox1, oy1], [ix0, iy0, ix1, iy1], dx, dy) {
  if ((dx === 0 && dy === 0) || curvature >= 2 || curvature === 0)
    return curvature;

  // Find the superellipse values for the curvature at 0.5.
  const cx = superellipse_at(curvature);
  const cy = 1 - cx;

  // Find that point for the outer rect.
  const [ocx, ocy] = [ox0 + (ox1 - ox0) * cx, oy0 + (oy1 - oy0) * cy];

  // The point for the inner rect should be diagonal to the
  // outer point, with the given distance.
  const [icx, icy] = [ocx + dx / Math.SQRT2, ocy + dy / Math.SQRT2];

  // Find the distance of that point from the corner.
  const dist_from_nearest_corner = Math.hypot(icx - ix0, icy - iy1);

  // Find the ratio of that distance from the overall distance
  // This would be the superellipse at t=0.5 for the internal curve.
  const total_dist = Math.hypot(ix1 - ix0, iy1 - iy0);
  const ratio = dist_from_nearest_corner / total_dist;

  // Find the curvature given the t=0.5 value.
  return Math.log(.5) / Math.log(ratio);
}
