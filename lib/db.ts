import { sql } from '@vercel/postgres';

// Types
export interface Person {
  id: number;
  name: string;
  topic_count?: number;
  discussed_count?: number;
}

export interface Topic {
  id: number;
  person_id: number;
  person_name?: string;
  title: string;
  description: string | null;
  created_at: string;
  vote_count?: number;
  voted_by_current_user?: boolean;
  discussed?: boolean;
}

export interface Suggestion {
  id: number;
  suggested_by: number;
  suggested_by_name?: string;
  title: string;
  description: string | null;
  created_at: string;
  vote_count?: number;
  voted_by_current_user?: boolean;
  claimed_by?: number | null;
  claimed_by_name?: string | null;
}

// Database setup
export async function setupDatabase(): Promise<void> {
  await sql`
    CREATE TABLE IF NOT EXISTS people (
      id SERIAL PRIMARY KEY,
      name VARCHAR(100) NOT NULL UNIQUE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS topics (
      id SERIAL PRIMARY KEY,
      person_id INTEGER REFERENCES people(id),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      discussed BOOLEAN DEFAULT FALSE
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS topic_votes (
      id SERIAL PRIMARY KEY,
      topic_id INTEGER REFERENCES topics(id) ON DELETE CASCADE,
      voter_id INTEGER REFERENCES people(id),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(topic_id, voter_id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS suggestions (
      id SERIAL PRIMARY KEY,
      suggested_by INTEGER REFERENCES people(id),
      title VARCHAR(255) NOT NULL,
      description TEXT,
      created_at TIMESTAMP DEFAULT NOW(),
      claimed_by INTEGER REFERENCES people(id)
    )
  `;

  await sql`
    CREATE TABLE IF NOT EXISTS suggestion_votes (
      id SERIAL PRIMARY KEY,
      suggestion_id INTEGER REFERENCES suggestions(id) ON DELETE CASCADE,
      voter_id INTEGER REFERENCES people(id),
      created_at TIMESTAMP DEFAULT NOW(),
      UNIQUE(suggestion_id, voter_id)
    )
  `;

  // Seed people
  const people = ['Piotr', 'Hubert', 'Adrian', 'Luca', 'Vincenzo', 'Antoni', 'Jan', 'Tomasz', 'Maciek', 'Matt', 'Konrad', 'Michal', 'Basti', 'Manu', 'Sergey', 'Peter', 'Bartek', 'Adi'];

  for (const name of people) {
    await sql`INSERT INTO people (name) VALUES (${name}) ON CONFLICT (name) DO NOTHING`;
  }
}

// People queries
export async function getPeople(): Promise<Person[]> {
  const { rows } = await sql`
    SELECT
      p.id,
      p.name,
      (SELECT COUNT(*)::int FROM topics t WHERE t.person_id = p.id AND (t.discussed = false OR t.discussed IS NULL)) as topic_count,
      (SELECT COUNT(*)::int FROM topics t WHERE t.person_id = p.id AND t.discussed = true) as discussed_count
    FROM people p
    ORDER BY p.name
  `;
  return rows as Person[];
}

export async function getPersonByName(name: string): Promise<Person | null> {
  const { rows } = await sql`
    SELECT id, name FROM people WHERE LOWER(name) = LOWER(${name})
  `;
  return rows[0] as Person || null;
}

// Topic queries
export async function getTopics(currentUserId?: number): Promise<Topic[]> {
  const userId = currentUserId || 0;
  const { rows } = await sql`
    SELECT
      t.id, t.person_id, t.title, t.description, t.created_at, t.discussed,
      p.name as person_name,
      COUNT(tv.id)::int as vote_count,
      CASE WHEN EXISTS(
        SELECT 1 FROM topic_votes WHERE topic_id = t.id AND voter_id = ${userId}
      ) THEN true ELSE false END as voted_by_current_user
    FROM topics t
    JOIN people p ON p.id = t.person_id
    LEFT JOIN topic_votes tv ON tv.topic_id = t.id
    WHERE t.discussed = FALSE OR t.discussed IS NULL
    GROUP BY t.id, t.person_id, t.title, t.description, t.created_at, p.name, t.discussed
    ORDER BY t.created_at DESC
  `;
  return rows as Topic[];
}

export async function getDiscussedTopics(): Promise<Topic[]> {
  const { rows } = await sql`
    SELECT
      t.id, t.person_id, t.title, t.description, t.created_at, t.discussed,
      p.name as person_name,
      COUNT(tv.id)::int as vote_count
    FROM topics t
    JOIN people p ON p.id = t.person_id
    LEFT JOIN topic_votes tv ON tv.topic_id = t.id
    WHERE t.discussed = TRUE
    GROUP BY t.id, t.person_id, t.title, t.description, t.created_at, p.name, t.discussed
    ORDER BY t.created_at DESC
  `;
  return rows as Topic[];
}

export async function markTopicDiscussed(topicId: number, discussed: boolean): Promise<boolean> {
  const { rowCount } = await sql`
    UPDATE topics SET discussed = ${discussed} WHERE id = ${topicId}
  `;
  return (rowCount ?? 0) > 0;
}

export async function getTopicsByPerson(personId: number): Promise<Topic[]> {
  const { rows } = await sql`
    SELECT t.id, t.person_id, t.title, t.description, t.created_at,
           COUNT(tv.id)::int as vote_count
    FROM topics t
    LEFT JOIN topic_votes tv ON tv.topic_id = t.id
    WHERE t.person_id = ${personId}
    GROUP BY t.id
    ORDER BY t.created_at DESC
  `;
  return rows as Topic[];
}

export async function createTopic(personId: number, title: string, description: string | null): Promise<Topic> {
  const { rows } = await sql`
    INSERT INTO topics (person_id, title, description)
    VALUES (${personId}, ${title}, ${description})
    RETURNING id, person_id, title, description, created_at
  `;
  return rows[0] as Topic;
}

export async function deleteTopic(topicId: number, personId: number): Promise<boolean> {
  const { rowCount } = await sql`
    DELETE FROM topics WHERE id = ${topicId} AND person_id = ${personId}
  `;
  return (rowCount ?? 0) > 0;
}

export async function toggleTopicVote(topicId: number, voterId: number): Promise<boolean> {
  const { rows } = await sql`
    SELECT id FROM topic_votes WHERE topic_id = ${topicId} AND voter_id = ${voterId}
  `;

  if (rows.length > 0) {
    await sql`DELETE FROM topic_votes WHERE topic_id = ${topicId} AND voter_id = ${voterId}`;
    return false;
  } else {
    await sql`INSERT INTO topic_votes (topic_id, voter_id) VALUES (${topicId}, ${voterId})`;
    return true;
  }
}

// Suggestion queries
export async function getSuggestions(currentUserId?: number): Promise<Suggestion[]> {
  const userId = currentUserId || 0;
  const { rows } = await sql`
    SELECT
      s.id, s.suggested_by, s.title, s.description, s.created_at, s.claimed_by,
      p.name as suggested_by_name,
      cp.name as claimed_by_name,
      COUNT(sv.id)::int as vote_count,
      CASE WHEN EXISTS(
        SELECT 1 FROM suggestion_votes WHERE suggestion_id = s.id AND voter_id = ${userId}
      ) THEN true ELSE false END as voted_by_current_user
    FROM suggestions s
    JOIN people p ON p.id = s.suggested_by
    LEFT JOIN people cp ON cp.id = s.claimed_by
    LEFT JOIN suggestion_votes sv ON sv.suggestion_id = s.id
    GROUP BY s.id, s.suggested_by, s.title, s.description, s.created_at, p.name, s.claimed_by, cp.name
    ORDER BY s.created_at DESC
  `;
  return rows as Suggestion[];
}

export async function createSuggestion(suggestedBy: number, title: string, description: string | null): Promise<Suggestion> {
  const { rows } = await sql`
    INSERT INTO suggestions (suggested_by, title, description)
    VALUES (${suggestedBy}, ${title}, ${description})
    RETURNING id, suggested_by, title, description, created_at
  `;
  return rows[0] as Suggestion;
}

export async function toggleSuggestionVote(suggestionId: number, voterId: number): Promise<boolean> {
  const { rows } = await sql`
    SELECT id FROM suggestion_votes WHERE suggestion_id = ${suggestionId} AND voter_id = ${voterId}
  `;

  if (rows.length > 0) {
    await sql`DELETE FROM suggestion_votes WHERE suggestion_id = ${suggestionId} AND voter_id = ${voterId}`;
    return false;
  } else {
    await sql`INSERT INTO suggestion_votes (suggestion_id, voter_id) VALUES (${suggestionId}, ${voterId})`;
    return true;
  }
}

export async function claimSuggestion(suggestionId: number, claimerId: number): Promise<boolean> {
  const { rows } = await sql`
    SELECT claimed_by FROM suggestions WHERE id = ${suggestionId}
  `;

  if (!rows[0]) return false;

  if (rows[0].claimed_by === claimerId) {
    await sql`UPDATE suggestions SET claimed_by = NULL WHERE id = ${suggestionId}`;
    return false;
  } else {
    await sql`UPDATE suggestions SET claimed_by = ${claimerId} WHERE id = ${suggestionId}`;
    return true;
  }
}
