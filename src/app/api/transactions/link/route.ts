import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { linkTransactions, unlinkTransactions } from "@/lib/bitcoin/internalTransfers";

export async function POST(request: NextRequest) {
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

    const body = await request.json();
    const { txId1, txId2 } = body;

    if (!txId1 || !txId2) {
      return NextResponse.json(
        { error: "Both transaction IDs are required" },
        { status: 400 }
      );
    }

    if (txId1 === txId2) {
      return NextResponse.json(
        { error: "Cannot link a transaction to itself" },
        { status: 400 }
      );
    }

    const success = await linkTransactions(supabase, user.id, txId1, txId2);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to link transactions. Ensure both belong to you." },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transactions linked as internal transfer",
    });
  } catch (error) {
    console.error("Transaction link error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Link failed" },
      { status: 500 }
    );
  }
}

export async function DELETE(request: NextRequest) {
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

    const { searchParams } = new URL(request.url);
    const txId = searchParams.get("txId");

    if (!txId) {
      return NextResponse.json(
        { error: "Transaction ID is required" },
        { status: 400 }
      );
    }

    const success = await unlinkTransactions(supabase, user.id, txId);

    if (!success) {
      return NextResponse.json(
        { error: "Failed to unlink transaction" },
        { status: 400 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "Transaction unlinked",
    });
  } catch (error) {
    console.error("Transaction unlink error:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Unlink failed" },
      { status: 500 }
    );
  }
}
