import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { EmptyState } from "./EmptyState";

describe("EmptyState", () => {
  it("renders the add button", () => {
    render(<EmptyState onAdd={vi.fn()} />);

    expect(screen.getByText("Add base currency")).toBeInTheDocument();
    expect(screen.getByText("Simple Exchange")).toBeInTheDocument();
  });

  it("calls onAdd when button is clicked", () => {
    const onAdd = vi.fn();
    render(<EmptyState onAdd={onAdd} />);

    fireEvent.click(screen.getByText("Add base currency"));
    expect(onAdd).toHaveBeenCalledOnce();
  });
});
