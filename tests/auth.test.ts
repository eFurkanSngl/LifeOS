import { it, expect, vi, afterEach } from "vitest";
import { CloudAdapter } from "../packages/integrations/src/index";
afterEach(() => vi.unstubAllGlobals());
it("signs in with the Supabase password flow and never persists the password", async () => {
  const stored = new Map<string, string>();
  let body: Record<string, unknown> | undefined;
  vi.stubGlobal(
    "fetch",
    vi.fn(async (input: string | URL, init?: RequestInit) => {
      const url = new URL(String(input));
      expect(url.pathname).toBe("/auth/v1/token");
      expect(url.searchParams.get("grant_type")).toBe("password");
      body = JSON.parse(String(init?.body));
      const payload = Buffer.from(
        JSON.stringify({
          sub: "11111111-1111-4111-8111-111111111111",
          exp: Math.floor(Date.now() / 1000) + 3600,
        }),
      ).toString("base64url");
      return new Response(
        JSON.stringify({
          access_token: "eyJhbGciOiJIUzI1NiJ9." + payload + ".signature",
          refresh_token: "test-refresh",
          expires_in: 3600,
          token_type: "bearer",
          user: {
            id: "11111111-1111-4111-8111-111111111111",
            email: "owner@example.com",
            aud: "authenticated",
            role: "authenticated",
          },
        }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }),
  );
  const adapter = new CloudAdapter(
    "https://auth-test.supabase.co",
    "test-public-key",
    {
      getItem: (k) => stored.get(k) ?? null,
      setItem: (k, v) => {
        stored.set(k, v);
      },
      removeItem: (k) => {
        stored.delete(k);
      },
    },
  );
  await adapter.signIn(" owner@example.com ", "private-test-password");
  expect(body).toMatchObject({
    email: "owner@example.com",
    password: "private-test-password",
  });
  expect([...stored.values()].join("")).not.toContain("private-test-password");
  expect(
    (await adapter.client.auth.getSession()).data.session?.user.email,
  ).toBe("owner@example.com");
  adapter.client.auth.stopAutoRefresh();
});
it("shows a bounded sign-in error without disclosing provider details", async () => {
  vi.stubGlobal(
    "fetch",
    vi.fn(
      async () =>
        new Response(
          JSON.stringify({
            error_code: "invalid_credentials",
            msg: "provider detail private-test-password",
          }),
          { status: 400, headers: { "Content-Type": "application/json" } },
        ),
    ),
  );
  const adapter = new CloudAdapter(
    "https://auth-failure.supabase.co",
    "test-public-key",
    { getItem: () => null, setItem: () => {}, removeItem: () => {} },
  );
  await expect(
    adapter.signIn("owner@example.com", "private-test-password"),
  ).rejects.toThrow("Giriş yapılamadı. E-posta ve şifrenizi kontrol edin.");
  adapter.client.auth.stopAutoRefresh();
});
