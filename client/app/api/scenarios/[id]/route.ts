import { getScenarioById } from "@/lib/scenarios";
import { NextResponse } from "next/server";

export async function GET(
  request: Request,
  // Note: params is now wrapped in a Promise type
  { params }: { params: Promise<{ id: string }> } 
) {
  // FIX: You must await the params object in Next.js 15
  const { id } = await params;

  try {
    const data = await getScenarioById(id);
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error fetching scenario:", error);
    return NextResponse.json(
      { error: "Scenario not found" }, 
      { status: 404 }
    );
  }
}