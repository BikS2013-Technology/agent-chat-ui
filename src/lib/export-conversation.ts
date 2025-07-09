import { Message } from "@langchain/langgraph-sdk";

export type ExportFormat = "json" | "markdown" | "text";

interface ExportOptions {
  messages: Message[];
  format: ExportFormat;
  threadId?: string | null;
  timestamp?: Date;
}

function getMessageContent(message: Message): string {
  if (typeof message.content === "string") {
    return message.content;
  }
  
  if (Array.isArray(message.content)) {
    return message.content
      .map((item) => {
        if (typeof item === "string") return item;
        if (typeof item === "object" && item !== null && 'type' in item) {
          if (item.type === "text" && 'text' in item) {
            return (item as any).text;
          }
          if (item.type === "image_url") {
            return "[Image]";
          }
        }
        return "[Unknown content]";
      })
      .join(" ");
  }
  
  return "[Complex content]";
}

function exportAsJSON(options: ExportOptions): string {
  const exportData = {
    threadId: options.threadId,
    timestamp: options.timestamp || new Date(),
    messages: options.messages.map((msg) => ({
      id: msg.id,
      type: msg.type,
      content: msg.content,
      ...('name' in msg && msg.name && { name: msg.name }),
      ...('tool_calls' in msg && msg.tool_calls && { tool_calls: msg.tool_calls }),
    })),
  };
  
  return JSON.stringify(exportData, null, 2);
}

function exportAsMarkdown(options: ExportOptions): string {
  const { messages, threadId, timestamp } = options;
  const date = (timestamp || new Date()).toLocaleString();
  
  let markdown = `# Conversation Export\n\n`;
  markdown += `**Thread ID:** ${threadId || "N/A"}\n`;
  markdown += `**Exported:** ${date}\n\n`;
  markdown += `---\n\n`;
  
  messages.forEach((msg) => {
    const content = getMessageContent(msg);
    
    switch (msg.type) {
      case "human":
        markdown += `### 👤 Human\n\n${content}\n\n`;
        break;
      case "ai":
        markdown += `### 🤖 Assistant\n\n${content}\n\n`;
        break;
      case "tool":
        markdown += `### 🔧 Tool: ${('name' in msg && msg.name) || "Unknown"}\n\n\`\`\`\n${content}\n\`\`\`\n\n`;
        break;
      default:
        markdown += `### ${msg.type}\n\n${content}\n\n`;
    }
  });
  
  return markdown;
}

function exportAsText(options: ExportOptions): string {
  const { messages, threadId, timestamp } = options;
  const date = (timestamp || new Date()).toLocaleString();
  
  let text = `Conversation Export\n`;
  text += `==================\n\n`;
  text += `Thread ID: ${threadId || "N/A"}\n`;
  text += `Exported: ${date}\n\n`;
  text += `------------------\n\n`;
  
  messages.forEach((msg) => {
    const content = getMessageContent(msg);
    
    switch (msg.type) {
      case "human":
        text += `Human:\n${content}\n\n`;
        break;
      case "ai":
        text += `Assistant:\n${content}\n\n`;
        break;
      case "tool":
        text += `Tool (${('name' in msg && msg.name) || "Unknown"}):\n${content}\n\n`;
        break;
      default:
        text += `${msg.type}:\n${content}\n\n`;
    }
  });
  
  return text;
}

export function exportConversation(options: ExportOptions): string {
  switch (options.format) {
    case "json":
      return exportAsJSON(options);
    case "markdown":
      return exportAsMarkdown(options);
    case "text":
      return exportAsText(options);
    default:
      throw new Error(`Unsupported export format: ${options.format}`);
  }
}

export function downloadConversation(
  content: string,
  format: ExportFormat,
  threadId?: string | null
): void {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const filename = `conversation_${threadId || "export"}_${timestamp}.${
    format === "json" ? "json" : format === "markdown" ? "md" : "txt"
  }`;
  
  const blob = new Blob([content], {
    type: format === "json" 
      ? "application/json" 
      : format === "markdown" 
      ? "text/markdown" 
      : "text/plain",
  });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}