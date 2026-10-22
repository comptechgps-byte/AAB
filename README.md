# DBMS SQL Query Quiz

A browser-based Oracle SQL writing quiz. Students enter Oracle SQL statements in a text answer box; there are no multiple-choice answers.

## Run the quiz

Open `index.html` in a modern browser. No package installation or internet connection is required. For more reliable browser storage, serve this folder over HTTP (for example, with any local static web server) and open its local URL.

Enter a seat number and name to start. Your attempt number is shown in the page header and increases for each saved attempt with the same seat number. Use Oracle SQL syntax for every answer. Each attempt randomly draws 5 questions from the 50-question bank, covering `CREATE TABLE`, `DROP TABLE`, `RENAME`, `ALTER TABLE`, `TRUNCATE TABLE`, `INSERT`, `UPDATE`, `DELETE`, and `SELECT`. Each question earns up to 1 mark. A live provisional match percentage and mark value are shown as you type. Partial marks are based on token-level edit similarity between the submitted query and the expected query; grading ignores SQL keyword case, formatting whitespace, and an optional final semicolon. The 10-minute timer submits automatically. Submitting manually, switching or hiding the tab, or leaving focus on the browser window ends the attempt immediately.

## Results and marks

Attempt records are saved in the current browser's local storage. Download the current result or export all saved attempts as a UTF-8 CSV with a byte-order mark, which opens in Microsoft Excel. The export includes seat number, attempt number, name, marks, percentage, start and submission times, and submission reason. Export records regularly and keep the downloaded file somewhere safe.

**Storage is local to one browser and device.** This project has no server or shared gradebook, so results do not automatically reach an instructor or appear on another device. Collect the exported CSV files to consolidate marks.

## Monitoring limitation

The quiz submits when the browser reports that its tab is hidden or the browser window loses focus. Browsers do not let a standalone web page reliably detect every operating-system-level screen switch, and client-side monitoring cannot prevent someone from bypassing or disabling it. Use an invigilated environment if stronger exam controls are required.

## Question bank

`sql-questions.js` contains 50 Oracle SQL query-writing questions. Five distinct questions are selected at random for each attempt.
