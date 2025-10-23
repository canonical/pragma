/* @canonical/generator-ds 0.10.0-experimental.5 */

import type { HTMLAttributes, ReactNode } from 'react'

/**
    We have used the `HTMLDivElement` as a default props base.
    If your component is based on a different HTML element, please update it accordingly.
    See https://developer.mozilla.org/en-US/docs/Web/API/HTML_DOM_API for a full list of HTML elements interfaces.
*/
export interface AnatomyDemoProps extends HTMLAttributes<HTMLDivElement> {
    /** Child elements */
    children?: ReactNode;
}