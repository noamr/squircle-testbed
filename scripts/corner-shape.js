import {control_points_for_superellipse, offset_for_curvature} from "./corner-math.js";

/**
 *
 * @param {Array<[number, number]} points
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 */
function map_control_points(points, x0, y0, x1, y1) {
  return points.flatMap(([x, y]) => [x0 + (x1 - x0) * x, y0 + (y1 - y0) * y]);
}

/**
 *
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @param {number} wx
 * @param {number} wy
 * @param {number} curvature
 */
function compute_outer_corners(x0, y0, x1, y1, wrl, wtb, curvature) {
  // Find the approximate slope & magnitude of the superellipse's tangent
  const a = Math.pow(0.5, 1/curvature);
  const b = 1 - a;
  const slope = a / b;
  const magnitude = Math.hypot(a, b);
  // Normalize a & b
  const norm_a = a / magnitude;
  const norm_b = b / magnitude;

  // The outer normal offset is the intercept of the line
  // parallel to the tangent, at distance.
  const outer_offset = norm_b + slope * (norm_a - 1);

  if (x1 > x0) {
    if (y1 > y0) {
      // top-right
      return [x0 + wtb * outer_offset, y0, x1, y1 - wrl * outer_offset];
    } else {
      // bottom-right
      return [x0 + wtb * outer_offset, y0, x1, y1 + wrl * outer_offset];
    }
  } else {
    if (y1 > y0) {
      // top-left
      return [x0 - wtb * outer_offset, y0, x1, y1 - wrl * outer_offset];
    } else {
      // bottom-left
      return [x0 - wtb * outer_offset, y0, x1, y1 + wrl * outer_offset];
    }
  }
}

/**
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ox0
 * @param {number} oy0
 * @param {number} ox1
 * @param {number} oy1
 * @param {number} ix0
 * @param {number} iy0
 * @param {number} ix1
 * @param {number} iy1
 * @param {number} wx
 * @param {number} wy
 * @param {number} curvature
 * @param {string} color1
 * @param {string} color2
 */
function drawCorner(ctx,
  ox0, oy0, ox1, oy1,
  ix0, iy0, ix1, iy1,
  wx, wy,
  curvature, color1, color2)
{
  const [dx0, dy0, dx1, dy1] = compute_outer_corners(ox0, oy0, ox1, oy1, wx, wy, curvature);
  const control_points = control_points_for_superellipse(curvature)
  const ocp = map_control_points(control_points, dx0, dy0, dx1, dy1);

  let path = new Path2D();
  const icp = map_control_points(control_points, ix0, iy0, ix1, iy1);
  path.moveTo(ix0, iy0);
  path.bezierCurveTo(...icp.slice(0, 6));
  path.lineTo(ocp[4], ocp[5]);
  path.bezierCurveTo(ocp[2], ocp[3], ocp[0], ocp[1], dx0, dy0);
  path.lineTo(ox0, oy0)
  ctx.fillStyle = color1;
  ctx.fill(path, "nonzero");
  path = new Path2D();
  path.moveTo(icp[4], icp[5]);
  path.bezierCurveTo(...icp.slice(6), ix1, iy1);
  path.lineTo(ox1, oy1);
  path.lineTo(dx1, dy1);
  path.bezierCurveTo(ocp[8], ocp[9], ocp[6], ocp[7], ocp[4], ocp[5]);
  ctx.fillStyle = color2;
  ctx.fill(path, "nonzero");
  // ctx.fillStyle = "rgba(0, 255, 0, .3)";
  // ctx.fillRect(ox0, oy0, ox1 - ox0, oy1 - oy0);
  // ctx.fillStyle = "rgba(0, 0, 255, .3)";
  // ctx.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
  // ctx.fillStyle = "rgba(255, 255, 255, .3)";
  // ctx.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
}

/**
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} x0
 * @param {number} y0
 * @param {number} x1
 * @param {number} y1
 * @param {number} color
 */
function drawSide(ctx,
  x0, y0, x1, y1, color
) {
  ctx.fillStyle = color;
  ctx.fillRect(Math.min(x0, x1), Math.min(y0, y1), Math.abs(x0 - x1), Math.abs(y0 - y1));
}
/**
 * @param {RectStyle} style
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 */
export function render(style, ctx, width, height) {
  // Top
  drawSide(
    ctx,
    style['border-top-left-radius'][0],
    0,
    width - style['border-top-right-radius'][0],
    style['border-top-width'],
    style['border-top-color']
  );

  // Top right
  drawCorner(
    ctx,

    width - style['border-top-right-radius'][0],
    0,
    width,
    style['border-top-right-radius'][1],

    width - style['border-top-right-radius'][0],
    style['border-top-width'],
    width - style['border-right-width'],
    style['border-top-right-radius'][1],

    style['border-right-width'],
    style['border-top-width'],

    style['corner-top-right-shape'],
    style['border-top-color'],
    style['border-right-color']
  );
  // Right
  drawSide(
    ctx,
    width,
    style['border-top-right-radius'][1],
    width - style['border-right-width'],
    height - style['border-bottom-right-radius'][1],
    style['border-right-color']
  );

  // Bottom right
  drawCorner(
    ctx,

    width - style['border-bottom-right-radius'][0],
    height,
    width,
    height - style['border-bottom-right-radius'][1],

    width - style['border-bottom-right-radius'][0],
    height - style['border-bottom-width'],
    width - style['border-right-width'],
    height - style['border-bottom-right-radius'][1],

    style['border-right-width'],
    style['border-bottom-width'],

    style['corner-bottom-right-shape'],
    style['border-bottom-color'],
    style['border-right-color'],
  );
  // Bottom
  drawSide(
    ctx,
    width - style['border-bottom-right-radius'][0],
    height,
    style['border-bottom-left-radius'][0],
    height - style['border-bottom-width'],
    style['border-bottom-color']
  );


  // Bottom left
  drawCorner(
    ctx,

    style['border-bottom-left-radius'][0],
    height,
    0,
    height - style['border-bottom-left-radius'][1],

    style['border-bottom-left-radius'][0],
    height - style['border-bottom-width'],
    style['border-left-width'],
    height - style['border-bottom-left-radius'][1],

    style['border-left-width'],
    style['border-bottom-width'],

    style['corner-bottom-left-shape'],
    style['border-bottom-color'],
    style['border-left-color'],
  );
  // Left
  drawSide(
    ctx,
    0,
    style['border-top-left-radius'][1],
    style['border-left-width'],
    height - style['border-bottom-left-radius'][1],
    style['border-left-color']
  )

  // top-let
  drawCorner(
    ctx,

    style['border-top-left-radius'][0],
    0,
    0,
    style['border-top-left-radius'][1],

    style['border-top-left-radius'][0],
    style['border-top-width'],
    style['border-left-width'],
    style['border-top-left-radius'][1],

    style['border-left-width'],
    style['border-top-width'],

    style['corner-top-left-shape'],
    style['border-top-color'],
    style['border-left-color'],
  );
}
