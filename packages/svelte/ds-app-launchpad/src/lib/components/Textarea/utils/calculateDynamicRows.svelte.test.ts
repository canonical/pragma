import { describe, expect, it } from "vitest";
import { calculateDynamicRows } from "./calculateDynamicRows.js";

describe("Textarea > calculateDynamicRows", () => {
  describe("Basic functionality", () => {
    it("returns default rows when content has fewer lines", () => {
      const text = "Single line content";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(3);
    });

    it("returns default rows when content has exactly default rows", () => {
      const text = "Line 1\nLine 2\nLine 3";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(3);
    });

    it("returns actual line count when between default and max rows", () => {
      const text = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(5);
    });

    it("returns max rows when content exceeds max rows", () => {
      const text =
        "Line 1\nLine 2\nLine 3\nLine 4\nLine 5\nLine 6\nLine 7\nLine 8\nLine 9\nLine 10\nLine 11";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(10);
    });
  });

  describe("Edge cases", () => {
    it("handles empty textarea", () => {
      const text = "";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(3);
    });

    it("handles single line content", () => {
      const text = "Just one line";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(3);
    });

    it("handles content with only newlines", () => {
      const text = "\n\n\n";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(4); // 4 lines: empty, empty, empty, empty
    });

    it("handles very long single line with no newlines", () => {
      const text =
        "This is a very long line with no newlines that should still be counted as one line";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(3);
    });

    it("handles content exactly at max rows", () => {
      const text = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
      const result = calculateDynamicRows(text, 3, 5);
      expect(result).toBe(5);
    });
  });

  describe("Swapped min/max", () => {
    it("swaps min and max when max is smaller than min", () => {
      const text = "Line 1\nLine 2\nLine 3\nLine 4";
      // args swapped: min=10, max=3 → effective min=3, max=10
      // 4 lines is between 3 and 10, so returns 4
      const result = calculateDynamicRows(text, 10, 3);
      expect(result).toBe(4);
    });

    it("returns effective min when content is short and args are swapped", () => {
      const text = "Line 1";
      const result = calculateDynamicRows(text, 5, 2);
      expect(result).toBe(2);
    });

    it("grows between effective min and max when args are swapped", () => {
      const text = "Line 1\nLine 2\nLine 3\nLine 4";
      const result = calculateDynamicRows(text, 8, 3);
      expect(result).toBe(4);
    });
  });

  describe("Boundary conditions", () => {
    it("handles when default rows equals max rows", () => {
      const text = "Line 1\nLine 2\nLine 3\nLine 4";
      const result = calculateDynamicRows(text, 3, 3);
      expect(result).toBe(3);
    });

    it("handles when content lines equal default rows", () => {
      const text = "Line 1\nLine 2\nLine 3";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(3);
    });

    it("handles when content lines equal max rows", () => {
      const text = "Line 1\nLine 2\nLine 3\nLine 4\nLine 5";
      const result = calculateDynamicRows(text, 3, 5);
      expect(result).toBe(5);
    });
  });

  describe("Special content scenarios", () => {
    it("handles content with trailing newline", () => {
      const text = "Line 1\nLine 2\nLine 3\n";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(4); // 4 lines including the trailing empty line
    });

    it("handles content with leading newline", () => {
      const text = "\nLine 1\nLine 2\nLine 3";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(4); // 4 lines including the leading empty line
    });

    it("handles content with multiple consecutive newlines", () => {
      const text = "Line 1\n\n\nLine 4";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(4); // 4 lines: Line 1, empty, empty, Line 4
    });

    it("handles mixed line lengths", () => {
      const text =
        "Short\nThis is a much longer line that might wrap\nAnother short line";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(3);
    });

    it("handles content with special characters", () => {
      const text =
        "Line with special chars: !@#$%^&*()\nLine with unicode: 🚀\nNormal line";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(3);
    });
  });

  describe("Performance and limits", () => {
    it("handles large content efficiently", () => {
      // Create content with many lines but within maxRows
      const lines = Array(8)
        .fill(0)
        .map((_, i) => `Line ${i + 1}`);
      const text = lines.join("\n");
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(8);
    });

    it("stops counting at maxRows limit for very large content", () => {
      // Create content with more lines than maxRows
      const lines = Array(15)
        .fill(0)
        .map((_, i) => `Line ${i + 1}`);
      const text = lines.join("\n");
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(10);
    });
  });

  describe("Real-world scenarios", () => {
    it("handles markdown content with headers and lists", () => {
      const text =
        "# Header\n\n- Item 1\n- Item 2\n\n## Subheader\n\nSome text";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(8);
    });

    it("handles mixed content with empty lines", () => {
      const text = "First paragraph\n\nSecond paragraph\n\n\nThird paragraph";
      const result = calculateDynamicRows(text, 3, 10);
      expect(result).toBe(6);
    });
  });
});
