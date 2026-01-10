import { createClient } from "@/lib/supabase/server";
import { NextResponse } from "next/server";

export async function DELETE() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Delete all user data in order (respecting foreign key constraints)
    // 1. Delete tax lots first (references transactions)
    await supabase.from("tax_lots").delete().eq("user_id", user.id);

    // 2. Delete transactions (references wallets)
    await supabase.from("transactions").delete().eq("user_id", user.id);

    // 3. Delete wallets
    await supabase.from("wallets").delete().eq("user_id", user.id);

    // 4. Delete user profile
    await supabase.from("user_profiles").delete().eq("id", user.id);

    // 5. Sign out the user
    await supabase.auth.signOut();

    // Note: The actual auth.users record deletion would need to be done
    // via Supabase admin API or a database trigger. For now, we've deleted
    // all user data and signed them out.

    return NextResponse.json({
      success: true,
      message: "Account data deleted successfully",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
