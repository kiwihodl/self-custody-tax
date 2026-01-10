import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { detectInternalTransfers } from "@/lib/bitcoin/internalTransfers";

export async function POST() {
  try {
    const supabase = await createClient();

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Detect internal transfers
    const result = await detectInternalTransfers(supabase, user.id);

    return NextResponse.json({
      success: true,
      detected: result.detected,
      linked: result.linked,
      message: `Found ${result.detected} internal transfers, linked ${result.linked} transaction pairs`,
    });
  } catch (error) {
    console.error("Internal transfer detection error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Detection failed" },
      { status: 500 }
    );
  }
}
