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
  const params = {
    'top-right': {
      outer: [width - style['border-top-right-radius'][0], 0, width, style['border-top-right-radius'][1]],
      sw: [style['border-top-width'], style['border-right-width']],
      shape: style['corner-top-right-shape'],
    },

    'bottom-right': {
      outer: [width, height - style['border-bottom-right-radius'][1], width - style['border-bottom-right-radius'][0], height],
      sw: [style['border-right-width'], style['border-bottom-width']],
      shape: style['corner-bottom-right-shape'],
    },

    'bottom-left': {
      outer: [style['border-bottom-left-radius'][0], height, 0, height - style['border-bottom-left-radius'][1]],
      sw: [style['border-bottom-width'], style['border-left-width']],
      shape: style['corner-bottom-left-shape'],
    },

    'top-left': {
      outer: [0, style['border-top-left-radius'][1], style['border-top-left-radius'][0], 0],
      sw: [style['border-left-width'], style['border-top-width']],
      shape: style['corner-top-left-shape'],
    }
  };

  function draw_outer_corner(corner) {
    const {outer, shape} = params[corner];
    add_corner(ctx, ...outer, shape);
  }

  function tl_first(inner) {
    return Math.sign(inner[0]) === Math.sign(inner[1])
  }

  function calc_inner(outer, [sw1, sw2]) {
    const s1 = Math.sign(outer[2] - outer[0]);
    const s2 = Math.sign(outer[3] - outer[1]);
    return [
      s1 * sw1, s2 * sw1, -s1 * sw2, -s2 * sw2
    ];
  }

  function inner_rect(corner) {
    const {outer, shape, sw} = params[corner];
    const inner = calc_inner(outer, sw);
    const offset = offset_for_curvature(shape);
    if (tl_first(inner)) {
      const s = offset[1];
      offset[1] = offset[0];
      offset[0] = s;
    }

    return [
      outer[0] + inner[0] * offset[0],
      outer[1] + inner[1] * offset[1],
      outer[2] + inner[2] * offset[1],
      outer[3] + inner[3] * offset[0],
    ]
  }

  function superellipse_center([x0, y0, x1, y1], k) {
    const {x, y} = se(1/k);
    return [x0 + x * (x1 - x0), y0 + (1-y) * (y1 - y0)]
  }

  function draw_inner_corner(corner) {
    const {shape, outer, sw} = params[corner];
    const inner = calc_inner(outer, sw);
    const trim = tl_first(inner) ?
      [[[0, outer[1] + inner[1]], [width, outer[1] + inner[1]]], [[outer[2] + inner[2], 0], [outer[2] + inner[2], height]]] :
      [[[outer[0] + inner[0], 0], [outer[0] + inner[0], width]], [[0, outer[3] + inner[3]], [width, outer[3] + inner[3]]]];

    add_corner(ctx, ...inner_rect(corner), shape, ...trim);
  }

  ctx.moveTo(...params['top-right'].outer.slice(0, 2));

  draw_outer_corner('top-right');
  draw_outer_corner('bottom-right');
  draw_outer_corner('bottom-left');
  draw_outer_corner('top-left');
  ctx.moveTo(width /2, style['border-top-width']);
  draw_inner_corner('top-right');
  draw_inner_corner('bottom-right');
  draw_inner_corner('bottom-left');
  draw_inner_corner('top-left');

  ctx.closePath();
  ctx.clip("evenodd");
  ctx.beginPath();

  {
    let {outer, sw, shape} = params["top-left"];
    const inner = inner_rect('top-left');
    ctx.moveTo(0, 0);
    ctx.lineTo(...superellipse_center(outer, shape))
    ctx.lineTo(...superellipse_center(inner, shape))
    ctx.lineTo(inner[2], inner[1]);
    ctx.lineTo(inner[2], sw[1]);
  }

  {
    let {outer, sw, shape} = params["top-right"];
    const inner = inner_rect('top-right');
    ctx.lineTo(inner[0], sw[0]);
    ctx.lineTo(inner[0], inner[3]);
    ctx.lineTo(...superellipse_center(inner, shape))
    ctx.lineTo(...superellipse_center(outer, shape))
    ctx.lineTo(width, 0);
    ctx.fillStyle = style['border-top-color'];
    ctx.fill("nonzero");

    ctx.beginPath();
    ctx.lineTo(width, 0);
    ctx.lineTo(...superellipse_center(outer, shape))
    ctx.lineTo(...superellipse_center(inner, shape))
    ctx.lineTo(inner[0], inner[3]);
    ctx.lineTo(width - sw[1], inner[3]);
  }

  {
    let {outer, sw, shape} = params["bottom-right"];
    const inner = inner_rect('bottom-right');
    ctx.lineTo(width - sw[0], inner[1]);
    ctx.lineTo(inner[2], inner[1]);
    ctx.lineTo(...superellipse_center(inner, shape))
    ctx.lineTo(...superellipse_center(outer, shape))
    ctx.lineTo(width, height);

    ctx.closePath();
    ctx.fillStyle = style['border-right-color'];
    ctx.fill("nonzero");

    ctx.beginPath();
    ctx.lineTo(width, height);
    ctx.lineTo(...superellipse_center(outer, shape))
    ctx.lineTo(...superellipse_center(inner, shape))
    ctx.lineTo(inner[2], inner[1]);
  }


  {
    let {outer, sw, shape} = params["bottom-left"];
    const inner = inner_rect('bottom-left');
    ctx.lineTo(inner[0], height - sw[0]);
    ctx.lineTo(inner[0], inner[3]);
    ctx.lineTo(...superellipse_center(inner, shape))
    ctx.lineTo(...superellipse_center(outer, shape))
    ctx.lineTo(0, height);

    ctx.closePath();
    ctx.fillStyle = style['border-bottom-color'];
    ctx.fill("nonzero");

    ctx.beginPath();

    ctx.lineTo(0, height);
    ctx.lineTo(...superellipse_center(outer, shape))
    ctx.lineTo(...superellipse_center(inner, shape))
    ctx.lineTo(inner[0], inner[3]);
  }

  {
    let {outer, sw, shape} = params["top-left"];
    const inner = inner_rect('top-left');
    ctx.lineTo(sw[0], inner[1]);
    ctx.lineTo(inner[2], inner[1]);
    ctx.lineTo(...superellipse_center(inner, shape))
    ctx.lineTo(...superellipse_center(outer, shape))
    ctx.lineTo(outer[2], outer[1]);
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = style['border-left-color'];
    ctx.fill("nonzero");
  }

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
