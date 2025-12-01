import { NextResponse } from 'next/server';
import { getDiscussedTopics } from '@/lib/db';

export async function GET() {
  try {
    const topics = await getDiscussedTopics();
    return NextResponse.json(topics);
  } catch (error) {
    console.error('Error fetching discussed topics:', error);
    return NextResponse.json({ error: 'Failed to fetch topics' }, { status: 500 });
  }
}
