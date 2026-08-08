import { cache } from "react";
import { getPrisma } from "@/server/db/client";
import { hasDatabaseUrl } from "@/server/db/env";
import { coreSubjects } from "@/server/subjects/catalog";

export type SubjectSummary = {
  id: string;
  name: string;
  slug: string;
  description: string;
  order: number;
  chapterCount: number;
};

export type SubjectDetail = SubjectSummary & {
  topicCount: number;
  chapters: Array<{
    id: string;
    name: string;
    slug: string;
    description: string;
    order: number;
    topicCount: number;
  }>;
};

type DataSource = "database" | "fallback";

function fallbackSubjects(): SubjectSummary[] {
  return coreSubjects.map((subject) => ({
    id: `fallback-${subject.slug}`,
    ...subject,
    chapterCount: 0,
  }));
}

export const listPublicSubjects = cache(async (): Promise<{
  subjects: SubjectSummary[];
  source: DataSource;
}> => {
  if (!hasDatabaseUrl()) {
    return { subjects: fallbackSubjects(), source: "fallback" };
  }

  try {
    const subjects = await getPrisma().subject.findMany({
      orderBy: { order: "asc" },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        order: true,
        _count: { select: { chapters: true } },
      },
    });

    return {
      source: "database",
      subjects: subjects.map(({ _count, ...subject }) => ({
        ...subject,
        chapterCount: _count.chapters,
      })),
    };
  } catch {
    console.error("Unable to load subjects from PostgreSQL; using the core subject fallback.");
    return { subjects: fallbackSubjects(), source: "fallback" };
  }
});

export const getPublicSubject = cache(async (slug: string): Promise<{
  subject: SubjectDetail | null;
  source: DataSource;
}> => {
  if (!hasDatabaseUrl()) {
    const subject = fallbackSubjects().find((item) => item.slug === slug);
    return {
      source: "fallback",
      subject: subject ? { ...subject, topicCount: 0, chapters: [] } : null,
    };
  }

  try {
    const subject = await getPrisma().subject.findUnique({
      where: { slug },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        order: true,
        chapters: {
          orderBy: { order: "asc" },
          select: {
            id: true,
            name: true,
            slug: true,
            description: true,
            order: true,
            _count: { select: { topics: true } },
          },
        },
      },
    });

    if (!subject) {
      return { subject: null, source: "database" };
    }

    const chapters = subject.chapters.map(({ _count, ...chapter }) => ({
      ...chapter,
      topicCount: _count.topics,
    }));

    return {
      source: "database",
      subject: {
        ...subject,
        chapters,
        chapterCount: chapters.length,
        topicCount: chapters.reduce((total, chapter) => total + chapter.topicCount, 0),
      },
    };
  } catch {
    console.error(`Unable to load subject "${slug}" from PostgreSQL; using the core subject fallback.`);
    const subject = fallbackSubjects().find((item) => item.slug === slug);
    return {
      source: "fallback",
      subject: subject ? { ...subject, topicCount: 0, chapters: [] } : null,
    };
  }
});
