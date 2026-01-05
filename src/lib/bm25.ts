/**
 * BM25+ Search Engine
 *
 * A lightweight implementation of the BM25+ ranking algorithm for full-text search.
 * BM25+ is an enhancement of BM25 that addresses the issue of negative IDF values
 * by adding a delta parameter (typically 1.0).
 *
 * Formula:
 * score(D, Q) = Σ IDF(qi) * (tf(qi, D) * (k1 + 1)) / (tf(qi, D) + k1 * (1 - b + b * |D|/avgdl)) + delta
 *
 * where:
 * - tf(qi, D) = term frequency of query term qi in document D
 * - |D| = length of document D (in words)
 * - avgdl = average document length in the corpus
 * - k1 = 1.2 (term frequency saturation parameter)
 * - b = 0.75 (document length normalization parameter)
 * - delta = 1.0 (BM25+ extension to avoid negative IDF)
 */

// Common English stopwords to filter out
const STOPWORDS = new Set([
  "a",
  "an",
  "and",
  "are",
  "as",
  "at",
  "be",
  "by",
  "for",
  "from",
  "has",
  "he",
  "in",
  "is",
  "it",
  "its",
  "of",
  "on",
  "or",
  "that",
  "the",
  "to",
  "was",
  "were",
  "will",
  "with",
  "you",
  "your",
  "this",
  "have",
  "had",
  "not",
  "but",
  "can",
  "all",
  "if",
  "they",
  "what",
  "so",
  "up",
  "out",
  "about",
  "who",
  "get",
  "which",
  "go",
  "me",
  "when",
  "make",
  "just",
  "into",
  "one",
  "could",
  "also",
  "how",
  "our",
  "more",
  "other",
  "than",
  "then",
  "these",
  "some",
  "them",
  "way",
  "been",
  "would",
  "do",
  "does",
  "no",
  "my",
  "any",
]);

export interface SearchDocument {
  id: string;
  name: string;
  content: string;
}

export interface SearchResult {
  id: string;
  name: string;
  score: number;
  matchType: "name" | "content";
  snippet?: string;
}

interface TermFrequency {
  [term: string]: number;
}

interface InvertedIndex {
  [term: string]: Set<string>; // term -> set of document IDs
}

interface DocumentData {
  id: string;
  name: string;
  nameTokens: string[];
  contentTokens: string[];
  nameLength: number;
  contentLength: number;
  nameTf: TermFrequency;
  contentTf: TermFrequency;
  rawContent: string;
}

/**
 * Tokenizes text into lowercase words, removing stopwords and non-alphabetic characters.
 */
const tokenize = (text: string): string[] => {
  return text
    .toLowerCase()
    .replace(/[^a-záàâãéèêíïóôõöúçñ\s]/gi, " ")
    .split(/\s+/)
    .filter((token) => token.length > 1 && !STOPWORDS.has(token));
};

/**
 * Calculate term frequency for a list of tokens.
 */
const calculateTf = (tokens: string[]): TermFrequency => {
  const tf: TermFrequency = {};
  for (const token of tokens) {
    tf[token] = (tf[token] || 0) + 1;
  }
  return tf;
};

export class BM25SearchEngine {
  private documents: Map<string, DocumentData> = new Map();
  private invertedIndex: InvertedIndex = {};
  private avgNameLength = 0;
  private avgContentLength = 0;
  private documentCount = 0;

  // BM25+ parameters
  private readonly k1 = 1.2;
  private readonly b = 0.75;
  private readonly delta = 1.0;

  /**
   * Build the search index from a list of documents.
   */
  buildIndex(documents: SearchDocument[]): void {
    this.documents.clear();
    this.invertedIndex = {};
    this.documentCount = documents.length;

    if (this.documentCount === 0) {
      this.avgNameLength = 0;
      this.avgContentLength = 0;
      return;
    }

    let totalNameLength = 0;
    let totalContentLength = 0;

    for (const doc of documents) {
      const nameTokens = tokenize(doc.name);
      const contentTokens = tokenize(doc.content);
      const nameTf = calculateTf(nameTokens);
      const contentTf = calculateTf(contentTokens);

      const docData: DocumentData = {
        id: doc.id,
        name: doc.name,
        nameTokens,
        contentTokens,
        nameLength: nameTokens.length,
        contentLength: contentTokens.length,
        nameTf,
        contentTf,
        rawContent: doc.content,
      };

      this.documents.set(doc.id, docData);

      totalNameLength += nameTokens.length;
      totalContentLength += contentTokens.length;

      // Build inverted index
      const allTerms = new Set([...nameTokens, ...contentTokens]);
      for (const term of allTerms) {
        if (!this.invertedIndex[term]) {
          this.invertedIndex[term] = new Set();
        }
        this.invertedIndex[term].add(doc.id);
      }
    }

    this.avgNameLength = totalNameLength / this.documentCount;
    this.avgContentLength = totalContentLength / this.documentCount;
  }

  /**
   * Calculate IDF (Inverse Document Frequency) for a term.
   */
  private idf(term: string): number {
    const docsWithTerm = this.invertedIndex[term]?.size || 0;
    if (docsWithTerm === 0) return 0;
    // Standard BM25 IDF formula
    return Math.log(
      (this.documentCount - docsWithTerm + 0.5) / (docsWithTerm + 0.5) + 1
    );
  }

  /**
   * Calculate BM25+ score for a document given query terms.
   */
  private scoreDocument(
    docData: DocumentData,
    queryTerms: string[],
    field: "name" | "content"
  ): number {
    const tf = field === "name" ? docData.nameTf : docData.contentTf;
    const docLength =
      field === "name" ? docData.nameLength : docData.contentLength;
    const avgLength =
      field === "name" ? this.avgNameLength : this.avgContentLength;

    if (avgLength === 0) return 0;

    let score = 0;
    for (const term of queryTerms) {
      const termFreq = tf[term] || 0;
      if (termFreq === 0) continue;

      const idfScore = this.idf(term);
      // BM25+ formula
      const tfComponent =
        (termFreq * (this.k1 + 1)) /
        (termFreq + this.k1 * (1 - this.b + this.b * (docLength / avgLength)));
      score += idfScore * tfComponent + this.delta;
    }

    return score;
  }

  /**
   * Generate a snippet around the first match of a query term in the content.
   */
  private generateSnippet(content: string, queryTerms: string[]): string {
    const lowerContent = content.toLowerCase();
    let firstMatchIndex = -1;
    let matchedTerm = "";

    for (const term of queryTerms) {
      const idx = lowerContent.indexOf(term);
      if (idx !== -1 && (firstMatchIndex === -1 || idx < firstMatchIndex)) {
        firstMatchIndex = idx;
        matchedTerm = term;
      }
    }

    if (firstMatchIndex === -1) {
      // No direct match found, return start of content
      return content.slice(0, 60) + (content.length > 60 ? "..." : "");
    }

    const start = Math.max(0, firstMatchIndex - 20);
    const end = Math.min(
      content.length,
      firstMatchIndex + matchedTerm.length + 40
    );
    const snippet = content.slice(start, end);

    return (
      (start > 0 ? "..." : "") + snippet + (end < content.length ? "..." : "")
    );
  }

  /**
   * Search for documents matching the query.
   * Returns results sorted by relevance score (descending).
   */
  search(query: string, maxResults = 20): SearchResult[] {
    const queryTerms = tokenize(query);
    if (queryTerms.length === 0) return [];

    const results: SearchResult[] = [];

    for (const docData of this.documents.values()) {
      const nameScore = this.scoreDocument(docData, queryTerms, "name");
      const contentScore = this.scoreDocument(docData, queryTerms, "content");

      // Boost name matches significantly
      const boostedNameScore = nameScore * 2.5;
      const totalScore = boostedNameScore + contentScore;

      if (totalScore > 0) {
        const matchType: "name" | "content" =
          boostedNameScore > contentScore ? "name" : "content";
        const result: SearchResult = {
          id: docData.id,
          name: docData.name,
          score: totalScore,
          matchType,
        };

        // Add snippet for content matches
        if (matchType === "content" && docData.rawContent) {
          result.snippet = this.generateSnippet(docData.rawContent, queryTerms);
        }

        results.push(result);
      }
    }

    // Sort by score descending
    results.sort((a, b) => b.score - a.score);

    return results.slice(0, maxResults);
  }
}
