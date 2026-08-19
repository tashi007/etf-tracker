import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ComponentProps } from "react";
import { TransactionForm } from "./TransactionForm";
import type { EtfConfig, Lot } from "../types";

const etfs: EtfConfig[] = [
  { symbol: "VAS", yahooSymbol: "VAS.AX", name: "Vanguard Aust Index", enabled: true },
  { symbol: "VGS", yahooSymbol: "VGS.AX", name: "Vanguard Intl Index", enabled: true },
];

const lots: Lot[] = [];

type FormProps = ComponentProps<typeof TransactionForm>;

function setup(props: Partial<FormProps> = {}) {
  const onAdd = vi.fn();
  const utils = render(
    <TransactionForm
      onAdd={onAdd}
      currentPrices={{ VAS: 100 }}
      lots={lots}
      etfConfigs={etfs}
      {...props}
    />,
  );
  return { onAdd, ...utils };
}

function priceInput() {
  return screen.getByLabelText("Price per unit ($)") as HTMLInputElement;
}

describe("TransactionForm price per unit", () => {
  it("prefills the price from the current market price", () => {
    setup();
    expect(priceInput().value).toBe("100.00");
  });

  it("keeps a manually typed price when the ETF changes or prices refresh", () => {
    const { rerender } = setup();
    fireEvent.change(priceInput(), { target: { value: "150" } });
    expect(priceInput().value).toBe("150");

    fireEvent.change(screen.getByLabelText("ETF"), { target: { value: "VGS" } });
    expect(priceInput().value).toBe("150");

    rerender(
      <TransactionForm
        onAdd={vi.fn()}
        currentPrices={{ VGS: 220 }}
        lots={lots}
        etfConfigs={etfs}
      />,
    );
    expect(priceInput().value).toBe("150");
  });

  it("restores the market price via the Use market price action", () => {
    setup();
    fireEvent.change(priceInput(), { target: { value: "150" } });
    fireEvent.click(screen.getByText("Use market price"));
    expect(priceInput().value).toBe("100.00");
  });

  it("submits the typed price for a BUY", () => {
    const { onAdd } = setup();
    fireEvent.change(priceInput(), { target: { value: "88.5" } });
    fireEvent.change(screen.getByLabelText("Units"), { target: { value: "20" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Transaction" }));

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ type: "BUY", units: 20, pricePerUnit: 88.5 }),
    );
  });

  it("submits the typed price for a SELL", () => {
    const { onAdd } = setup();
    fireEvent.change(screen.getByLabelText("Type"), { target: { value: "SELL" } });
    fireEvent.change(priceInput(), { target: { value: "140" } });
    fireEvent.click(screen.getByRole("button", { name: "Add Transaction" }));

    expect(onAdd).toHaveBeenCalledWith(
      expect.objectContaining({ type: "SELL", units: 10, pricePerUnit: 140 }),
    );
  });

  it("disables submit when the price is missing or invalid", () => {
    setup({ currentPrices: {} });
    const btn = screen.getByRole("button", { name: "Add Transaction" }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);

    fireEvent.change(priceInput(), { target: { value: "0" } });
    expect(btn.disabled).toBe(true);

    fireEvent.change(priceInput(), { target: { value: "12.3" } });
    expect(btn.disabled).toBe(false);

    fireEvent.change(priceInput(), { target: { value: "" } });
    expect(btn.disabled).toBe(true);
  });

  it("prefills the price from a planner suggestion and resets a manual override", () => {
    const { rerender } = setup();
    fireEvent.change(priceInput(), { target: { value: "150" } });

    rerender(
      <TransactionForm
        onAdd={vi.fn()}
        currentPrices={{ VAS: 100 }}
        lots={lots}
        etfConfigs={etfs}
        initialSuggestion={{ etf: "VAS", amount: 1000 }}
      />,
    );
    expect(priceInput().value).toBe("100.00");
  });

  it("does not reset a manual price on suggestion price refresh", () => {
    const { rerender } = setup({ initialSuggestion: { etf: "VAS", amount: 1000 } });
    fireEvent.change(priceInput(), { target: { value: "150" } });

    rerender(
      <TransactionForm
        onAdd={vi.fn()}
        currentPrices={{ VAS: 105 }}
        lots={lots}
        etfConfigs={etfs}
        initialSuggestion={{ etf: "VAS", amount: 1000 }}
      />,
    );
    expect(priceInput().value).toBe("150");
  });
});
