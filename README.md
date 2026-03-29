<section>
  <h2>Installation and Setup</h2>
  <p>Follow these instructions to set up the CrisisLens development environment. This project requires two separate terminals to run the frontend and backend concurrently.</p>

  <h3>Prerequisites</h3>
  <ul>
    <li><strong>Node.js:</strong> Version 18.0.0 or higher</li>
    <li><strong>Python:</strong> Version 3.10 or higher</li>
    <li><strong>Supabase:</strong> An active project with API credentials</li>
  </ul>

  <h3>Database Configuration</h3>
  <ol>
    <li>Access the Supabase Dashboard and navigate to the SQL Editor.</li>
    <li>Execute the schema scripts located in <code>/database/schema.sql</code> to initialize the <code>portfolios</code>, <code>holdings</code>, <code>scenarios</code>, and <code>risk_analysis</code> tables.</li>
    <li>Verify that Row Level Security (RLS) is configured to permit development traffic.</li>
  </ol>

  <h3>Backend Setup (FastAPI)</h3>
  <pre><code>cd server
python3 -m venv venv
source venv/bin/activate  # Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload</code></pre>

  <h3>Frontend Setup (Next.js)</h3>
  <p>Navigate to the client directory and configure the environment variables before launching the application.</p>
  <pre><code>cd client
touch .env.local</code></pre>
  <p>Enter the following credentials into <code>.env.local</code>:</p>
  <pre><code>NEXT_PUBLIC_SUPABASE_URL=your_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_anon_key</code></pre>
  <p>Install dependencies and start the development server:</p>
  <pre><code>npm install
npm run dev</code></pre>
</section>


<section>
  <h2>Current Project State</h2>
  <p>The application has moved beyond the initial prototyping phase into a functional dynamic system. Below is a detailed summary of the implemented features and architectural progress.</p>

  <h3>Architectural Milestones</h3>
  <ul>
    <li><strong>Full-Stack Integration:</strong> Successfully connected the Next.js frontend to a live Supabase backend, enabling persistent data storage and real-time updates.</li>
    <li><strong>Build Optimization:</strong> Migrated to Tailwind CSS v4 engine using the <code>@tailwindcss/postcss</code> plugin to resolve build-time configuration errors and improve CSS processing speed.</li>
    <li><strong>Dynamic Routing:</strong> Implemented pluralized RESTful routing structures (<code>/portfolios/[id]</code>) to support individual portfolio deep-dives and specific asset analysis.</li>
  </ul>

  <h3>Feature Implementation</h3>
  <table>
    <thead>
      <tr>
        <th>Feature Area</th>
        <th>Status</th>
        <th>Description</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><strong>Portfolio Management</strong></td>
        <td>Functional</td>
        <td>Complete CRUD operations (Create, Read, Delete) for user portfolios and associated holdings.</td>
      </tr>
      <tr>
        <td><strong>Data Visualization</strong></td>
        <td>Functional</td>
        <td>Interactive Robinhood-style Area Charts with gradient overlays and dynamic timeline toggles (1D to 5Y).</td>
      </tr>
      <tr>
        <td><strong>Asset Focus Mode</strong></td>
        <td>Functional</td>
        <td>UI logic allowing users to isolate and view performance metrics for specific tickers within a broader portfolio.</td>
      </tr>
      <tr>
        <td><strong>Analysis Logic</strong></td>
        <td>UI Complete</td>
        <td>Integrated a context-aware analysis dashboard that pre-selects portfolios via URL parameters for stress testing.</td>
      </tr>
      <tr>
        <td><strong>Insights Engine</strong></td>
        <td>UI Complete</td>
        <td>A dedicated sidebar component designed to surface AI-generated risk reports and volatility assessments.</td>
      </tr>
    </tbody>
  </table>

  <h3>Pending Development</h3>
  <ul>
    <li>Integration of real-time market price fetching via financial APIs.</li>
    <li>Refinement of the AI-driven "Scenario Agent" for custom Black Swan event creation.</li>
    <li>Finalization of the CSV parsing logic for bulk portfolio uploads.</li>
  </ul>
</section>
