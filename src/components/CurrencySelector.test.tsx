import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { CurrencySelector } from "./CurrencySelector";
import type { CurrencyCode } from "@/types";

describe("CurrencySelector", () => {
  const defaultProps = {
    isOpen: true,
    onSelect: vi.fn(),
    onClose: vi.fn(),
    selectedCodes: [] as CurrencyCode[],
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("renders when isOpen is true", () => {
    render(<CurrencySelector {...defaultProps} />);

    expect(screen.getByPlaceholderText("Search currency...")).toBeInTheDocument();
    expect(screen.getByText("USD")).toBeInTheDocument();
    expect(screen.getByText("EUR")).toBeInTheDocument();
  });

  it("does not render when isOpen is false", () => {
    render(<CurrencySelector {...defaultProps} isOpen={false} />);

    expect(screen.queryByPlaceholderText("Search currency...")).not.toBeInTheDocument();
  });

  it("filters currencies by search query", () => {
    render(<CurrencySelector {...defaultProps} />);

    const search = screen.getByPlaceholderText("Search currency...");
    fireEvent.change(search, { target: { value: "EUR" } });

    expect(screen.getByText("EUR")).toBeInTheDocument();
    expect(screen.queryByText("USD")).not.toBeInTheDocument();
  });

  it("filters currencies by name", () => {
    render(<CurrencySelector {...defaultProps} />);

    const search = screen.getByPlaceholderText("Search currency...");
    fireEvent.change(search, { target: { value: "Peso" } });

    expect(screen.getByText("MXN")).toBeInTheDocument();
    expect(screen.getByText("COP")).toBeInTheDocument();
    expect(screen.queryByText("USD")).not.toBeInTheDocument();
  });

  it("calls onSelect and onClose when a currency is clicked", () => {
    const onSelect = vi.fn();
    const onClose = vi.fn();
    render(
      <CurrencySelector {...defaultProps} onSelect={onSelect} onClose={onClose} />,
    );

    // Find and click the EUR button (not the code label, the parent button)
    const eurButton = screen.getByText("EUR").closest("button")!;
    fireEvent.click(eurButton);

    expect(onSelect).toHaveBeenCalledWith("EUR");
    expect(onClose).toHaveBeenCalledOnce();
  });

  it("disables already selected currencies", () => {
    render(
      <CurrencySelector {...defaultProps} selectedCodes={["USD" as CurrencyCode]} />,
    );

    const usdButton = screen.getByText("USD").closest("button")!;
    expect(usdButton).toBeDisabled();
  });

  it("shows no results message for empty search", () => {
    render(<CurrencySelector {...defaultProps} />);

    const search = screen.getByPlaceholderText("Search currency...");
    fireEvent.change(search, { target: { value: "XYZ" } });

    expect(screen.getByText("No currencies found")).toBeInTheDocument();
  });

  it("closes on Escape key", () => {
    const onClose = vi.fn();
    render(<CurrencySelector {...defaultProps} onClose={onClose} />);

    fireEvent.keyDown(window, { key: "Escape" });

    expect(onClose).toHaveBeenCalledOnce();
  });
});
