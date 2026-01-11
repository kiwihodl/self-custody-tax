// Validate Invitation API
// GET - Check if invitation is valid

import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/admin';

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> }
) {
  const { token } = await params;

  if (!token) {
    return NextResponse.json(
      { error: 'Invitation token is required' },
      { status: 400 }
    );
  }

  const supabase = createAdminClient();

  // Find the invitation
  const { data: invite, error } = await supabase
    .from('advisor_clients')
    .select(`
      id,
      status,
      permission_level,
      invitation_expires_at,
      advisor_id,
      user_profiles!advisor_clients_advisor_id_fkey (
        email,
        full_name
      )
    `)
    .eq('invitation_token', token)
    .single();

  if (error || !invite) {
    return NextResponse.json(
      { error: 'Invalid invitation token' },
      { status: 404 }
    );
  }

  // Check if already accepted
  if (invite.status === 'active') {
    return NextResponse.json(
      { error: 'This invitation has already been accepted' },
      { status: 400 }
    );
  }

  // Check if revoked
  if (invite.status === 'revoked') {
    return NextResponse.json(
      { error: 'This invitation has been revoked' },
      { status: 400 }
    );
  }

  // Check if expired
  if (invite.invitation_expires_at && new Date(invite.invitation_expires_at) < new Date()) {
    return NextResponse.json(
      { error: 'This invitation has expired' },
      { status: 400 }
    );
  }

  // Return invite details
  // The join returns an object (not array) since it's a single relationship
  const advisorProfile = invite.user_profiles as unknown as { email: string; full_name: string | null } | null;

  return NextResponse.json({
    data: {
      advisorEmail: advisorProfile?.email || 'Unknown',
      advisorName: advisorProfile?.full_name || null,
      permissionLevel: invite.permission_level,
      expiresAt: invite.invitation_expires_at,
    },
  });
}
