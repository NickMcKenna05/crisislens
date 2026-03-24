import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getScenarioById } from '@/lib/scenarios';
import { MDXRemote } from 'next-mdx-remote/rsc';

const mdxComponents = {
  WinnerBox: ({ children }: { children: React.ReactNode }) => (
    <div className="my-4 rounded-xl border border-green-200 bg-green-50 p-4 text-green-900">
      <h4 className="mb-2 font-bold">Winners</h4>
      {children}
    </div>
  ),
  LoserBox: ({ children }: { children: React.ReactNode }) => (
    <div className="my-4 rounded-xl border border-red-200 bg-red-50 p-4 text-red-900">
      <h4 className="mb-2 font-bold">Losers</h4>
      {children}
    </div>
  ),
};

export default async function ScenarioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const resolvedParams = await params; 
  const id = resolvedParams.id;

  let scenario;

  try {
    scenario = await getScenarioById(id);
  } catch (error) {
    notFound();
  }

  const { metadata, content } = scenario;

  return (
    <main className="min-h-screen bg-gray-50 px-6 py-10">
      <div className="mx-auto max-w-4xl">
        {/* Back Navigation */}
        <Link
          href="/scenarios"
          className="mb-8 inline-flex items-center text-sm font-medium text-gray-500 hover:text-black"
        >
          &larr; Back to Catalog
        </Link>

        {/* Header Section */}
        <div className="mb-10 rounded-3xl border border-gray-200 bg-white p-8 shadow-sm md:p-10">
          <div className="mb-4 flex items-center gap-3 text-sm font-medium">
            <span className="rounded-full bg-red-100 px-3 py-1 text-red-800">
              {metadata.severity}
            </span>
            <span className="text-gray-500">{metadata.dateRange}</span>
          </div>

          <h1 className="mb-4 text-4xl font-bold md:text-5xl">{metadata.title}</h1>
          <p className="text-lg text-gray-600">{metadata.shortDescription}</p>

          <div className="mt-8 flex flex-wrap gap-4 border-t border-gray-100 pt-8">
            <div className="mr-8">
              <p className="text-sm text-gray-500">Max Drawdown</p>
              <p className="text-2xl font-semibold text-red-600">
                {metadata.maxDrawdown}
              </p>
            </div>
            
            <Link
              href={`/analysis?scenario=${id}`}
              className="mt-auto rounded-xl bg-black px-6 py-3 font-medium text-white transition-opacity hover:opacity-90"
            >
              Simulate Portfolio in this Crisis
            </Link>
          </div>
        </div>

        {/* MDX Content Section */}
        <article className="prose prose-lg prose-gray max-w-none rounded-3xl border border-gray-200 bg-white p-8 shadow-sm md:p-10">
          <MDXRemote source={content} components={mdxComponents} />
        </article>
      </div>
    </main>
  );
}