export type SummaryAndTags = {
  summary: string
  tags: string[]
}

const OPENAI_API_URL = 'https://api.openai.com/v1/chat/completions'

const SYSTEM_PROMPT = `你是一个笔记分析助手。请分析用户提供的笔记正文，生成简洁的中文摘要和相关标签。

必须仅返回 JSON，格式如下：
{"summary": "2-4句话的摘要", "tags": ["标签1", "标签2", "标签3"]}

要求：
- summary：概括核心内容，不超过 150 字
- tags：3-6 个简短中文标签，每个不超过 10 字，不要带 # 号`

export async function generateSummaryAndTags(
  content: string,
): Promise<SummaryAndTags> {
  const apiKey = import.meta.env.VITE_OPENAI_API_KEY
  if (!apiKey) {
    throw new Error('未配置 VITE_OPENAI_API_KEY')
  }

  const response = await fetch(OPENAI_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'gpt-3.5-turbo',
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: content.slice(0, 12000) },
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
    }),
  })

  if (!response.ok) {
    const detail = await response.text().catch(() => '')
    throw new Error(
      `OpenAI 请求失败 (${response.status})${detail ? `: ${detail}` : ''}`,
    )
  }

  const payload = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>
  }

  const raw = payload.choices?.[0]?.message?.content
  if (!raw) {
    throw new Error('OpenAI 返回内容为空')
  }

  let parsed: unknown
  try {
    parsed = JSON.parse(raw)
  } catch {
    throw new Error('OpenAI 返回的 JSON 无法解析')
  }

  if (
    typeof parsed !== 'object' ||
    parsed === null ||
    !('summary' in parsed) ||
    !('tags' in parsed)
  ) {
    throw new Error('OpenAI 返回格式不正确')
  }

  const { summary, tags } = parsed as { summary: unknown; tags: unknown }

  if (typeof summary !== 'string' || !Array.isArray(tags)) {
    throw new Error('OpenAI 返回格式不正确')
  }

  const normalizedTags = tags
    .filter((tag): tag is string => typeof tag === 'string')
    .map((tag) => tag.trim())
    .filter(Boolean)

  return {
    summary: summary.trim(),
    tags: normalizedTags,
  }
}
