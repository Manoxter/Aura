'use client'

import React, { useState } from 'react'

export function SVGPoint({
    x, y, text, color = '#ffffff', r = 6
}: {
    x: number; y: number; text: string; color?: string; r?: number
}) {
    const [visible, setVisible] = useState(false)

    return (
        <g>
            <circle
                cx={x}
                cy={y}
                r={r}
                fill={color}
                className="cursor-pointer transition-all duration-300 hover:scale-125 hover:brightness-125 hover:drop-shadow-lg"
                onMouseEnter={() => setVisible(true)}
                onMouseLeave={() => setVisible(false)}
            />
            {visible && (
                <foreignObject x={x + 10} y={y - 60} width={220} height={140} style={{ pointerEvents: 'none' }}>
                    <div className="bg-gray-800/95 backdrop-blur-sm shadow-xl border border-gray-600 rounded-xl px-3 py-2 animate-in fade-in zoom-in-95 duration-200">
                        <p className="text-gray-200 text-xs whitespace-pre-line font-medium">{text}</p>
                    </div>
                </foreignObject>
            )}
        </g>
    )
}
