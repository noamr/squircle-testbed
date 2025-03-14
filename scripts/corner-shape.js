import {
  se,
  control_points,
  superellipse_t_for_x,
  superellipse_t_for_y
} from "./corner-math.js";
import {
  resolve_corner_params
} from "./corner-params.js";

let mode = "fast";
/**
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} ax
 * @param {number} ay
 * @param {number} bx
 * @param {number} by
 * @param {number} curvature
 * @param {*} phase
 * @param {*} direction
 * @returns
 */
function add_corner(ctx, ax, ay, bx, by, curvature, phase, direction) {

  if (curvature > 1000) {
    ctx.lineTo(ax, ay);
    ctx.lineTo(i_vertex.x, i_vertex.y);
    ctx.lineTo(bx, by);
    return;
  }

  function map_point({
    x,
    y
  }) {
    if (Math.sign(bx - ax) !== Math.sign(by - ay)) {
      [x, y] = [1 - y, x];
    } else {
      y = 1 - y;
    }

    return [ax + x * (bx - ax), ay + y * (by - ay)];
  }

  if (mode === "precise") {
    let t1 = 0;
    let t2 = 1;
    if (phase === "second")
      t1 = 0.5;
    else if (phase === "first")
      t2 = 0.5;

    function xy_for_t(t) {
      return map_point(se(curvature, t));
    }


    ctx.lineTo(ax, ay);
    const t_values = new Set();
    const antialiasing_offset = 0.25;
    for (
      let x = Math.min(ax, bx) + antialiasing_offset; x < Math.max(ax, bx);
      ++x
    ) {
      const nx = (x - ax) / (bx - ax);
      const t = vertical_first ?
        superellipse_t_for_x(nx, curvature) :
        superellipse_t_for_y(1 - nx, curvature);
      if (t > 0 && t < 1) t_values.add(t);
    }

    for (
      let y = Math.min(ay, by) + antialiasing_offset; y < Math.max(ay, by);
      ++y
    ) {
      const ny = (y - ay) / (by - ay);
      const t = vertical_first ?
        superellipse_t_for_y(1 - ny, curvature) :
        superellipse_t_for_x(1 - ny, curvature);
      if (t > 0 && t < 1) t_values.add(t);
    }

    const applicable_t = [...t_values].filter(t >= t1 && t < t2).sort();

    for (const t of applicable_t) {
      const [x, y] = xy_for_t(t);
      ctx.lineTo(x, y);
    }
    ctx.lineTo(bx, by);
  } else {
    let cp = control_points(curvature).map(map_point);
    if (phase === "both") {
      const [P0, P1, P2, P3, P4, P5, P6] = cp;
      ctx.lineTo(...P0);
      ctx.bezierCurveTo(...P1, ...P2, ...P3);
      ctx.bezierCurveTo(...P4, ...P5, ...P6);
    } else {
      if (phase === "second")
        cp = cp.slice(3);
      else
        cp = cp.slice(0, 4);

      const [P0, P1, P2, P3] = direction === "reverse" ? cp.toReversed() : cp;

      ctx.lineTo(...P0);
      ctx.bezierCurveTo(...P1, ...P2, ...P3);
    }

  }
}

export function render(style, ctx, width, height) {
  mode = style.mode;
  const corner_params = resolve_corner_params(style, width, height);

  function draw_outer_corner(corner, phase = "both", direction) {
    const params = corner_params[corner];
    add_corner(ctx, ...params.outer_rect, params.shape, phase, direction);
  }

  function draw_inner_corner_from_params(params, phase = "both", direction) {
    add_corner(ctx, ...params.inner_rect, params.shape, phase, direction);
  }

  function draw_inner_corner(corner, phase = "both", direction) {
    draw_inner_corner_from_params(corner_params[corner], phase, direction)
  }


  ctx.scale(0.75, 0.75);
  ctx.translate(60, 60);

  if (style.shadow) {
    const {
      spread,
      offset,
      blur,
      color
    } = style.shadow;
    const for_shadow = resolve_corner_params(style, width, height, spread);
    ctx.save();
    ctx.filter = `blur(${blur}px)`;
    ctx.beginPath();
    ctx.translate(...offset);
    ctx.lineTo(for_shadow['top-right'].inner_rect[0], -spread);
    draw_inner_corner_from_params(for_shadow['top-right']);
    ctx.lineTo(width + spread, for_shadow['top-right'].inner_rect[3])
    ctx.lineTo(width + spread, for_shadow['bottom-right'].inner_rect[1])
    draw_inner_corner_from_params(for_shadow['bottom-right']);
    ctx.lineTo(for_shadow['bottom-right'].inner_rect[2], height + spread);
    ctx.lineTo(for_shadow['bottom-left'].inner_rect[0], height + spread);
    draw_inner_corner_from_params(for_shadow['bottom-left']);
    ctx.lineTo(-spread, for_shadow['bottom-left'].inner_rect[3]);
    ctx.lineTo(-spread, for_shadow['top-left'].inner_rect[1]);
    draw_inner_corner_from_params(for_shadow['top-left']);
    ctx.lineTo(for_shadow['top-left'].inner_rect[2], -spread);
    ctx.fillStyle = color;
    ctx.fill("nonzero");
    ctx.closePath();
    ctx.restore();
  }

  ctx.beginPath();

  draw_outer_corner('top-right');
  draw_outer_corner('bottom-right');
  draw_outer_corner('bottom-left');
  draw_outer_corner('top-left');
  ctx.closePath();
  ctx.clip("nonzero"); {
    ctx.fillStyle = style['border-top-color'];
    ctx.beginPath();
    ctx.moveTo(width - style['border-top-right-radius'][0], 0);
    draw_outer_corner('top-right', 'first');
    draw_inner_corner('top-right', 'first', 'reverse');
    ctx.lineTo(width - style['border-top-right-radius'][0], style['border-top-width']);
    ctx.lineTo(style['border-top-left-radius'][0], style['border-top-width']);
    draw_inner_corner('top-left', 'second', 'reverse');
    draw_outer_corner('top-left', 'second');
    ctx.closePath();
    ctx.fill();
  }

  {
    ctx.fillStyle = style['border-right-color'];
    ctx.beginPath();
    ctx.moveTo(width, 0);
    ctx.lineTo(width - style['border-right-width'], style['border-top-width']);
    ctx.lineTo(width - style['border-right-width'], height - style['border-bottom-width']);
    ctx.lineTo(width, height);
    ctx.closePath();
    ctx.fill();
    ctx.beginPath();
    draw_inner_corner('top-right', 'second', 'reverse');
    draw_outer_corner('top-right', 'second');
    ctx.lineTo(width, 0)
    ctx.lineTo(width, style['border-top-right-radius'][1]);
    ctx.lineTo(width, height - style['border-bottom-right-radius'][1]);
    draw_outer_corner('bottom-right', 'first');
    draw_inner_corner('bottom-right', 'first', 'reverse');
    ctx.lineTo(width - style['border-right-width'], height - style['border-bottom-right-radius'][1])
    ctx.lineTo(width - style['border-right-width'], style['border-top-right-radius'][1])
    ctx.lineTo(width, 0)
    ctx.closePath();
    ctx.fill();
  } {
    ctx.beginPath();
    ctx.moveTo(width - style['border-bottom-right-radius'][0], height - style['border-bottom-width']);
    draw_inner_corner('bottom-right', 'second', 'reverse');
    draw_outer_corner('bottom-right', 'second');
    ctx.lineTo(width - style['border-bottom-right-radius'][0], height);
    ctx.lineTo(style['border-bottom-left-radius'][0], height);
    draw_outer_corner('bottom-left', 'first');
    draw_inner_corner('bottom-left', 'first', 'reverse');
    ctx.lineTo(corner_params['bottom-left'].inner_rect[2], height - style['border-bottom-width'])
    ctx.fillStyle = style['border-bottom-color'];
    ctx.fill();
  }

  {
    ctx.beginPath();
    ctx.moveTo(0, height - style['border-bottom-left-radius'][1]);
    draw_outer_corner('bottom-left', 'second', 'reverse');
    draw_inner_corner('bottom-left', 'second');
    ctx.lineTo(style['border-left-width'], height - style['border-bottom-left-radius'][1]);
    draw_inner_corner('top-left', 'first');
    draw_outer_corner('top-left', 'first', 'reverse');
    ctx.fillStyle = style['border-left-color'];
    ctx.fill();
  }

  {
    ctx.fillStyle = style['border-top-color'];

    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(style['border-left-width'], style['border-top-width']);
    ctx.lineTo(width - style['border-right-width'], style['border-top-width']);
    ctx.lineTo(width, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = style['border-bottom-color'];
    ctx.beginPath();
    ctx.moveTo(width, height);
    ctx.lineTo(width - style['border-right-width'], height - style['border-bottom-width']);
    ctx.lineTo(style['border-left-width'], height - style['border-bottom-width']);
    ctx.lineTo(0, height);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = style['border-left-color'];
    ctx.beginPath();
    ctx.lineTo(0, height);
    ctx.lineTo(style['border-left-width'], height - style['border-bottom-width']);
    ctx.lineTo(style['border-left-width'], style['border-top-width']);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fill();
  }

  const inner_rect = [style['border-left-width'], style['border-top-width'], width - style['border-right-width'], height - style['border-bottom-width']];
  ctx.save();
  ctx.beginPath();
  draw_inner_corner('top-right');
  ctx.lineTo(inner_rect[2], inner_rect[3]);
  ctx.lineTo(inner_rect[0], inner_rect[3]);
  ctx.lineTo(inner_rect[0], inner_rect[1]);
  ctx.closePath();
  ctx.clip();
  ctx.beginPath();
  draw_inner_corner('bottom-right');
  ctx.lineTo(inner_rect[0], inner_rect[3]);
  ctx.lineTo(inner_rect[0], inner_rect[1]);
  ctx.lineTo(inner_rect[2], inner_rect[1]);
  ctx.closePath();
  ctx.clip();
  ctx.beginPath();
  draw_inner_corner('bottom-left');
  ctx.lineTo(inner_rect[0], inner_rect[1]);
  ctx.lineTo(inner_rect[2], inner_rect[1]);
  ctx.lineTo(inner_rect[2], inner_rect[3]);
  ctx.closePath();
  ctx.clip();
  ctx.beginPath();
  draw_inner_corner('top-left');
  ctx.lineTo(inner_rect[2], inner_rect[1]);
  ctx.lineTo(inner_rect[2], inner_rect[3]);
  ctx.lineTo(inner_rect[0], inner_rect[3]);
  ctx.closePath();
  ctx.clip();
  ctx.fillStyle = "white";
  ctx.fill();
  ctx.restore();
}