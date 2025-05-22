export interface UseWindowDimensionProps {
  /** Delay in milliseconds before the resize event is triggered */
  resizeDelay?: number;
  /** Delay in milliseconds before the scroll event is triggered */
  scrollDelay?: number;
  /** Callback to be called when the window is resized */
  onResize?: (dimensions: UseWindowDimensionsResult) => void;
  /** Callback to be called when the window is scrolled */
  onScroll?: (dimensions: UseWindowDimensionsResult) => void;
}

export interface UseWindowDimensionsResult {
  /** The width of the window */
  windowWidth: number;
  /** The height of the window */
  windowHeight: number;
  /** The horizontal scroll position */
  scrollWidth: number;
  /** The vertical scroll position */
  scrollHeight: number;
}
