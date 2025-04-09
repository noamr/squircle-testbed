/**
 *
 * @param {number} curvature
 * @returns number
 */
export function offset_for_curvature(curvature) {
  // Find the superellipse's control point.
  // we do that by approximating the superellipse as a quadratic
  // curve that has the same point at t = 0.5.
  if (curvature <= 0.001)
    return [1, -1];
  const s = Math.min(1, Math.max(-1, Math.log2(curvature)));
  const rotation = (1 - s) * Math.PI / 4;
  return [Math.cos(rotation), -Math.sin(rotation)]
}

export function se(n, t = 0.5) {
  const x = Math.pow(t, 1 / n);
  const y = Math.pow(1 - t, 1 / n);
  return {
    x,
    y
  };
}

const p = [
  1.2430920942724248,
  2.010479023614843,
  0.32922901179443753,
  0.2823023142212073,
  1.3473704261055421,
  2.9149468637949814,
  0.9106507102917086,
];

export function control_points(curvature) {
  const s = Math.log2(curvature);
  const absS = Math.abs(s);

  const slope = p[0] +
    (p[6] - p[0]) * 0.5 * (1 + Math.tanh(p[5] * (absS - p[1])));
  const base = 1 / (1 + Math.exp(-slope * (0 - p[1])));
  const logistic = 1 / (1 + Math.exp(-slope * (absS - p[1])));

  const a = (logistic - base) / (1 - base);
  const b = p[2] * Math.exp(-p[3] * (absS ** p[4]));

  const P0 = {
    x: 0,
    y: 1
  };
  const P3 = se(Math.pow(2, absS), 0.5);
  const P6 = {
    x: 1,
    y: 0
  };
  const P1 = {
    x: a,
    y: 1
  };
  const P5 = {
    x: 1,
    y: a
  };

  if (s < 0) {
    [P1.x, P1.y] = [1 - P1.y, 1 - P1.x];
    [P3.x, P3.y] = [1 - P3.y, 1 - P3.x];
    [P5.x, P5.y] = [1 - P5.y, 1 - P5.x];
  }

  const P2 = {
    x: P3.x - b,
    y: P3.y + b
  };
  const P4 = {
    x: P3.x + b,
    y: P3.y - b
  };

  return [P0, P1, P2, P3, P4, P5, P6];
}

export function superellipse_t_for_x(x, curvature) {
  if (curvature < 1) {
    return 1 - superellipse_t_for_y(1 - x, 1 / curvature);
  } else return Math.log(x) / Math.log(1 / curvature);
}

export function superellipse_t_for_y(y, curvature) {
  if (curvature < 1) {
    return 1 - superellipse_t_for_x(1 - y, 1 / curvature);
  } else return 1 - Math.log(y) / Math.log(1 / curvature);
}
