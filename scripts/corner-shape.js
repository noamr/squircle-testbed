import {
  control_points,
} from "./corner-math.js";
import { resolve_corner_params } from "./corner-params.js";

import {
  Bezier
} from "https://cdn.jsdelivr.net/npm/bezier-js@6.1.4/src/bezier.min.js"

function add_corner(ctx, ax, ay, bx, by, curvature, l1 = null, l2 = null) {
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
  const transform_vals = [hor.x, hor.y, ver.x, ver.y, vertex.x, vertex.y];
  ctx.transform(...transform_vals);
  const inverse_transform = new DOMMatrix(transform_vals).inverse();
  [l1, l2] = [l1, l2].map(p => p ? Object.fromEntries(p.map(
    (p, i) => [`p${i + 1}`, inverse_transform.transformPoint(new DOMPoint(p[0], p[1]))])) : null);
  const [P0, P1, P2, P3, P4, P5, P6] = control_points(curvature);
  const b1 = new Bezier(P0, P1, P2, P3);
  const b2 = new Bezier(P3, P4, P5, P6);
  let t1 = l1 === null ? 0 : b1.intersects(l1)[0];
  let t2 = l2 === null ? 1 : b2.intersects(l2)[0];
  if (curvature < 0.01 || !t2) {
    t1 = 0;
    t2 = 1;
  }

  if (t1 === 0 && t2 === 1) {
    ctx.lineTo(P0.x, P0.y);
    ctx.bezierCurveTo(P1.x, P1.y, P2.x, P2.y, P3.x, P3.y);
    ctx.bezierCurveTo(P4.x, P4.y, P5.x, P5.y, P6.x, P6.y);
  } else {
    const first = b1.split(t1).right.points.flatMap(({
      x,
      y
    }) => [x, y]);
    const second = b2.split(t2).left.points.flatMap(({
      x,
      y
    }) => [x, y]);
    ctx.lineTo(first[0], first[1]);
    ctx.bezierCurveTo(...first.slice(2));
    ctx.bezierCurveTo(...second.slice(2));
  }
  ctx.restore();
}

export function render(style, ctx, width, height) {
  const corner_params = resolve_corner_params(style, width, height);
  function draw_outer_corner(corner) {
    const {
      outer_rect,
      shape
    } = corner_params[corner];
    add_corner(ctx, ...outer_rect, shape);
  }


  ctx.scale(0.75, 0.75);
  ctx.translate(60, 60);

  function draw_inner_corner_from_params(params) {
    add_corner(ctx, ...params.inner_rect, params.shape, ...params.trim);
  }

  function draw_inner_corner(corner) {
    draw_inner_corner_from_params(corner_params[corner])
  }

  if (style.shadow) {
    const {spread, offset, blur, color} = style.shadow;
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
    ctx.lineTo(for_shadow['top-left'].inner_rect[2  ], -spread);
    ctx.fillStyle = color;
    ctx.fill("evenodd");
    ctx.closePath();
    ctx.restore();
  }

  ctx.beginPath();
  ctx.moveTo(...corner_params['top-right'].outer_rect.slice(0, 2));

  draw_outer_corner('top-right');
  draw_outer_corner('bottom-right');
  draw_outer_corner('bottom-left');
  draw_outer_corner('top-left');
  ctx.moveTo(width / 2, style['border-top-width']);
  draw_inner_corner('top-right');
  draw_inner_corner('bottom-right');
  draw_inner_corner('bottom-left');
  draw_inner_corner('top-left');

  ctx.save();
  ctx.closePath();
  ctx.clip("evenodd");
  ctx.beginPath();

  {
    let {
      outer_center,
      inner_center,
      inset,
      inner_rect
    } = corner_params["top-left"];
    ctx.moveTo(0, 0);
    ctx.lineTo(...outer_center)
    ctx.lineTo(...inner_center)
    ctx.lineTo(inner_rect[2], inner_rect[1]);
    ctx.lineTo(inner_rect[2], inset[1]);
  }

  {
    let {
      inner_rect,
      outer_center,
      inner_center,
      inset,
    } = corner_params["top-right"];
    ctx.lineTo(inner_rect[0], inset[0]);
    ctx.lineTo(inner_rect[0], inner_rect[3]);
    ctx.lineTo(...inner_center)
    ctx.lineTo(...outer_center)
    ctx.lineTo(width, 0);
    ctx.fillStyle = style['border-top-color'];
    ctx.fill("nonzero");

    ctx.beginPath();
    ctx.lineTo(width, 0);
    ctx.lineTo(...outer_center)
    ctx.lineTo(...inner_center)
    ctx.lineTo(inner_rect[0], inner_rect[3]);
    ctx.lineTo(width - inset[1], inner_rect[3]);
  }

  {
    let {
      inner_rect,
      outer_center,
      inner_center,
      inset,
    } = corner_params["bottom-right"];
    ctx.lineTo(width - inset[0], inner_rect[1]);
    ctx.lineTo(inner_rect[2], inner_rect[1]);
    ctx.lineTo(...inner_center)
    ctx.lineTo(...outer_center)
    ctx.lineTo(width, height);

    ctx.closePath();
    ctx.fillStyle = style['border-right-color'];
    ctx.fill("nonzero");

    ctx.beginPath();
    ctx.lineTo(width, height);
    ctx.lineTo(...outer_center)
    ctx.lineTo(...inner_center)
    ctx.lineTo(inner_rect[2], inner_rect[1]);
  }


  {
    let {
      outer_center,
      inner_center,
      inner_rect,
      inset,
    } = corner_params["bottom-left"];
    ctx.lineTo(inner_rect[0], height - inset[0]);
    ctx.lineTo(inner_rect[0], inner_rect[3]);
    ctx.lineTo(...inner_center)
    ctx.lineTo(...outer_center)
    ctx.lineTo(0, height);

    ctx.closePath();
    ctx.fillStyle = style['border-bottom-color'];
    ctx.fill("nonzero");

    ctx.beginPath();

    ctx.lineTo(0, height);
    ctx.lineTo(...outer_center)
    ctx.lineTo(...inner_center)
    ctx.lineTo(inner_rect[0], inner_rect[3]);
  }

  {
    let {
      outer_center,
      inner_center,
      inner_rect,
      inset,
    } = corner_params["top-left"];
    ctx.lineTo(inset[0], inner_rect[1]);
    ctx.lineTo(inner_rect[2], inner_rect[1]);
    ctx.lineTo(...inner_center)
    ctx.lineTo(...outer_center)
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = style['border-left-color'];
    ctx.fill("nonzero");
  }

  ctx.restore();
  ctx.beginPath();
  ctx.moveTo(width / 2, style['border-top-width']);
  draw_inner_corner('top-right');
  draw_inner_corner('bottom-right');
  draw_inner_corner('bottom-left');
  draw_inner_corner('top-left');
  ctx.fillStyle = "rgba(255, 255, 255, 1)";
  ctx.fill("nonzero");

}