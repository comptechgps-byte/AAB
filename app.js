(function () {
  "use strict";

  const STORAGE_KEY = "dbmsQuizAttemptsV1";
  const EXAM_SECONDS = 10 * 60;
  const QUESTIONS_PER_ATTEMPT = 5;
  const screens = {
    welcome: document.getElementById("welcome-screen"),
    exam: document.getElementById("exam-screen"),
    result: document.getElementById("result-screen")
  };
  const state = {
    active: false,
    candidate: null,
    questions: [],
    answers: [],
    currentIndex: 0,
    startedAt: "",
    deadline: 0,
    timerId: null,
    latestAttempt: null,
    attempts: [],
    storageAvailable: true
  };

  const form = document.getElementById("candidate-form");
  const formError = document.getElementById("form-error");
  const questionContainer = document.getElementById("question-container");
  const timer = document.getElementById("timer");
  const storageWarning = document.getElementById("storage-warning");
  const attemptIndicator = document.getElementById("attempt-indicator");
  const submitButton = document.getElementById("submit-button");
  const tipButton = document.getElementById("tip-button");
  const syntaxTip = document.getElementById("syntax-tip");

  function shuffle(items) {
    const shuffled = items.slice();
    for (let index = shuffled.length - 1; index > 0; index -= 1) {
      const swapIndex = Math.floor(Math.random() * (index + 1));
      [shuffled[index], shuffled[swapIndex]] = [shuffled[swapIndex], shuffled[index]];
    }
    return shuffled;
  }

  function selectQuestions() {
    const bank = window.QUESTION_BANK;
    if (!Array.isArray(bank) || bank.length !== 50) {
      throw new Error("The question bank must contain exactly 50 questions.");
    }

    return shuffle(bank).slice(0, QUESTIONS_PER_ATTEMPT);
  }

  function normalizeSql(query) {
    const parts = String(query || "")
      .trim()
      .replace(/;\s*$/, "")
      .match(/'(?:''|[^'])*'|"(?:""|[^"])*"|[^'"]+/g) || [];
    return parts.map(function (part) {
        if (part.charAt(0) === "'" || part.charAt(0) === '"') return part;
        return part.toLowerCase().replace(/\s+/g, " ").trim().replace(/\s*([(),=<>*])\s*/g, "$1");
      })
      .join("");
  }

  function getSyntaxTip(question) {
    switch (question.category) {
      case "CREATE TABLE":
        return "Oracle form: CREATE TABLE table_name (column_name datatype, ...); Add required constraints to the relevant column definitions.";
      case "DROP TABLE":
        return "Oracle form: DROP TABLE table_name;";
      case "RENAME TABLE":
        return "Oracle form: RENAME old_table_name TO new_table_name;";
      case "ALTER TABLE":
        if (/modify/i.test(question.question)) {
          return "Oracle form: ALTER TABLE table_name MODIFY (column_name new_datatype);";
        }
        if (/drop/i.test(question.question)) {
          return "Oracle form: ALTER TABLE table_name DROP COLUMN column_name;";
        }
        return "Oracle form: ALTER TABLE table_name ADD (column_name datatype);";
      case "TRUNCATE TABLE":
        return "Oracle form: TRUNCATE TABLE table_name;";
      case "INSERT":
        return "Oracle form: INSERT INTO table_name (column1, column2) VALUES (value1, value2);";
      case "UPDATE":
        return "Oracle form: UPDATE table_name SET column_name = value WHERE condition;";
      case "DELETE":
        return "Oracle form: DELETE FROM table_name WHERE condition;";
      case "SELECT":
        if (/count/i.test(question.question)) {
          return "Oracle form: SELECT COUNT(*) AS alias FROM table_name;";
        }
        if (/order/i.test(question.question)) {
          return "Oracle form: SELECT columns FROM table_name ORDER BY column_name ASC;";
        }
        return "Oracle form: SELECT columns FROM table_name WHERE condition; Use * to select every column.";
      default:
        return "Use the Oracle SQL statement form for this command.";
    }
  }

  function showScreen(name) {
    Object.keys(screens).forEach(function (screenName) {
      screens[screenName].hidden = screenName !== name;
    });
    window.scrollTo(0, 0);
  }

  function startExam(candidate) {
    state.candidate = candidate;
    attemptIndicator.textContent = "Attempt " + candidate.attemptNumber;
    attemptIndicator.hidden = false;
    state.questions = selectQuestions();
    state.answers = new Array(state.questions.length).fill(null);
    state.currentIndex = 0;
    state.startedAt = new Date().toISOString();
    state.deadline = Date.now() + EXAM_SECONDS * 1000;
    state.active = true;
    showScreen("exam");
    renderQuestion();
    updateTimer();
    state.timerId = window.setInterval(updateTimer, 250);
  }

  function updateTimer() {
    if (!state.active) return;
    const secondsLeft = Math.max(0, Math.ceil((state.deadline - Date.now()) / 1000));
    const minutes = Math.floor(secondsLeft / 60);
    const seconds = secondsLeft % 60;
    timer.textContent = String(minutes).padStart(2, "0") + ":" + String(seconds).padStart(2, "0");
    timer.classList.toggle("is-low", secondsLeft <= 30);
    if (secondsLeft === 0) submitExam("Time limit reached");
  }

  function renderQuestion() {
    const question = state.questions[state.currentIndex];
    const questionSection = document.createElement("section");
    questionSection.className = "question";
    questionSection.setAttribute("aria-labelledby", "question-title");

    const meta = document.createElement("div");
    meta.className = "question-meta";
    const tag = document.createElement("span");
    tag.className = "tag";
    tag.textContent = question.category;
    meta.appendChild(tag);

    const title = document.createElement("h2");
    title.id = "question-title";
    title.textContent = question.question;
    questionSection.append(meta, title);

    const answerLabel = document.createElement("label");
    answerLabel.className = "answer-label";
    answerLabel.htmlFor = "query-answer";
    answerLabel.textContent = "Your SQL query";
    const answer = document.createElement("textarea");
    answer.id = "query-answer";
    answer.name = "answer";
    answer.rows = 5;
    answer.spellcheck = false;
    answer.autocapitalize = "off";
    answer.autocomplete = "off";
    answer.autocorrect = "off";
    answer.placeholder = "Write the SQL query only";
    answer.value = state.answers[state.currentIndex] || "";
    answer.addEventListener("input", function () {
      state.answers[state.currentIndex] = answer.value;
      updateProgress();
    });

    questionSection.append(answerLabel, answer);
    questionContainer.replaceChildren(questionSection);
    syntaxTip.textContent = getSyntaxTip(question);
    syntaxTip.hidden = true;
    tipButton.setAttribute("aria-expanded", "false");
    document.getElementById("previous-button").disabled = state.currentIndex === 0;
    document.getElementById("next-button").disabled = state.currentIndex === state.questions.length - 1;
    submitButton.hidden = state.currentIndex !== state.questions.length - 1;
    updateProgress();
  }

  function updateProgress() {
    const answered = state.answers.filter(function (answer) { return answer && answer.trim(); }).length;
    document.getElementById("progress-label").textContent = "Question " + (state.currentIndex + 1) + " of " + state.questions.length;
    document.getElementById("answered-label").textContent = answered + " answered";
    document.getElementById("progress-bar").style.width = ((state.currentIndex + 1) / state.questions.length * 100) + "%";
  }

  function submitExam(reason) {
    if (!state.active) return;
    state.active = false;
    window.clearInterval(state.timerId);
    const score = state.questions.reduce(function (total, question, index) {
      return total + (normalizeSql(state.answers[index]) === normalizeSql(question.answer) ? 1 : 0);
    }, 0);
    const submittedAt = new Date().toISOString();
    state.latestAttempt = {
      seatNumber: state.candidate.seatNumber,
      attemptNumber: state.candidate.attemptNumber,
      name: state.candidate.name,
      score: score,
      maxMarks: state.questions.length,
      percentage: Math.round(score / state.questions.length * 100),
      startedAt: state.startedAt,
      submittedAt: submittedAt,
      submissionReason: reason
    };
    state.attempts.push(state.latestAttempt);

    if (state.storageAvailable) {
      try {
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state.attempts));
      } catch (error) {
        state.storageAvailable = false;
        storageWarning.textContent = "This browser could not save attempts on this device (" + error.message + "). Download the CSV now to keep this result.";
      }
    } else if (!storageWarning.textContent) {
      storageWarning.textContent = "Saved attempts could not be read from this browser. Download the CSV now to keep this result.";
    }
    renderResult(reason);
  }

  function renderResult(reason) {
    document.getElementById("result-heading").textContent = reason === "Submitted by candidate" ? "Assessment submitted" : "Assessment ended";
    document.getElementById("result-message").textContent = "Thank you, " + state.candidate.name + ". Your attempt has been recorded.";
    document.getElementById("score-value").textContent = state.latestAttempt.score + " / " + state.latestAttempt.maxMarks;
    document.getElementById("percentage-value").textContent = state.latestAttempt.percentage + "%";
    document.getElementById("result-reason").textContent = "Submission reason: " + reason + ". Seat number: " + state.candidate.seatNumber + ".";
    storageWarning.hidden = state.storageAvailable;
    renderRecords();
    renderReview();
    showScreen("result");
  }

  function loadAttempts() {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === null) {
        state.storageAvailable = true;
        return [];
      }
      const parsed = JSON.parse(saved);
      if (!Array.isArray(parsed)) throw new Error("Saved attempt data is not a list.");
      state.storageAvailable = true;
      return parsed;
    } catch (error) {
      state.storageAvailable = false;
      storageWarning.textContent = "Saved attempts could not be read from this browser (" + error.message + "). You can still download the current result.";
      storageWarning.hidden = false;
      return [];
    }
  }

  function renderRecords() {
    const body = document.getElementById("records-body");
    body.replaceChildren();
    const attempts = state.attempts.slice().reverse();
    if (attempts.length === 0) {
      const row = document.createElement("tr");
      const cell = document.createElement("td");
      cell.colSpan = 4;
      cell.textContent = "No saved attempts yet.";
      row.appendChild(cell);
      body.appendChild(row);
      return;
    }
    attempts.forEach(function (attempt) {
      const row = document.createElement("tr");
      [attempt.seatNumber || attempt.enrollmentNumber, attempt.name, attempt.score + " / " + attempt.maxMarks, formatDate(attempt.submittedAt)].forEach(function (value) {
        const cell = document.createElement("td");
        cell.textContent = value;
        row.appendChild(cell);
      });
      body.appendChild(row);
    });
  }

  function renderReview() {
    const review = document.getElementById("review-list");
    review.replaceChildren();
    state.questions.forEach(function (question, index) {
      const item = document.createElement("article");
      item.className = "review-item";
      const title = document.createElement("h3");
      title.textContent = (index + 1) + ". " + question.question;
      const submitted = document.createElement("p");
      const isCorrect = normalizeSql(state.answers[index]) === normalizeSql(question.answer);
      submitted.className = isCorrect ? "correct-answer" : "wrong-answer";
      submitted.textContent = "Your query: " + (state.answers[index] || "Not answered");
      const correct = document.createElement("p");
      correct.textContent = "Expected query: " + question.answer;
      item.append(title, submitted, correct);
      review.appendChild(item);
    });
  }

  function formatDate(value) {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
  }

  function csvEscape(value) {
    let text = String(value === null || value === undefined ? "" : value);
    if (/^\s*[=+\-@]/.test(text)) text = "'" + text;
    return '"' + text.replace(/"/g, '""') + '"';
  }

  function downloadCsv(attempts, filename) {
    const headers = ["Seat Number", "Attempt Number", "Name", "Score", "Maximum Marks", "Percentage", "Started At", "Submitted At", "Submission Reason"];
    const rows = attempts.map(function (attempt) {
      return [
        attempt.seatNumber || attempt.enrollmentNumber, attempt.attemptNumber, attempt.name, attempt.score, attempt.maxMarks,
        attempt.percentage + "%", attempt.startedAt, attempt.submittedAt,
        attempt.submissionReason
      ];
    });
    const csv = [headers].concat(rows).map(function (row) {
      return row.map(csvEscape).join(",");
    }).join("\r\n");
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.setTimeout(function () { URL.revokeObjectURL(url); }, 1000);
  }

  form.addEventListener("submit", function (event) {
    event.preventDefault();
    const seatNumber = document.getElementById("seat-number").value.trim();
    const name = document.getElementById("candidate-name").value.trim();
    if (!seatNumber || !name) {
      formError.textContent = "Enter both your seat number and full name to continue.";
      formError.hidden = false;
      return;
    }
    formError.hidden = true;
    state.attempts = loadAttempts();
    const normalizedSeatNumber = seatNumber.trim().toUpperCase();
    const attemptNumber = state.attempts.filter(function (attempt) {
      const savedSeatNumber = String(attempt.seatNumber || attempt.enrollmentNumber || "").trim().toUpperCase();
      return savedSeatNumber === normalizedSeatNumber;
    }).length + 1;
    startExam({ seatNumber: seatNumber, name: name, attemptNumber: attemptNumber });
  });

  document.getElementById("previous-button").addEventListener("click", function () {
    if (state.currentIndex > 0) {
      state.currentIndex -= 1;
      renderQuestion();
    }
  });
  document.getElementById("next-button").addEventListener("click", function () {
    if (state.currentIndex < state.questions.length - 1) {
      state.currentIndex += 1;
      renderQuestion();
    }
  });
  document.getElementById("submit-button").addEventListener("click", function () {
    submitExam("Submitted by candidate");
  });
  tipButton.addEventListener("click", function () {
    const expanded = tipButton.getAttribute("aria-expanded") === "true";
    tipButton.setAttribute("aria-expanded", String(!expanded));
    syntaxTip.hidden = expanded;
  });
  document.getElementById("download-results-button").addEventListener("click", function () {
    downloadCsv([state.latestAttempt], "dbms-quiz-result.csv");
  });
  document.getElementById("export-all-button").addEventListener("click", function () {
    downloadCsv(state.attempts, "dbms-quiz-all-results.csv");
  });

  document.addEventListener("visibilitychange", function () {
    if (state.active && document.visibilityState === "hidden") {
      submitExam("Browser tab switched or hidden");
    }
  });
  window.addEventListener("blur", function () {
    if (state.active) submitExam("Browser window lost focus");
  });
  window.addEventListener("pagehide", function () {
    if (state.active) submitExam("Page closed or navigated away");
  });
})();
