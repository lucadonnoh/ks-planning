import { NextRequest, NextResponse } from 'next/server';
import { toggleSuggestionVote } from '@/lib/db';

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { voterId } = await request.json();
    const suggestionId = parseInt(params.id);

    if (!voterId) {
      return NextResponse.json({ error: 'voterId is required' }, { status: 400 });
    }

    const voted = await toggleSuggestionVote(suggestionId, voterId);
    return NextResponse.json({ voted });
  } catch (error) {
    console.error('Error toggling vote:', error);
    return NextResponse.json({ error: 'Failed to toggle vote' }, { status: 500 });
  }
}
