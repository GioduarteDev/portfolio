export const PROJECT_FILTERS = [
  "All",
  "Branding",
  "Digital",
  "Motion",
  "Experiment",
] as const;

export type ProjectFilter =
  (typeof PROJECT_FILTERS)[number];

export type ProjectCategory = Exclude<ProjectFilter, "All">;

export type ProjectItem = {
  id: string;
  slug: string;
  title: string;
  categories: ProjectCategory[];
  year: number;
  media: string;
  aspectRatio: number;
  column: 0 | 1;
  description: string;
  credits: Array<{
    role: string;
    name: string;
  }>;
  gallery: string[];
  previous: string | null;
  next: string | null;
};

export const PROJECT_LIMIT = 20;

type ProjectDefinition = Pick<
  ProjectItem,
  | "id"
  | "slug"
  | "title"
  | "categories"
  | "year"
  | "media"
  | "aspectRatio"
  | "column"
>;

const createProject = (
  definition: ProjectDefinition,
): ProjectItem => ({
  ...definition,
  description:
    "Placeholder project content for the independent academic reconstruction.",
  credits: [
    { role: "Project", name: "Academic reconstruction placeholder" },
  ],
  gallery: [definition.media],
  previous: null,
  next: null,
});

export const projects: ProjectItem[] = [
  createProject({
    id: "project-01",
    slug: "soft-forms",
    title: "Soft Forms",
    categories: ["Digital", "Experiment"],
    year: 2026,
    media: "/projects/placeholders/placeholder-soft-forms.svg",
    aspectRatio: 1.42,
    column: 0,
  }),
  createProject({
    id: "project-02",
    slug: "still-water",
    title: "Still Water",
    categories: ["Branding"],
    year: 2026,
    media: "/projects/placeholders/placeholder-still-water.svg",
    aspectRatio: 0.82,
    column: 1,
  }),
  createProject({
    id: "project-03",
    slug: "quiet-architecture",
    title: "Quiet Architecture",
    categories: ["Digital"],
    year: 2025,
    media: "/projects/placeholders/placeholder-quiet-architecture.svg",
    aspectRatio: 1.24,
    column: 0,
  }),
  createProject({
    id: "project-04",
    slug: "garden-study",
    title: "Garden Study",
    categories: ["Motion", "Experiment"],
    year: 2025,
    media: "/projects/placeholders/placeholder-garden-study.svg",
    aspectRatio: 1,
    column: 1,
  }),
  createProject({
    id: "project-05",
    slug: "material-memory",
    title: "Material Memory",
    categories: ["Branding"],
    year: 2024,
    media: "/projects/placeholders/placeholder-soft-forms.svg",
    aspectRatio: 1.42,
    column: 0,
  }),
  createProject({
    id: "project-06",
    slug: "open-house",
    title: "Open House",
    categories: ["Digital", "Motion"],
    year: 2024,
    media: "/projects/placeholders/placeholder-quiet-architecture.svg",
    aspectRatio: 1.24,
    column: 1,
  }),
  createProject({
    id: "project-07",
    slug: "slow-landscape",
    title: "Slow Landscape",
    categories: ["Experiment"],
    year: 2023,
    media: "/projects/placeholders/placeholder-garden-study.svg",
    aspectRatio: 1,
    column: 0,
  }),
  createProject({
    id: "project-08",
    slug: "soft-current",
    title: "Soft Current",
    categories: ["Motion"],
    year: 2023,
    media: "/projects/placeholders/placeholder-still-water.svg",
    aspectRatio: 0.82,
    column: 1,
  }),
  createProject({
    id: "project-09",
    slug: "living-lines",
    title: "Living Lines",
    categories: ["Branding", "Digital"],
    year: 2023,
    media: "/projects/placeholders/placeholder-quiet-architecture.svg",
    aspectRatio: 1.42,
    column: 0,
  }),
  createProject({
    id: "project-10",
    slug: "light-study",
    title: "Light Study",
    categories: ["Motion", "Experiment"],
    year: 2022,
    media: "/projects/placeholders/placeholder-garden-study.svg",
    aspectRatio: 1.24,
    column: 1,
  }),
  createProject({
    id: "project-11",
    slug: "common-ground",
    title: "Common Ground",
    categories: ["Branding"],
    year: 2022,
    media: "/projects/placeholders/placeholder-soft-forms.svg",
    aspectRatio: 1,
    column: 0,
  }),
  createProject({
    id: "project-12",
    slug: "tender-machines",
    title: "Tender Machines",
    categories: ["Digital", "Motion"],
    year: 2022,
    media: "/projects/placeholders/placeholder-still-water.svg",
    aspectRatio: 0.82,
    column: 1,
  }),
  createProject({
    id: "project-13",
    slug: "slow-objects",
    title: "Slow Objects",
    categories: ["Experiment"],
    year: 2021,
    media: "/projects/placeholders/placeholder-garden-study.svg",
    aspectRatio: 1.42,
    column: 0,
  }),
  createProject({
    id: "project-14",
    slug: "open-fields",
    title: "Open Fields",
    categories: ["Branding", "Digital"],
    year: 2021,
    media: "/projects/placeholders/placeholder-quiet-architecture.svg",
    aspectRatio: 1.24,
    column: 1,
  }),
  createProject({
    id: "project-15",
    slug: "soft-systems",
    title: "Soft Systems",
    categories: ["Digital"],
    year: 2020,
    media: "/projects/placeholders/placeholder-soft-forms.svg",
    aspectRatio: 1,
    column: 0,
  }),
  createProject({
    id: "project-16",
    slug: "afterimage",
    title: "Afterimage",
    categories: ["Motion", "Experiment"],
    year: 2020,
    media: "/projects/placeholders/placeholder-still-water.svg",
    aspectRatio: 0.82,
    column: 1,
  }),
  createProject({
    id: "project-17",
    slug: "new-nature",
    title: "New Nature",
    categories: ["Branding"],
    year: 2019,
    media: "/projects/placeholders/placeholder-garden-study.svg",
    aspectRatio: 1.42,
    column: 0,
  }),
  createProject({
    id: "project-18",
    slug: "quiet-motion",
    title: "Quiet Motion",
    categories: ["Motion"],
    year: 2019,
    media: "/projects/placeholders/placeholder-quiet-architecture.svg",
    aspectRatio: 1.24,
    column: 1,
  }),
  createProject({
    id: "project-19",
    slug: "material-play",
    title: "Material Play",
    categories: ["Digital", "Experiment"],
    year: 2018,
    media: "/projects/placeholders/placeholder-soft-forms.svg",
    aspectRatio: 1,
    column: 0,
  }),
  createProject({
    id: "project-20",
    slug: "soft-edges",
    title: "Soft Edges",
    categories: ["Branding", "Motion"],
    year: 2018,
    media: "/projects/placeholders/placeholder-still-water.svg",
    aspectRatio: 0.82,
    column: 1,
  }),
];

projects.forEach((project, index) => {
  project.previous = projects[index - 1]?.slug ?? null;
  project.next = projects[index + 1]?.slug ?? null;
});

if (import.meta.env.DEV && projects.length !== PROJECT_LIMIT) {
  throw new Error(
    `Projects gallery requires exactly ${PROJECT_LIMIT} projects; received ${projects.length}.`,
  );
}

export const PROJECT_ITEMS = projects;

export const getProjectBySlug = (slug: string) =>
  projects.find((project) => project.slug === slug) ?? null;
