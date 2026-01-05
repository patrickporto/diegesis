import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

// Mock matchMedia for Mantine/BlockNote
Object.defineProperty(window, "matchMedia", {
  writable: true,
  value: vi.fn().mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(), // deprecated
    removeListener: vi.fn(), // deprecated
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

// Mock Google OAuth to prevent script loading errors
vi.mock("@react-oauth/google", () => ({
  GoogleOAuthProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useGoogleLogin: () => vi.fn(),
}));

describe("App", () => {
  it("renders app title", () => {
    render(<App />);
    expect(screen.getByText(/Diegesis Notes/i)).toBeDefined();
  });
});
