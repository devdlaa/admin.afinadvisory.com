// app/api/businesses/[id]/route.js
import fadmin from "@/lib/firebase-admin";
import { auth } from "@/utils/auth";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";

export async function GET(request) {
  try {
    const session = await auth();
    if (!session?.user) {
      return createErrorResponse(
        "Unauthorized - Please login to continue",
        401,
        "AUTH_REQUIRED"
      );
    }

    const { searchParams } = new URL(request.url);

    // Pagination params
    const page = parseInt(searchParams.get("page") || "1");
    const limit = Math.min(parseInt(searchParams.get("limit") || "20"), 100);

    // Search & filter params
    const search = searchParams.get("search") || "";
    const createdBy = searchParams.get("createdBy") || null;
    const includeDeleted = searchParams.get("includeDeleted") === "true";

    const db = fadmin.firestore();
    let query = db.collection("businesses");

    // Soft delete filter
    if (!includeDeleted) {
      query = query.where("flags.softDeleted", "==", false);
    }

    // Search by name
    if (search) {
      const searchLower = search.toLowerCase();
      query = query
        .orderBy("name")
        .startAt(searchLower)
        .endAt(searchLower + "\uf8ff");
    } else {
      query = query.orderBy("createdAt", "desc");
    }

    // Get total count
    const countSnapshot = await query.get();
    const total = countSnapshot.size;

    // Apply pagination
    const offset = (page - 1) * limit;
    query = query.limit(limit).offset(offset);

    const snapshot = await query.get();

    const businesses = snapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    return createSuccessResponse(
      "Businesses retrieved successfully",
      businesses,
      {
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
          hasMore: page * limit < total,
        },
        filters: {
          search,
          createdBy,
          includeDeleted,
        },
      }
    );
  } catch (error) {
    console.error("Error fetching businesses:", error);
    return createErrorResponse(
      error.message || "Failed to fetch businesses",
      500,
      "INTERNAL_SERVER_ERROR"
    );
  }
}
