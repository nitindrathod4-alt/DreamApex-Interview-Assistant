const $ = (id) => document.getElementById(id);

let ws = null;
let recognition = null;
let questionIndex = 1;
let history = JSON.parse(localStorage.getItem("dreamapex_history") || "[]");

const questionBank = {
  AWS: [
    "Explain VPC and its main components.",
    "How would you troubleshoot an unreachable EC2 instance?",
    "How do you design high availability in AWS?"
  ],
  Docker: [
    "What is Docker and why is it used?",
    "A container works locally but fails in production. How do you troubleshoot it?",
    "Explain Docker image vs Docker container."
  ],
  Kubernetes: [
    "What is CrashLoopBackOff and how do you troubleshoot it?",
    "Explain Kubernetes Service types.",
    "How would you troubleshoot a pod stuck in Pending?"
  ],
  "Jenkins / CI-CD": [
    "Explain a Jenkins CI/CD pipeline.",
    "A Jenkins deployment suddenly fails. How do you troubleshoot it?",
    "What is the difference between CI and CD?"
  ],
  Terraform: [
    "What is Terraform state?",
    "How do you handle an existing AWS resource in Terraform?",
    "What is the difference between Terraform plan and apply?"
  ],
  Linux: [
    "How do you troubleshoot high CPU usage on Linux?",
    "How do you check disk and memory usage?",
    "How do you troubleshoot a Linux server that is not responding?"
  ],
  Scenarios: [
    "Your production EKS application is returning 502 errors. How would you troubleshoot it?",
    "Your production application suddenly has high latency. What would you check?",
    "A Kubernetes deployment is failing. Explain your troubleshooting approach."
  ],
  HR: [
    "Tell me about yourself.",
    "Why should we hire you as a DevOps Engineer?",
    "Tell me about a difficult production issue you handled."
  ]
};

/* =========================
   WEBSOCKET
========================= */

function connectAI() {
  try {
    ws = new WebSocket(
      `${location.protocol === "https:" ? "wss" : "ws"}://${location.host}`
    );

    ws.onopen = () => {
      console.log("DreamApex AI connected");
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "answer") {
          showAnswer(data.answer || data.text || "No answer received.");
        }

        if (data.type === "error") {
          showAnswer("AI Error: " + (data.message || "Something went wrong."));
        }
      } catch (err) {
        console.error("WebSocket message error:", err);
      }
    };

    ws.onerror = (err) => {
      console.error("WebSocket error:", err);
    };

    ws.onclose = () => {
      console.log("AI connection closed");
    };
  } catch (err) {
    console.error("WebSocket connection failed:", err);
  }
}

connectAI();

/* =========================
   PAGE NAVIGATION
========================= */

function go(page) {
  document.querySelectorAll(".page").forEach((p) => {
    p.classList.remove("active");
  });

  const target = $(`${page}Page`);

  if (target) {
    target.classList.add("active");
  } else {
    console.warn(`Page not found: ${page}Page`);
  }

  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.classList.remove("active");
  });

  const activeBtn = document.querySelector(
    `.nav-btn[data-page="${page}"]`
  );

  if (activeBtn) {
    activeBtn.classList.add("active");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });

  if (page === "dashboard") {
    updateDashboard();
  }

  if (page === "history") {
    renderHistory();
  }

  if (page === "report") {
    updateReport();
  }
}

/* IMPORTANT:
   Makes go() available to HTML onclick=""
*/
window.go = go;

/* =========================
   NAV BUTTONS
========================= */

document.addEventListener("DOMContentLoaded", () => {
  document.querySelectorAll(".nav-btn").forEach((btn) => {
    btn.addEventListener("click", () => {
      const page = btn.dataset.page;

      if (page) {
        go(page);
      }
    });
  });

  setupEventListeners();
  updateDashboard();
  renderQuestionBank();
  renderHistory();
  updateReport();
});

/* =========================
   EVENT LISTENERS
========================= */

function setupEventListeners() {
  const startBtn = $("startInterviewBtn");

  if (startBtn) {
    startBtn.addEventListener("click", startInterview);
  }

  const generateBtn = $("generateBtn");

  if (generateBtn) {
    generateBtn.addEventListener("click", generateAnswer);
  }

  const micBtn = $("micBtn");

  if (micBtn) {
    micBtn.addEventListener("click", toggleSpeech);
  }

  const nextBtn = $("nextBtn");

  if (nextBtn) {
    nextBtn.addEventListener("click", nextQuestion);
  }

  const previousBtn = $("previousBtn");

  if (previousBtn) {
    previousBtn.addEventListener("click", previousQuestion);
  }

  const clearHistoryBtn = $("clearHistoryBtn");

  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", clearHistory);
  }

  const question = $("question");

  if (question) {
    question.addEventListener("keydown", (event) => {
      if (event.key === "Enter" && (event.ctrlKey || event.metaKey)) {
        generateAnswer();
      }
    });
  }
}

/* =========================
   START INTERVIEW
========================= */

function startInterview() {
  const role = $("role")?.value || "";
  const company = $("company")?.value || "";
  const jobDescription = $("jobDescription")?.value || "";
  const candidateContext = $("candidateContext")?.value || "";

  const setup = {
    role,
    company,
    jobDescription,
    candidateContext
  };

  localStorage.setItem("dreamapex_setup", JSON.stringify(setup));

  questionIndex = 1;

  const roleTitle = $("liveRole");

  if (roleTitle) {
    roleTitle.textContent = role || "DevOps Interview";
  }

  go("live");
}

/* =========================
   GENERATE AI ANSWER
========================= */

function generateAnswer() {
  const questionEl = $("question");

  if (!questionEl) {
    console.error("Question input not found");
    return;
  }

  const question = questionEl.value.trim();

  if (!question) {
    alert("Please enter or speak an interview question.");
    return;
  }

  const mode = $("answerMode")?.value || "Concise";
  const language = $("language")?.value || "English";

  const setup = JSON.parse(
    localStorage.getItem("dreamapex_setup") || "{}"
  );

  const role = setup.role || "DevOps Engineer";
  const company = setup.company || "Company";

  const prompt = `
You are an AI interview assistant helping a candidate during an interview.

Role: ${role}
Company: ${company}

Interview question:
${question}

Answer mode: ${mode}
Language: ${language}

Give a professional interview-ready answer.
Keep the answer practical and natural.
For technical questions, include commands/examples where useful.
For scenario questions, explain the troubleshooting steps clearly.
Do not mention that you are an AI assistant.
`;

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    showAnswer(
      "AI connection is not ready. Please wait a moment and try again."
    );
    connectAI();
    return;
  }

  setLoading(true);

  ws.send(
    JSON.stringify({
      type: "generate",
      prompt,
      question,
      mode,
      language
    })
  );
}

/* =========================
   SHOW ANSWER
========================= */

function showAnswer(answer) {
  setLoading(false);

  const answerBox = $("answer");

  if (answerBox) {
    answerBox.textContent = answer;
  }

  const answerPanel = $("answerPanel");

  if (answerPanel) {
    answerPanel.classList.add("has-answer");
  }

  const question = $("question")?.value?.trim();

  if (question && answer) {
    history.push({
      question,
      answer,
      time: new Date().toLocaleString(),
      index: questionIndex
    });

    localStorage.setItem(
      "dreamapex_history",
      JSON.stringify(history)
    );

    updateDashboard();
    updateReport();
  }
}

/* =========================
   LOADING
========================= */

function setLoading(loading) {
  const btn = $("generateBtn");

  if (btn) {
    btn.disabled = loading;
    btn.textContent = loading
      ? "Generating..."
      : "✨ Generate Answer";
  }

  const answerBox = $("answer");

  if (loading && answerBox) {
    answerBox.textContent = "DreamApex AI is thinking...";
  }
}

/* =========================
   SPEECH RECOGNITION
========================= */

function toggleSpeech() {
  const SR =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SR) {
    alert(
      "Speech recognition is not supported. Please use Google Chrome."
    );
    return;
  }

  const micBtn = $("micBtn");
  const questionBox = $("question");

  if (!questionBox) return;

  if (recognition) {
    recognition.stop();
    recognition = null;

    if (micBtn) {
      micBtn.textContent = "🎙 Speak";
    }

    return;
  }

  recognition = new SR();

  const language = $("language")?.value || "English";

  recognition.lang =
    language === "Marathi"
      ? "mr-IN"
      : language === "Hindi"
      ? "hi-IN"
      : "en-IN";

  recognition.continuous = false;
  recognition.interimResults = false;
  recognition.maxAlternatives = 1;

  recognition.onstart = () => {
    if (micBtn) {
      micBtn.textContent = "⏹ Stop";
    }
  };

  recognition.onresult = (event) => {
    const transcript =
      event.results[0][0].transcript.trim();

    questionBox.value = transcript;
  };

  recognition.onerror = (event) => {
    console.error("Speech recognition error:", event.error);
  };

  recognition.onend = () => {
    recognition = null;

    if (micBtn) {
      micBtn.textContent = "🎙 Speak";
    }
  };

  recognition.start();
}

/* =========================
   NEXT QUESTION
========================= */

function nextQuestion() {
  questionIndex++;

  const counter = $("questionNumber");

  if (counter) {
    counter.textContent = `Question ${questionIndex}`;
  }

  const questionBox = $("question");

  if (questionBox) {
    questionBox.value = "";
    questionBox.focus();
  }

  const answerBox = $("answer");

  if (answerBox) {
    answerBox.textContent =
      "Enter the next interview question.";
  }
}

/* =========================
   PREVIOUS QUESTION
========================= */

function previousQuestion() {
  if (questionIndex > 1) {
    questionIndex--;
  }

  const counter = $("questionNumber");

  if (counter) {
    counter.textContent = `Question ${questionIndex}`;
  }
}

/* =========================
   QUESTION BANK
========================= */

function renderQuestionBank() {
  const container = $("questionBank");

  if (!container) {
    console.warn("questionBank element not found");
    return;
  }

  container.innerHTML = "";

  Object.entries(questionBank).forEach(
    ([category, questions]) => {
      const categoryDiv = document.createElement("div");

      categoryDiv.className = "question-category";

      const title = document.createElement("h3");
      title.textContent = category;

      categoryDiv.appendChild(title);

      questions.forEach((q) => {
        const button = document.createElement("button");

        button.className = "bank-question";
        button.type = "button";
        button.textContent = q;

        button.addEventListener("click", () => {
          useQuestion(q);
        });

        categoryDiv.appendChild(button);
      });

      container.appendChild(categoryDiv);
    }
  );
}

/* =========================
   USE QUESTION
========================= */

function useQuestion(question) {
  const questionBox = $("question");

  if (!questionBox) {
    console.error("Question input not found");
    return;
  }

  questionBox.value = question;

  go("live");

  questionBox.focus();
}

/* =========================
   HISTORY
========================= */

function renderHistory() {
  const container = $("historyList");

  if (!container) return;

  if (!history.length) {
    container.innerHTML = `
      <div class="empty-state">
        <h3>No interview history</h3>
        <p>Your generated interview answers will appear here.</p>
      </div>
    `;

    return;
  }

  container.innerHTML = "";

  [...history]
    .reverse()
    .forEach((item) => {
      const div = document.createElement("div");

      div.className = "history-item";

      div.innerHTML = `
        <div class="history-question">
          <strong>Q${item.index || ""}:</strong>
          ${escapeHTML(item.question)}
        </div>

        <div class="history-answer">
          ${escapeHTML(item.answer)}
        </div>

        <small>${escapeHTML(item.time || "")}</small>
      `;

      container.appendChild(div);
    });
}

/* =========================
   CLEAR HISTORY
========================= */

function clearHistory() {
  if (!history.length) return;

  const confirmed = confirm(
    "Are you sure you want to clear interview history?"
  );

  if (!confirmed) return;

  history = [];

  localStorage.removeItem("dreamapex_history");

  renderHistory();
  updateDashboard();
  updateReport();
}

/* =========================
   DASHBOARD
========================= */

function updateDashboard() {
  const total = $("totalQuestions");

  if (total) {
    total.textContent = history.length;
  }

  const sessions = $("totalSessions");

  if (sessions) {
    const uniqueTimes = new Set(
      history.map((item) => item.time)
    );

    sessions.textContent = uniqueTimes.size;
  }
}

/* =========================
   REPORT
========================= */

function updateReport() {
  const total = $("reportTotal");

  if (total) {
    total.textContent = history.length;
  }

  const reportQuestions = $("reportQuestions");

  if (reportQuestions) {
    reportQuestions.textContent = history.length;
  }

  const reportAnswers = $("reportAnswers");

  if (reportAnswers) {
    reportAnswers.textContent = history.length;
  }
}

/* =========================
   HTML ESCAPE
========================= */

function escapeHTML(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

/* =========================
   LOAD SAVED SETUP
========================= */

function loadSetup() {
  const setup = JSON.parse(
    localStorage.getItem("dreamapex_setup") || "{}"
  );

  if ($("role") && setup.role) {
    $("role").value = setup.role;
  }

  if ($("company") && setup.company) {
    $("company").value = setup.company;
  }

  if ($("jobDescription") && setup.jobDescription) {
    $("jobDescription").value = setup.jobDescription;
  }

  if ($("candidateContext") && setup.candidateContext) {
    $("candidateContext").value =
      setup.candidateContext;
  }
}

window.addEventListener("load", loadSetup);