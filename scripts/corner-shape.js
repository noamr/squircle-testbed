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
function compute_outer_corners(x0, y0, x1, y1, wx, wy, curvature) {
  if (curvature >= 2)
    return [x0, y0, x1, y1, x0, y0, x1, y1]
  const with_join = curvature < 1;
  const outer_offset = offset_for_curvature(Math.max(0.5, Math.min(2, curvature)));
  const inner_offset = with_join ? Math.sqrt(2 * Math.max(0.5, curvature)) : outer_offset;
  const join = h => with_join ? h : 0;
  if (x1 > x0) {
    if (y1 > y0) {
      // top-right
      return [
        x0 + wy * inner_offset, y0 + join(wy), x1 - join(wx), y1 - wx * inner_offset,
        x0 + wy * outer_offset, y0, x1, y1 - wx * outer_offset];
    } else {
      // bottom-right
      return [
        x0 + wy * inner_offset, y0 - join(wy), x1 - join(wx), y1 + wx * inner_offset,
        x0 + wy * outer_offset, y0, x1, y1 + wx * outer_offset,
      ];
    }
  } else {
    if (y1 > y0) {
      // top-left
      return [
        x0 - wy * inner_offset, y0 + join(wy), x1 + join(wx), y1 - wx * inner_offset,
        x0 - wy * outer_offset, y0, x1, y1 - wx * outer_offset,
      ];
    } else {
      // bottom-left
      return [
        x0 - wy * inner_offset, y0 - join(wy), x1 + join(wy), y1 + wx * inner_offset,
        x0 - wy * outer_offset, y0, x1, y1 + wx * outer_offset
      ];
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
  const [dx0, dy0, dx1, dy1, ex0, ey0, ex1, ey1] = compute_outer_corners(ox0, oy0, ox1, oy1, wx, wy, curvature);

  const control_points = control_points_for_superellipse(curvature)

  let path = new Path2D();
  const icp = map_control_points(control_points, ix0, iy0, ix1, iy1);
  const ocp = map_control_points(control_points, dx0, dy0, dx1, dy1);
  const ecp = map_control_points(control_points, ex0, ey0, ex1, ey1)
  path.moveTo(ix0, iy0);
  path.bezierCurveTo(...icp.slice(0, 6));
  path.lineTo(ocp[4], ocp[5]);
  path.bezierCurveTo(ocp[2], ocp[3], ocp[0], ocp[1], ex0, ey0);
  path.lineTo(ox0, oy0)
  ctx.fillStyle = color1;
  ctx.fill(path, "nonzero");
  path = new Path2D();
  path.moveTo(icp[4], icp[5]);
  path.bezierCurveTo(...icp.slice(6), ix1, iy1);
  path.lineTo(ox1, oy1);
  path.lineTo(ex1, ey1);
  path.bezierCurveTo(ocp[8], ocp[9], ocp[6], ocp[7], ocp[4], ocp[5]);
  ctx.fillStyle = color2;
  ctx.fill(path, "nonzero");
  ctx.fillStyle = "rgba(0, 255, 0, .3)";
  ctx.fillRect(ox0, oy0, ox1 - ox0, oy1 - oy0);
  ctx.fillStyle = "rgba(255, 0, 0, .3)";
  ctx.fillRect(ex0, ey0, ex1 - ex0, ey1 - ey0);
  ctx.fillStyle = "rgba(0, 0, 255, .3)";
  ctx.fillRect(dx0, dy0, dx1 - dx0, dy1 - dy0);
  ctx.fillStyle = "rgba(255, 255, 255, .3)";
  ctx.fillRect(ix0, iy0, ix1 - ix0, iy1 - iy0);
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
