// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import SignInPage from "@/app/auth/sign-in/page";

const { requireAdmin, redirect } = vi.hoisted(() => ({ requireAdmin: vi.fn(), redirect: vi.fn() }));
vi.mock("@/lib/auth/admin-authorization", () => ({ requireAdmin }));
vi.mock("next/navigation", () => ({ redirect }));

describe("sign-in query states", () => {
  afterEach(cleanup);
  beforeEach(() => {
    vi.clearAllMocks();
    requireAdmin.mockResolvedValue({ authorized: false, status: 401, code: "ADMIN_SESSION_REQUIRED" });
    redirect.mockImplementation(() => { throw new Error("NEXT_REDIRECT"); });
  });

  it("redirects an authorized operator visiting sign-in to administration", async () => {
    requireAdmin.mockResolvedValue({ authorized: true });
    await expect(SignInPage({})).rejects.toThrow("NEXT_REDIRECT");
    expect(redirect).toHaveBeenCalledWith("/admin");
    expect(requireAdmin).toHaveBeenCalledOnce();
  });

  it("distinguishes a rejected link from an existing authorized session", async () => {
    requireAdmin.mockResolvedValue({ authorized: true });
    render(await SignInPage({ searchParams: Promise.resolve({ error: "confirmation_failed", sent: "1" }) }));
    expect(screen.getByRole("alert")).toHaveTextContent("This sign-in link could not be confirmed, but your existing operator session is still active.");
    expect(screen.getByRole("link", { name: "Continue to administration" })).toHaveAttribute("href", "/admin");
    expect(screen.queryByRole("button", { name: "Send sign-in link" })).not.toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    [403, "ADMIN_ACCESS_DENIED", "This account does not have active operator access."],
    [503, "ADMIN_AUTH_UNAVAILABLE", "Operator access cannot be verified right now. Please try again later."],
  ])("fails closed for authorization status %s", async (status, code, message) => {
    requireAdmin.mockResolvedValue({ authorized: false, status, code });
    render(await SignInPage({ searchParams: Promise.resolve({ error: "confirmation_failed" }) }));
    expect(screen.getByRole("alert")).toHaveTextContent(message);
    expect(screen.queryByRole("link", { name: "Continue to administration" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Send sign-in link" })).not.toBeInTheDocument();
    expect(redirect).not.toHaveBeenCalled();
  });

  it.each([
    [{ sent: "1" }, "status", "Check your email for a secure sign-in link."],
    [{ error: "confirmation_failed" }, "alert", "That sign-in link could not be confirmed. Request a new link."],
    [{ error: "unavailable" }, "alert", "Sign-in is temporarily unavailable. Please try again."],
  ])("renders the supported %s state", async (searchParams, role, message) => {
    render(await SignInPage({ searchParams: Promise.resolve(searchParams) }));

    expect(screen.getByRole(role)).toHaveTextContent(message);
    expect(screen.getByRole("button", { name: "Send sign-in link" })).toBeInTheDocument();
  });

  it("ignores unknown query states without exposing provider details", async () => {
    render(await SignInPage({ searchParams: Promise.resolve({ error: "provider_internal" }) }));

    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.queryByRole("alert")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send sign-in link" })).toBeInTheDocument();
  });

  it("does not hide an unauthenticated link failure behind a sent flag", async () => {
    render(await SignInPage({ searchParams: Promise.resolve({ error: "confirmation_failed", sent: "1" }) }));
    expect(screen.getByRole("alert")).toHaveTextContent("That sign-in link could not be confirmed. Request a new link.");
    expect(screen.queryByRole("status")).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Send sign-in link" })).toBeInTheDocument();
  });
});
