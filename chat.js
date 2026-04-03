const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");

const CORS_HEADERS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

function loadKnowledge() {
  const knowledgeDir = path.join(__dirname, "knowledge");
  const files = fs.readdirSync(knowledgeDir).filter((f) => f.endsWith(".md"));
  return files
    .map((f) => fs.readFileSync(path.join(knowledgeDir, f), "utf-8"))
    .join("\n\n---\n\n");
}

const knowledgeBase = loadKnowledge();

const SYSTEM_PROMPT = `You are Connor McBride's AI assistant, embedded on his personal portfolio website. Your job is to answer questions about Connor's professional background, experience, skills, and what he's looking for in his next role.

Use the knowledge base below to answer questions. Be conversational, concise, and helpful. Answer in 2-4 sentences unless the question warrants more detail. Speak in third person about Connor (e.g., "Connor has..." not "I have...").

If someone asks something not covered in the knowledge base, politely say you don't have that information and suggest they reach out to Connor directly at connortmcbride@gmail.com.

Do not make up information that isn't in the knowledge base. Do not use bullet points or lists unless specifically asked. Keep the tone warm and professional.

<knowledge_base>
${knowledgeBase}
</knowledge_base>`;

module.exports = async function handler(req, res) {
  Object.entries(CORS_HEADERS).forEach(([key, value]) => {
    res.setHeader(key, value);
  });

  if (req.method === "OPTIONS") {
    return res.status(200).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { message, history = [] } = req.body;

  if (!message || typeof message !== "string") {
    return res.status(400).json({ error: "Message is required" });
  }

  const messages = [];
  for (const msg of history.slice(-10)) {
    messages.push({ role: msg.role, content: msg.content });
  }
  messages.push({ role: "user", content: message });

  try {
    const client = new Anthropic();
    const response = await client.messages.create({
      model: "claude-sonnet-4-20250514",
      max_tokens: 512,
      system: SYSTEM_PROMPT,
      messages: messages,
    });
    const reply = response.content[0].text;
    return res.status(200).json({ reply });
  } catch (err) {
    console.error("Anthropic API error:", err.message);
    return res.status(500).json({ error: "Something went wrong. Please try again." });
  }
};yes
