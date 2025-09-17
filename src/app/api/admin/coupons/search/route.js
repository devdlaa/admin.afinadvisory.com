import { NextResponse } from "next/server";
import { connectToDatabase } from "@/utils/mongodb";
import Coupon from "@/models/Coupon";
import admin from "@/lib/firebase-admin";
import { z } from "zod";
import { requirePermission } from "@/lib/requirePermission";


const searchCouponSchema = z.object({
  searchTerm: z.string().trim().min(1, "Search term is required").max(100, "Search term too long"),
  searchType: z.enum(["code", "influencer_email", "influencer_phone"], {
    required_error: "Search type is required"
  }),
  limit: z.number().int().min(1).max(50).default(20).optional()
});


function detectField(value) {
  if (/^\+?\d{7,15}$/.test(value)) return "phone";

  if (/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) return "email";

  return "code";
}

export async function POST(req) {
  try {
    // Permission check placeholder
    const permissionCheck = await requirePermission(req, "coupons.access");
    if (permissionCheck) return permissionCheck;

    await connectToDatabase();

    const body = await req.json();
    
    const validation = searchCouponSchema.safeParse(body);
    if (!validation.success) {
      const errors = validation.error.issues.map(
        issue => `${issue.path.join(".")}: ${issue.message}`
      );
      return NextResponse.json({
        success: false,
        error: "Validation failed",
        details: errors,
        timestamp: new Date().toISOString()
      }, { status: 400 });
    }

    const { searchTerm, searchType, limit = 20 } = validation.data;
    const matchedFeild = detectField(searchTerm);
    let coupons = [];
    let searchMetadata = {
      searchTerm,
      searchType,
      timestamp: new Date().toISOString()
    };

    switch (matchedFeild) {
      case 'code':
        try {
          coupons = await Coupon.find({
            code: { $regex: searchTerm, $options: 'i' }
          })
          .sort({ createdAt: -1 })
          .limit(limit)
          .select('-__v')
          .lean();

          searchMetadata.directMatch = true;
        } catch (dbError) {
          console.error("🔥 Database error searching coupons by code:", dbError);
          return NextResponse.json({
            success: false,
            error: "Database error during coupon search",
            timestamp: new Date().toISOString()
          }, { status: 500 });
        }
        break;

      case 'email':
        try {
          // Validate email format
          const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
          if (!emailRegex.test(searchTerm)) {
            return NextResponse.json({
              success: false,
              error: "Invalid email format",
              timestamp: new Date().toISOString()
            }, { status: 400 });
          }

          // Search in Firebase
          const db = admin.firestore();
          const influencersSnapshot = await db
            .collection('influencers')
            .where('email', '==', searchTerm.toLowerCase())
            .limit(10) // Limit Firebase query
            .get();

          if (influencersSnapshot.empty) {
            searchMetadata.influencersFound = 0;
            return NextResponse.json({
              success: true,
              message: "No influencer found with this email address",
              data: {
                coupons: [],
                searchMetadata
              },
              timestamp: new Date().toISOString()
            }, { status: 200 });
          }

          // Extract influencer IDs
          const influencerIds = influencersSnapshot.docs.map(doc => doc.id);
          searchMetadata.influencersFound = influencerIds.length;
          searchMetadata.influencerIds = influencerIds;

          // Search coupons by influencer IDs
          coupons = await Coupon.find({
            influencerId: { $in: influencerIds }
          })
          .sort({ createdAt: -1 })
          .limit(limit)
          .select('-__v')
          .lean();

        } catch (firebaseError) {
          console.error("🔥 Firebase error searching influencers by email:", firebaseError);
          return NextResponse.json({
            success: false,
            error: "Error searching influencer database",
            timestamp: new Date().toISOString()
          }, { status: 500 });
        }
        break;

      case 'phone':
        try {
          // Basic phone validation - remove spaces, dashes, and check length
          const cleanPhone = searchTerm.replace(/[\s-()]/g, '');
          if (cleanPhone.length < 10 || cleanPhone.length > 15) {
            return NextResponse.json({
              success: false,
              error: "Invalid phone number format",
              timestamp: new Date().toISOString()
            }, { status: 400 });
          }

          // Search in Firebase
          const db = admin.firestore();
          const influencersSnapshot = await db
            .collection('influencers')
            .where('mobile', '==', cleanPhone)
            .limit(10) // Limit Firebase query
            .get();

          if (influencersSnapshot.empty) {
            searchMetadata.influencersFound = 0;
            return NextResponse.json({
              success: true,
              message: "No influencer found with this phone number",
              data: {
                coupons: [],
                searchMetadata
              },
              timestamp: new Date().toISOString()
            }, { status: 200 });
          }

          // Extract influencer IDs
          const influencerIds = influencersSnapshot.docs.map(doc => doc.id);
          searchMetadata.influencersFound = influencerIds.length;
          searchMetadata.influencerIds = influencerIds;

          // Search coupons by influencer IDs
          coupons = await Coupon.find({
            influencerId: { $in: influencerIds }
          })
          .sort({ createdAt: -1 })
          .limit(limit)
          .select('-__v')
          .lean();

        } catch (firebaseError) {
          console.error("🔥 Firebase error searching influencers by phone:", firebaseError);
          return NextResponse.json({
            success: false,
            error: "Error searching influencer database",
            timestamp: new Date().toISOString()
          }, { status: 500 });
        }
        break;

      default:
        return NextResponse.json({
          success: false,
          error: "Invalid search type",
          timestamp: new Date().toISOString()
        }, { status: 400 });
    }

    // Add search result metadata
    searchMetadata.resultsCount = coupons.length;
    searchMetadata.limitApplied = limit;

    // Success response
    const message = coupons.length > 0 
      ? `Found ${coupons.length} coupon(s) for ${matchedFeild} search`
      : `No coupons found for ${matchedFeild} search`;

    return NextResponse.json({
      success: true,
      message,
      data: {
        coupons,
        searchMetadata
      },
      timestamp: new Date().toISOString()
    }, { status: 200 });

  } catch (error) {
    console.error("🔥 Unexpected error during coupon search:", error);
    return NextResponse.json({
      success: false,
      error: "Search operation failed. Please try again later.",
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}