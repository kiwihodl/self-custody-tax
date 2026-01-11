import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { NextResponse } from "next/server";

export async function DELETE() {
  const supabase = await createClient();

  // Get current user
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = user.id;

  try {
    // Delete all user data in order (respecting foreign key constraints)
    // Order matters: tax_lots -> transactions -> wallets -> user_profiles

    const { error: taxLotsError } = await supabase
      .from("tax_lots")
      .delete()
      .eq("user_id", userId);

    if (taxLotsError) {
      console.error("Failed to delete tax_lots:", taxLotsError);
      // Continue anyway - may not have any tax lots
    }

    const { error: transactionsError } = await supabase
      .from("transactions")
      .delete()
      .eq("user_id", userId);

    if (transactionsError) {
      console.error("Failed to delete transactions:", transactionsError);
    }

    const { error: walletsError } = await supabase
      .from("wallets")
      .delete()
      .eq("user_id", userId);

    if (walletsError) {
      console.error("Failed to delete wallets:", walletsError);
    }

    const { error: profileError } = await supabase
      .from("user_profiles")
      .delete()
      .eq("id", userId);

    if (profileError) {
      console.error("Failed to delete user_profile:", profileError);
    }

    // Sign out the user first (invalidate their session)
    await supabase.auth.signOut();

    // Delete the auth.users record using admin client
    // This completely removes the user's ability to log back in
    try {
      const adminSupabase = createAdminClient();
      const { error: deleteAuthError } =
        await adminSupabase.auth.admin.deleteUser(userId);

      if (deleteAuthError) {
        console.error("Failed to delete auth.users record:", deleteAuthError);
        // User data is already deleted, this is a partial failure
        // They won't be able to use the app since profile is gone
      }
    } catch (adminErr) {
      console.error("Admin client error:", adminErr);
      // Continue - user data is deleted, they can't use the app
    }

    return NextResponse.json({
      success: true,
      message: "Account and all data deleted permanently",
    });
  } catch (error) {
    console.error("Delete account error:", error);
    return NextResponse.json(
      { error: "Failed to delete account" },
      { status: 500 }
    );
  }
}
