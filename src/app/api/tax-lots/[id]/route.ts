import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

/**
 * GET /api/tax-lots/[id]
 * Get a specific tax lot
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: lot, error } = await supabase
    .from("tax_lots")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (error || !lot) {
    return NextResponse.json({ error: "Tax lot not found" }, { status: 404 });
  }

  return NextResponse.json(lot);
}

/**
 * PATCH /api/tax-lots/[id]
 * Update cost basis for a tax lot (manual override)
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const body = await request.json();
  const { acquisition_price_usd, cost_basis_notes } = body;

  // Validate input
  if (typeof acquisition_price_usd !== "number" || acquisition_price_usd < 0) {
    return NextResponse.json(
      { error: "Invalid acquisition_price_usd" },
      { status: 400 }
    );
  }

  // Get current lot to validate ownership and store original values
  const { data: lot, error: fetchError } = await supabase
    .from("tax_lots")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !lot) {
    return NextResponse.json({ error: "Tax lot not found" }, { status: 404 });
  }

  // Calculate new cost basis
  const amount = parseFloat(lot.amount);
  const newCostBasis = amount * acquisition_price_usd;

  // Build update object
  const updateData: Record<string, unknown> = {
    acquisition_price_usd,
    cost_basis_usd: newCostBasis,
    is_cost_basis_override: true,
    updated_at: new Date().toISOString(),
  };

  // Store original values if this is first override
  if (!lot.is_cost_basis_override) {
    updateData.original_acquisition_price_usd = lot.acquisition_price_usd;
    updateData.original_cost_basis_usd = lot.cost_basis_usd;
  }

  // Add notes if provided
  if (cost_basis_notes !== undefined) {
    updateData.cost_basis_notes = cost_basis_notes;
  }

  // Update the lot
  const { error: updateError } = await supabase
    .from("tax_lots")
    .update(updateData)
    .eq("id", id);

  if (updateError) {
    console.error("[API] Failed to update tax lot:", updateError);
    return NextResponse.json(
      { error: "Failed to update tax lot" },
      { status: 500 }
    );
  }

  // If this lot has been disposed, we need to recalculate gain/loss
  if (lot.is_disposed && lot.proceeds_usd) {
    const newGainLoss = lot.proceeds_usd - newCostBasis;

    await supabase
      .from("tax_lots")
      .update({ gain_loss_usd: newGainLoss })
      .eq("id", id);
  }

  return NextResponse.json({
    success: true,
    acquisition_price_usd,
    cost_basis_usd: newCostBasis,
  });
}

/**
 * DELETE /api/tax-lots/[id]/override
 * Revert cost basis to original calculated value
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const supabase = await createClient();

  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  // Get current lot
  const { data: lot, error: fetchError } = await supabase
    .from("tax_lots")
    .select("*")
    .eq("id", id)
    .eq("user_id", user.id)
    .single();

  if (fetchError || !lot) {
    return NextResponse.json({ error: "Tax lot not found" }, { status: 404 });
  }

  // Check if there's an original value to restore
  if (!lot.is_cost_basis_override || !lot.original_acquisition_price_usd) {
    return NextResponse.json(
      { error: "No override to revert" },
      { status: 400 }
    );
  }

  // Restore original values
  const { error: updateError } = await supabase
    .from("tax_lots")
    .update({
      acquisition_price_usd: lot.original_acquisition_price_usd,
      cost_basis_usd: lot.original_cost_basis_usd,
      is_cost_basis_override: false,
      cost_basis_notes: null,
      updated_at: new Date().toISOString(),
    })
    .eq("id", id);

  if (updateError) {
    return NextResponse.json(
      { error: "Failed to revert override" },
      { status: 500 }
    );
  }

  // Recalculate gain/loss if disposed
  if (lot.is_disposed && lot.proceeds_usd) {
    const restoredGainLoss = lot.proceeds_usd - lot.original_cost_basis_usd;

    await supabase
      .from("tax_lots")
      .update({ gain_loss_usd: restoredGainLoss })
      .eq("id", id);
  }

  return NextResponse.json({
    success: true,
    acquisition_price_usd: lot.original_acquisition_price_usd,
    cost_basis_usd: lot.original_cost_basis_usd,
  });
}
