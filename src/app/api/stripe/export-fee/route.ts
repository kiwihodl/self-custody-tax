import { createClient } from "@/lib/supabase/server";
import { stripe } from "@/lib/stripe/config";
import { NextResponse } from "next/server";

// Create checkout session for $21 export fee
export async function POST() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Check if user already paid
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id, has_paid_export_fee, subscription_tier")
      .eq("id", user.id)
      .single();

    // If not free tier or already paid, no need to pay
    if (profile?.subscription_tier && profile.subscription_tier !== "free") {
      return NextResponse.json({ error: "Paid tier users don't need to pay export fee" }, { status: 400 });
    }

    if (profile?.has_paid_export_fee) {
      return NextResponse.json({ error: "Export fee already paid" }, { status: 400 });
    }

    let customerId = profile?.stripe_customer_id;

    // Create Stripe customer if doesn't exist
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          supabase_user_id: user.id,
        },
      });
      customerId = customer.id;

      // Save customer ID to profile
      await supabase
        .from("user_profiles")
        .upsert({
          id: user.id,
          stripe_customer_id: customerId,
          updated_at: new Date().toISOString(),
        });
    }

    // Create checkout session for one-time payment
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "payment",
      payment_method_types: ["card"],
      line_items: [
        {
          price_data: {
            currency: "usd",
            product_data: {
              name: "Self Custody Tax - Data Export",
              description: "One-time fee to export your portfolio and tax data",
            },
            unit_amount: 2100, // $21.00 in cents
          },
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?export_paid=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?export_canceled=true`,
      metadata: {
        supabase_user_id: user.id,
        type: "export_fee",
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Export fee checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}

// Handle successful payment confirmation
export async function PATCH() {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Mark export fee as paid
    const { error } = await supabase
      .from("user_profiles")
      .update({
        has_paid_export_fee: true,
        updated_at: new Date().toISOString(),
      })
      .eq("id", user.id);

    if (error) {
      throw error;
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Failed to update export fee status:", error);
    return NextResponse.json(
      { error: "Failed to update payment status" },
      { status: 500 }
    );
  }
}
