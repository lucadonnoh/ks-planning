import { NextResponse } from 'next/server';
import { getDiscussedTopics } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const topics = await getDiscussedTopics();
    return NextResponse.json(topics, {
      headers: { 'Cache-Control': 'no-store, max-age=0' }
    });
  } catch (error) {
    console.error('Error fetching discussed topics:', error);
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
  }
}
