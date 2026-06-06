const STOP_WORDS = new Set([
  '的', '了', '是', '在', '和', '与', '或', '有', '为', '等', '这', '那', '我', '你', '他', '她', '它',
  '我们', '他们', '一个', '可以', '已经', '如果', '因为', '所以', '但是', '而且', '这个', '那个',
  'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been', 'being', 'have', 'has', 'had',
  'do', 'does', 'did', 'will', 'would', 'could', 'should', 'may', 'might', 'must', 'can',
  'to', 'of', 'in', 'for', 'on', 'with', 'at', 'by', 'from', 'as', 'and', 'but', 'or', 'not',
  'this', 'that', 'these', 'those', 'it', 'its', 'you', 'your', 'we', 'our', 'they', 'their',
])

/** 提取英文词与中文二字词，用于轻量 TF-IDF */
export function tokenize(text: string): string[] {
  const tokens: string[] = []
  const lower = text.toLowerCase()

  const english = lower.match(/[a-z]{2,}/g)
  if (english) tokens.push(...english)

  const cjkRuns = text.match(/[\u4e00-\u9fff]+/g) ?? []
  for (const run of cjkRuns) {
    if (run.length === 1) {
      if (!STOP_WORDS.has(run)) tokens.push(run)
      continue
    }
    for (let i = 0; i < run.length - 1; i++) {
      tokens.push(run.slice(i, i + 2))
    }
  }

  return tokens.filter((t) => !STOP_WORDS.has(t))
}

type TfIdfVector = Map<string, number>

function buildTfIdfVector(tokens: string[], df: Map<string, number>, docCount: number): TfIdfVector {
  const tf = new Map<string, number>()
  for (const token of tokens) {
    tf.set(token, (tf.get(token) ?? 0) + 1)
  }

  const maxTf = Math.max(...tf.values(), 1)
  const vector = new Map<string, number>()

  for (const [term, count] of tf) {
    const termTf = count / maxTf
    const idf = Math.log((docCount + 1) / ((df.get(term) ?? 0) + 1)) + 1
    vector.set(term, termTf * idf)
  }

  return vector
}

function cosineSimilarity(a: TfIdfVector, b: TfIdfVector): number {
  let dot = 0
  let normA = 0
  let normB = 0

  for (const [, value] of a) {
    normA += value * value
  }
  for (const [, value] of b) {
    normB += value * value
  }

  const smaller = a.size <= b.size ? a : b
  const larger = a.size <= b.size ? b : a

  for (const [term, valueA] of smaller) {
    const valueB = larger.get(term)
    if (valueB !== undefined) {
      dot += valueA * valueB
    }
  }

  if (normA === 0 || normB === 0) return 0
  return dot / (Math.sqrt(normA) * Math.sqrt(normB))
}

export type RelatedNoteResult = {
  noteId: string
  title: string
  similarity: number
}

export function findRelatedNotes(
  currentNoteId: string,
  currentTitle: string,
  currentContent: string,
  allNotes: Array<{ id: string; title: string; content: string }>,
  topN = 5,
): RelatedNoteResult[] {
  const currentText = `${currentTitle}\n${currentTitle}\n${currentContent}`.trim()
  if (!currentText) return []

  const others = allNotes.filter((n) => n.id !== currentNoteId)
  if (others.length === 0) return []

  const documents = [
    currentText,
    ...others.map((n) => `${n.title}\n${n.title}\n${n.content}`),
  ]
  const tokenized = documents.map(tokenize)

  const df = new Map<string, number>()
  for (const tokens of tokenized) {
    for (const term of new Set(tokens)) {
      df.set(term, (df.get(term) ?? 0) + 1)
    }
  }

  const docCount = documents.length
  const currentVector = buildTfIdfVector(tokenized[0], df, docCount)

  const scored = others
    .map((note, index) => {
      const vector = buildTfIdfVector(tokenized[index + 1], df, docCount)
      const similarity = cosineSimilarity(currentVector, vector)
      return {
        noteId: note.id,
        title: note.title.trim() || '未命名笔记',
        similarity: Math.round(similarity * 100),
      }
    })
    .filter((item) => item.similarity > 0)
    .sort((a, b) => b.similarity - a.similarity)
    .slice(0, topN)

  return scored
}
