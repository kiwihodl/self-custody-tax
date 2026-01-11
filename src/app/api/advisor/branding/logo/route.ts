import { createClient } from '@/lib/supabase/server';
import { NextRequest, NextResponse } from 'next/server';

const MAX_FILE_SIZE = 2 * 1024 * 1024; // 2MB
const ALLOWED_TYPES = ['image/png', 'image/jpeg', 'image/jpg'];

// POST /api/advisor/branding/logo - Upload firm logo
export async function POST(request: NextRequest) {
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

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('logo') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No logo file provided' }, { status: 400 });
    }

    // Validate file type
    if (!ALLOWED_TYPES.includes(file.type)) {
      return NextResponse.json(
        { error: 'Logo must be PNG or JPEG format' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: 'Logo must be under 2MB' },
        { status: 400 }
      );
    }

    // Convert to buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Determine file extension
    const extension = file.type === 'image/png' ? 'png' : 'jpg';
    const logoPath = `${user.id}/logo.${extension}`;

    // Upload to Supabase Storage
    const { error: uploadError } = await supabase.storage
      .from('advisor-assets')
      .upload(logoPath, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (uploadError) {
      console.error('Logo upload error:', uploadError);
      return NextResponse.json(
        { error: 'Failed to upload logo. Make sure the advisor-assets bucket exists.' },
        { status: 500 }
      );
    }

    // Update advisor profile with logo path
    const { error: updateError } = await supabase
      .from('advisor_profiles')
      .upsert(
        {
          id: user.id,
          logo_path: logoPath,
          updated_at: new Date().toISOString(),
        },
        { onConflict: 'id' }
      );

    if (updateError) {
      console.error('Update profile error:', updateError);
      // Don't fail completely - logo is uploaded, just profile update failed
    }

    // Get public URL for the logo
    const { data: urlData } = supabase.storage
      .from('advisor-assets')
      .getPublicUrl(logoPath);

    return NextResponse.json({
      data: {
        logo_path: logoPath,
        logo_url: urlData.publicUrl,
      },
    });
  } catch (error) {
    console.error('Logo upload error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to upload logo' },
      { status: 500 }
    );
  }
}

// DELETE /api/advisor/branding/logo - Delete firm logo
export async function DELETE() {
  try {
    const supabase = await createClient();

    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get current logo path
    const { data: profile } = await supabase
      .from('advisor_profiles')
      .select('logo_path')
      .eq('id', user.id)
      .single();

    if (profile?.logo_path) {
      // Delete from storage
      await supabase.storage
        .from('advisor-assets')
        .remove([profile.logo_path]);
    }

    // Clear logo path in profile
    const { error: updateError } = await supabase
      .from('advisor_profiles')
      .update({
        logo_path: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    if (updateError) {
      console.error('Update profile error:', updateError);
    }

    return NextResponse.json({ data: { success: true } });
  } catch (error) {
    console.error('Logo delete error:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Failed to delete logo' },
      { status: 500 }
    );
  }
}
