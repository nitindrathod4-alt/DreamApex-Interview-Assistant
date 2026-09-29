require("dotenv").config();
const express=require("express");
const http=require("http");
const path=require("path");
const {WebSocketServer}=require("ws");
const {GoogleGenAI}=require("@google/genai");
const app=express(),server=http.createServer(app),wss=new WebSocketServer({server});
const PORT=Number(process.env.PORT||3000);
const hasKey=Boolean(process.env.GEMINI_API_KEY&&process.env.GEMINI_API_KEY!=="your_gemini_api_key_here");
const ai=hasKey?new GoogleGenAI({apiKey:process.env.GEMINI_API_KEY}):null;
const MODEL=process.env.GEMINI_MODEL||"gemini-2.5-flash-lite";
app.use(express.json({limit:"2mb"}));app.use(express.static(path.join(__dirname,"public")));
app.get("/api/health",(req,res)=>res.json({ok:true,ai:!!ai,provider:"Gemini",model:MODEL}));
const systemPrompt="You are DreamApex, an interview preparation assistant. Help the candidate practice and answer interview questions clearly and honestly. Never invent employment, certifications, projects, metrics, or personal experience. Keep answers natural, speakable, concise and technically accurate. Use only supplied candidate context when describing personal experience.";
function buildPrompt(d){const mode=d.mode||"concise";return systemPrompt+"\n\nRole: "+(d.role||"Not specified")+"\nCompany: "+(d.company||"Not specified")+"\n\nJob description:\n"+(d.jobDescription||"Not provided")+"\n\nCandidate/resume context:\n"+(d.resume||"Not provided")+"\n\nInterview question:\n"+d.question+"\n\nAnswer mode: "+mode+"\nLanguage: "+(d.language||"English")+"\n\nGenerate an interview-ready answer. "+(mode==="concise"?"Keep it around 60-100 words and easy to speak.":mode==="detailed"?"Give a structured answer with practical detail, but keep it speakable.":mode==="STAR"?"Use Situation, Task, Action and Result headings.":mode==="technical"?"Explain the concept, practical example or commands when useful, and troubleshooting points.":mode==="followup"?"Give 3 likely interviewer follow-up questions and short model answers.":"Give a structured, speakable answer.")} 
async function generate(d){if(!d.question?.trim())throw Error("Question is required.");if(!ai)return{answer:"Demo mode: add GEMINI_API_KEY to your .env file to enable AI answers.",followUps:["Can you give a real example?","What challenge did you face?","How did you measure the result?"]};const response=await ai.models.generateContent({model:MODEL,contents:buildPrompt(d),config:{temperature:.3,maxOutputTokens:700}});return{answer:response.text?.trim()||"No answer generated."}}
wss.on("connection",ws=>{ws.send(JSON.stringify({type:"connected"}));ws.on("message",async raw=>{try{const m=JSON.parse(raw.toString());if(m.type==="generate"){ws.send(JSON.stringify({type:"status",status:"thinking"}));ws.send(JSON.stringify({type:"answer",...(await generate(m))}))}}catch(e){ws.send(JSON.stringify({type:"error",message:e.message||"AI request failed"}))}})});
app.post("/api/generate",async(req,res)=>{try{res.json(await generate(req.body))}catch(e){res.status(400).json({error:e.message||"AI request failed"})}});
server.listen(PORT,()=>console.log("DreamApex running at http://localhost:"+PORT+" | Gemini: "+(hasKey?"configured":"demo mode")));