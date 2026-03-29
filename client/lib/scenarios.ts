import fs from "fs";
import path from "path";
import matter from "gray-matter";

const scenariosDirectory = path.join(process.cwd(), "content/scenarios");

type ScenarioMeta = Record<string, any>;

function parseDateRange(dateRange?: string): { startDate?: string; endDate?: string } {
  if (!dateRange) return {};

  const normalized = dateRange.replace(/–/g, "-").replace(/\s+-\s+/g, " - ");
  const parts = normalized.split(" - ").map((item) => item.trim());

  if (parts.length === 2) {
    const start = new Date(parts[0]);
    const end = new Date(parts[1]);

    return {
      startDate: Number.isNaN(start.getTime()) ? undefined : start.toISOString().slice(0, 10),
      endDate: Number.isNaN(end.getTime()) ? undefined : end.toISOString().slice(0, 10),
    };
  }

  const single = new Date(normalized);
  if (!Number.isNaN(single.getTime())) {
    const iso = single.toISOString().slice(0, 10);
    return { startDate: iso, endDate: iso };
  }

  return {};
}

function normalizeScenario(id: string, data: ScenarioMeta) {
  const derivedDates = parseDateRange(data.dateRange);

  return {
    id,
    ...data,
    description: data.description || data.shortDescription || "",
    startDate: data.startDate || derivedDates.startDate || "",
    endDate: data.endDate || derivedDates.endDate || "",
    markers: Array.isArray(data.markers) ? data.markers : [],
  };
}

export function getAllScenarios() {
  if (!fs.existsSync(scenariosDirectory)) {
    fs.mkdirSync(scenariosDirectory, { recursive: true });
    return [];
  }

  const fileNames = fs
    .readdirSync(scenariosDirectory)
    .filter((fileName) => fileName.endsWith(".mdx") || fileName.endsWith(".mx"));

  return fileNames
    .map((fileName) => {
      const id = fileName.replace(/\.(mdx|mx)$/, "");
      const fullPath = path.join(scenariosDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, "utf8");
      const { data } = matter(fileContents);

      return normalizeScenario(id, data);
    })
    .sort((a, b) => String(a.title || a.label || a.id).localeCompare(String(b.title || b.label || b.id)));
}

export async function getScenarioById(id: string) {
  const candidatePaths = [
    path.join(scenariosDirectory, `${id}.mdx`),
    path.join(scenariosDirectory, `${id}.mx`),
  ];

  const fullPath = candidatePaths.find((candidate) => fs.existsSync(candidate));

  if (!fullPath) {
    throw new Error(`File not found for scenario: ${id}`);
  }

  const fileContents = fs.readFileSync(fullPath, "utf8");
  const { data, content } = matter(fileContents);

  return {
    metadata: normalizeScenario(id, data),
    content,
  };
}