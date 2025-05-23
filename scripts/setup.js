import {render} from "./corner-shape.js";
function fix_style(style, w, h) {
  ["top", "bottom"].forEach((vSide) =>
    ["left", "right"].forEach((hSide) => {
      let shape =
        style[`corner-${vSide}-${hSide}-shape`] ||
        style["corner-shape"] ||
        "round";
      const match = shape.match(/superellipse\((\.?[0-9]+(.[0-9]+)?)\)/);
      shape = match ? +match[1] : keywords[shape];
      const hWidth = style[`border-${hSide}-width`] ?? style["border-width"];
      const vWidth = style[`border-${vSide}-width`] ?? style["border-width"];
      let radius =
        style[`border-${vSide}-${hSide}-radius`] ?? style["border-radius"];
      if (!Array.isArray(radius)) radius = [radius, radius];
      if (shape > 1000) shape = 1000;
      if (String(radius[0]).endsWith("%"))
        radius[0] = (parseFloat(radius[0]) * w) / 100;
      if (String(radius[1]).endsWith("%"))
        radius[1] = (parseFloat(radius[1]) * h) / 100;
      style[`corner-${vSide}-${hSide}-shape`] = shape;
      style[`border-${vSide}-${hSide}-radius`] = radius;
      style[`border-${hSide}-width`] = hWidth;
      style[`border-${vSide}-width`] = vWidth;
      if (style['shadow-offset-width'] || style['shadow-offset-height'] || style['shadow-spread']) {
        style.shadow = {
          offset: [style['shadow-offset-width'], style['shadow-offset-height']],
          spread: style['shadow-spread'],
          blur: style['shadow-blur'],
          color: style['shadow-color']
        }
      }
    })
  );
}

function render_corner_shape_with_canvas(do_save) {
    const formData = new FormData(document.forms.form);
    const style = Object.fromEntries(
      Array.from(formData).map(([k, v]) => [k, parseFloat(v)])
    );
    for (const side of ["top", "right", "bottom", "left"])
      style[`border-${side}-color`] =
        document.forms.form.elements[`border-${side}-color`].value;
    style['shadow-color'] = document.forms.form.elements[`shadow-color`].value;
    style['mode'] = document.forms.form.elements['mode'].value;
    if (do_save) {
      const asParams = new URLSearchParams(Object.entries(style));
      history.pushState(null, null, "?" + asParams.toString())
    }
    ref.width = style.width;
    ref.height = style.height;
    const ctx = document.getElementById("ref").getContext("2d");
    for (const corner of [
      "top-left",
      "top-right",
      "bottom-right",
      "bottom-left"
    ]) {
      let v = style[`corner-${corner}-shape`];
      let flip = v < 50;
      if (flip)
        v = 100 -v;
      let k =
        v === 0 ? 0 : v === 100 ? 1000 : Math.log(0.5) / Math.log(v / 100);
      if (flip)
        k = 1 / k;
      style[`corner-${corner}-shape`] = `superellipse(${k})`;
      style[`border-${corner}-radius`] = `${style[`border-${corner}-radius`]}%`;
    }

    fix_style(style, ref.width, ref.height);
    render(style, ctx, ref.width, ref.height);
  }

  function borderSlider(side) {
    const template = document.getElementById("side-template");
    const fragment = template.content.cloneNode(true);
    fragment.querySelectorAll("input").forEach(input => {
      input.name = `border-${side}-${input.name}`;
    });
    document.querySelector("fieldset." + side).append(fragment);
  }

  function cornerSlider(corner) {
  const template = document.getElementById("corner-template");
  const fragment = template.content.cloneNode(true);
  fragment.querySelector("input[name=shape]").name = `corner-${corner}-shape`;
  fragment.querySelector("input[name=radius]").name = `border-${corner}-radius`;
  document.querySelector("fieldset." + corner).append(fragment);
}

for (const h of ["left", "right"]) {
  borderSlider(h);
  for (const v of ["top", "bottom"]) {
    cornerSlider(`${v}-${h}`);
  }
}
for (const v of ["top", "bottom"]) {
  borderSlider(v);
}

for (const [k, v] of new URLSearchParams(location.search).entries()) {
    document.forms.form.elements[k].value = v;
}

render_corner_shape_with_canvas();
form.onchange = () => {
  render_corner_shape_with_canvas(true);
};

form.oninput = () => {
  render_corner_shape_with_canvas();
};
