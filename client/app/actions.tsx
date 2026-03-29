"use server";

import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

type ScenarioMarker = {
  date: string;
  label: string;
};

type DynamicScenario = {
  id: string;
  label: string;
  startDate: string;
  endDate: string;
  description: string;
  markers: ScenarioMarker[];
};

function parseDateRange(dateRange?: string): { startDate: string; endDate: string } {
  if (!dateRange) {
    return { startDate: "", endDate: "" };
  }

  const normalized = dateRange.replace(/–/g, "-").replace(/\s+-\s+/g, " - ");
  const parts = normalized.split(" - ").map((item) => item.trim());

  if (parts.length === 2) {
    const start = new Date(parts[0]);
    const end = new Date(parts[1]);

    return {
      startDate: Number.isNaN(start.getTime()) ? "" : start.toISOString().slice(0, 10),
      endDate: Number.isNaN(end.getTime()) ? "" : end.toISOString().slice(0, 10),
    };
  }

  const single = new Date(normalized);
  if (!Number.isNaN(single.getTime())) {
    const iso = single.toISOString().slice(0, 10);
    return { startDate: iso, endDate: iso };
  }

  return { startDate: "", endDate: "" };
}

export async function getDynamicScenarios(): Promise<DynamicScenario[]> {
  const scenariosDirectory = path.join(process.cwd(), "content/scenarios");

  try {
    const filenames = await fs.readdir(scenariosDirectory);
    const scenarioFiles = filenames.filter(
      (name) => name.endsWith(".mdx") || name.endsWith(".mx")
    );

    const scenarios = await Promise.all(
      scenarioFiles.map(async (filename) => {
        const filePath = path.join(scenariosDirectory, filename);
        const fileContents = await fs.readFile(filePath, "utf8");
        const { data } = matter(fileContents);

        const derivedDates = parseDateRange(data.dateRange);

        return {
          id: data.id || filename.replace(/\.(mdx|mx)$/, ""),
          label: data.title || "Unknown Scenario",
          startDate: data.startDate || derivedDates.startDate || "",
          endDate: data.endDate || derivedDates.endDate || "",
          description: data.shortDescription || data.description || "",
          markers: Array.isArray(data.markers) ? data.markers : [],
        };
      })
    );

    return scenarios.sort((a, b) => a.label.localeCompare(b.label));
  } catch (error) {
    console.error("Failed to read scenario files:", error);
    return [];
  }
}