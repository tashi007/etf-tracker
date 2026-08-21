import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Modal } from "./Modal";

function setup(open: boolean, onClose = vi.fn()) {
  render(
    <Modal open={open} title="Add Transaction" onClose={onClose}>
      <p>Modal body</p>
    </Modal>,
  );
  return { onClose };
}

describe("Modal", () => {
  it("renders dialog semantics and body when open", () => {
    setup(true);
    const dialog = screen.getByRole("dialog");
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-label")).toBe("Add Transaction");
    expect(screen.getByText("Modal body").classList.contains("hidden")).toBe(
      false,
    );
  });

  it("is inert when closed but stays mounted for fade-out", () => {
    setup(false);
    const dialog = screen.getByRole("dialog");
    expect(dialog.className).toContain("invisible");
    expect(dialog.className).toContain("opacity-0");
    expect(dialog.className).toContain("pointer-events-none");
  });

  it("calls onClose when the backdrop is clicked", () => {
    const { onClose } = setup(true);
    fireEvent.click(screen.getByRole("dialog").firstElementChild as Element);
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose when the close button is clicked", () => {
    const { onClose } = setup(true);
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("calls onClose on Escape while open", () => {
    const { onClose } = setup(true);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
  });

  it("ignores Escape while closed", () => {
    const { onClose } = setup(false);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).not.toHaveBeenCalled();
  });
});
