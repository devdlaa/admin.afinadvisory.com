import { NextResponse } from "next/server";
import { getToken } from "next-auth/jwt";

// === Configuration ===
const CONFIG = {
  // Protected routes requiring authentication
  PROTECTED_ROUTES: ["/dashboard"],

  // Authentication pages (e.g., login/signup) to redirect authenticated users away from
  AUTH_PAGES: ["/login", "/user-onboarding"],

  ADMIN_ROUTES: [],
  SUPERADMIN_ROUTES: ["/dashboard/users"],

  // Permission-based route mappings
  PERMISSION_ROUTES: {
    "/dashboard/customers": ["customers.access"],
    "/dashboard/service-bookings": ["bookings.access"],
    "/dashboard/payments": ["payments.access"],
    "/dashboard/payment-links": ["bookings.create_new_link"],
    "/dashboard/service-pricing": ["service_pricing.access"],
    "/dashboard/marketing/partners": ["influencers.access"],
    "/dashboard/marketing/coupons": ["coupons.access"],
    "/dashboard/marketing/comissions": ["commissions.access"],
    "/dashboard/manage-team": ["users.access"],
    // API routes permissions
    "/api/admin/services": ["bookings.access"],
    "/api/admin/customers": ["customers.access"],
    "/api/admin/payments": ["payments.access"],
    "/api/admin/users": ["users.access"],
    "/api/admin/coupons": ["coupons.access"],
    "/api/admin/commissions": ["commissions.access"],
    "/api/admin/influencers": ["influencers.access"],
    "/api/admin/pricing": ["service_pricing.access"],
  },

  // Public API routes that bypass authentication
  PUBLIC_API_ROUTES: [
    "/api/auth",
    "/api/admin/onboarding/initiate-onboarding",
    "/api/admin/onboarding/verify-onboarding",
    "/api/verify-turnstile",
    "/api/admin/users/unlock-dashboard",
    // TODO : REMOVE THESE AFTER TESTING===============================================================
  ],

  // Default redirect paths
  DEFAULT_LOGIN_REDIRECT: "/login",
  DEFAULT_AUTH_REDIRECT: "/dashboard",
  DEFAULT_UNAUTHORIZED_REDIRECT: "/dashboard", // Redirect to dashboard instead of login for permission issues
  DEFAULT_NO_ACCESS_REDIRECT: "/dashboard/access-denied",

  RATE_LIMIT: {
    windowMs: 15 * 60 * 1000,
    maxRequests: 1500,
  },
};

// === Utility Functions ===

const rateLimitStore = new Map();

// Checks if an IP has exceeded the rate limit
function checkRateLimit(ip, limit = CONFIG.RATE_LIMIT.maxRequests) {
  const now = Date.now();
  const windowStart = now - CONFIG.RATE_LIMIT.windowMs;

  // Initialize request array for new IPs
  if (!rateLimitStore.has(ip)) {
    rateLimitStore.set(ip, []);
  }

  const requests = rateLimitStore.get(ip);
  // Filter out requests older than the window
  const recentRequests = requests.filter(
    (timestamp) => timestamp > windowStart
  );
  rateLimitStore.set(ip, recentRequests);

  // Block if limit exceeded
  if (recentRequests.length >= limit) {
    return false;
  }

  // Record new request
  recentRequests.push(now);
  return true;
}

// Logging utility for request and error tracking
function log(level, message, metadata = {}) {
  const timestamp = new Date().toISOString();
  const logEntry = { timestamp, level, message, ...metadata };
  console.log(logEntry);

  if (level === "error") {
    console.error(`[${timestamp}] ERROR:`, message, metadata);
  } else if (level === "warn") {
    console.warn(`[${timestamp}] WARN:`, message, metadata);
  } else {
    console.log(`[${timestamp}] ${level.toUpperCase()}:`, message, metadata);
  }
}

// Checks if a pathname matches any pattern in the provided paths array
function matchesPath(pathname, paths) {
  return paths.some((path) => {
    if (path.endsWith("*")) {
      return pathname.startsWith(path.slice(0, -1));
    }
    return pathname === path || pathname.startsWith(path + "/");
    // Modify this logic for custom route matching (e.g., regex for dynamic routes)
  });
}

// New: Check if user has specific permissions
function hasSpecificPermissions(token, requiredPermissions) {
  if (!token || !token.permissions || !Array.isArray(token.permissions)) {
    return false;
  }

  // Check if user has all required permissions
  return requiredPermissions.every((permission) =>
    token.permissions.includes(permission)
  );
}

// Enhanced: Get required permissions for a specific route
function getRequiredPermissionsForRoute(pathname) {
  // Check for exact matches first
  if (CONFIG.PERMISSION_ROUTES[pathname]) {
    return CONFIG.PERMISSION_ROUTES[pathname];
  }

  // Check for wildcard matches (e.g., /api/admin/services/*)
  for (const [route, permissions] of Object.entries(CONFIG.PERMISSION_ROUTES)) {
    if (route.endsWith("*")) {
      if (pathname.startsWith(route.slice(0, -1))) {
        return permissions;
      }
    } else if (pathname.startsWith(route + "/")) {
      // Handle sub-routes (e.g., /dashboard/customers/123 should match /dashboard/customers)
      return permissions;
    }
  }

  return null; // No specific permissions required
}

// Validates user permissions for specific routes
function hasRequiredPermissions(token, pathname) {
  if (!token) return false; // no token, no access

  const role = token.role; // "user", "admin", "superAdmin"

  // Admin routes
  if (matchesPath(pathname, CONFIG.ADMIN_ROUTES)) {
    // Only admin and superAdmin can access admin routes
    const allowed = role === "admin" || role === "superAdmin";
    if (!allowed) {
      log("warn", "User lacks admin permissions", {
        pathname,
        userId: token.sub || token.id,
        userRole: role,
      });
    }
    return allowed;
  }

  // SuperAdmin-only routes
  if (matchesPath(pathname, CONFIG.SUPERADMIN_ROUTES || [])) {
    const allowed = role === "superAdmin";
    if (!allowed) {
      log("warn", "User lacks superAdmin permissions", {
        pathname,
        userId: token.sub || token.id,
        userRole: role,
      });
    }
    return allowed;
  }

  // Check specific permissions for routes
  const requiredPermissions = getRequiredPermissionsForRoute(pathname);
  if (requiredPermissions) {
    const hasPermissions = hasSpecificPermissions(token, requiredPermissions);
    if (!hasPermissions) {
      log("warn", "User lacks required permissions", {
        pathname,
        userId: token.sub || token.id,
        userRole: role,
        requiredPermissions,
        userPermissions: token.permissions || [],
      });
    }
    return hasPermissions;
  }

  // Dashboard is always accessible to authenticated users
  if (pathname === "/dashboard") {
    return true;
  }

  // For all other routes, allow users with any role
  return true;
}

// Adds security headers to the response
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

// New: Create error response for permission issues
function createPermissionErrorResponse(pathname, isApiRoute = false, req) {
  if (isApiRoute) {
    return new NextResponse(
      JSON.stringify({
        error: "Insufficient permissions",
        message: `Access denied for ${pathname}. Contact your administrator for required permissions.`,
        code: "PERMISSION_DENIED",
      }),
      {
        status: 403,
        headers: { "Content-Type": "application/json" },
      }
    );
  }

  // For web routes, redirect to dashboard with error query parameter
  const url = new URL("/dashboard/access-denied", req.url);
  url.searchParams.set("requested_path", pathname);
  return NextResponse.redirect(url);
}

// === Main Middleware Logic ===
export async function middleware(req) {
  // --- CORS handling (run first) ---
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
    };

    // Preflight request handling
    if (req.method === "OPTIONS") {
      return new NextResponse(null, {
        status: 204,
        headers: corsHeaders,
      });
    }

    // For non-OPTIONS requests, pass headers along
    const res = NextResponse.next();
    Object.entries(corsHeaders).forEach(([key, value]) => {
      res.headers.set(key, value);
    });
  }

  const startTime = Date.now();
  const { pathname, search } = req.nextUrl;
  const url = req.nextUrl.clone();
  const userAgent = req.headers.get("user-agent") || "unknown";
  const ip =
    req.ip ||
    req.headers.get("x-forwarded-for") ||
    req.headers.get("x-real-ip") ||
    "unknown";

  // Log incoming request for debugging
  log("info", "Processing request", {
    pathname,
    userAgent: userAgent.substring(0, 100),
    ip,
    method: req.method,
  });

  try {
    // Check rate limit
    if (!checkRateLimit(ip)) {
      log("warn", "Rate limit exceeded", { ip, pathname });
      return new NextResponse("Too Many Requests", {
        status: 429,
        headers: { "Retry-After": "900" }, // 15 minutes
      });
    }

    // Bypass auth for public API routes
    if (matchesPath(pathname, CONFIG.PUBLIC_API_ROUTES)) {
      log("debug", "Public API route accessed", { pathname });
      return addSecurityHeaders(NextResponse.next());
    }

    // Fetch authentication token
    let token = null;
    try {
      token = await getToken({
        req,
        secret: process.env.NEXTAUTH_SECRET,
        secureCookie: process.env.NODE_ENV === "production",
      });
    } catch (tokenError) {
      log("error", "Failed to get authentication token", {
        error: tokenError.message,
        pathname,
      });
    }

    //  ✅ Dashboard lock check
    if (
      token &&
      token.isDashboardLocked &&
      !pathname.startsWith("/dashboard/locked") &&
      !pathname.startsWith("/api/unlock-dashboard")
    ) {
      const lockedUrl = new URL("/dashboard/locked", req.url);
      return NextResponse.redirect(lockedUrl);
    }

    // ✅ If dashboard is unlocked, prevent access to /locked
    if (
      token &&
      !token.isDashboardLocked &&
      pathname.startsWith("/dashboard/locked")
    ) {
      const redirectUrl = new URL(CONFIG.DEFAULT_AUTH_REDIRECT, req.url);
      return NextResponse.redirect(redirectUrl);
    }

    // Log authentication status with permissions
    if (token) {
      log("debug", "User authenticated", {
        userId: token.sub || token.id,
        email: token.email,
        role: token.role,
        permissionsCount: token.permissions ? token.permissions.length : 0,
        pathname,
      });
    } else {
      log("debug", "No authentication token", { pathname });
    }

    // Handle root route "/" explicitly
    if (pathname === "/") {
      url.pathname = token ? "/dashboard" : "/login";
      return NextResponse.redirect(url);
    }

    // Protect routes requiring authentication
    if (matchesPath(pathname, CONFIG.PROTECTED_ROUTES)) {
      if (!token) {
        log("info", "Unauthenticated access to protected route", {
          pathname,
          ip,
        });
        const loginUrl = new URL(CONFIG.DEFAULT_LOGIN_REDIRECT, req.url);
        loginUrl.searchParams.set("callbackUrl", pathname + search);
        return NextResponse.redirect(loginUrl);
      }

      // Check permissions for protected routes
      if (!hasRequiredPermissions(token, pathname)) {
        log("warn", "Insufficient permissions for route", {
          pathname,
          userId: token.sub || token.id,
          userRole: token.role,
          userPermissions: token.permissions || [],
          requiredPermissions: getRequiredPermissionsForRoute(pathname),
        });
        return createPermissionErrorResponse(pathname, false, req);
      }
    }

    // Redirect authenticated users away from auth pages
    if (token && matchesPath(pathname, CONFIG.AUTH_PAGES)) {
      log("info", "Authenticated user redirected from auth page", {
        pathname,
        userId: token.sub || token.id,
      });
      const callbackUrl = req.nextUrl.searchParams.get("callbackUrl");
      url.pathname =
        callbackUrl && callbackUrl.startsWith("/")
          ? callbackUrl
          : CONFIG.DEFAULT_AUTH_REDIRECT;
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Protect API routes (non-public)
    if (
      pathname.startsWith("/api/") &&
      !matchesPath(pathname, CONFIG.PUBLIC_API_ROUTES)
    ) {
      log("debug", "Checking protected API route", { pathname });

      if (!token) {
        log("warn", "Unauthenticated API access", { pathname, ip });
        return new NextResponse(
          JSON.stringify({ error: "Authentication required" }),
          { status: 401, headers: { "Content-Type": "application/json" } }
        );
      }

      if (!hasRequiredPermissions(token, pathname)) {
        log("warn", "Insufficient permissions for API", {
          pathname,
          userId: token.sub || token.id,
          userRole: token.role,
          userPermissions: token.permissions || [],
          requiredPermissions: getRequiredPermissionsForRoute(pathname),
        });
        return createPermissionErrorResponse(pathname, true);
      }
    }

    // Log successful processing
    const processingTime = Date.now() - startTime;
    log("debug", "Request processed", {
      pathname,
      processingTime: `${processingTime}ms`,
      authenticated: !!token,
      permissionsChecked: !!getRequiredPermissionsForRoute(pathname),
    });

    // Proceed with request
    return addSecurityHeaders(NextResponse.next());
  } catch (error) {
    // Handle unexpected errors
    log("error", "Middleware error", {
      error: error.message,
      stack: error.stack,
      pathname,
      ip,
    });
    return new NextResponse(
      process.env.NODE_ENV === "production"
        ? "Internal Server Error"
        : `Middleware Error: ${error.message}`,
      { status: 500 }
    );
  }
}

// === Middleware Configuration ===
export const config = {
  matcher: [
    // Match all paths except static files, images, favicon, and public assets
    "/((?!_next/static|_next/image|favicon.ico|public|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)",
  ],
};

// === Rate Limit Cleanup ===
if (typeof globalThis !== "undefined") {
  const cleanup = () => {
    const now = Date.now();
    const windowStart = now - CONFIG.RATE_LIMIT.windowMs;
    for (const [ip, requests] of rateLimitStore.entries()) {
      const recentRequests = requests.filter(
        (timestamp) => timestamp > windowStart
      );
      rateLimitStore.set(ip, recentRequests.length > 0 ? recentRequests : []);
      if (recentRequests.length === 0) rateLimitStore.delete(ip);
    }
  };
  // Run cleanup every 5 minutes
  setInterval(cleanup, 5 * 60 * 1000);
}
