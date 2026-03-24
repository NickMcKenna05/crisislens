"use server";

import fs from "fs/promises";
import path from "path";
import matter from "gray-matter";

export async function getDynamicScenarios() {
  // Point to where your MDX files live
  const scenariosDirectory = path.join(process.cwd(), "content/scenarios");
  
  try {
    const filenames = await fs.readdir(scenariosDirectory);
    const mdxFiles = filenames.filter((name) => name.endsWith(".mdx"));

    const scenarios = await Promise.all(
      mdxFiles.map(async (filename) => {
        const filePath = path.join(scenariosDirectory, filename);
        const fileContents = await fs.readFile(filePath, "utf8");
        
        // matter() automatically separates the YAML data from the markdown text
        const { data } = matter(fileContents);

        return {
          id: data.id || filename.replace(".mdx", ""),
          label: data.title || "Unknown Scenario",
          startDate: data.startDate || "",
          endDate: data.endDate || "",
          description: data.shortDescription || data.description || "",
          markers: data.markers || [], 
        };
      })
    );

    return scenarios;
  } catch (error) {
    console.error("Failed to read MDX scenarios:", error);
    return [];
  }
}