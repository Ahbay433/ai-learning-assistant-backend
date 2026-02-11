/**
 * Split text into chunks for better AI processing
 * @param {string} text - Full text to chunk
 * @param {number} chunkSize - Target size per chunk (in words)
 * @param {number} overlap - Number of overlapping words
 * @returns {Array<{content: string, chunkIndex: number, pageNumber: number}>}
 */
export const chunkText = (text, chunkSize = 500, overlap = 50) => {
  if (!text || text.trim().length === 0) return [];

  // Normalize text
  const cleanedText = text
    .replace(/\r\n/g, "\n")
    .replace(/\t+/g, " ")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\s+/g, " ")
    .trim();

  const paragraphs = cleanedText
    .split(/\n{1,2}/)
    .map(p => p.trim())
    .filter(Boolean);

  const chunks = [];
  let currentChunk = [];
  let currentWordCount = 0;
  let chunkIndex = 0;

  for (const paragraph of paragraphs) {
    const words = paragraph.split(/\s+/);
    const wordCount = words.length;

    // Large paragraph → split by words
    if (wordCount > chunkSize) {
      if (currentChunk.length) {
        chunks.push({
          content: currentChunk.join("\n\n"),
          chunkIndex: chunkIndex++,
          pageNumber: 0,
        });
        currentChunk = [];
        currentWordCount = 0;
      }

      for (let i = 0; i < words.length; i += chunkSize - overlap) {
        chunks.push({
          content: words.slice(i, i + chunkSize).join(" "),
          chunkIndex: chunkIndex++,
          pageNumber: 0,
        });

        if (i + chunkSize >= words.length) break;
      }
      continue;
    }

    // Paragraph doesn't fit → save current chunk
    if (currentWordCount + wordCount > chunkSize && currentChunk.length) {
      chunks.push({
        content: currentChunk.join("\n\n"),
        chunkIndex: chunkIndex++,
        pageNumber: 0,
      });

      // overlap from previous chunk
      const prevWords = currentChunk.join(" ").split(/\s+/);
      const overlapText = prevWords
        .slice(-Math.min(overlap, prevWords.length))
        .join(" ");

      currentChunk = overlapText ? [overlapText] : [];
      currentWordCount = overlapText
        ? overlapText.split(/\s+/).length
        : 0;
    }

    currentChunk.push(paragraph);
    currentWordCount += wordCount;
  }

  // Push last chunk
  if (currentChunk.length) {
    chunks.push({
      content: currentChunk.join("\n\n"),
      chunkIndex,
      pageNumber: 0,
    });
  }

  return chunks;
};

/**
 * Find relevant chunks using keyword matching
 * @param {Array<Object>} chunks
 * @param {string} query
 * @param {number} maxChunks
 * @returns {Array<Object>}
 */
export const findRelevantChunks = (chunks, query, maxChunks = 3) => {
  if (!chunks || chunks.length === 0 || !query) return [];

  const stopwords = new Set([
    "the", "is", "at", "which", "on", "a", "an", "and", "or", "but",
    "in", "with", "to", "for", "of", "as", "by", "this", "that", "it",
  ]);

  const queryWords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 2 && !stopwords.has(w));

  if (queryWords.length === 0) {
    return chunks.slice(0, maxChunks).map(chunk => ({
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      _id: chunk._id,
    }));
  }

  const scoredChunks = chunks.map((chunk, index) => {
    const content = chunk.content.toLowerCase();
    const contentWords = content.split(/\s+/).length;

    let score = 0;
    let matchedWords = 0;

    for (const word of queryWords) {
      const exactMatches = (content.match(new RegExp(`\\b${word}\\b`, "g")) || []).length;
      const partialMatches =
        (content.match(new RegExp(word, "g")) || []).length - exactMatches;

      if (exactMatches > 0) matchedWords++;
      score += exactMatches * 3 + Math.max(partialMatches, 0);
    }

    if (matchedWords > 1) score += matchedWords * 2;

    const normalizedScore = score / Math.sqrt(contentWords || 1);
    const positionBonus = 1 - index / chunks.length * 0.1;

    return {
      content: chunk.content,
      chunkIndex: chunk.chunkIndex,
      pageNumber: chunk.pageNumber,
      _id: chunk._id,
      score: normalizedScore + positionBonus,
      rawScore: score,
      matchedWords,
    };
  });

  return scoredChunks
    .filter(c => c.score > 0)
    .sort((a, b) => {
      if (b.score !== a.score) return b.score - a.score;
      if (b.matchedWords !== a.matchedWords) return b.matchedWords - a.matchedWords;
      return a.chunkIndex - b.chunkIndex;
    })
    .slice(0, maxChunks);
};
