import { Temporal } from "@js-temporal/polyfill";
import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import RelativeTime from "./RelativeTime.js";

// Mock the Temporal.Now namespace
vi.mock(
  "@js-temporal/polyfill",
  async (
    importOriginal: () => Promise<typeof import("@js-temporal/polyfill")>,
  ) => {
    const actual = await importOriginal();
    return {
      ...actual,
      Temporal: {
        ...actual.Temporal,
        Now: {
          instant: vi.fn(),
          timeZoneId: vi.fn().mockReturnValue("UTC"),
        },
      },
    };
  },
);

describe("RelativeTime", () => {
  let mockNow: Temporal.Instant;

  beforeEach(() => {
    // Create a fixed "now" time for testing
    mockNow = Temporal.Instant.from("2023-01-01T12:00:00Z");
    vi.spyOn(Temporal.Now, "instant").mockReturnValue(mockNow);

    // Mock setInterval and clearInterval
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it("renders with default props", () => {
    const futureTime = mockNow.add({ minutes: 30 });
    render(<RelativeTime time={futureTime} />);

    expect(screen.getByText("in 30 minutes")).toBeInTheDocument();
    expect(screen.getByRole("time")).toHaveClass("ds relative-time");
  });

  it("applies custom className and style", () => {
    const futureTime = mockNow.add({ hours: 1 });
    render(
      <RelativeTime
        time={futureTime}
        className="custom-class"
        style={{ color: "#000" }}
        id="time-id"
      />,
    );

    const timeElement = screen.getByRole("time");
    expect(timeElement).toHaveClass("ds relative-time");
    expect(timeElement).toHaveClass("custom-class");
    expect(timeElement).toHaveStyle({ color: "#000" });
    expect(timeElement).toHaveAttribute("id", "time-id");
  });

  it("handles Date object input", () => {
    const dateObj = new Date(mockNow.epochMilliseconds + 3600000); // 1 hour in the future
    render(<RelativeTime time={dateObj} />);

    expect(screen.getByText("in 1 hour")).toBeInTheDocument();
  });

  it("handles ISO string input", () => {
    const isoString = mockNow.subtract({ hours: 48 }).toString(); // 2 days ago
    render(<RelativeTime time={isoString} />);

    expect(screen.getByText("2 days ago")).toBeInTheDocument();
  });

  it('shows "now" for times within nowThreshold', () => {
    const almostNow = mockNow.add({ seconds: 5 });
    render(<RelativeTime time={almostNow} nowThreshold={10} />);

    expect(screen.getByText("now")).toBeInTheDocument();
  });

  it("handles invalid date input", () => {
    // Suppress the expected console error
    const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {});
    const invalideDateKeyword = "Invalid date";

    render(
      <RelativeTime
        time="invalid-date-string"
        invalidDateKeyword={invalideDateKeyword}
      />,
    );

    expect(screen.getByText(invalideDateKeyword)).toBeInTheDocument();
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });

  it("uses custom relativeTimeFormat if provided", () => {
    const pastTime = mockNow.subtract({ minutes: 5 });
    const customFormatter = new Intl.RelativeTimeFormat("en", {
      numeric: "always",
      style: "long",
    });

    render(
      <RelativeTime time={pastTime} relativeTimeFormat={customFormatter} />,
    );

    expect(screen.getByText("5 minutes ago")).toBeInTheDocument();
  });

  it("updates the time when updateLive is true", () => {
    const initialTime = mockNow.add({ seconds: 30 });
    render(<RelativeTime time={initialTime} />);

    expect(screen.getByText("in 30 seconds")).toBeInTheDocument();

    // Advance time by 20 seconds
    act(() => {
      vi.spyOn(Temporal.Now, "instant").mockReturnValue(
        mockNow.add({ seconds: 20 }),
      );
      vi.advanceTimersByTime(1000); // Trigger the interval
    });

    expect(screen.getByText("in 10 seconds")).toBeInTheDocument();
  });

  it("does not update the time when updateLive is false", () => {
    const initialTime = mockNow.add({ seconds: 30 });
    render(<RelativeTime time={initialTime} disableLiveUpdate />);

    expect(screen.getByText("in 30 seconds")).toBeInTheDocument();

    // Advance time by 20 seconds
    act(() => {
      vi.spyOn(Temporal.Now, "instant").mockReturnValue(
        mockNow.add({ seconds: 20 }),
      );
      vi.advanceTimersByTime(1000); // Try to trigger the interval
    });

    // Should still show the initial value
    expect(screen.getByText("in 30 seconds")).toBeInTheDocument();
  });

  it("chooses optimal update interval based on time difference", () => {
    const setIntervalSpy = vi.spyOn(window, "setInterval");

    // Test with time less than a minute away
    render(<RelativeTime time={mockNow.add({ seconds: 30 })} />);
    expect(setIntervalSpy).toHaveBeenLastCalledWith(expect.any(Function), 1000);

    setIntervalSpy.mockClear();

    // Test with time less than an hour away
    render(<RelativeTime time={mockNow.add({ minutes: 30 })} />);
    expect(setIntervalSpy).toHaveBeenLastCalledWith(
      expect.any(Function),
      60000,
    );

    setIntervalSpy.mockClear();

    // Test with time less than a day away
    render(<RelativeTime time={mockNow.add({ hours: 12 })} />);
    expect(setIntervalSpy).toHaveBeenLastCalledWith(
      expect.any(Function),
      3600000,
    );

    setIntervalSpy.mockClear();

    // Test with time more than a day away
    render(<RelativeTime time={mockNow.add({ hours: 48 })} />);
    expect(setIntervalSpy).toHaveBeenLastCalledWith(
      expect.any(Function),
      86400000,
    );
  });

  it("clears interval on unmount", () => {
    const clearIntervalSpy = vi.spyOn(window, "clearInterval");

    const { unmount } = render(
      <RelativeTime time={mockNow.add({ minutes: 5 })} />,
    );
    unmount();

    expect(clearIntervalSpy).toHaveBeenCalled();
  });
});
