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
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ox0
 * @param {number} oy0
 * @param {number} ox1
 * @param {number} oy1
 * @param {number} ix0
 * @param {number} iy0
 * @param {number} ix1
 * @param {number} iy1
 * @param {number} curvature
 * @param {string} color1
 * @param {string} color2
 */
function drawCorner(ctx,
  ox0, oy0, ox1, oy1,
  ix0, iy0, ix1, iy1,
  curvature, color1, color2,
  dx0 = ix0, dy0 = iy0, dx1 = ix1, dy1 = iy1)
{
  const control_points = control_points_for_superellipse(curvature)
  const ocp = map_control_points(control_points, ox0, oy0, ox1, oy1);
  const dcp = map_control_points(control_points, dx0, dy0, dx1, dy1);
  let icp = map_control_points(control_points, ix0, iy0, ix1, iy1);
  const da = dcp[4];
  const ia = icp[4];
  if (da != ia) {
    const cx = (ia - ix0) / (ix1 - ix0);
    const k = Math.log(0.5) / Math.log(cx);
    const cp2 = control_points_for_superellipse(k);
    icp = map_control_points(cp2, ix0, iy0, ix1, iy1);
  }

  let path = new Path2D();
  path.moveTo(ix0, iy0);
  path.bezierCurveTo(...icp.slice(0, 6));
  path.lineTo(ocp[4], ocp[5]);
  path.bezierCurveTo(ocp[2], ocp[3], ocp[0], ocp[1], ox0, oy0);
  ctx.fillStyle = color1;
  ctx.fill(path, "nonzero");

  path = new Path2D();
  path.moveTo(icp[4], icp[5]);
  path.bezierCurveTo(...icp.slice(6), ix1, iy1);
  path.lineTo(ox1, oy1);
  path.bezierCurveTo(ocp[8], ocp[9], ocp[6], ocp[7], ocp[4], ocp[5]);
  ctx.fillStyle = color2;
  ctx.fill(path, "nonzero");
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

    width - style['border-top-right-radius'][0] - style['border-top-width'] * offset_for_curvature(style['corner-top-right-shape']),
    style['border-top-width'],
    width - style['border-right-width'],
    style['border-top-right-radius'][1] + style['border-right-width'] * offset_for_curvature(style['corner-top-right-shape']),

    style['corner-top-right-shape'],
    style['border-top-color'],
    style['border-right-color'],

    width - style['border-top-right-radius'][0],
    style['border-top-width'],
    width - style['border-right-width'],
    style['border-top-right-radius'][1] + style['border-right-width'],
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

    width - style['border-bottom-right-radius'][0] - style['border-bottom-width'] * offset_for_curvature(style['corner-bottom-right-shape']),
    height - style['border-bottom-width'],
    width - style['border-right-width'],
    height - style['border-bottom-right-radius'][1] - style['border-left-width'] * offset_for_curvature(style['corner-bottom-right-shape']),

    style['corner-bottom-right-shape'],
    style['border-bottom-color'],
    style['border-right-color'],
    width - style['border-bottom-right-radius'][0] - style['border-bottom-width'],
    height - style['border-bottom-width'],
    width - style['border-right-width'],
    height - style['border-bottom-right-radius'][1] - style['border-left-width'],
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

    style['border-bottom-left-radius'][0] + style['border-bottom-width'] * offset_for_curvature(style['corner-bottom-left-shape']),
    height - style['border-bottom-width'],
    style['border-left-width'],
    height - style['border-bottom-left-radius'][1] - style['border-left-width'] * offset_for_curvature(style['corner-bottom-left-shape']),

    style['corner-bottom-left-shape'],
    style['border-bottom-color'],
    style['border-left-color'],

    style['border-bottom-left-radius'][0],
    height - style['border-bottom-width'],
    style['border-left-width'],
    height - style['border-bottom-left-radius'][1],
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

    style['border-top-left-radius'][0] + style['border-top-width'] * offset_for_curvature(style['corner-top-left-shape']),
    style['border-top-width'],
    style['border-left-width'],
    style['border-top-left-radius'][1] + style['border-left-width'] * offset_for_curvature(style['corner-top-left-shape']),

    style['corner-top-left-shape'],
    style['border-top-color'],
    style['border-left-color'],
    style['border-top-left-radius'][0],
    style['border-top-width'],
    style['border-left-width'],
    style['border-top-left-radius'][1]
  );
}
