import { screen } from "@testing-library/react";
import { render } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import App from "./App";

// IMPORTANT: All vi.mock calls must be at the top level BEFORE any imports
// to ensure they are hoisted properly by Vitest

// Mock URLSync component to avoid routing issues in tests
vi.mock("@/components/URLSync", () => ({
  URLSync: () => null,
}));

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
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    expect(screen.getAllByText(/Diegesis/i).length).toBeGreaterThan(0);
  });
});
