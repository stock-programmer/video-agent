import "dotenv/config";
import express from "express";
import multer from "multer";
import { tool } from "langchain";
import { TavilySearch } from "@langchain/tavily";
import { ChatAlibabaTongyi } from "@langchain/community/chat_models/alibaba_tongyi";
import { createDeepAgent } from "deepagents";
import { z } from "zod";
import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import pdfParse from "pdf-parse";
import mammoth from "mammoth";
import { Document, Paragraph, HeadingLevel, TextRun, AlignmentType } from "docx";
import { Buffer } from "buffer";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ========================================
// Qwen Wrapper Class (from your existing code)
// ========================================
class QwenWithTools extends ChatAlibabaTongyi {
  constructor(config) {
    super(config);
    this._boundTools = [];
  }

  bindTools(tools) {
    const instance = new QwenWithTools({
      model: this.model,
      temperature: this.temperature,
      alibabaApiKey: this.alibabaApiKey,
    });
    instance._boundTools = tools;
    return instance;
  }

  async invoke(input, options) {
    if (this._boundTools && this._boundTools.length > 0) {
      const toolDescriptions = this._boundTools
        .map((tool, index) => {
          const schema = tool.schema || tool.func?.schema;
          return `Tool ${index + 1}: ${tool.name || tool.func?.name}
Description: ${tool.description || tool.func?.description}
Parameters: ${schema ? JSON.stringify(schema, null, 2) : "No parameters"}`;
        })
        .join("\n\n");

      const systemMessage = `You have access to the following tools:

${toolDescriptions}

When you need to use a tool, respond with a JSON object in this format:
{
  "tool": "tool_name",
  "parameters": { ... }
}`;

      if (Array.isArray(input)) {
        input = [{ role: "system", content: systemMessage }, ...input];
      } else if (input.messages) {
        input.messages = [
          { role: "system", content: systemMessage },
          ...input.messages,
        ];
      }
    }
    return super.invoke(input, options);
  }
}

// ========================================
// File Processing Utilities
// ========================================
async function extractTextFromFile(filePath, originalName) {
  const ext = path.extname(originalName).toLowerCase();

  if (ext === ".txt") {
    return await fs.readFile(filePath, "utf-8");
  } else if (ext === ".pdf") {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return data.text;
  } else if (ext === ".docx") {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error(`Unsupported file type: ${ext}`);
}

// Convert markdown to DOCX
function markdownToDocx(mdText) {
  const doc = new Document({
    sections: [
      {
        properties: {},
        children: [],
      },
    ],
  });

  const lines = mdText.split("\n");
  const children = [];

  for (const line of lines) {
    const trimmed = line.trim();

    if (!trimmed) {
      children.push(new Paragraph({ text: "" }));
      continue;
    }

    // Headings
    if (trimmed.startsWith("#")) {
      const level = trimmed.match(/^#+/)[0].length;
      const text = trimmed.replace(/^#+\s*/, "");
      children.push(
        new Paragraph({
          text,
          heading:
            level === 1
              ? HeadingLevel.HEADING_1
              : level === 2
              ? HeadingLevel.HEADING_2
              : HeadingLevel.HEADING_3,
        })
      );
    }
    // List items
    else if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      children.push(
        new Paragraph({
          text: trimmed.substring(2),
          bullet: { level: 0 },
        })
      );
    }
    // Regular paragraph
    else {
      children.push(new Paragraph({ text: trimmed }));
    }
  }

  doc.sections[0].children = children;
  return doc;
}

// ========================================
// Internet Search Tool
// ========================================
const internetSearch = tool(
  async ({
    query,
    maxResults = 5,
    topic = "general",
    includeRawContent = false,
  }) => {
    const tavilySearch = new TavilySearch({
      maxResults,
      tavilyApiKey: process.env.TAVILY_API_KEY,
      includeRawContent,
      topic,
    });
    const results = await tavilySearch._call({ query });
    return results;
  },
  {
    name: "internet_search",
    description: "Search the web for current job postings and company information",
    schema: z.object({
      query: z.string().describe("The search query"),
      maxResults: z
        .number()
        .optional()
        .default(5)
        .describe("Maximum number of results to return"),
      topic: z
        .enum(["general", "news", "finance"])
        .optional()
        .default("general")
        .describe("Search topic category"),
      includeRawContent: z
        .boolean()
        .optional()
        .default(false)
        .describe("Whether to include raw content"),
    }),
  }
);

// ========================================
// Agent Instructions and Prompts
// ========================================
const MAIN_INSTRUCTIONS = `You are a job application assistant. Your tasks are:

1) Use the internet_search tool to find exactly 5 CURRENT job postings matching the user's target title, locations, and skills.
   Return them ONLY as JSON wrapped in this exact format:

   <JOBS>
   [{"company":"CompanyName","title":"Job Title","location":"City/Remote","link":"https://...","Good Match":"one sentence explaining fit"}, ... five total]
   </JOBS>

   Rules:
   - The list MUST be valid JSON (no comments, proper quotes)
   - Links must be real job application URLs
   - No duplicate jobs
   - Prefer reputable sources (LinkedIn, company career pages, Greenhouse, Lever)

2) Create a concise cover letter (≤150 words) for EACH job found.
   - Include a subject line
   - Tailor to the specific job and company
   - Highlight relevant skills from the resume
   - Return cover letters in a separate section wrapped like this:

   <COVER_LETTERS>
   ## [Company Name] - [Job Title]
   **Subject:** ...
   [letter content]
   ---
   </COVER_LETTERS>

IMPORTANT: Do not invent jobs. Only return real, current postings with valid links.`;

const JOB_SEARCH_PROMPT = `Your task: Search and select 5 real job postings matching the user's criteria.

Steps:
1. Use internet_search with queries like: "{title} jobs {location} site:linkedin.com"
2. Use internet_search with: "{title} {location} site:greenhouse.io OR site:lever.co"
3. Verify each posting is current and has a valid application link
4. Select the 5 best matches

Output ONLY this exact format (no other text):

<JOBS>
[{"company":"...","title":"...","location":"...","link":"https://...","Good Match":"one sentence"},
 {"company":"...","title":"...","location":"...","link":"https://...","Good Match":"one sentence"},
 {"company":"...","title":"...","location":"...","link":"https://...","Good Match":"one sentence"},
 {"company":"...","title":"...","location":"...","link":"https://...","Good Match":"one sentence"},
 {"company":"...","title":"...","location":"...","link":"https://...","Good Match":"one sentence"}]
</JOBS>`;

const COVER_LETTER_PROMPT = `For each job found, write a tailored cover letter.

Format your response with this wrapper:

<COVER_LETTERS>
## [Company Name] - [Job Title]

**Subject:** Application for [Job Title] at [Company Name]

[Cover letter body - max 150 words, highlighting:
- Specific skills from resume that match job requirements
- Why you're interested in this company
- How you can add value to the role]

---

[Repeat for each job]
</COVER_LETTERS>

Make each letter specific and compelling.`;

// ========================================
// Agent Builder
// ========================================
function buildJobAssistantAgent() {
  console.log("\n🔧 Building job assistant agent...");

  // Check API keys
  if (!process.env.ALIBABA_API_KEY) {
    console.error("❌ ALIBABA_API_KEY is not set!");
    throw new Error("ALIBABA_API_KEY is required");
  }
  if (!process.env.TAVILY_API_KEY) {
    console.error("❌ TAVILY_API_KEY is not set!");
    throw new Error("TAVILY_API_KEY is required");
  }

  console.log("✅ ALIBABA_API_KEY found:", process.env.ALIBABA_API_KEY.substring(0, 10) + "...");
  console.log("✅ TAVILY_API_KEY found:", process.env.TAVILY_API_KEY.substring(0, 10) + "...");

  const qwenModel = new QwenWithTools({
    model: "qwen-plus",
    temperature: 0.3,
    alibabaApiKey: process.env.ALIBABA_API_KEY,
  });

  console.log("✅ Qwen model created: qwen-plus (temp: 0.3)");

  const subagents = [
    {
      name: "job-search-agent",
      description: "Searches and finds relevant job postings",
      prompt: JOB_SEARCH_PROMPT,
    },
    {
      name: "cover-letter-writer",
      description: "Writes tailored cover letters for each job",
      prompt: COVER_LETTER_PROMPT,
    },
  ];

  console.log("✅ Sub-agents configured:");
  console.log("  1. job-search-agent");
  console.log("  2. cover-letter-writer");

  console.log("✅ Tools configured:");
  console.log("  1. internet_search (Tavily)");

  return createDeepAgent({
    tools: [internetSearch],
    systemPrompt: MAIN_INSTRUCTIONS,
    subagents,
    model: qwenModel,
  });
}

// ========================================
// Data Extraction Utilities
// ========================================
function extractJobsFromText(text) {
  console.log("\n🔧 extractJobsFromText() called");
  console.log(`Input text length: ${text.length}`);

  const pattern = /<JOBS>\s*(?:```[\w-]*)?\s*(\[.*?\])\s*(?:```)?\s*<\/JOBS>/is;
  const match = text.match(pattern);

  if (!match) {
    console.log("❌ No <JOBS> pattern match found");
    console.log("Checking if text contains 'JOBS':", text.includes("JOBS"));
    console.log("Checking if text contains '<JOBS>':", text.includes("<JOBS>"));
    console.log("Checking if text contains '</JOBS>':", text.includes("</JOBS>"));
    return [];
  }

  console.log("✅ Found <JOBS> pattern match");
  const jsonStr = match[1].trim().replace(/^`+|`+$/g, "");
  console.log(`Extracted JSON string (first 300 chars): ${jsonStr.substring(0, 300)}`);

  try {
    const jobs = JSON.parse(jsonStr);
    console.log(`✅ Successfully parsed JSON. Array: ${Array.isArray(jobs)}, Length: ${Array.isArray(jobs) ? jobs.length : 'N/A'}`);
    return Array.isArray(jobs) ? jobs : [];
  } catch (err) {
    console.log(`❌ JSON parse failed: ${err.message}`);
    // Try to fix common JSON errors (single quotes)
    try {
      console.log("🔄 Attempting to fix JSON by replacing single quotes...");
      const fixed = jsonStr.replace(/'/g, '"');
      const jobs = JSON.parse(fixed);
      console.log(`✅ Successfully parsed fixed JSON. Array: ${Array.isArray(jobs)}, Length: ${Array.isArray(jobs) ? jobs.length : 'N/A'}`);
      return Array.isArray(jobs) ? jobs : [];
    } catch (err2) {
      console.error(`❌ Fixed JSON parse also failed: ${err2.message}`);
      return [];
    }
  }
}

function extractCoverLettersFromText(text) {
  console.log("\n🔧 extractCoverLettersFromText() called");
  console.log(`Input text length: ${text.length}`);

  const pattern = /<COVER_LETTERS>\s*(.*?)\s*<\/COVER_LETTERS>/is;
  const match = text.match(pattern);

  if (!match) {
    console.log("❌ No <COVER_LETTERS> pattern match found");
    console.log("Checking if text contains 'COVER':", text.includes("COVER"));
    console.log("Checking if text contains '<COVER_LETTERS>':", text.includes("<COVER_LETTERS>"));
    console.log("Checking if text contains '</COVER_LETTERS>':", text.includes("</COVER_LETTERS>"));
    return "";
  }

  console.log("✅ Found <COVER_LETTERS> pattern match");
  const content = match[1].trim();
  console.log(`Extracted cover letters length: ${content.length} characters`);
  return content;
}

function normalizeJobs(jobs) {
  return jobs
    .filter((job) => typeof job === "object" && job !== null)
    .map((job) => {
      const lowerKeys = {};
      Object.keys(job).forEach((key) => {
        lowerKeys[key.toLowerCase()] = job[key];
      });

      return {
        company: (lowerKeys.company || "—").trim(),
        title: (lowerKeys.title || "—").trim(),
        location: (lowerKeys.location || "—").trim(),
        link: (lowerKeys.link || "").trim(),
        goodMatch: (lowerKeys["good match"] || lowerKeys.goodmatch || "—").trim(),
      };
    })
    .filter((job) => job.link) // Must have a link
    .slice(0, 5); // Max 5 jobs
}

// ========================================
// Express Web Server
// ========================================
const app = express();
const upload = multer({ dest: "uploads/" });

app.use(express.json());
app.use(express.static("public"));

// Serve main HTML page
app.get("/", (req, res) => {
  res.send(`
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Job Application Assistant (Qwen + DeepAgents)</title>
    <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; background: #f5f5f5; padding: 20px; }
        .container { max-width: 1200px; margin: 0 auto; background: white; padding: 30px; border-radius: 8px; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
        h1 { color: #333; margin-bottom: 30px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 8px; font-weight: 600; color: #555; }
        input[type="text"], input[type="file"], textarea { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; font-size: 14px; }
        textarea { min-height: 80px; font-family: inherit; }
        button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; font-size: 16px; font-weight: 600; }
        button:hover { background: #0056b3; }
        button:disabled { background: #ccc; cursor: not-allowed; }
        .grid { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; }
        .status { margin-top: 20px; padding: 15px; border-radius: 4px; display: none; }
        .status.info { background: #d1ecf1; border: 1px solid #bee5eb; color: #0c5460; display: block; }
        .status.success { background: #d4edda; border: 1px solid #c3e6cb; color: #155724; display: block; }
        .status.error { background: #f8d7da; border: 1px solid #f5c6cb; color: #721c24; display: block; }
        table { width: 100%; border-collapse: collapse; margin-top: 20px; }
        th, td { padding: 12px; text-align: left; border-bottom: 1px solid #ddd; }
        th { background: #f8f9fa; font-weight: 600; }
        a { color: #007bff; text-decoration: none; }
        a:hover { text-decoration: underline; }
        .download-btn { margin-top: 20px; display: inline-block; }
    </style>
</head>
<body>
    <div class="container">
        <h1>💼 Job Application Assistant</h1>
        <p style="margin-bottom: 30px; color: #666;">Powered by Qwen + DeepAgents</p>

        <form id="jobForm">
            <div class="form-group">
                <label>Upload Resume (PDF/DOCX/TXT)</label>
                <input type="file" id="resume" name="resume" accept=".pdf,.docx,.txt" required>
            </div>

            <div class="grid">
                <div class="form-group">
                    <label>Target Job Title</label>
                    <input type="text" id="title" name="title" value="Senior Machine Learning Engineer" required>
                </div>
                <div class="form-group">
                    <label>Target Location(s)</label>
                    <input type="text" id="location" name="location" value="Bangalore OR Remote" required>
                </div>
            </div>

            <div class="form-group">
                <label>Skills to Emphasize (Optional)</label>
                <textarea id="skills" name="skills" placeholder="Python, PyTorch, LLMs, RAG, Azure, vLLM, FastAPI"></textarea>
            </div>

            <button type="submit" id="submitBtn">🚀 Find Jobs & Generate Cover Letters</button>
        </form>

        <div id="status" class="status"></div>

        <div id="results" style="margin-top: 40px; display: none;">
            <h2>📋 Job Matches</h2>
            <table id="jobsTable">
                <thead>
                    <tr>
                        <th>Company</th>
                        <th>Title</th>
                        <th>Location</th>
                        <th>Good Match</th>
                        <th>Link</th>
                    </tr>
                </thead>
                <tbody></tbody>
            </table>

            <div id="downloadSection" style="display: none;">
                <h2 style="margin-top: 30px;">📥 Download Cover Letters</h2>
                <a href="#" id="downloadBtn" class="download-btn">
                    <button type="button">Download cover_letters.docx</button>
                </a>
            </div>
        </div>
    </div>

    <script>
        const form = document.getElementById('jobForm');
        const status = document.getElementById('status');
        const submitBtn = document.getElementById('submitBtn');
        const results = document.getElementById('results');
        const jobsTableBody = document.querySelector('#jobsTable tbody');
        const downloadSection = document.getElementById('downloadSection');
        const downloadBtn = document.getElementById('downloadBtn');

        function showStatus(message, type = 'info') {
            status.textContent = message;
            status.className = 'status ' + type;
        }

        form.addEventListener('submit', async (e) => {
            e.preventDefault();

            const formData = new FormData(form);
            submitBtn.disabled = true;
            showStatus('🔄 Processing... This may take 1-2 minutes...', 'info');
            results.style.display = 'none';

            try {
                const response = await fetch('/process', {
                    method: 'POST',
                    body: formData
                });

                const data = await response.json();

                if (!response.ok) {
                    throw new Error(data.error || 'Request failed');
                }

                showStatus('✅ Success! Jobs found and cover letters generated.', 'success');

                // Display jobs
                jobsTableBody.innerHTML = '';
                data.jobs.forEach(job => {
                    const row = document.createElement('tr');
                    row.innerHTML = \`
                        <td>\${job.company}</td>
                        <td>\${job.title}</td>
                        <td>\${job.location}</td>
                        <td>\${job.goodMatch}</td>
                        <td><a href="\${job.link}" target="_blank">Apply →</a></td>
                    \`;
                    jobsTableBody.appendChild(row);
                });

                results.style.display = 'block';

                // Show download button if cover letters available
                if (data.hasCoverLetters) {
                    downloadSection.style.display = 'block';
                    downloadBtn.href = '/download/' + data.sessionId;
                }

            } catch (error) {
                showStatus('❌ Error: ' + error.message, 'error');
            } finally {
                submitBtn.disabled = false;
            }
        });
    </script>
</body>
</html>
  `);
});

// Store results temporarily (in production, use Redis or database)
const sessionStore = new Map();

// Process job application
app.post("/process", upload.single("resume"), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: "Resume file is required" });
    }

    const { title, location, skills } = req.body;

    // Extract resume text
    console.log("\n" + "=".repeat(60));
    console.log("📄 EXTRACTING RESUME TEXT");
    console.log("=".repeat(60));
    console.log(`File: ${req.file.originalname}`);
    console.log(`Size: ${req.file.size} bytes`);
    console.log(`Type: ${path.extname(req.file.originalname)}`);

    const resumeText = await extractTextFromFile(
      req.file.path,
      req.file.originalname
    );

    console.log(`✅ Resume text extracted: ${resumeText.length} characters`);
    console.log(`First 200 chars: ${resumeText.substring(0, 200)}...`);

    // Build task prompt
    const skillsLine = skills?.trim()
      ? `\nPrioritize these skills: ${skills.trim()}`
      : "";
    const taskPrompt = `Target title: ${title}
Target location(s): ${location}${skillsLine}

RESUME RAW TEXT:
${resumeText.substring(0, 8000)}`;

    console.log("\n" + "=".repeat(60));
    console.log("📋 TASK PROMPT:");
    console.log("=".repeat(60));
    console.log(taskPrompt.substring(0, 500) + "...\n");

    // Create agent
    console.log("🤖 Creating job assistant agent...");
    const agent = buildJobAssistantAgent();

    // Run agent
    console.log("🔍 Searching for jobs and generating cover letters...");
    console.log("⏳ This may take 1-2 minutes...\n");

    const state = {
      messages: [{ role: "user", content: taskPrompt }],
    };

    const result = await agent.invoke(state);

    console.log("\n" + "=".repeat(60));
    console.log("📊 AGENT EXECUTION COMPLETE");
    console.log("=".repeat(60));
    console.log(`Total messages in result: ${result.messages?.length || 0}`);

    // Log all messages
    if (result.messages && result.messages.length > 0) {
      console.log("\n📝 ALL MESSAGES IN CONVERSATION:");
      console.log("-".repeat(60));
      result.messages.forEach((msg, idx) => {
        console.log(`\n[Message ${idx + 1}] Role: ${msg.role || "unknown"}`);
        const content = msg.content || "";
        if (content.length > 500) {
          console.log(`Content (first 500 chars):\n${content.substring(0, 500)}...`);
          console.log(`\n... [truncated, total length: ${content.length}]`);
        } else {
          console.log(`Content:\n${content}`);
        }
      });
    }

    // Extract results
    const finalMessages = result.messages || [];
    const finalText = finalMessages[finalMessages.length - 1]?.content || "";

    console.log("\n" + "=".repeat(60));
    console.log("🔍 PARSING FINAL RESPONSE");
    console.log("=".repeat(60));
    console.log(`Final message length: ${finalText.length} characters`);
    console.log(`\nFinal message content (full):\n${finalText}\n`);

    console.log("\n🔎 Looking for <JOBS> tags...");
    const jobsMatch = finalText.match(/<JOBS>\s*(?:```[\w-]*)?\s*(\[.*?\])\s*(?:```)?\s*<\/JOBS>/is);
    if (jobsMatch) {
      console.log("✅ Found <JOBS> section!");
      console.log(`Jobs JSON: ${jobsMatch[1].substring(0, 200)}...`);
    } else {
      console.log("❌ No <JOBS> section found in response");
    }

    console.log("\n🔎 Looking for <COVER_LETTERS> tags...");
    const coverMatch = finalText.match(/<COVER_LETTERS>\s*(.*?)\s*<\/COVER_LETTERS>/is);
    if (coverMatch) {
      console.log("✅ Found <COVER_LETTERS> section!");
      console.log(`Cover letters (first 200 chars): ${coverMatch[1].substring(0, 200)}...`);
    } else {
      console.log("❌ No <COVER_LETTERS> section found in response");
    }

    const jobs = normalizeJobs(extractJobsFromText(finalText));
    const coverLettersMd = extractCoverLettersFromText(finalText);

    console.log("\n" + "=".repeat(60));
    console.log("📊 EXTRACTION RESULTS");
    console.log("=".repeat(60));
    console.log(`Jobs found: ${jobs.length}`);
    console.log(`Cover letters length: ${coverLettersMd.length} characters`);

    if (jobs.length > 0) {
      console.log("\n✅ Jobs extracted successfully:");
      jobs.forEach((job, idx) => {
        console.log(`  ${idx + 1}. ${job.company} - ${job.title}`);
      });
    } else {
      console.log("\n⚠️  No jobs were extracted from the response");
    }

    // Generate session ID
    const sessionId = Date.now().toString();

    // Store results
    sessionStore.set(sessionId, {
      jobs,
      coverLettersMd,
      timestamp: Date.now(),
    });

    // Clean up uploaded file
    await fs.unlink(req.file.path);

    // Clean old sessions (older than 1 hour)
    const oneHourAgo = Date.now() - 60 * 60 * 1000;
    for (const [sid, data] of sessionStore.entries()) {
      if (data.timestamp < oneHourAgo) {
        sessionStore.delete(sid);
      }
    }

    res.json({
      success: true,
      jobs,
      hasCoverLetters: coverLettersMd.length > 0,
      sessionId,
    });
  } catch (error) {
    console.error("\n" + "=".repeat(60));
    console.error("❌ ERROR OCCURRED");
    console.error("=".repeat(60));
    console.error(`Error type: ${error.name}`);
    console.error(`Error message: ${error.message}`);
    console.error(`Stack trace:\n${error.stack}`);
    console.error("=".repeat(60) + "\n");

    res.status(500).json({ error: error.message });
  }
});

// Download cover letters
app.get("/download/:sessionId", async (req, res) => {
  try {
    const { sessionId } = req.params;
    const data = sessionStore.get(sessionId);

    if (!data || !data.coverLettersMd) {
      return res.status(404).send("Cover letters not found");
    }

    // Convert markdown to DOCX
    const doc = markdownToDocx(data.coverLettersMd);
    const buffer = await doc.getBuffer();

    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    );
    res.setHeader(
      "Content-Disposition",
      "attachment; filename=cover_letters.docx"
    );
    res.send(Buffer.from(buffer));
  } catch (error) {
    console.error("Error generating download:", error);
    res.status(500).send("Error generating document");
  }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
╔════════════════════════════════════════════════════════════╗
║  💼 Job Application Assistant (Qwen + DeepAgents)         ║
║                                                            ║
║  Server running at: http://localhost:${PORT}              ║
║                                                            ║
║  Make sure you have set:                                   ║
║  - ALIBABA_API_KEY (for Qwen)                             ║
║  - TAVILY_API_KEY (for job search)                        ║
╚════════════════════════════════════════════════════════════╝
  `);
});
