import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function GET() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Fetch all user data
    const [walletsResult, transactionsResult, taxLotsResult, profileResult] =
      await Promise.all([
        supabase
          .from("wallets")
          .select("*")
          .eq("user_id", user.id)
          .eq("is_deleted", false),
        supabase.from("transactions").select("*").eq("user_id", user.id),
        supabase.from("tax_lots").select("*").eq("user_id", user.id),
        supabase.from("user_profiles").select("*").eq("id", user.id).single(),
      ]);

    const exportData = {
      exportDate: new Date().toISOString(),
      user: {
        id: user.id,
        email: user.email,
        createdAt: user.created_at,
      },
      profile: profileResult.data || null,
      wallets: walletsResult.data || [],
      transactions: transactionsResult.data || [],
      taxLots: taxLotsResult.data || [],
      summary: {
        walletCount: walletsResult.data?.length || 0,
        transactionCount: transactionsResult.data?.length || 0,
        taxLotCount: taxLotsResult.data?.length || 0,
      },
    };

    // Return as JSON file download
    return new NextResponse(JSON.stringify(exportData, null, 2), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Content-Disposition": `attachment; filename="self-custody-tax-export-${new Date().toISOString().split("T")[0]}.json"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return NextResponse.json(
      { error: "Failed to export data" },
      { status: 500 }
    );
  }
}
