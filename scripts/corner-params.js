import {
    offset_for_curvature,
    se
} from "./corner-math.js";
export function resolve_corner_params(style, width, height) {
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
        const shape = style[`corner-${corner}-shape`];
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
                k = 1 / k;
            }
            const {
                x,
                y
            } = se(k);
            return [x0 + x * (x1 - x0), y0 + (1 - y) * (y1 - y0)]
        }

        const outer_center = superellipse_center(outer, shape);
        const inner_center = superellipse_center(inner_rect, shape);
        return [corner, {
            outer_rect: outer,
            inner_rect,
            inset,
            shape,
            inner_offset: inner,
            outer_center,
            inner_center,
            trim
        }];
    }));
}