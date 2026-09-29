const $ = (id) => document.getElementById(id);

let ws = null;
let recognition = null;
let questionIndex = 1;

let history = JSON.parse(
  localStorage.getItem("dreamapex_history") || "[]"
);

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
    const protocol =
      location.protocol === "https:" ? "wss" : "ws";

    ws = new WebSocket(
      `${protocol}://${location.host}`
    );

    ws.onopen = () => {
      console.log("DreamApex AI connected");

      const connection = $("connection");

      if (connection) {
        connection.textContent = "● Ready";
        connection.classList.add("ready");
      }
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "connected") {
          console.log("AI connected");
          return;
        }

        if (data.type === "status") {
          setLoading(true);
          return;
        }

        if (data.type === "answer") {
          showAnswer(
            data.answer || "No answer generated.",
            data.followUps || []
          );
          return;
        }

        if (data.type === "error") {
          setLoading(false);
          showAnswer(
            "AI Error: " +
              (data.message || "Something went wrong.")
          );
        }
      } catch (error) {
        console.error("WebSocket message error:", error);
      }
    };

    ws.onerror = (error) => {
      console.error("WebSocket error:", error);
    };

    ws.onclose = () => {
      console.log("AI connection closed");

      const connection = $("connection");

      if (connection) {
        connection.textContent = "● Offline";
      }
    };
  } catch (error) {
    console.error("WebSocket connection failed:", error);
  }
}

connectAI();

/* =========================
   PAGE NAVIGATION
========================= */

const pageInfo = {
  dashboard: {
    title: "Dashboard",
    subtitle: "Your interview workspace"
  },

  setup: {
    title: "Interview Setup",
    subtitle: "Configure your interview"
  },

  live: {
    title: "Live Interview",
    subtitle: "AI-powered interview workspace"
  },

  questions: {
    title: "Question Bank",
    subtitle: "Practice technical and HR questions"
  },

  history: {
    title: "History",
    subtitle: "Your interview practice history"
  },

  report: {
    title: "Report",
    subtitle: "Interview practice summary"
  }
};

function go(page) {
  document.querySelectorAll(".page").forEach((section) => {
    section.classList.remove("active");
  });

  const target = $(page);

  if (target) {
    target.classList.add("active");
  } else {
    console.error("Page not found:", page);
    return;
  }

  document.querySelectorAll(".nav").forEach((button) => {
    button.classList.remove("active");

    if (button.dataset.page === page) {
      button.classList.add("active");
    }
  });

  const info = pageInfo[page];

  if (info) {
    const title = $("pageTitle");
    const subtitle = $("pageSub");

    if (title) {
      title.textContent = info.title;
    }

    if (subtitle) {
      subtitle.textContent = info.subtitle;
    }
  }

  if (page === "history") {
    renderHistory();
  }

  if (page === "report") {
    updateReport();
  }

  if (page === "questions") {
    loadCategory("AWS");
  }

  window.scrollTo({
    top: 0,
    behavior: "smooth"
  });
}

/* HTML onclick="" साठी global */
window.go = go;

/* =========================
   SETUP
========================= */

function saveSetup() {
  const setup = {
    role: $("role")?.value || "",
    company: $("company")?.value || "",
    jobDescription: $("jd")?.value || "",
    resume: $("resume")?.value || ""
  };

  localStorage.setItem(
    "dreamapex_setup",
    JSON.stringify(setup)
  );

  const role = $("role")?.value || "";

  console.log("Interview setup saved:", setup);

  if (role) {
    console.log("Role:", role);
  }
}

window.saveSetup = saveSetup;

/* =========================
   LOAD SETUP
========================= */

function loadSetup() {
  try {
    const setup = JSON.parse(
      localStorage.getItem("dreamapex_setup") || "{}"
    );

    if ($("role")) {
      $("role").value = setup.role || "";
    }

    if ($("company")) {
      $("company").value = setup.company || "";
    }

    if ($("jd")) {
      $("jd").value = setup.jobDescription || "";
    }

    if ($("resume")) {
      $("resume").value = setup.resume || "";
    }
  } catch (error) {
    console.error("Setup load error:", error);
  }
}

/* =========================
   LIVE INTERVIEW
========================= */

function generateAnswer() {
  const question = $("question")?.value.trim();

  if (!question) {
    alert("Please enter an interview question first.");
    return;
  }

  const setup = JSON.parse(
    localStorage.getItem("dreamapex_setup") || "{}"
  );

  const mode = $("mode")?.value || "concise";
  const language = $("language")?.value || "English";

  if (!ws || ws.readyState !== WebSocket.OPEN) {
    alert("AI connection is not ready. Please wait a moment.");
    connectAI();
    return;
  }

  setLoading(true);

  ws.send(
    JSON.stringify({
      type: "generate",

      role: setup.role || "DevOps Engineer",

      company: setup.company || "",

      jobDescription:
        setup.jobDescription || "",

      resume:
        setup.resume || "",

      question,

      mode,

      language
    })
  );
}

function setLoading(loading) {
  const button = $("generate");

  if (!button) return;

  button.disabled = loading;

  button.textContent = loading
    ? "Generating..."
    : "Generate AI Answer ✨";
}

function showAnswer(answer, followUps = []) {
  setLoading(false);

  const answerBox = $("answer");

  if (answerBox) {
    answerBox.classList.remove("empty");
    answerBox.textContent = answer;
  }

  const followupBox = $("followups");

  if (followupBox) {
    followupBox.innerHTML = "";

    if (followUps.length) {
      const heading = document.createElement("strong");

      heading.textContent = "Possible Follow-ups";

      followupBox.appendChild(heading);

      followUps.forEach((item) => {
        const div = document.createElement("div");

        div.textContent = item;

        followupBox.appendChild(div);
      });
    }
  }

  const question = $("question")?.value.trim();

  if (question) {
    history.push({
      question,
      answer,
      time: new Date().toLocaleString(),
      number: questionIndex
    });

    localStorage.setItem(
      "dreamapex_history",
      JSON.stringify(history)
    );
  }

  updateStats();
  updateReport();
}

/* =========================
   SPEECH
========================= */

function toggleSpeech() {
  const SpeechRecognition =
    window.SpeechRecognition ||
    window.webkitSpeechRecognition;

  if (!SpeechRecognition) {
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

  recognition = new SpeechRecognition();

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
    console.error(
      "Speech recognition error:",
      event.error
    );
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
   QUESTION NAVIGATION
========================= */

function nextQuestion() {
  questionIndex++;

  updateQuestionNumber();

  if ($("question")) {
    $("question").value = "";
    $("question").focus();
  }

  if ($("answer")) {
    $("answer").textContent =
      "Your AI answer will appear here.";

    $("answer").classList.add("empty");
  }

  if ($("followups")) {
    $("followups").innerHTML = "";
  }
}

function previousQuestion() {
  if (questionIndex > 1) {
    questionIndex--;
  }

  updateQuestionNumber();
}

function updateQuestionNumber() {
  const number = $("qNumber");

  if (number) {
    number.textContent =
      `Question ${questionIndex}`;
  }
}

/* =========================
   QUESTION BANK
========================= */

function loadCategory(category) {
  const bank = $("bank");

  if (!bank) return;

  bank.innerHTML = "";

  const questions = questionBank[category] || [];

  questions.forEach((question, index) => {
    const button = document.createElement("button");

    button.className = "bank-item";
    button.type = "button";

    button.textContent =
      `${index + 1}. ${question}`;

    button.addEventListener("click", () => {
      useQuestion(question);
    });

    bank.appendChild(button);
  });
}

window.loadCategory = loadCategory;

function useQuestion(question) {
  const questionBox = $("question");

  if (!questionBox) return;

  questionBox.value = question;

  go("live");

  setTimeout(() => {
    questionBox.focus();
  }, 100);
}

/* =========================
   HISTORY
========================= */

function renderHistory() {
  const container = $("historyList");

  if (!container) return;

  if (!history.length) {
    container.innerHTML = `
      <div class="empty-history">
        No interview history yet.
      </div>
    `;

    return;
  }

  container.innerHTML = "";

  [...history]
    .reverse()
    .forEach((item) => {
      const card = document.createElement("div");

      card.className = "history-item";

      const question = document.createElement("h4");

      question.textContent =
        `Question ${item.number || ""}: ${item.question}`;

      const answer = document.createElement("p");

      answer.textContent = item.answer;

      const time = document.createElement("small");

      time.textContent = item.time;

      card.appendChild(question);
      card.appendChild(answer);
      card.appendChild(time);

      container.appendChild(card);
    });
}

function clearHistory() {
  const confirmed = confirm(
    "Clear all interview history?"
  );

  if (!confirmed) return;

  history = [];

  localStorage.removeItem(
    "dreamapex_history"
  );

  renderHistory();

  updateStats();

  updateReport();
}

/* =========================
   REPORT
========================= */

function updateReport() {
  const count = $("reportCount");

  if (count) {
    count.textContent = history.length;
  }
}

/* =========================
   DASHBOARD STATS
========================= */

function updateStats() {
  const count = $("qCount");

  if (count) {
    count.textContent = history.length;
  }
}

/* =========================
   COPY ANSWER
========================= */

function copyAnswer() {
  const answer = $("answer")?.textContent || "";

  if (!answer) return;

  navigator.clipboard
    .writeText(answer)
    .then(() => {
      const button = $("copyBtn");

      if (button) {
        const oldText = button.textContent;

        button.textContent = "Copied ✓";

        setTimeout(() => {
          button.textContent = oldText;
        }, 1500);
      }
    })
    .catch(() => {
      alert("Unable to copy answer.");
    });
}

/* =========================
   TEXT TO SPEECH
========================= */

function speakAnswer() {
  const answer = $("answer")?.textContent || "";

  if (!answer) return;

  if (!window.speechSynthesis) {
    alert("Text-to-speech is not supported.");
    return;
  }

  window.speechSynthesis.cancel();

  const speech = new SpeechSynthesisUtterance(answer);

  const language = $("language")?.value || "English";

  speech.lang =
    language === "Marathi"
      ? "mr-IN"
      : language === "Hindi"
      ? "hi-IN"
      : "en-IN";

  window.speechSynthesis.speak(speech);
}

/* =========================
   BUTTON EVENTS
========================= */

document.addEventListener("DOMContentLoaded", () => {
  loadSetup();

  updateStats();

  updateReport();

  /* Sidebar */
  document.querySelectorAll(".nav").forEach((button) => {
    button.addEventListener("click", () => {
      go(button.dataset.page);
    });
  });

  /* Generate */
  $("generate")?.addEventListener(
    "click",
    generateAnswer
  );

  /* Mic */
  $("micBtn")?.addEventListener(
    "click",
    toggleSpeech
  );

  /* Previous */
  $("prevBtn")?.addEventListener(
    "click",
    previousQuestion
  );

  /* Next */
  $("nextBtn")?.addEventListener(
    "click",
    nextQuestion
  );

  /* Clear history */
  $("clearHistory")?.addEventListener(
    "click",
    clearHistory
  );

  /* Copy */
  $("copyBtn")?.addEventListener(
    "click",
    copyAnswer
  );

  /* Speak answer */
  $("speakBtn")?.addEventListener(
    "click",
    speakAnswer
  );

  /* Ctrl + Enter = Generate */
  $("question")?.addEventListener(
    "keydown",
    (event) => {
      if (
        event.key === "Enter" &&
        (event.ctrlKey || event.metaKey)
      ) {
        generateAnswer();
      }
    }
  );

  /* Default category */
  loadCategory("AWS");
});