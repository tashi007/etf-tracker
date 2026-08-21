import { describe, expect, it, vi } from "vitest";
import { fireEvent, render, screen } from "@testing-library/react";
import { Transaction } from "../types";
import { TransactionList } from "./TransactionList";

const tx: Transaction = {
  id: "t1",
  date: "2026-01-02",
  etf: "VAS",
  type: "BUY",
  units: 10,
  pricePerUnit: 90,
};

function renderList(onDeleted?: () => void) {
  const onDelete = vi.fn();
  render(
    <TransactionList
      transactions={[tx]}
      onDelete={onDelete}
      onDeleted={onDeleted}
    />,
  );
  return onDelete;
}

describe("TransactionList delete confirmation", () => {
  it("opens a confirm dialog instead of deleting immediately", () => {
    const onDelete = renderList();
    fireEvent.click(screen.getByTitle("Delete transaction"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("cancel closes the dialog without deleting", () => {
    const onDelete = renderList();
    fireEvent.click(screen.getByTitle("Delete transaction"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(screen.getByRole("dialog").className).toContain("invisible");
    expect(onDelete).not.toHaveBeenCalled();
  });

  it("confirm deletes the transaction and closes the dialog", () => {
    const onDelete = renderList();
    fireEvent.click(screen.getByTitle("Delete transaction"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDelete).toHaveBeenCalledWith("t1");
    expect(screen.getByRole("dialog").className).toContain("invisible");
  });

  it("notifies onDeleted after confirming", () => {
    const onDeleted = vi.fn();
    renderList(onDeleted);
    fireEvent.click(screen.getByTitle("Delete transaction"));
    fireEvent.click(screen.getByRole("button", { name: "Delete" }));
    expect(onDeleted).toHaveBeenCalledTimes(1);
  });
});
