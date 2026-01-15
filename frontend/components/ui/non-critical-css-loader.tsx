"use client";

import React from 'react';

export function NonCriticalCssLoader() {
    React.useEffect(() => {
        const link = document.querySelector('link[href="/styles/non-critical.css"][media="print"]') as HTMLLinkElement;
        if (link && link.sheet) {
            link.media = 'all';
        }
    }, []);

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
