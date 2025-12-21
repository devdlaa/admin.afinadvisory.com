
import { z } from "zod";
import {
  createSuccessResponse,
  createErrorResponse,
} from "@/utils/resposeHandlers";
import { smartSearch } from "@/lib/algoliaSync";


// Zod schema for search input
const SearchSchema = z.object({
  query: z.string().trim().min(1, "Search query cannot be empty").max(100),
  page: z.number().int().min(0).default(0),
  hitsPerPage: z.number().int().positive().max(50).default(20),
  isCrmUser: z.boolean().optional(),
  attributesToRetrieve: z.array(z.string()).optional(),
});

export async function POST(req) {
  const startTime = Date.now();

  try {
 

    // Parse and validate request body
    let body;
    try {
      const bodyText = await req.text();
      if (!bodyText.trim()) {
        return createErrorResponse(
          "Request body cannot be empty",
          400,
          "EMPTY_BODY"
        );
      }
      body = JSON.parse(bodyText);
    } catch (parseError) {
      return createErrorResponse(
        "Invalid JSON in request body",
        400,
        "INVALID_JSON",
        [{ message: parseError.message }]
      );
    }

    // Validate with Zod
    const parsed = SearchSchema.safeParse(body);

    if (!parsed.success) {
      const validationErrors = parsed.error.errors.map((err) => ({
        field: err.path.join("."),
        message: err.message,
        code: err.code,
      }));

      return createErrorResponse(
        "Validation failed",
        400,
        "VALIDATION_ERROR",
        validationErrors
      );
    }

    const { query, page, hitsPerPage, isCrmUser, attributesToRetrieve } =
      parsed.data;

    // Perform smart search
    let searchResults;
    try {
      searchResults = await smartSearch(query, {
        page,
        hitsPerPage,
        isCrmUser,
        attributesToRetrieve,
      });
    } catch (searchError) {
      console.error("Algolia search error:", searchError);
      return createErrorResponse(
        "Search operation failed",
        500,
        "SEARCH_FAILED",
        [{ message: searchError.message }]
      );
    }

    const executionTimeMs = Date.now() - startTime;

    // Format response
    const responseData = {
      results: searchResults.hits,
      searchType: searchResults.searchType,
      pagination: {
        page: searchResults.page,
        hitsPerPage: searchResults.hitsPerPage,
        totalHits: searchResults.nbHits,
        totalPages: searchResults.nbPages,
        hasMore: searchResults.page < searchResults.nbPages - 1,
      },
      query: searchResults.query,
    };

    return createSuccessResponse(
      "Search completed successfully",
      responseData,
      { executionTimeMs }
    );
  } catch (err) {
    console.error("Search customers API error:", err);
    return createErrorResponse(
      "An unexpected error occurred during search",
      500,
      "INTERNAL_SERVER_ERROR",
      [{ message: err.message }]
    );
  }
}
