import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { Tabs } from "./Tabs";

const tabs = [
  { id: "history", label: "History" },
  { id: "add", label: "Add" },
];

describe("Tabs", () => {
  it("marks the active tab via aria-selected", () => {
    render(<Tabs tabs={tabs} active="history" onChange={() => {}} />);
    expect(screen.getByRole("tab", { name: "History" }).getAttribute("aria-selected")).toBe("true");
    expect(screen.getByRole("tab", { name: "Add" }).getAttribute("aria-selected")).toBe("false");
  });

  it("calls onChange with the tab id", () => {
    const onChange = vi.fn();
    render(<Tabs tabs={tabs} active="history" onChange={onChange} />);
    fireEvent.click(screen.getByRole("tab", { name: "Add" }));
    expect(onChange).toHaveBeenCalledWith("add");
  });
});
