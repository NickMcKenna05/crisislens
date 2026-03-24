import fs from 'fs';
import path from 'path';
import matter from 'gray-matter';

const scenariosDirectory = path.join(process.cwd(), 'content/scenarios');

// ENSURE THE NAME MATCHES: getAllScenarios
export function getAllScenarios() {
  // Create folder if it doesn't exist to prevent crash
  if (!fs.existsSync(scenariosDirectory)) {
    fs.mkdirSync(scenariosDirectory, { recursive: true });
    return [];
  }

  const fileNames = fs.readdirSync(scenariosDirectory);
  
  return fileNames
    .filter(fileName => fileName.endsWith('.mdx'))
    .map((fileName) => {
      // The filename (without .mdx) is the exact path Next.js needs
      const id = fileName.replace(/\.mdx$/, '');
      const fullPath = path.join(scenariosDirectory, fileName);
      const fileContents = fs.readFileSync(fullPath, 'utf8');
      const { data } = matter(fileContents);

      return {
        ...data, // Spread the markdown data FIRST
        id,      // Put the filename ID LAST so it overrides any conflicting ID in the markdown
      };
    });
}

export async function getScenarioById(id: string) {
  const fullPath = path.join(scenariosDirectory, `${id}.mdx`);
  
  // I added a better error message just in case it ever fails again!
  if (!fs.existsSync(fullPath)) {
    throw new Error(`File not found: ${fullPath}`);
  }

  const fileContents = fs.readFileSync(fullPath, 'utf8');
  const { data, content } = matter(fileContents);

  return {
    metadata: data,
    content,
  };
}