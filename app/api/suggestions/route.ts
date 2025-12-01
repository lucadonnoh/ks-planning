import { NextRequest, NextResponse } from 'next/server';
import { getSuggestions, createSuggestion } from '@/lib/db';

export async function GET(request: NextRequest) {
  try {
    const userId = request.nextUrl.searchParams.get('userId');
    const suggestions = await getSuggestions(userId ? parseInt(userId) : undefined);
    return NextResponse.json(suggestions);
  } catch (error) {
    console.error('Error fetching suggestions:', error);
    return NextResponse.json({ error: 'Failed to fetch suggestions' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const { suggestedBy, title, description } = await request.json();

    if (!suggestedBy || !title) {
      return NextResponse.json({ error: 'suggestedBy and title are required' }, { status: 400 });
    }

    const suggestion = await createSuggestion(suggestedBy, title, description || null);
    return NextResponse.json(suggestion);
  } catch (error) {
    console.error('Error creating suggestion:', error);
    return NextResponse.json({ error: 'Failed to create suggestion' }, { status: 500 });
  }
}
