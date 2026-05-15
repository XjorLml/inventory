import React from "react";
import { render, screen } from "@testing-library/react";
import BottomNav from "./BottomNav";

jest.mock("next/link", () => {
  function MockLink({ children, href, ...props }) {
    return (
      <a href={href} {...props}>
        {children}
      </a>
    );
  }
  return MockLink;
});

jest.mock("next/navigation", () => ({
  usePathname: jest.fn(),
}));

import { usePathname } from "next/navigation";

describe("BottomNav", () => {
  beforeEach(() => {
    usePathname.mockClear();
  });

  it("renders all navigation links", () => {
    usePathname.mockReturnValue("/");
    render(<BottomNav />);

    expect(screen.getByText("Home")).toBeInTheDocument();
    expect(screen.getByText("Shopping")).toBeInTheDocument();
    expect(screen.getByText("Settings")).toBeInTheDocument();
  });

  it("renders icons for each link", () => {
    usePathname.mockReturnValue("/");
    render(<BottomNav />);

    expect(screen.getByText("🏠")).toBeInTheDocument();
    expect(screen.getByText("🛒")).toBeInTheDocument();
    expect(screen.getByText("⚙️")).toBeInTheDocument();
  });

  it("marks home link as active when on home page", () => {
    usePathname.mockReturnValue("/");
    render(<BottomNav />);

    const homeLink = screen.getByText("Home").closest("a");
    expect(homeLink).toHaveClass("text-green-600");
  });

  it("marks shopping link as active when on shopping list page", () => {
    usePathname.mockReturnValue("/shopping-list");
    render(<BottomNav />);

    const shoppingLink = screen.getByText("Shopping").closest("a");
    expect(shoppingLink).toHaveClass("text-green-600");
  });

  it("marks shopping link as active when on shopping item detail page", () => {
    usePathname.mockReturnValue("/shopping-list/item/1");
    render(<BottomNav />);

    const shoppingLink = screen.getByText("Shopping").closest("a");
    expect(shoppingLink).toHaveClass("text-green-600");
  });

  it("marks settings link as active when on settings page", () => {
    usePathname.mockReturnValue("/settings");
    render(<BottomNav />);

    const settingsLink = screen.getByText("Settings").closest("a");
    expect(settingsLink).toHaveClass("text-green-600");
  });

  it("marks settings link as active when on products settings page", () => {
    usePathname.mockReturnValue("/settings/products");
    render(<BottomNav />);

    const settingsLink = screen.getByText("Settings").closest("a");
    expect(settingsLink).toHaveClass("text-green-600");
  });

  it("marks links as inactive when not on that page", () => {
    usePathname.mockReturnValue("/shopping-list");
    render(<BottomNav />);

    const homeLink = screen.getByText("Home").closest("a");
    const settingsLink = screen.getByText("Settings").closest("a");

    expect(homeLink).not.toHaveClass("text-green-600");
    expect(homeLink).toHaveClass("text-zinc-400");
    expect(settingsLink).not.toHaveClass("text-green-600");
    expect(settingsLink).toHaveClass("text-zinc-400");
  });

  it("renders correct hrefs for each link", () => {
    usePathname.mockReturnValue("/");
    render(<BottomNav />);

    const homeLink = screen.getByText("Home").closest("a");
    const shoppingLink = screen.getByText("Shopping").closest("a");
    const settingsLink = screen.getByText("Settings").closest("a");

    expect(homeLink).toHaveAttribute("href", "/");
    expect(shoppingLink).toHaveAttribute("href", "/shopping-list");
    expect(settingsLink).toHaveAttribute("href", "/settings");
  });

  it("has proper navigation structure", () => {
    usePathname.mockReturnValue("/");
    render(<BottomNav />);

    const nav = document.querySelector("nav");
    expect(nav).toBeInTheDocument();
    expect(nav).toHaveClass("fixed", "bottom-0", "bg-white");
  });
});
