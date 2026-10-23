# DBMS SQL Query Quiz

A browser-based Oracle SQL writing quiz. Students enter Oracle SQL statements in a text answer box; there are no multiple-choice answers.

## Run the quiz

Open `index.html` in a modern browser. No package installation is required for the quiz. For GitHub score saving, deploy the site over HTTPS and configure the score API as described below.

Enter a numbers-only seat number and name to start. Each seat number is limited to three attempts across devices. After each result, the candidate can select **Take next attempt** until all three are complete; the results page then displays “You have completed all 3 Attempts.” Attempt scores are held in Cloudflare Durable Objects; only the best score is written to `store.csv`, after the third attempt. Use Oracle SQL syntax for every answer. Each attempt randomly draws 5 questions from the 50-question bank, covering `CREATE TABLE`, `DROP TABLE`, `RENAME`, `ALTER TABLE`, `TRUNCATE TABLE`, `INSERT`, `UPDATE`, `DELETE`, and `SELECT`. Each question earns up to 5 marks on the reported scale, for a total of 25. Scores below 10 are recorded as 10 with a promotion note. A live provisional match percentage and mark value are shown as you type. Partial marks are based on token-level edit similarity between the submitted query and the expected query; grading ignores SQL keyword case, formatting whitespace, and an optional final semicolon. The 10-minute timer submits automatically. Submitting manually, switching or hiding the tab, leaving focus on the browser window, exiting fullscreen, or significantly resizing the exam window ends the attempt immediately.

## Results and marks

Attempt history remains available in the current browser's local storage and in private Cloudflare Durable Object storage. After the third attempt, the score API writes only the best score for that seat number to `store.csv` on the repository's `main` branch. The GitHub CSV has the columns `Seat Number,Score`; if the file does not exist, the API creates it. CSV download buttons are not shown in the results page.

**The GitHub CSV is shared across devices.** Browser-local attempt history is still device-specific. If the score API is unavailable or not configured, the result page reports that the GitHub save failed and offers a retry button.

## GitHub score API setup

The static quiz must not contain a GitHub access token. The included Cloudflare Worker uses a server-side `GITHUB_TOKEN` secret to write `store.csv` to this repository (`comptechgps-byte/AAB`, branch `main`).

**Repository visibility:** this GitHub repository is public. The passcode gates the quiz's Admin download link, but it cannot prevent people from downloading `store.csv` directly from GitHub. Make the repository private or move the CSV to private storage if the scores must be access-restricted.

1. Deploy `cloudflare/worker.mjs` with Wrangler (for example, `npx wrangler deploy --config cloudflare/wrangler.toml`). The Wrangler config creates the Durable Object namespace for private attempt history.
2. Create a fine-grained GitHub personal access token restricted to this repository with **Contents: Read and write** permission, then set it as a Worker secret: `npx wrangler secret put GITHUB_TOKEN --config cloudflare/wrangler.toml`. Do not put the token in the website or commit it.
3. Set the Worker variable `ALLOWED_ORIGIN` in `cloudflare/wrangler.toml` to the origin serving the quiz (the default is `https://comptechgps-byte.github.io`; do not include the project path).
4. Set the admin passcode as a Worker secret: `npx wrangler secret put ADMIN_PASSCODE --config cloudflare/wrangler.toml`. Enter the passcode at Wrangler's prompt; it is never stored in the website or repository. Set the passcode for the **Delete CSV contents** link the same way: `npx wrangler secret put DELETE_PASSCODE --config cloudflare/wrangler.toml`. That link empties `store.csv` (keeping the header); attempt counts held in Durable Objects are not reset.
5. Put the deployed Worker URL in the `score-api-url` meta tag in `index.html`, then redeploy the site.

The Worker checks the request origin and validates seat numbers and scores before updating the CSV through GitHub's Contents API. It preserves previous CSV scores as private attempt history when migrating existing records; incomplete seats are removed from `store.csv` until their third attempt, when only their best score is written. The **Admin** link at the bottom of the quiz asks for the admin passcode and then offers a clear **Download CSV now** link for `store.csv`. Admin login is locked for 15 minutes after five incorrect passcodes from the same IP address. Redeploy the Worker and publish the updated quiz site whenever you change these files. Configure Cloudflare rate limiting for the Worker as additional protection against automated abuse.

## Monitoring limitation

The quiz attempts to enter fullscreen and submits when the browser reports that its tab is hidden, the browser window loses focus, fullscreen is exited, or the exam window is significantly resized. A web page cannot prevent a device from being minimized or reliably detect every operating-system-level screen switch or split-screen mode; client-side monitoring can also be bypassed or disabled. Use an invigilated environment if stronger exam controls are required.

## Question bank

`sql-questions.js` contains 50 Oracle SQL query-writing questions. Five distinct questions are selected at random for each attempt.
