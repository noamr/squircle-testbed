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
  const params = {};

  const bw = Object.fromEntries(['top', 'right', 'bottom', 'left'].map(d => [d, style[`border-${d}-width`]]));
  let shape = style['corner-top-right-shape'];
  let offset = offset_for_curvature(shape);
  let radius = style['border-top-right-radius'];
  params['top-right'] = {
    outer: [width - radius[0], 0, width, radius[1]],
    inner: [bw.top * offset[1], bw.top * offset[0], -bw.right * offset[0], -bw.right * offset[1]],
    shape,
    trim: [[[0, bw.top], [width, bw.top]], [[width - bw.right, 0], [width - bw.right, height]]]
  }

  shape = style['corner-bottom-right-shape'];
  offset = offset_for_curvature(shape);
  radius = style['border-bottom-right-radius'];

  params['bottom-right'] = {
    outer: [width, height - radius[1], width - radius[0], height],
    inner: [-bw.right * offset[0], bw.right * offset[1], bw.bottom * offset[1], -bw.bottom * offset[0]],
    shape,
    trim: [[[width - bw.right, 0], [width - bw.right, height]], [[0, height - bw.bottom], [width, height - bw.bottom]]]
  }


  shape = style['corner-bottom-left-shape'];
  offset = offset_for_curvature(shape);
  radius = style['border-bottom-left-radius'];

  params['bottom-left'] = {
    outer: [radius[0], height, 0, height - radius[1]],
    inner: [-bw.bottom * offset[1], -bw.bottom * offset[0], bw.left * offset[0], bw.left * offset[1]],
    shape,
    trim: [[[0, height - bw.bottom], [width, height - bw.bottom]], [[bw.left, 0], [bw.left, height]]]
  }

  shape = style['corner-top-left-shape'];
  offset = offset_for_curvature(shape);
  radius = style['border-top-left-radius'];

  params['top-left'] = {
    outer: [0, radius[1], radius[0], 0],
    inner: [bw.left * offset[0], -bw.left * offset[1], -bw.top * offset[1], bw.top * offset[0]],
    shape,
    trim: [[[bw.left, 0], [bw.left, height]], [[0, bw.top], [width, bw.top]]]
  }

  function draw_outer_corner(corner) {
    const {outer, shape} = params[corner];
    add_corner(ctx, ...outer, shape);
  }

  function inner_rect(corner) {
    const {outer, inner} = params[corner];
    return outer.map((d, i) => d + inner[i]);
  }

  function draw_inner_corner(corner) {
    const {shape, trim} = params[corner];
    add_corner(ctx, ...inner_rect(corner), shape, ...trim);
  }

  function superellipse([ax, ay, bx, by], k) {
    const {x, y} = se(k);
    console.log(x, y)
    console.log([ax + (bx - ax) * x, ay + (by - ay) * y])
    return [ax + (bx - ax) * x, ay + (by - ay) * (1 - y)];
  }

  ctx.moveTo(...params['top-right'].outer.slice(0, 2));

  draw_outer_corner('top-right');
  draw_outer_corner('bottom-right');
  draw_outer_corner('bottom-left');
  draw_outer_corner('top-left');
  ctx.moveTo(width /2, bw.top);
  draw_inner_corner('top-right');
  draw_inner_corner('bottom-right');
  draw_inner_corner('bottom-left');
  draw_inner_corner('top-left');

  ctx.closePath();
  ctx.fill("evenodd");
  /*
  ctx.beginPath();
  ctx.moveTo(0, 0);

  shape = params['top-left'].shape;
  let {outer} = params['top-left']
  let inner = inner_rect('top-left');
  outer = [outer[0], outer[2], outer[1], outer[3]];
  inner = [inner[0], inner[2], inner[1], inner[3]];
  let sec = se(1/shape);
  ctx.lineTo(...superellipse(outer, shape));
  ctx.lineTo(...superellipse(inner, shape));
  ctx.lineTo(inner[2], inner[1] + sec.y * (inner[1] - inner[3]));
  ctx.lineTo(inner[2], bw.top);

  shape = params['top-right'].shape;
  outer = params['top-right'].outer;
  inner = inner_rect('top-right');
  sec = se(1/shape);
  ctx.lineTo(inner[0], bw.top);
  ctx.lineTo(inner[0], inner[3]);
  ctx.lineTo(...superellipse(inner, shape));
  ctx.lineTo(...superellipse(outer, shape));
  ctx.lineTo(width, 0);
  ctx.closePath();
  ctx.fillStyle = style['border-top-color'];
  ctx.fill();

  shape = params['bottom-right'].shape;
  outer = params['bottom-right'].outer;
  inner = inner_rect('bottom-right');
  sec = se(1/shape);
  ctx.beginPath();
  ctx.moveTo(width, height);
  ctx.lineTo(...superellipse(outer, shape));
  ctx.lineTo(...superellipse(inner, shape));
  ctx.lineTo(inner[2], inner[1] + sec.y * (inner[1] - inner[3]));
  ctx.lineTo(inner[2], height - bw.bottom);
  ctx.closePath();
  ctx.fillStyle = style['border-right-color'];
  ctx.fill();
  /*
  ctx.beginPath();
  ctx.moveTo(width, 0);
  ctx.lineTo(width - style['border-top-right-radius'][0] - style['border-right-width'], style['border-top-right-radius'][1] + style['border-top-width']);
  ctx.lineTo(width - style['border-right-width'], height / 2);
  ctx.lineTo(width - style['border-bottom-right-radius'][0] - style['border-right-width'], height - style['border-bottom-width'] - style['border-bottom-right-radius'][1]);
  ctx.lineTo(width, height);
  ctx.fillStyle = style['border-right-color'];
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(width, height);
  ctx.lineTo(width - style['border-bottom-right-radius'][0] - style['border-right-width'], height - style['border-bottom-width'] - style['border-bottom-right-radius'][1]);
  ctx.lineTo(width / 2, height - style['border-bottom-width']);
  ctx.lineTo(style['border-bottom-left-radius'][0] + style['border-left-width'], height - style['border-bottom-left-radius'][1] - style['border-bottom-width']);
  ctx.lineTo(0, height);
  ctx.fillStyle = style['border-bottom-color'];
  ctx.fill();
  ctx.beginPath();
  ctx.moveTo(0, height);
  ctx.lineTo(style['border-bottom-left-radius'][0] + style['border-left-width'], height - style['border-bottom-left-radius'][1] - style['border-bottom-width']);
  ctx.lineTo(style['border-left-width'], height / 2);
  ctx.lineTo(style['border-top-left-radius'][0] + style['border-left-width'], style['border-top-left-radius'][1] + style['border-top-width']);
  ctx.lineTo(0, 0);
  ctx.fillStyle = style['border-left-color'];
  ctx.fill();
*/
}
