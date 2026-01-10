import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { syncBitcoinWallet } from "@/lib/bitcoin/sync";
import { syncEthereumWallet } from "@/lib/ethereum/sync";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cookieStore = await cookies();

    // Debug: log available cookies
    const allCookies = cookieStore.getAll();
    console.log("Available cookies:", allCookies.map(c => c.name));

    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          getAll() {
            return cookieStore.getAll();
          },
          setAll(cookiesToSet: { name: string; value: string; options?: CookieOptions }[]) {
            try {
              cookiesToSet.forEach(({ name, value, options }) => {
                cookieStore.set(name, value, options);
              });
            } catch {
              // Ignore errors in Server Components
            }
          },
        },
      }
    );

    // Get current user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    console.log("Sync auth check - user:", user?.id, "error:", authError?.message);

    if (authError || !user) {
      return NextResponse.json({
        error: "Session expired. Please refresh the page and try again.",
        details: authError?.message
      }, { status: 401 });
    }

    // Get the wallet (ensures user owns it via RLS)
    const { data: wallet, error: walletError } = await supabase
      .from("wallets")
      .select("*")
      .eq("id", id)
      .eq("is_deleted", false)
      .single();

    if (walletError || !wallet) {
      return NextResponse.json({ error: "Wallet not found" }, { status: 404 });
    }

    // Route to appropriate sync based on network
    if (wallet.network === "bitcoin") {
      const result = await syncBitcoinWallet(supabase, wallet);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Sync failed" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        newTransactions: result.newTransactions,
        balance: result.totalBalance,
      });
    } else if (wallet.network === "ethereum") {
      const result = await syncEthereumWallet(supabase, wallet);

      if (!result.success) {
        return NextResponse.json(
          { error: result.error || "Sync failed" },
          { status: 500 }
        );
      }

      return NextResponse.json({
        success: true,
        newTransactions: result.transactionsAdded,
        balance: result.balances.reduce((sum, b) => sum + parseFloat(b.balance), 0),
        balances: result.balances,
      });
    } else {
      return NextResponse.json(
        { error: `Unsupported network: ${wallet.network}` },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error("Sync API error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
