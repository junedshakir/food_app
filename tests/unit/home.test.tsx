import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import Home from "@/app/page";

describe("Home page", () => {
  it("renders the app name and call to action", () => {
    render(<Home />);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(/food delivery/i);
    expect(screen.getByRole("button", { name: /browse restaurants/i })).toBeInTheDocument();
  });
});
