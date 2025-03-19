function radius_factor_for_curvature(curvature) {
    return Math.pow(2, Math.min(Math.max( curvature, 0.5), 2) - 0.5);
}

function compute_inner_curvature(curvature, outer_length, inner_length) {
    if (curvature === 0)
        return 0;
    if (curvature < 1)
        return 1 / compute_inner_curvature(1 / curvature, outer_length, inner_length);
    return Math.log(0.5) / Math.log((Math.pow(0.5, 1/curvature) * outer_length + (inner_length - outer_length) / Math.SQRT2) / inner_length)
}

export function resolve_corner_params(style, width, height, spread = null) {
    const params = {
        'top-right': {
            outer: [width - style['border-top-right-radius'][0], 0, width, style['border-top-right-radius'][1]],
            inner: [-style['border-top-width'], 0, 0, style['border-right-width']]
        },

        'bottom-right': {
            outer: [width, height - style['border-bottom-right-radius'][1], width - style['border-bottom-right-radius'][0], height],
            inner: [0, -style['border-right-width'], -style['border-bottom-width'], 0]
        },

        'bottom-left': {
            outer: [style['border-bottom-left-radius'][0], height, 0, height - style['border-bottom-left-radius'][1]],
            inner: [style['border-bottom-width'], 0, 0, -style['border-left-width']],
        },

        'top-left': {
            outer: [0, style['border-top-left-radius'][1], style['border-top-left-radius'][0], 0],
            inner: [0, style['border-left-width'], style['border-top-width'], 0],
        }
    };

    return Object.fromEntries(Object.entries(params).map(([corner, {
        outer,
        inner
    }]) => {
        if (spread)
            inner = [spread, spread, spread, spread];
        const shape = style[`corner-${corner}-shape`];
        let inner_shape = shape;
        if (shape > 1) {
            inner = corner === 'top-right' || corner === 'bottom-left' ?
                 [-inner[1], -inner[0], -inner[3], -inner[2]] : [inner[1], inner[0], inner[3], inner[2]];
        }
        const inner_rect = outer.map((p, i) => p + radius_factor_for_curvature(shape > 1 ? 1 / shape : shape) * inner[i]);
        if (shape > 2 || shape < 0.5) {
            const outer_length = Math.hypot(outer[2] - outer[0], outer[3] - outer[1]);
            const inner_length = Math.hypot(inner_rect[2] - inner_rect[0], inner_rect[3] - inner_rect[1])
            inner_shape = compute_inner_curvature(shape, outer_length, inner_length);
        }

        return [corner, {
            outer_rect: outer,
            shape,
            inner_shape,
            inner_rect,
        }];
    }));
}