"use client";

import React from 'react';

export function NonCriticalCssLoader() {
    return (
        <>
            <link
                rel="stylesheet"
                href="/styles/non-critical.css"
                media="print"
                onLoad={(e) => { e.currentTarget.media = 'all'; }}
            />
            <noscript>
                <link rel="stylesheet" href="/styles/non-critical.css" />
            </noscript>
        </>
    );
}
