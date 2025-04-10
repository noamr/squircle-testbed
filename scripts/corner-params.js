import {
    offset_for_curvature,
    se
} from "./corner-math.js";
export function resolve_corner_params(style, width, height, outset = null) {
    const params = {
        'top-right': {
            outer: [width - style['border-top-right-radius'][0], 0, width, style['border-top-right-radius'][1]],
            inset: [style['border-top-width'], style['border-right-width']],
        },

        'bottom-right': {
            outer: [width, height - style['border-bottom-right-radius'][1], width - style['border-bottom-right-radius'][0], height],
            inset: [style['border-right-width'], style['border-bottom-width']],
        },

        'bottom-left': {
            outer: [style['border-bottom-left-radius'][0], height, 0, height - style['border-bottom-left-radius'][1]],
            inset: [style['border-bottom-width'], style['border-left-width']],
        },

        'top-left': {
            outer: [0, style['border-top-left-radius'][1], style['border-top-left-radius'][0], 0],
            inset: [style['border-left-width'], style['border-top-width']],
        }
    };

    return Object.fromEntries(Object.entries(params).map(([corner, {
        outer,
        inset
    }]) => {
        if (outset !== null)
            inset = [-outset, -outset];
        const shape = style[`corner-${corner}-shape`];
        const s1 = Math.sign(outer[2] - outer[0]);
        const s2 = Math.sign(outer[3] - outer[1]);
        const [sw1, sw2] = inset;
        const inner_offset = [
            s1 * sw1, s2 * sw1, -s1 * sw2, -s2 * sw2
        ];


        const offset = offset_for_curvature(shape);
        if (Math.sign(inner_offset[0]) === Math.sign(inner_offset[1])) {
            offset.reverse();
        }

        const inner_rect = [
            outer[0] + inner_offset[0] * offset[0],
            outer[1] + inner_offset[1] * offset[1],
            outer[2] + inner_offset[2] * offset[1],
            outer[3] + inner_offset[3] * offset[0],
        ]

        return [corner, {
            outer_rect: outer,
            shape,
            inset,
            inner_rect,
            inner_offset,
        }];
    }));
}