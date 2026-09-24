// @vitest-environment jsdom

import { cleanup, render, screen } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";

import SignInPage from "@/app/auth/sign-in/page";

describe("sign-in query states", () => {
  afterEach(cleanup);

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
});
