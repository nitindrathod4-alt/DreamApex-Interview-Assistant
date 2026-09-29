const $=id=>document.getElementById(id);
let socket;
let history=JSON.parse(localStorage.getItem("dreamapex_history")||"[]");
let lastAnswer="";

function connect(){
  socket=new WebSocket((location.protocol==="https:"?"wss://":"ws://")+location.host);

  socket.onopen=()=>{
    $("statusText").textContent="Connected";
    $("dot").parentElement.classList.add("ok");
  };

  socket.onclose=()=>{
    $("statusText").textContent="Reconnecting...";
    $("dot").parentElement.classList.remove("ok");
    setTimeout(connect,1500);
  };

  socket.onmessage=e=>{
    const m=JSON.parse(e.data);

    if(m.type==="status"){
      $("statusText").textContent="AI thinking...";
    }

    if(m.type==="answer"){
      showAnswer(m.answer,m.followUps||[]);
      $("statusText").textContent="Ready";
    }

    if(m.type==="error"){
      alert(m.message);
      $("statusText").textContent="Error";
    }
  };
}

function payload(){
  return{
    type:"generate",
    question:$("question").value,
    role:$("role").value,
    company:$("company").value,
    jobDescription:$("jd").value,
    resume:$("resume").value,
    mode:$("mode").value,
    language:$("language").value
  };
}

function esc(s){
  return String(s).replace(/[&<>"']/g,c=>({
    "&":"&amp;",
    "<":"&lt;",
    ">":"&gt;",
    '"':"&quot;",
    "'":"&#039;"
  }[c]));
}

function showAnswer(text,followUps){
  lastAnswer=text;
  $("answer").textContent=text;
  $("answer").classList.remove("empty");

  $("followups").innerHTML=followUps
    .map(x=>"<div>"+esc(x)+"</div>")
    .join("");

  history.unshift({
    question:$("question").value,
    answer:text,
    time:new Date().toLocaleString()
  });

  history=history.slice(0,30);
  localStorage.setItem("dreamapex_history",JSON.stringify(history));
  renderHistory();
}

function renderHistory(){
  $("history").innerHTML=history.length
    ?history.map((x,i)=>`
      <div class="history-item" data-i="${i}">
        <b>${esc(x.question)}</b>
        <small>${esc(x.time)}</small>
      </div>
    `).join("")
    :"<div class='answer empty'>No questions yet.</div>";

  document.querySelectorAll(".history-item").forEach(el=>{
    el.onclick=()=>{
      const x=history[Number(el.dataset.i)];
      $("question").value=x.question;
      $("answer").textContent=x.answer;
      $("answer").classList.remove("empty");
      lastAnswer=x.answer;
    };
  });
}

$("generate").onclick=()=>{
  if(!socket||socket.readyState!==1)
    return alert("Connecting...");

  if(!$("question").value.trim())
    return alert("Enter an interview question.");

  $("generate").disabled=true;
  socket.send(JSON.stringify(payload()));

  setTimeout(()=>{
    $("generate").disabled=false;
  },800);
};

$("copyBtn").onclick=async()=>{
  if(lastAnswer)
    await navigator.clipboard.writeText(lastAnswer);
};

$("speakBtn").onclick=()=>{
  if(lastAnswer&&"speechSynthesis"in window){
    speechSynthesis.cancel();
    speechSynthesis.speak(
      new SpeechSynthesisUtterance(lastAnswer)
    );
  }
};

$("clearHistory").onclick=()=>{
  history=[];
  localStorage.removeItem("dreamapex_history");
  renderHistory();
};

$("clearBtn").onclick=()=>{
  ["role","company","jd","resume","question"]
    .forEach(id=>$(id).value="");
};


// ===============================
// FIXED SPEECH RECOGNITION
// ===============================

let recognition=null;

$("micBtn").onclick=()=>{
  const SR=window.SpeechRecognition||window.webkitSpeechRecognition;

  if(!SR){
    return alert("Speech recognition is not supported. Use Chrome.");
  }

  if(recognition){
    recognition.stop();
    recognition=null;
    $("micBtn").textContent="🎙 Speak";
    return;
  }

  recognition=new SR();

  recognition.lang=
    $("language").value==="Marathi"
      ?"mr-IN"
      :$("language").value==="Hindi"
      ?"hi-IN"
      :"en-IN";

  // IMPORTANT:
  // One question only.
  recognition.continuous=false;
  recognition.interimResults=false;
  recognition.maxAlternatives=1;

  recognition.onstart=()=>{
    $("micBtn").textContent="⏹ Stop";
    $("statusText").textContent="Listening...";
  };

  recognition.onresult=(event)=>{
    const transcript=
      event.results[0][0].transcript.trim();

    // Replace instead of repeatedly appending.
    $("question").value=transcript;
    $("statusText").textContent="Ready";
  };

  recognition.onerror=(event)=>{
    console.error("Speech recognition error:",event.error);
    $("statusText").textContent="Speech error";
  };

  recognition.onend=()=>{
    recognition=null;
    $("micBtn").textContent="🎙 Speak";

    if(socket&&socket.readyState===1){
      $("statusText").textContent="Ready";
    }
  };

  recognition.start();
};

renderHistory();
connect();
