import { createClient } from "@/lib/supabase/server";
import { stripe, getPriceId } from "@/lib/stripe/config";
import { SUBSCRIPTION_TIERS, SubscriptionTier } from "@/lib/stripe/tiers";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const supabase = await createClient();

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { tier } = await request.json();

    if (!tier || !SUBSCRIPTION_TIERS[tier as SubscriptionTier]) {
      return NextResponse.json({ error: "Invalid tier" }, { status: 400 });
    }

    const priceId = getPriceId(tier as SubscriptionTier);

    if (!priceId) {
      return NextResponse.json(
        { error: "This tier is free and does not require payment" },
        { status: 400 }
      );
    }

    // Check if user already has a Stripe customer ID
    const { data: profile } = await supabase
      .from("user_profiles")
      .select("stripe_customer_id")
      .eq("id", user.id)
      .single();

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

    // Create checkout session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      payment_method_types: ["card"],
      line_items: [
        {
          price: priceId,
          quantity: 1,
        },
      ],
      success_url: `${process.env.NEXT_PUBLIC_APP_URL}/settings?success=true`,
      cancel_url: `${process.env.NEXT_PUBLIC_APP_URL}/pricing?canceled=true`,
      subscription_data: {
        trial_period_days: 14,
        metadata: {
          supabase_user_id: user.id,
          tier,
        },
      },
    });

    return NextResponse.json({ url: session.url });
  } catch (error) {
    console.error("Checkout error:", error);
    return NextResponse.json(
      { error: "Failed to create checkout session" },
      { status: 500 }
    );
  }
}
