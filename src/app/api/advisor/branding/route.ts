import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';
import type { UpdateBrandingRequest, AdvisorProfile } from '@/lib/advisor/types';

// GET /api/advisor/branding - Get current branding settings
export async function GET() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify advisor tier
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || profile.subscription_tier !== 'advisor') {
      return NextResponse.json(
        { error: 'Advisor tier required for branding features' },
        { status: 403 }
      );
    }

    // Get or create advisor profile
    let { data: advisorProfile } = await supabase
      .from('advisor_profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    // If no profile exists, create one with defaults
    if (!advisorProfile) {
      const { data: newProfile, error: createError } = await supabase
        .from('advisor_profiles')
        .insert({
          id: user.id,
          primary_color: '#F7931A',
          secondary_color: '#1a1a2e',
          country: 'USA',
        })
        .select()
        .single();

      if (createError) {
        console.error('Error creating advisor profile:', createError);
        return NextResponse.json(
          { error: 'Failed to create advisor profile' },
          { status: 500 }
        );
      }

      advisorProfile = newProfile;
    }

    return NextResponse.json({ data: advisorProfile as AdvisorProfile });
  } catch (error) {
    console.error('Get branding error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to get branding settings' },
      { status: 500 }
    );
  }
}

// PATCH /api/advisor/branding - Update branding settings
export async function PATCH(request: NextRequest) {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Verify advisor tier
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('subscription_tier')
      .eq('id', user.id)
      .single();

    if (!profile || profile.subscription_tier !== 'advisor') {
      return NextResponse.json(
        { error: 'Advisor tier required for branding features' },
        { status: 403 }
      );
    }

    const body: UpdateBrandingRequest = await request.json();

    // Validate color formats if provided
    const hexColorRegex = /^#[0-9A-Fa-f]{6}$/;
    if (body.primary_color && !hexColorRegex.test(body.primary_color)) {
      return NextResponse.json(
        { error: 'Invalid primary color format. Use hex format: #XXXXXX' },
        { status: 400 }
      );
    }
    if (body.secondary_color && !hexColorRegex.test(body.secondary_color)) {
      return NextResponse.json(
        { error: 'Invalid secondary color format. Use hex format: #XXXXXX' },
        { status: 400 }
      );
    }
    if (body.accent_color && !hexColorRegex.test(body.accent_color)) {
      return NextResponse.json(
        { error: 'Invalid accent color format. Use hex format: #XXXXXX' },
        { status: 400 }
      );
    }

    // Upsert advisor profile
    const { data: advisorProfile, error } = await supabase
      .from('advisor_profiles')
      .upsert(
        {
          id: user.id,
          ...body,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      )
      .select()
      .single();

    if (error) {
      console.error('Update branding error:', error);
      return NextResponse.json(
        { error: 'Failed to update branding settings' },
        { status: 500 }
      );
    }

    return NextResponse.json({ data: advisorProfile as AdvisorProfile });
  } catch (error) {
    console.error('Update branding error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to update branding settings' },
      { status: 500 }
    );
  }
}
