import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

const CONFIG = {
  PROTECTED_ROUTES: ["/dashboard"],
  AUTH_PAGES: ["/login", "/user-onboarding", "/reset-password"],

  PERMISSION_ROUTES: {},

  PUBLIC_API_ROUTES: [
    "/api/auth",
    "/api/auth/reset-identity",
    "/api/auth/verify",
    "/api/auth/onboarding/initiate-onboarding",
    "/api/auth/onboarding/verify-onboarding",
    "/api/verify-turnstile",
  ],

  DEFAULT_LOGIN_REDIRECT: "/login",
  DEFAULT_AUTH_REDIRECT: "/dashboard/task-managment",
};

const ALLOWED_ORIGINS =
  process.env.NODE_ENV === "production"
    ? ["https://admin.afinadvisory.com"]
    : ["http://localhost:3000", "https://admin.afinadvisory.com"];

function matchesPath(pathname, paths) {
  return paths.some((path) => {
    if (path.endsWith("*")) return pathname.startsWith(path.slice(0, -1));
    return pathname === path || pathname.startsWith(path + "/");
  });
}

function getRequiredPermissions(pathname) {
  if (CONFIG.PERMISSION_ROUTES[pathname])
    return CONFIG.PERMISSION_ROUTES[pathname];

  for (const [route, perms] of Object.entries(CONFIG.PERMISSION_ROUTES)) {
    if (route.endsWith("*") && pathname.startsWith(route.slice(0, -1)))
      return perms;
    if (pathname.startsWith(route + "/")) return perms;
  }

  return null;
}

function hasPermissions(token, pathname) {
  if (!token) return false;

  if (token.admin_role === "SUPER_ADMIN") return true;

  const required = getRequiredPermissions(pathname);
  if (!required) return true;

  const userPermissions = token.permissions || [];
  return required.every((p) => userPermissions.includes(p));
}

function addSecurityHeaders(res) {
  res.headers.set("X-Frame-Options", "DENY");
  res.headers.set("X-Content-Type-Options", "nosniff");
  res.headers.set("X-XSS-Protection", "1; mode=block");
  res.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  res.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  return res;
}

function addCorsHeaders(req, res) {
  const origin = req.headers.get("origin");

  if (origin && ALLOWED_ORIGINS.includes(origin)) {
    res.headers.set("Access-Control-Allow-Origin", origin);
    res.headers.set(
      "Access-Control-Allow-Methods",
      "GET, POST, PUT, DELETE, OPTIONS"
    );
    res.headers.set(
      "Access-Control-Allow-Headers",
      "Content-Type, Authorization"
    );
    res.headers.set("Access-Control-Allow-Credentials", "true");
  }
}

function createPermissionError(pathname, isApi, req) {
  if (isApi) {
    return new NextResponse(
      JSON.stringify({
        error: "Insufficient permissions",
        code: "PERMISSION_DENIED",
      }),
      { status: 403, headers: { "Content-Type": "application/json" } }
    );
  }

  const url = new URL("/dashboard/access-denied", req.url);
  url.searchParams.set("requested_path", pathname);
  return NextResponse.redirect(url);
}

export async function middleware(req) {
  const { pathname, search } = req.nextUrl;
  const url = req.nextUrl.clone();

  // Handle preflight safely
  if (req.method === "OPTIONS") {
    const res = new NextResponse(null, { status: 204 });
    addCorsHeaders(req, res);
    return addSecurityHeaders(res);
  }

  try {
    // Public APIs
    if (matchesPath(pathname, CONFIG.PUBLIC_API_ROUTES)) {
      const res = NextResponse.next();
      addCorsHeaders(req, res);
      return addSecurityHeaders(res);
    }

    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });

    // Block inactive users globally
    if (token && token.status !== "ACTIVE") {
      if (pathname.startsWith("/api/")) {
        return new NextResponse(JSON.stringify({ error: "Account inactive" }), {
          status: 403,
          headers: { "Content-Type": "application/json" },
        });
      }
      return NextResponse.redirect(new URL("/login", req.url));
    }

    // Dashboard lock
    if (
      token?.isDashboardLocked &&
      !pathname.startsWith("/dashboard/locked") &&
      !pathname.startsWith("/api/unlock-dashboard")
    ) {
      return NextResponse.redirect(new URL("/dashboard/locked", req.url));
    }

    if (
      token &&
      !token.isDashboardLocked &&
      pathname.startsWith("/dashboard/locked")
    ) {
      return NextResponse.redirect(
        new URL(CONFIG.DEFAULT_AUTH_REDIRECT, req.url)
      );
    }

    // Root redirect
    if (pathname === "/") {
      url.pathname = token ? "/dashboard" : "/login";
      return NextResponse.redirect(url);
    }

    // Protected pages
    if (matchesPath(pathname, CONFIG.PROTECTED_ROUTES)) {
      if (!token) {
        const loginUrl = new URL(CONFIG.DEFAULT_LOGIN_REDIRECT, req.url);
        loginUrl.searchParams.set("callbackUrl", pathname + search);
        return NextResponse.redirect(loginUrl);
      }

      if (!hasPermissions(token, pathname)) {
        return createPermissionError(pathname, false, req);
      }
    }

    // Auth pages redirect
    if (token && matchesPath(pathname, CONFIG.AUTH_PAGES)) {
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
      url.pathname =
        callbackUrl && callbackUrl.startsWith("/")
          ? callbackUrl
          : CONFIG.DEFAULT_AUTH_REDIRECT;
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Protected APIs
    if (pathname.startsWith("/api/")) {
      if (!token) {
        return new NextResponse(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!hasPermissions(token, pathname)) {
        return createPermissionError(pathname, true, req);
      }
    }

    const res = NextResponse.next();
    addCorsHeaders(req, res);
    return addSecurityHeaders(res);
  } catch (err) {
    console.error("Middleware error:", err);
    return new NextResponse("Internal Server Error", { status: 500 });
  }
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
