import {se, control_points_for_superellipse, offset_for_curvature} from "./corner-math.js";
const keywords = {
  round: 2,
  notch: 0,
  squircle: 4,
  bevel: 1,
  scoop: 0.5,
  straight: 100
};

/**
 *
 * @param {RectStyle} style
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} width
 * @param {number} height
 */
export function render(style, ctx, width, height) {
  const outer_width = ["top", "bottom"].flatMap((vSide) =>
    ["left", "right"].map((hSide) => {
      const corner = `${vSide}-${hSide}`;
      const curvature = style[`corner-${corner}-shape`];
      const [rx, ry] = style[`border-${corner}-radius`];
      const hWidth = style[`border-${hSide}-width`];
      const vWidth = style[`border-${vSide}-width`];
      const offset = offset_for_curvature(curvature);
      return [rx - vWidth * offset, ry - hWidth * offset];
    })
  );

  let cursor = [];
  function lineTo(x, y) {
    ctx.lineTo(x, y);
    cursor = [x, y];
  }
  function moveTo(x, y) {
    ctx.moveTo(x, y);
    cursor = [x, y];
  }

  function cornerTo(x, y, corner, phase = "inner") {
    if (x == cursor[0] && y === cursor[1]) return;
    let curvature = style[`corner-${corner}-shape`];

    let [a1, a2, a3, b1, b2, b3] = control_points_for_superellipse(
      curvature,
      cursor,
      [x, y],
      corner
    );

    ctx.bezierCurveTo(...a1, ...a2, ...a3);
    ctx.bezierCurveTo(...b1, ...b2, ...b3);
    cursor = [x, y];
  }

  ctx.fillStyle = "white";
  ctx.fillRect(0, 0, width, height);
  ctx.fillStyle = "black";
  ctx.beginPath();
  moveTo(width - outer_width[1][0], 0);
  cornerTo(width, outer_width[1][1], "top-right", "outer");
  lineTo(width, height - outer_width[3][1]);
  cornerTo(width - outer_width[3][0], height, "bottom-right", "outer");
  lineTo(outer_width[2][0], height);
  cornerTo(0, height - outer_width[2][1], "bottom-left", "outer");
  lineTo(0, outer_width[0][1]);
  cornerTo(outer_width[0][0], 0, "top-left", "outer");
  lineTo(width - outer_width[1][0], 0);

  // Draw inner path
  ctx.moveTo(
    Math.max(style["border-top-left-radius"][0], style["border-left-width"]),
    style["border-top-width"]
  );

  lineTo(
    width - style["border-top-right-radius"][0],
    style["border-top-width"]
  );
  cornerTo(
    width - style["border-right-width"],
    Math.max(style["border-top-width"], style["border-top-right-radius"][1]),
    "top-right"
  );

  lineTo(
    width - style["border-right-width"],
    height -
      Math.max(
        style["border-bottom-width"],
        style["border-bottom-right-radius"][1]
      )
  );

  cornerTo(
    width -
      Math.max(
        style["border-right-width"],
        style["border-bottom-right-radius"][0]
      ),
    height - style["border-bottom-width"],
    "bottom-right"
  );

  lineTo(
    Math.max(style["border-left-width"], style["border-bottom-left-radius"][0]),
    height - style["border-bottom-width"]
  );

  cornerTo(
    style["border-left-width"],
    height -
      Math.max(
        style["border-top-width"],
        style["border-bottom-left-radius"][1]
      ),
    "bottom-left"
  );

  lineTo(
    style["border-left-width"],
    Math.max(style["border-top-width"], style["border-top-left-radius"][1])
  );
  cornerTo(
    Math.max(style["border-left-width"], style["border-top-left-radius"][0]),
    style["border-top-width"],
    "top-left"
  );
  ctx.fill("evenodd");
}
