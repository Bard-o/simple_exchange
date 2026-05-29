import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CurrencyInput } from "./CurrencyInput";
import type { CurrencyState } from "@/types";

const mockCurrency: CurrencyState = {
  code: "USD",
  amount: 100,
  flag: "\ud83c\uddfa\ud83c\uddf8",
};

const defaultProps = {
  currency: mockCurrency,
  index: 0,
  onAmountChange: vi.fn(),
  onRemove: vi.fn(),
  onChangeCurrency: vi.fn(),
  isBase: true,
  canRemove: false,
  displayAmount: "100",
  rates: null,
};

describe("CurrencyInput", () => {
  it("renders the currency code and flag", () => {
    render(<CurrencyInput {...defaultProps} />);

    expect(screen.getByText("USD")).toBeInTheDocument();
  });

  it("renders the display amount", () => {
    render(<CurrencyInput {...defaultProps} displayAmount="100" />);

    const input = screen.getByPlaceholderText("0");
    expect(input).toHaveValue("100");
  });

  it("shows remove button when canRemove is true", () => {
    render(<CurrencyInput {...defaultProps} canRemove={true} />);

    const removeBtn = screen.getByTitle("Remove currency");
    expect(removeBtn).toBeInTheDocument();
  });

  it("hides remove button when canRemove is false", () => {
    render(<CurrencyInput {...defaultProps} canRemove={false} />);

    expect(screen.queryByTitle("Remove currency")).not.toBeInTheDocument();
  });

  it("calls onRemove when remove button is clicked", () => {
    const onRemove = vi.fn();
    render(<CurrencyInput {...defaultProps} canRemove={true} onRemove={onRemove} />);

    fireEvent.click(screen.getByTitle("Remove currency"));
    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it("calls onChangeCurrency when currency badge is clicked", () => {
    const onChangeCurrency = vi.fn();
    render(
      <CurrencyInput {...defaultProps} onChangeCurrency={onChangeCurrency} />,
    );

    fireEvent.click(screen.getByTitle("Change currency"));
    expect(onChangeCurrency).toHaveBeenCalledWith(0);
  });

  it("allows numeric input in the amount field", () => {
    const onAmountChange = vi.fn();
    render(
      <CurrencyInput {...defaultProps} onAmountChange={onAmountChange} />,
    );

    const input = screen.getByPlaceholderText("0");
    fireEvent.focus(input);
    fireEvent.change(input, { target: { value: "200" } });
    fireEvent.blur(input);

    expect(onAmountChange).toHaveBeenCalled();
  });
});
