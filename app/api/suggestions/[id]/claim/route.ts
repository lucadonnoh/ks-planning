import { NextRequest, NextResponse } from 'next/server';
import { claimSuggestion } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { claimerId } = await request.json();
    const suggestionId = parseInt(params.id);

    if (!claimerId) {
      return NextResponse.json({ error: 'claimerId is required' }, { status: 400 });
    }

    const claimed = await claimSuggestion(suggestionId, claimerId);
    return NextResponse.json({ claimed });
  } catch (error) {
    console.error('Error claiming suggestion:', error);
    return NextResponse.json({ error: 'Failed to claim suggestion' }, { status: 500 });
  }
}
