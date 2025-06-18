import { NextRequest, NextResponse } from "next/server";
import { getFiberDevLogLists } from "@/app/blog/devlog";

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const devlogs = await getFiberDevLogLists(limit);

    return NextResponse.json(
      {
        success: true,
        data: devlogs,
        timestamp: Date.now(),
      },
      {
        headers: {
          // Cache for 10 minutes at edge, serve stale for 5 minutes while revalidating
          "Cache-Control": "s-maxage=600, stale-while-revalidate=300",
          // Add Vary header to handle different limit parameters
          Vary: "Accept, Accept-Encoding",
        },
      }
    );
  } catch (error) {
    console.error("API Error fetching devlogs:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch devlogs",
        data: [],
      },
      {
        status: 500,
        headers: {
          // Don't cache error responses
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  }
}
