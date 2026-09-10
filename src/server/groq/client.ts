import Groq from "groq-sdk";
import { env } from "~/env";
import { groqTools, executeGroqTool, type ToolDefinition } from "./tools";

export const groq = new Groq({
  apiKey: env.GROQ_API_KEY || process.env.GROQ_API_KEY,
});

export const DEFAULT_GROQ_MODEL = "openai/gpt-oss-120b";

export async function runGroqModel(
  input: string,
  instructions: string,
  model = DEFAULT_GROQ_MODEL,
  history?: Array<{ role: "user" | "assistant"; content: string }>,
): Promise<string> {
  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: instructions },
  ];

  if (history && history.length > 0) {
    for (const h of history) {
      messages.push({ role: h.role, content: h.content });
    }
  }

  messages.push({ role: "user", content: input });

  const completion = await groq.chat.completions.create({
    model,
    messages,
    temperature: 0.2,
    max_tokens: 1024,
  });

  return completion.choices[0]?.message?.content ?? "";
}

export async function runGroqAgentWithTools({
  input,
  instructions,
  model = DEFAULT_GROQ_MODEL,
  tools = groqTools,
}: {
  input: string;
  instructions: string;
  model?: string;
  tools?: ToolDefinition[];
}) {
  const messages: Groq.Chat.Completions.ChatCompletionMessageParam[] = [
    { role: "system", content: instructions },
    { role: "user", content: input },
  ];

  const toolCallsExecuted: Array<{
    name: string;
    args: Record<string, any>;
    result: any;
  }> = [];

  const response = await groq.chat.completions.create({
    model,
    messages,
    tools: tools.length > 0 ? (tools as any) : undefined,
    tool_choice: "auto",
    temperature: 0.2,
    max_tokens: 1024,
  });

  const choice = response.choices[0];
  const message = choice?.message;

  if (message?.tool_calls && message.tool_calls.length > 0) {
    messages.push(message as any);

    for (const toolCall of message.tool_calls) {
      if (toolCall.type === "function") {
        const fnName = toolCall.function.name;
        let fnArgs: Record<string, any> = {};
        try {
          fnArgs = JSON.parse(toolCall.function.arguments || "{}");
        } catch {
          fnArgs = {};
        }

        const toolResult = await executeGroqTool(fnName, fnArgs);
        toolCallsExecuted.push({
          name: fnName,
          args: fnArgs,
          result: toolResult,
        });

        messages.push({
          role: "tool",
          tool_call_id: toolCall.id,
          content: JSON.stringify(toolResult),
        });
      }
    }

    const followUp = await groq.chat.completions.create({
      model,
      messages,
      temperature: 0.2,
      max_tokens: 1024,
    });

    return {
      text: followUp.choices[0]?.message?.content ?? "",
      toolCalls: toolCallsExecuted,
    };
  }

  return {
    text: message?.content ?? "",
    toolCalls: [],
  };
}
