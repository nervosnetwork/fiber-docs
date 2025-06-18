import { NextRequest, NextResponse } from "next/server";
import { getFiberDevLogById } from "@/app/blog/devlog";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = params;

    if (!id) {
      return NextResponse.json(
        { success: false, error: "ID parameter is required" },
        {
          status: 400,
          headers: {
            "Cache-Control": "no-cache, no-store, must-revalidate",
          },
        }
      );
    }

    const devlog = await getFiberDevLogById(id);

    if (!devlog) {
      return NextResponse.json(
        { success: false, error: "Devlog not found" },
        {
          status: 404,
          headers: {
            // Cache 404s for shorter time in case devlog becomes available
            "Cache-Control": "s-maxage=60, stale-while-revalidate=30",
          },
        }
      );
    }

    return NextResponse.json(
      {
        success: true,
        data: devlog,
        timestamp: Date.now(),
      },
      {
        headers: {
          // Cache individual devlogs for 30 minutes, serve stale for 15 minutes
          "Cache-Control": "s-maxage=1800, stale-while-revalidate=900",
          Vary: "Accept, Accept-Encoding",
        },
      }
    );
  } catch (error) {
    console.error("API Error fetching devlog by ID:", error);

    return NextResponse.json(
      {
        success: false,
        error: "Failed to fetch devlog",
      },
      {
        status: 500,
        headers: {
          "Cache-Control": "no-cache, no-store, must-revalidate",
        },
      }
    );
  }
}
