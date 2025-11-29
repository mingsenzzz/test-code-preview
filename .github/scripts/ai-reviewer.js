/*
 * @Author: 翟乐乐 lele.zhai@quantgroup.com
 * @Date: 2025-11-29 20:48:48
 * @LastEditors: 翟乐乐 lele.zhai@quantgroup.com
 * @LastEditTime: 2025-11-29 21:07:19
 * @FilePath: /test-code-preview/.github/scripts/ai-preview.js
 */
// 文件路径: .github/scripts/ai-reviewer.js
const { Octokit } = require("@octokit/rest");
const OpenAI = require("openai");

// 配置：只审查这些后缀的文件
const TARGET_EXTENSIONS = ['.js', '.jsx', '.ts', '.tsx', '.vue', '.html', '.css', '.scss'];

async function run() {
  try {
    const githubToken = process.env.GITHUB_TOKEN;
    const openaiApiKey = process.env.OPENAI_API_KEY;

    // 初始化 Octokit (GitHub API)
    const octokit = new Octokit({ auth: githubToken });

    // 初始化 OpenAI
    // ==========================================
    // ⭐ 如果你用的是 DeepSeek，请取消下面 baseURL 的注释
    // ==========================================
    const openai = new OpenAI({
      apiKey: openaiApiKey,
      baseURL: "https://api.deepseek.com", // <--- 如果用 DeepSeek，把这行注释解开
    });

    const [owner, repo] = process.env.GITHUB_REPOSITORY.split("/");
    const pull_number = process.env.PR_NUMBER;

    console.log(`🚀 开始审查 PR: ${owner}/${repo} #${pull_number}`);

    // 获取 PR 修改的文件列表
    const { data: files } = await octokit.pulls.listFiles({
      owner,
      repo,
      pull_number,
    });

    let promptContent = "";

    for (const file of files) {
      if (file.status === 'removed') continue;
      // 简单的后缀匹配
      if (!TARGET_EXTENSIONS.some(ext => file.filename.endsWith(ext))) continue;
      // 排除 lock 文件
      if (file.filename.includes('lock')) continue;

      if (file.patch) {
        promptContent += `\n\n--- File: ${file.filename} ---\n${file.patch}`;
      }
    }

    if (!promptContent) {
      console.log("⚠️ 没有发现需要审查的前端代码变更。");
      return;
    }

    // 简单截断防止 Token 溢出
    if (promptContent.length > 20000) {
      promptContent = promptContent.substring(0, 20000) + "\n...(diff truncated)...";
    }

    console.log("🤖 正在请求 AI 分析...");

    // 调用 AI
    const completion = await openai.chat.completions.create({
      messages: [
        {
            role: "system",
            content: "你是一个资深前端架构师。请审查代码 Diff，关注：逻辑错误、安全隐患、性能问题。忽略格式问题。请用中文 Markdown 列表格式回答。如果无问题回复 'LGTM'。"
        },
        { role: "user", content: promptContent }
      ],
      model: "deepseek-chat", // <--- 如果用 DeepSeek 改这里
      // model: "gpt-3.5-turbo",   // 如果用 OpenAI 默认这个
    });

    const reviewComment = completion.choices[0].message.content;

    // 回写评论
    if (!reviewComment.includes("LGTM")) {
      await octokit.issues.createComment({
        owner,
        repo,
        issue_number: pull_number,
        body: `### 🤖 AI 代码审查建议\n\n${reviewComment}`
      });
      console.log("✅ 评论已提交！");
    } else {
        console.log("✅ 代码看起来不错 (LGTM)");
    }

  } catch (error) {
    console.error("❌ 执行出错:", error);
    process.exit(1);
  }
}

run();