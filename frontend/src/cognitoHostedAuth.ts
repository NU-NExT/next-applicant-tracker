type HostedLoginContext = {
  adminMode: boolean;
  nextPath: string;
};

type HostedTokenResponse = {
  access_token: string;
  id_token: string;
  refresh_token?: string;
  token_type?: string;
  expires_in?: number;
};

const STORAGE_PREFIX = "cognito_pkce_";

const COGNITO_DOMAIN = (import.meta.env.VITE_COGNITO_DOMAIN ?? "").trim();
const COGNITO_CLIENT_ID = (import.meta.env.VITE_COGNITO_CLIENT_ID ?? "").trim();
const COGNITO_REDIRECT_URI =
  (import.meta.env.VITE_COGNITO_REDIRECT_URI ?? "").trim() || `${window.location.origin}/login`;

function base64UrlEncode(input: Uint8Array): string {
  let binary = "";
  input.forEach((b) => {
    binary += String.fromCharCode(b);
  });
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function randomString(size = 64): string {
  const bytes = new Uint8Array(size);
  window.crypto.getRandomValues(bytes);
  return base64UrlEncode(bytes);
}

async function sha256(input: string): Promise<Uint8Array> {
  const digest = await window.crypto.subtle.digest("SHA-256", new TextEncoder().encode(input));
  return new Uint8Array(digest);
}

function normalizeDomain(domain: string): string {
  if (domain.startsWith("http://") || domain.startsWith("https://")) {
    return domain.replace(/\/+$/, "");
  }
  return `https://${domain.replace(/\/+$/, "")}`;
}

export function isHostedLoginConfigured(): boolean {
  return Boolean(COGNITO_DOMAIN && COGNITO_CLIENT_ID);
}

export async function beginHostedLogin(ctx: HostedLoginContext): Promise<void> {
  const state = randomString(32);
  const codeVerifier = randomString(96);
  const codeChallenge = base64UrlEncode(await sha256(codeVerifier));

  sessionStorage.setItem(
    `${STORAGE_PREFIX}${state}`,
    JSON.stringify({
      codeVerifier,
      adminMode: ctx.adminMode,
      nextPath: ctx.nextPath,
    })
  );

  const authorizeUrl = new URL(`${normalizeDomain(COGNITO_DOMAIN)}/oauth2/authorize`);
  authorizeUrl.searchParams.set("response_type", "code");
  authorizeUrl.searchParams.set("client_id", COGNITO_CLIENT_ID);
  authorizeUrl.searchParams.set("redirect_uri", COGNITO_REDIRECT_URI);
  authorizeUrl.searchParams.set("scope", "openid email profile");
  authorizeUrl.searchParams.set("state", state);
  authorizeUrl.searchParams.set("code_challenge_method", "S256");
  authorizeUrl.searchParams.set("code_challenge", codeChallenge);

  window.location.assign(authorizeUrl.toString());
}

export async function completeHostedLoginFromUrl(): Promise<
  | {
      tokens: HostedTokenResponse;
      context: HostedLoginContext;
    }
  | null
> {
  const params = new URLSearchParams(window.location.search);
  const code = params.get("code");
  const state = params.get("state");

  if (!code || !state) return null;

  const key = `${STORAGE_PREFIX}${state}`;
  const rawState = sessionStorage.getItem(key);
  if (!rawState) {
    throw new Error("Missing login state. Please try signing in again.");
  }

  sessionStorage.removeItem(key);
  const parsed = JSON.parse(rawState) as { codeVerifier: string; adminMode: boolean; nextPath: string };
  const tokenUrl = `${normalizeDomain(COGNITO_DOMAIN)}/oauth2/token`;

  const payload = new URLSearchParams();
  payload.set("grant_type", "authorization_code");
  payload.set("client_id", COGNITO_CLIENT_ID);
  payload.set("redirect_uri", COGNITO_REDIRECT_URI);
  payload.set("code", code);
  payload.set("code_verifier", parsed.codeVerifier);

  const response = await fetch(tokenUrl, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: payload.toString(),
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Cognito token exchange failed: ${errorBody || response.statusText}`);
  }

  const tokens = (await response.json()) as HostedTokenResponse;
  if (!tokens.access_token || !tokens.id_token) {
    throw new Error("Cognito token response missing access or id token.");
  }

  const cleanUrl = new URL(window.location.href);
  cleanUrl.searchParams.delete("code");
  cleanUrl.searchParams.delete("state");
  window.history.replaceState({}, document.title, cleanUrl.pathname + cleanUrl.search);

  return {
    tokens,
    context: {
      adminMode: parsed.adminMode,
      nextPath: parsed.nextPath,
    },
  };
}
