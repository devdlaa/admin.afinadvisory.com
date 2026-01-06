import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// ============================================================================
// CONFIGURATION
// ============================================================================
const CONFIG = {
  // Routes that require authentication
  PROTECTED_ROUTES: ["/dashboard"],

  // Auth pages (redirect authenticated users away from these)
  AUTH_PAGES: ["/login", "/user-onboarding", "/reset-password"],

  // Permission-based route access
  PERMISSION_ROUTES: {
    // "/dashboard/customers": ["customers.access"],
    // "/dashboard/service-bookings": ["bookings.access"],
    // "/dashboard/payments": ["payments.access"],
    // "/dashboard/payment-links": ["bookings.create_new_link"],
    // "/dashboard/service-pricing": ["service_pricing.access"],
    // "/dashboard/marketing/partners": ["influencers.access"],
    // "/dashboard/marketing/coupons": ["coupons.access"],
    // "/dashboard/marketing/comissions": ["commissions.access"],
    // "/dashboard/manage-team": ["users.access"],
  },

  // Public API routes (no auth required)
  PUBLIC_API_ROUTES: [
    "/api/auth",
    "/api/auth/onboarding/initiate-onboarding",
    "/api/auth/onboarding/verify-onboarding",
    "/api/verify-turnstile",
    "/api/admin/users/unlock-dashboard",
    "/api/admin_ops/entity/unlock-dashboard",
    "/api/admin_ops/notifications/test",
  ],

  // Default redirects
  DEFAULT_LOGIN_REDIRECT: "/login",
  DEFAULT_AUTH_REDIRECT: "/dashboard",
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

// Check if pathname matches any path in the array
function matchesPath(pathname, paths) {
  return paths.some((path) => {
    if (path.endsWith("*")) {
      return pathname.startsWith(path.slice(0, -1));
    }
    return pathname === path || pathname.startsWith(path + "/");
  });
}

// Get required permissions for a route
function getRequiredPermissions(pathname) {
  // Exact match
  if (CONFIG.PERMISSION_ROUTES[pathname]) {
    return CONFIG.PERMISSION_ROUTES[pathname];
  }

  // Wildcard match
  for (const [route, permissions] of Object.entries(CONFIG.PERMISSION_ROUTES)) {
    if (route.endsWith("*") && pathname.startsWith(route.slice(0, -1))) {
      return permissions;
    }
    if (pathname.startsWith(route + "/")) {
      return permissions;
    }
  }

  return null;
}

// Check if user has required permissions
function hasPermissions(token, pathname) {
  if (!token) return false;

  // Dashboard is accessible to all authenticated users
  if (pathname === "/dashboard") return true;

  const requiredPermissions = getRequiredPermissions(pathname);

  // No specific permissions required
  if (!requiredPermissions) return true;

  // Check if user has all required permissions
  const userPermissions = token.permissions || [];
  return requiredPermissions.every((perm) => userPermissions.includes(perm));
}

// Add security headers
function addSecurityHeaders(response) {
  response.headers.set("X-Frame-Options", "DENY");
  response.headers.set("X-Content-Type-Options", "nosniff");
  response.headers.set("X-XSS-Protection", "1; mode=block");
  response.headers.set("Referrer-Policy", "strict-origin-when-cross-origin");
  response.headers.set(
    "Permissions-Policy",
    "camera=(), microphone=(), geolocation=()"
  );
  return response;
}

// Create permission error response
function createPermissionError(pathname, isApiRoute, req) {
  if (isApiRoute) {
    return new NextResponse(
      JSON.stringify({
        error: "Insufficient permissions",
        message: "You don't have permission to access this resource.",
        code: "PERMISSION_DENIED",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  const url = new URL("/dashboard/access-denied", req.url);
  url.searchParams.set("requested_path", pathname);
  return NextResponse.redirect(url);
}

// ============================================================================
// MAIN MIDDLEWARE
// ============================================================================
export async function middleware(req) {
  const { pathname, search } = req.nextUrl;
  const url = req.nextUrl.clone();

  // --- CORS Handling ---
  const origin = req.headers.get("origin");
  const allowedOrigins = [
    "http://localhost:3000",
    "https://admin.afinadvisory.com",
  ];

  if (allowedOrigins.includes(origin)) {
    const corsHeaders = {
      "Access-Control-Allow-Origin": origin,
      "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, Authorization",
      "Access-Control-Allow-Credentials": "true",
    };

    if (req.method === "OPTIONS") {
      return new NextResponse(null, { status: 204, headers: corsHeaders });
    }

    const res = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.headers.set(key, value);
    });
    return addSecurityHeaders(res);
  }

  try {
    // --- Public API Routes (no auth needed) ---
    if (matchesPath(pathname, CONFIG.PUBLIC_API_ROUTES)) {
      return addSecurityHeaders(NextResponse.next());
    }

    // --- Get Authentication Token ---
    const token = await getToken({
      req,
      secret: process.env.NEXTAUTH_SECRET,
      secureCookie: process.env.NODE_ENV === "production",
    });

    // --- Dashboard Lock Check ---
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

    // --- Access Denied Page (requires auth) ---
    if (pathname.startsWith("/dashboard/access-denied")) {
      if (!token) {
        const loginUrl = new URL(CONFIG.DEFAULT_LOGIN_REDIRECT, req.url);
        loginUrl.searchParams.set("callbackUrl", "/dashboard");
        return NextResponse.redirect(loginUrl);
      }
      return addSecurityHeaders(NextResponse.next());
    }

    // --- Root Route Redirect ---
    if (pathname === "/") {
      url.pathname = token ? "/dashboard" : "/login";
      return NextResponse.redirect(url);
    }

    // --- Protected Routes (require auth) ---
    if (matchesPath(pathname, CONFIG.PROTECTED_ROUTES)) {
      if (!token) {
        const loginUrl = new URL(CONFIG.DEFAULT_LOGIN_REDIRECT, req.url);
        loginUrl.searchParams.set("callbackUrl", pathname + search);
        return NextResponse.redirect(loginUrl);
      }

      // Check permissions
      if (!hasPermissions(token, pathname)) {
        return createPermissionError(pathname, false, req);
      }
    }

    // --- Auth Pages (redirect if already authenticated) ---
    if (token && matchesPath(pathname, CONFIG.AUTH_PAGES)) {
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
      url.pathname =
        callbackUrl && callbackUrl.startsWith("/")
          ? callbackUrl
          : CONFIG.DEFAULT_AUTH_REDIRECT;
      url.search = "";
      return NextResponse.redirect(url);
    }

    // --- Protected API Routes ---
    if (
      pathname.startsWith("/api/") &&
      !matchesPath(pathname, CONFIG.PUBLIC_API_ROUTES)
    ) {
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

    // --- Allow Request ---
    return addSecurityHeaders(NextResponse.next());
  } catch (error) {
    console.error("Middleware error:", error);
    return new NextResponse(
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : `Error: ${error.message}`,
      { status: 500 }
    );
  }
}

// ============================================================================
// MIDDLEWARE CONFIGURATION
// ============================================================================
export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};
