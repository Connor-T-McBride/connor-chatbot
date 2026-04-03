const Anthropic = require("@anthropic-ai/sdk");
const fs = require("fs");
const path = require("path");

const CORS_HEADERS = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
};

function loadKnowledge() {
    const rootDir = path.join(__dirname, "..");
    const files = fs.readdirSync(rootDir).filter((f) => f.endsWith(".md") && f !== "README.md");
    return files
      .map((f) => fs.readFileSync(path.join(rootDir, f), "utf-8"))
      .join("\n\n---\n\n");
}

let knowledgeBase = "";
try {
    knowledgeBase = loadKnowledge();
} catch (e) {
    console.error("Failed to load knowledge base:", e.message);
}

const SYSTEM_PROMPT = `You are Connor McBride's AI assistant on his portfolio website. Answer questions about his professional background, experience, skills, and target roles. Be conversational and concise (2-4 sentences). Speak in third person. If something isn't in the knowledge base, suggest contacting Connor at connortmcbride@gmail.com. No bullet points unless asked.

<knowledge_base>
${knowledgeBase}
</knowledge_base>`;

module.exports = async function handler(req, res) {
    Object.entries(CORS_HEADERS).forEach(([key, value]) => res.setHeader(key, value));
    if (req.method === "OPTIONS") return res.status(200).end();
    if (req.method !== "POST") return res.status(405).json({ error: "Method not allowed" });
    const { message, history = [] } = req.body;
    if (!message || typeof message !== "string") return res.status(400).json({ error: "Message is required" });
    const messages = [...history.slice(-10).map(m => ({ role: m.role, content: m.content })), { role: "user", content: message }];
    try {
          const client = new Anthropic();
          const response = await client.messages.create({
                  model: "claude-sonnet-4-20250514",
                  max_tokens: 512,
                  system: SYSTEM_PROMPT,
                  messages,
          });
          return res.status(200).json({ reply: response.content[0].text });
    } catch (err) {
          console.error("Anthropic API error:", err.message);
          return res.status(500).json({ error: "Something went wrong. Please try again." });
    }
};
