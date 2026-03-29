import Link from "next/link";
import { getAllScenarios } from "@/lib/scenarios";

export default function ScenariosPage() {
  const scenarios = getAllScenarios();

  return (
    <main className="min-h-screen px-6 py-10">
      <div className="mx-auto max-w-6xl">
        <h1 className="mb-2 text-4xl font-bold">Crisis Scenario Catalog</h1>
        <p className="mb-8 text-gray-600">
          Explore major historical market crises and apply them to portfolio analysis.
        </p>

        {scenarios.length === 0 ? (
          <p className="text-gray-500">No scenarios found.</p>
        ) : (
          <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-3">
            {scenarios.map((scenario) => (
              <div
                key={scenario.id}
                className="rounded-2xl border border-gray-200 bg-white p-6 shadow-sm"
              >
                <h2 className="mb-2 text-2xl font-semibold">
                  {scenario.title || scenario.label || scenario.id}
                </h2>

                <p className="mb-4 text-sm text-gray-600">
                  {scenario.description || "Historical crisis scenario for stress testing."}
                </p>

                <div className="mb-4 space-y-1 text-sm text-gray-700">
                  <p>
                    <span className="font-medium">Start:</span>{" "}
                    {scenario.startDate || "N/A"}
                  </p>
                  <p>
                    <span className="font-medium">End:</span>{" "}
                    {scenario.endDate || "N/A"}
                  </p>

                  {scenario.severity && (
                    <p>
                      <span className="font-medium">Severity:</span> {scenario.severity}
                    </p>
                  )}

                  {scenario.maxDrawdown !== undefined && scenario.maxDrawdown !== "" && (
                    <p>
                      <span className="font-medium">Max Drawdown:</span>{" "}
                      {scenario.maxDrawdown}
                    </p>
                  )}
                </div>

                <div className="flex flex-wrap gap-3">
                  <Link
                    href={`/scenarios/${scenario.id}`}
                    className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium hover:bg-gray-50"
                  >
                    View Details
                  </Link>

                  <Link
                    href={`/analysis?scenario=${scenario.id}&start=${scenario.startDate || ""}&end=${scenario.endDate || ""}`}
                    className="rounded-lg bg-black px-4 py-2 text-sm font-medium text-white hover:opacity-90"
                  >
                    Simulate This Crisis
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}