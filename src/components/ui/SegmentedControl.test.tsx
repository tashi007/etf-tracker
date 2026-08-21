import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { SegmentedControl } from "./SegmentedControl";

describe("SegmentedControl", () => {
  it("renders all options and marks the active one", () => {
    render(
      <SegmentedControl
        value="1Y"
        onChange={() => {}}
        options={[
          { value: "1M", label: "1M" },
          { value: "1Y", label: "1Y" },
        ]}
      />,
    );
    const active = screen.getByRole("button", { name: "1Y" });
    const inactive = screen.getByRole("button", { name: "1M" });
    expect(active.getAttribute("aria-pressed")).toBe("true");
    expect(inactive.getAttribute("aria-pressed")).toBe("false");
  });

  it("calls onChange with the clicked value", () => {
    const onChange = vi.fn();
    render(
      <SegmentedControl
        value="1M"
        onChange={onChange}
        options={[
          { value: "1M", label: "1M" },
          { value: "ITD", label: "ITD" },
        ]}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "ITD" }));
    expect(onChange).toHaveBeenCalledWith("ITD");
  });
});
