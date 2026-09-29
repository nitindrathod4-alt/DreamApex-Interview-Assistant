require("dotenv").config();
const path=require("path"), express=require("express"), http=require("http"), WebSocket=require("ws"), OpenAI=require("openai");
const app=express(), server=http.createServer(app), wss=new WebSocket.Server({server});
app.use(express.static(path.join(__dirname,"public")));
const client=process.env.OPENAI_API_KEY?new OpenAI({apiKey:process.env.OPENAI_API_KEY}):null;
async function answer(question,mode="concise"){
 if(!client)return `[Demo mode] Answer suggestion for: "${question}"\\n\\nAdd OPENAI_API_KEY to .env for real AI answers.`;
 const r=await client.chat.completions.create({model:process.env.OPENAI_MODEL||"gpt-4.1-mini",messages:[
  {role:"system",content:"You help a candidate formulate truthful interview responses. AI assistance is authorized for this session."},
  {role:"user",content:`Interview question: ${question}\\nProvide a ${mode} answer. Be accurate, natural and concise. Do not invent personal experience.`}
 ],temperature:.3});
 return r.choices?.[0]?.message?.content||"No answer generated.";
}
wss.on("connection",s=>{s.send(JSON.stringify({type:"ready"}));s.on("message",async raw=>{try{
 const m=JSON.parse(raw); if(m.type==="question"){s.send(JSON.stringify({type:"status",value:"Generating answer..."}));const a=await answer(m.text,m.mode);s.send(JSON.stringify({type:"answer",question:m.text,answer:a}));s.send(JSON.stringify({type:"status",value:"Ready"}));}
}catch(e){s.send(JSON.stringify({type:"error",message:e.message}));}})});
server.listen(Number(process.env.PORT||3000),()=>console.log("DreamApex: http://localhost:"+Number(process.env.PORT||3000)));
