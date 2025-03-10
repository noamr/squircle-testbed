import {
  control_points,
} from "./corner-math.js";
import {
  resolve_corner_params
} from "./corner-params.js";

function add_corner(ctx, ax, ay, bx, by, curvature, phase, direction) {
  const vertex = ((bx - ax) * (by - ay) >= 0) ? {
    x: ax,
    y: by
  } : {
    x: bx,
    y: ay
  };
  const i_vertex = ((bx - ax) * (by - ay) >= 0) ? {
    x: bx,
    y: ay
  } : {
    x: ax,
    y: by
  };
  const ver = {
    x: ax - vertex.x,
    y: ay - vertex.y
  };
  const hor = {
    x: bx - vertex.x,
    y: by - vertex.y
  };

  if (curvature > 1000) {
    ctx.lineTo(ax, ay);
    ctx.lineTo(i_vertex.x, i_vertex.y);
    ctx.lineTo(bx, by);
    return;
  }
  ctx.save();
  ctx.transform(hor.x, hor.y, ver.x, ver.y, vertex.x, vertex.y);
  let cp = control_points(curvature);
  if (phase === "both") {
    const [P0, P1, P2, P3, P4, P5, P6] = cp;
    ctx.lineTo(P0.x, P0.y);
    ctx.bezierCurveTo(P1.x, P1.y, P2.x, P2.y, P3.x, P3.y);
    ctx.bezierCurveTo(P4.x, P4.y, P5.x, P5.y, P6.x, P6.y);
  } else {
    if (phase === "second")
      cp = cp.slice(3);
    else
      cp = cp.slice(0, 4);

    const [P0, P1, P2, P3] = direction === "reverse" ? cp.toReversed() : cp;

    ctx.lineTo(P0.x, P0.y);
    ctx.bezierCurveTo(P1.x, P1.y, P2.x, P2.y, P3.x, P3.y);
  }
  ctx.restore();
}

export function render(style, ctx, width, height) {
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

  if (!style.shadow) {
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
  ctx.clip("nonzero");

  {
    ctx.fillStyle = style['border-top-color'];
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.lineTo(style['border-left-width'], style['border-top-width']);
    ctx.lineTo(width - style['border-right-width'], style['border-top-width']);
    ctx.lineTo(width, 0);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = style['border-right-color'];
    ctx.beginPath();
    ctx.moveTo(width, 0);
    ctx.lineTo(width - style['border-right-width'], style['border-top-width']);
    ctx.lineTo(width - style['border-right-width'], height - style['border-bottom-width']);
    ctx.lineTo(width, height);
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
  {
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
    draw_inner_corner('top-right', 'second', 'reverse');
    draw_outer_corner('top-right', 'second');
    ctx.lineTo(width, style['border-top-right-radius'][1]);
    ctx.lineTo(width, height - style['border-bottom-right-radius'][1]);
    draw_outer_corner('bottom-right', 'first');
    draw_inner_corner('bottom-right', 'first', 'reverse');
    ctx.lineTo(width - style['border-right-width'], height - style['border-bottom-right-radius'][1])
    ctx.lineTo(width - style['border-right-width'], style['border-top-right-radius'][1])
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