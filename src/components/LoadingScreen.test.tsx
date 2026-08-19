import { describe, it, expect } from "vitest";
import { render, screen } from "@testing-library/react";
import { LoadingScreen } from "./LoadingScreen";

describe("LoadingScreen", () => {
  it("renders a status region with the brand name", () => {
    render(<LoadingScreen />);
    expect(screen.getByRole("status")).toBeTruthy();
    expect(screen.getByText("ETF Portfolio Tracker")).toBeTruthy();
  });

  it("shows the provided label", () => {
    render(<LoadingScreen label="Loading portfolio..." />);
    expect(screen.getByText("Loading portfolio...")).toBeTruthy();
  });
});
