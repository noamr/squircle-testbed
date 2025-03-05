import {
  offset_for_curvature,
  control_points,
  se
} from "./corner-math.js";
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
  ctx.transform(hor.x, hor.y, ver.x, ver.y, vertex.x, vertex.y);
  const transform = ctx.getTransform().inverse();
  [l1, l2] = [l1, l2].map(p => p ? Object.fromEntries(p.map(
    (p, i) => [`p${i + 1}`, transform.transformPoint(new DOMPoint(p[0], p[1]))])) : null);
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
  const params = {
    'top-right': {
      outer: [width - style['border-top-right-radius'][0], 0, width, style['border-top-right-radius'][1]],
      inset: [style['border-top-width'], style['border-right-width']],
      shape: style['corner-top-right-shape'],
    },

    'bottom-right': {
      outer: [width, height - style['border-bottom-right-radius'][1], width - style['border-bottom-right-radius'][0], height],
      inset: [style['border-right-width'], style['border-bottom-width']],
      shape: style['corner-bottom-right-shape'],
    },

    'bottom-left': {
      outer: [style['border-bottom-left-radius'][0], height, 0, height - style['border-bottom-left-radius'][1]],
      inset: [style['border-bottom-width'], style['border-left-width']],
      shape: style['corner-bottom-left-shape'],
    },

    'top-left': {
      outer: [0, style['border-top-left-radius'][1], style['border-top-left-radius'][0], 0],
      inset: [style['border-left-width'], style['border-top-width']],
      shape: style['corner-top-left-shape'],
    }
  };

  function draw_outer_corner(corner) {
    const {
      outer,
      shape
    } = params[corner];
    add_corner(ctx, ...outer, shape);
  }

  function get_corner(corner) {
    const {outer, inset, shape} = params[corner];
    const s1 = Math.sign(outer[2] - outer[0]);
    const s2 = Math.sign(outer[3] - outer[1]);
    const [sw1, sw2] = inset;
    const inner = [
      s1 * sw1, s2 * sw1, -s1 * sw2, -s2 * sw2
    ];

    const tl_first = Math.sign(inner[0]) === Math.sign(inner[1]);

    const offset = offset_for_curvature(shape);
    if (tl_first) {
      const s = offset[1];
      offset[1] = offset[0];
      offset[0] = s;
    }

    const inner_rect = [
      outer[0] + inner[0] * offset[0],
      outer[1] + inner[1] * offset[1],
      outer[2] + inner[2] * offset[1],
      outer[3] + inner[3] * offset[0],
    ]

    const trim = tl_first ? [
      [
        [0, outer[1] + inner[1]],
        [width, outer[1] + inner[1]]
      ],
      [
        [outer[2] + inner[2], 0],
        [outer[2] + inner[2], height]
      ]
    ] : [
      [
        [outer[0] + inner[0], 0],
        [outer[0] + inner[0], width]
      ],
      [
        [0, outer[3] + inner[3]],
        [width, outer[3] + inner[3]]
      ]
    ];

    function superellipse_center([x0, y0, x1, y1], k) {
      if (Math.sign(x1 - x0) !== Math.sign(y1 - y0))
        k = 1 / k;
      if (k < 1) {
        [x0, y0, x1, y1] = [x1, y1, x0, y0];
        k = 1/k;
      }
      const {x, y} = se(k);
      return [x0 + x * (x1 - x0), y0 + (1 - y) * (y1 - y0)]
    }

    const outer_center = superellipse_center(outer, shape);
    const inner_center = superellipse_center(inner_rect, shape);
    return {
      outer_rect: outer,
      inner_rect,
      inset,
      shape,
      inner_offset: inner,
      outer_center,
      inner_center,
      trim
    }
  }

  function draw_inner_corner(corner) {
    const {
      shape,
      inner_rect,
      trim
    } = get_corner(corner);
    add_corner(ctx, ...inner_rect, shape, ...trim);
  }

  ctx.moveTo(...params['top-right'].outer.slice(0, 2));

  draw_outer_corner('top-right');
  draw_outer_corner('bottom-right');
  draw_outer_corner('bottom-left');
  draw_outer_corner('top-left');
  ctx.moveTo(width / 2, style['border-top-width']);
  draw_inner_corner('top-right');
  draw_inner_corner('bottom-right');
  draw_inner_corner('bottom-left');
  draw_inner_corner('top-left');

  ctx.closePath();
  ctx.clip("evenodd");
  ctx.beginPath();

  {
    let {
      outer_center,
      inner_center,
      inset,
      inner_rect
    } = get_corner("top-left");
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
    } = get_corner("top-right");
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
    } = get_corner("bottom-right");
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
    } = get_corner("bottom-left");
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
    } = get_corner("top-left");
    ctx.lineTo(inset[0], inner_rect[1]);
    ctx.lineTo(inner_rect[2], inner_rect[1]);
    ctx.lineTo(...inner_center)
    ctx.lineTo(...outer_center)
    ctx.lineTo(0, 0);
    ctx.closePath();
    ctx.fillStyle = style['border-left-color'];
    ctx.fill("nonzero");
  }

}