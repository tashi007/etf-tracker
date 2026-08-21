import { describe, expect, it } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { InfoPopover } from "./InfoPopover";

describe("InfoPopover", () => {
  it("opens on click and exposes the text", () => {
    render(<InfoPopover text="Explains the card." />);
    const btn = screen.getByRole("button", { name: "About this card" });
    expect(btn.getAttribute("aria-expanded")).toBe("false");
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    expect(
      screen.getByText("Explains the card.").classList.contains("hidden"),
    ).toBe(false);
  });

  it("closes on Escape", () => {
    render(<InfoPopover text="Notes" />);
    fireEvent.click(screen.getByRole("button", { name: "About this card" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(
      screen
        .getByRole("button", { name: "About this card" })
        .getAttribute("aria-expanded"),
    ).toBe("false");
  });

  it("closes on outside mousedown", () => {
    render(
      <div>
        <div data-testid="outside" />
        <InfoPopover text="Notes" />
      </div>,
    );
    const btn = screen.getByRole("button", { name: "About this card" });
    fireEvent.click(btn);
    expect(btn.getAttribute("aria-expanded")).toBe("true");
    fireEvent(
      screen.getByTestId("outside"),
      new MouseEvent("mousedown", { bubbles: true }),
    );
    expect(btn.getAttribute("aria-expanded")).toBe("false");
  });

  it("does not close when clicking inside", () => {
    render(<InfoPopover text="Notes" />);
    const btn = screen.getByRole("button", { name: "About this card" });
    fireEvent.click(btn);
    fireEvent(btn, new MouseEvent("mousedown", { bubbles: true }));
    expect(btn.getAttribute("aria-expanded")).toBe("true");
  });
});
