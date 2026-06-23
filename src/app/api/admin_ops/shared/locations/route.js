import { z } from "zod";

import {
  createSuccessResponse,
  handleApiError,
} from "@/utils/server/apiResponse";

import { requirePermission } from "@/utils/server/requirePermission";

import { Country, State, City } from "country-state-city";

export async function GET(req) {
  try {
    const [permissionError] = await requirePermission(req);
    if (permissionError) return permissionError;

    const { searchParams } = new URL(req.url);

    /* ----------------------------------------
       INLINE ZOD SCHEMA
    ---------------------------------------- */
    const filters = z
      .object({
        type: z.enum(["country", "state", "city"]),
        country_code: z.string().optional(),
        state_code: z.string().optional(),
      })
      .parse({
        type: searchParams.get("type"),
        country_code: searchParams.get("country_code") ?? undefined,
        state_code: searchParams.get("state_code") ?? undefined,
      });

    let data = [];

    /* ----------------------------------------
       COUNTRY
    ---------------------------------------- */
    if (filters.type === "country") {
      data = Country.getAllCountries().map((c) => ({
        name: c.name,
        isoCode: c.isoCode,
      }));
    }

    /* ----------------------------------------
       STATE
    ---------------------------------------- */
    if (filters.type === "state") {
      if (!filters.country_code) {
        throw new Error("country_code is required");
      }

      data = State.getStatesOfCountry(filters.country_code).map((s) => ({
        name: s.name,
        isoCode: s.isoCode,
      }));
    }

    /* ----------------------------------------
       CITY
    ---------------------------------------- */
    if (filters.type === "city") {
      if (!filters.country_code || !filters.state_code) {
        throw new Error("country_code and state_code are required");
      }

      data = City.getCitiesOfState(
        filters.country_code,
        filters.state_code,
      ).map((c) => ({
        name: c.name,
        isoCode: c.name,
      }));
    }

    return createSuccessResponse("Geo data retrieved successfully", data);
  } catch (e) {
    return handleApiError(e);
  }
}
