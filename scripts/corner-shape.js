import {add_corner_to_path, offset_for_curvature, se} from "./corner-math.js";

function add_corner(ctx, ax, ay, bx, by, curvature, l1 = null, l2 = null) {
  const vertex = ((bx - ax) * (by - ay) >= 0) ? { x: ax, y: by } : { x: bx, y: ay };
  const i_vertex = ((bx - ax) * (by - ay) >= 0) ? { x: bx, y: ay } : { x: ax, y: by };
  const ver = { x: ax - vertex.x, y: ay - vertex.y };
  const hor = { x: bx - vertex.x, y: by - vertex.y };

  if (curvature < 0.001) {
    ctx.lineTo(ax, ay);
    ctx.lineTo(vertex.x, vertex.y);
    ctx.lineTo(bx, by);
    return;
  }

  if (curvature > 100) {
    ctx.lineTo(ax, ay);
    ctx.lineTo(i_vertex.x, i_vertex.y);
    ctx.lineTo(bx, by);
    return;
  }
  ctx.save();
  ctx.transform(hor.x, hor.y, ver.x, ver.y, vertex.x, vertex.y);
  const transform = ctx.getTransform().inverse();
  [l1, l2] = [l1, l2].map(line => line ?
    line.map(([x, y]) => transform.transformPoint(new DOMPoint(x, y))) : null);
  add_corner_to_path(ctx, curvature, l1, l2);
  ctx.restore();
}

export function render(style, ctx, width, height) {
  let ax = width - style['border-top-right-radius'][0];
  let ay = 0;
  ctx.moveTo(ax, ay);

  let bx = width;
  let by = style['border-top-right-radius'][1];
  let shape = style['corner-top-right-shape'];
  add_corner(ctx, ax, ay, bx, by, shape);
  ax = width;
  ay = height - style['border-bottom-right-radius'][1];
  ctx.lineTo(ax, ay);
  bx = width - style['border-bottom-right-radius'][0];
  by = height;
  shape = style['corner-bottom-right-shape'];
  add_corner(ctx, ax, ay, bx, by, shape);
  ax = bx;
  ay = by;
  bx = style['border-bottom-left-radius'][0];
  by = height;
  ctx.lineTo(bx, by);
  ax = bx;
  ay = by;
  bx = 0;
  by = height - style['border-bottom-left-radius'][1];
  shape = style['corner-bottom-left-shape'];
  add_corner(ctx, ax, ay, bx, by, shape);
  ax = bx;
  ay = by;
  ax = 0;
  by = style['border-top-left-radius'][1];
  ctx.lineTo(bx, by);
  ax = bx;
  ay = by;
  bx = style['border-top-left-radius'][0];
  by = 0;
  shape = style['corner-top-left-shape'];
  add_corner(ctx, ax, ay, bx, by, shape);
  ax = bx;
  ay = by;
  ctx.lineTo(width - style['border-top-right-radius'][0], 0)
  ctx.closePath();
  ctx.stroke();


  ctx.beginPath();
  shape = style['corner-top-right-shape'];
  let w_tb = style['border-top-width'];
  let w_rl = style['border-right-width'];

  ctx.moveTo(width/2, w_tb)

  let offset = offset_for_curvature(shape);
  ax = width - style['border-top-right-radius'][0] + w_tb * offset[1];
  ay = w_tb * offset[0];
  bx = width - w_rl * offset[0];
  by = style['border-top-right-radius'][1] - w_rl * offset[1];
  add_corner(ctx, ax, ay, bx, by, shape, [[0, w_tb], [width, w_tb]], [[width - w_rl, 0], [width - w_rl, height]])

  ctx.lineTo(width - w_rl, height / 2)

  w_tb = style['border-bottom-width'];
  shape = style['corner-bottom-right-shape'];
  offset = offset_for_curvature(shape);
  ax = width - w_rl * offset[0];
  ay = height - style['border-bottom-right-radius'][1] + w_rl * offset[1]
  bx = width - style['border-bottom-right-radius'][0] + w_tb * offset[1];
  by = height - w_tb * offset[0];
  add_corner(ctx, ax, ay, bx, by, shape, [[width - w_rl, 0], [width - w_rl, height]], [[0, height - w_tb], [width, height - w_tb]])

  ctx.lineTo(width / 2, height - w_tb);

  shape = style['corner-bottom-left-shape'];
  w_rl = style['border-left-width'];
  offset = offset_for_curvature(shape);
  ax = style['border-bottom-left-radius'][0] - w_tb * offset[1]
  ay = height - w_tb * offset[0]
  bx = w_rl * offset[0]
  by = height - style['border-bottom-left-radius'][1] + w_rl * offset[1]
  add_corner(ctx, ax, ay, bx, by, shape, [[0, height - w_tb], [width, height - w_tb]], [[w_rl, 0], [w_rl, height]])
  ax = w_rl;

  ctx.lineTo(w_rl, height / 2);

  shape = style['corner-top-left-shape'];
  w_tb = style['border-top-width'];
  offset = offset_for_curvature(shape);
  ax = w_rl * offset[0]
  ay = style['border-top-left-radius'][1] - w_rl * offset[1]
  bx = style['border-top-left-radius'][0] - w_tb * offset[1]
  by = w_tb * offset[0]
  add_corner(ctx, ax, ay, bx, by, shape, [[w_rl, 0], [w_rl, height]], [[0, w_tb], [width, w_tb]])
  ctx.closePath();
  ctx.stroke();
}
