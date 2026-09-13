import { AIProvider, NoteItem, ParaCategory, AskSource } from '../types';

export interface ClassificationResult {
  para: ParaCategory;
  tags: string[];
  summary: string;
}

export interface AskResult {
  answer: string;
  sources: AskSource[];
}

export const aiService = {
  // --- Note Classification ---
  async classifyNote(
    text: string,
    apiKey?: string,
    provider: AIProvider = 'gemini'
  ): Promise<ClassificationResult> {
    if (!text.trim()) {
      return { para: 'Archives', tags: ['empty'], summary: 'Empty note' };
    }

    if (apiKey?.trim()) {
      try {
        if (provider === 'gemini') {
          return await this._classifyWithGemini(text, apiKey.trim());
        } else {
          return await this._classifyWithGroq(text, apiKey.trim());
        }
      } catch (err) {
        console.warn('AI classification API error, using intelligent fallback:', err);
      }
    }

    // Intelligent local heuristic fallback
    return this._localHeuristicClassify(text);
  },

  async _classifyWithGemini(text: string, apiKey: string): Promise<ClassificationResult> {
    const prompt = `Classify this note into exactly one PARA category: 'Projects', 'Areas', 'Resources', or 'Archives'.
Output ONLY valid JSON with keys: "para", "tags" (array of 3-5 lowercase strings), and "summary" (one clear sentence max 150 chars).

Note Content:
${text.slice(0, 3000)}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: {
          temperature: 0.2,
          responseMimeType: 'application/json',
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini API returned status ${response.status}`);
    }

    const data = await response.json();
    const candidateText = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (candidateText) {
      const parsed = JSON.parse(candidateText);
      return {
        para: this._normalizePara(parsed.para),
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: string) => String(t).toLowerCase()) : ['note'],
        summary: parsed.summary?.trim() || text.slice(0, 100),
      };
    }
    throw new Error('No candidate returned from Gemini');
  },

  async _classifyWithGroq(text: string, apiKey: string): Promise<ClassificationResult> {
    const prompt = `Classify this note into exactly one PARA category: 'Projects', 'Areas', 'Resources', or 'Archives'.
Output ONLY valid JSON with keys: "para", "tags" (array of 3-5 lowercase strings), and "summary" (one clear sentence max 150 chars).

Note Content:
${text.slice(0, 3000)}`;

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are a precise JSON classifier for personal notes.' },
          { role: 'user', content: prompt },
        ],
        temperature: 0.2,
        response_format: { type: 'json_object' },
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq API returned status ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (content) {
      const parsed = JSON.parse(content);
      return {
        para: this._normalizePara(parsed.para),
        tags: Array.isArray(parsed.tags) ? parsed.tags.map((t: string) => String(t).toLowerCase()) : ['note'],
        summary: parsed.summary?.trim() || text.slice(0, 100),
      };
    }
    throw new Error('No valid content from Groq');
  },

  _normalizePara(val: any): ParaCategory {
    const s = String(val).toLowerCase();
    if (s.includes('project')) return 'Projects';
    if (s.includes('area')) return 'Areas';
    if (s.includes('resource')) return 'Resources';
    return 'Archives';
  },

  _localHeuristicClassify(text: string): ClassificationResult {
    const lower = text.toLowerCase();
    let para: ParaCategory = 'Archives';

    if (['project', 'launch', 'deadline', 'sprint', 'roadmap', 'build', 'todo', 'task'].some((w) => lower.includes(w))) {
      para = 'Projects';
    } else if (['habit', 'routine', 'health', 'finance', 'workout', 'meeting', 'review', 'standard'].some((w) => lower.includes(w))) {
      para = 'Areas';
    } else if (['guide', 'tutorial', 'reference', 'book', 'article', 'docs', 'link', 'bookmark', 'cheatsheet'].some((w) => lower.includes(w))) {
      para = 'Resources';
    }

    const words = text
      .toLowerCase()
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !['this', 'that', 'with', 'from', 'have', 'your', 'about', 'note'].includes(w));
    
    const uniqueTags = Array.from(new Set(words)).slice(0, 4);
    const firstLine = text.split('\n')[0].trim();
    const summary = firstLine.length > 120 ? `${firstLine.slice(0, 117)}...` : firstLine || 'Captured note';

    return {
      para,
      tags: uniqueTags.length > 0 ? uniqueTags : [para.toLowerCase()],
      summary,
    };
  },

  // --- Ask / Knowledge Retrieval & Answer Synthesis ---
  async askSecondSelf(
    question: string,
    notes: NoteItem[],
    apiKey?: string,
    provider: AIProvider = 'gemini'
  ): Promise<AskResult> {
    if (!question.trim()) {
      return { answer: 'Please enter a question to ask your notes.', sources: [] };
    }

    if (notes.length === 0) {
      return {
        answer: 'You have not captured any notes in SecondSelf yet. Create a quick note or bookmark first!',
        sources: [],
      };
    }

    // Rank notes using lexical & TF-IDF similarity
    const scoredNotes = notes
      .map((note) => {
        const text = `${note.title} ${note.summary} ${note.tags.join(' ')} ${note.body}`.toLowerCase();
        const qTokens = question.toLowerCase().split(/\s+/).filter((w) => w.length > 2);
        let score = 0;
        for (const token of qTokens) {
          if (text.includes(token)) {
            score += 1;
          }
        }
        return { note, score };
      })
      .filter((item) => item.score > 0)
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item) => item.note);

    const relevantNotes = scoredNotes.length > 0 ? scoredNotes : notes.slice(0, 3);
    const sources: AskSource[] = relevantNotes.map((n) => ({
      id: n.id,
      summary: n.summary || n.title,
      para: n.para,
    }));

    const contextText = relevantNotes
      .map((n, i) => `[Source ${i + 1} - ${n.para} - ${n.id}]: ${n.summary}\n${n.body}`)
      .join('\n\n');

    if (apiKey?.trim()) {
      try {
        if (provider === 'gemini') {
          const answer = await this._synthesizeWithGemini(question, contextText, apiKey.trim());
          return { answer, sources };
        } else {
          const answer = await this._synthesizeWithGroq(question, contextText, apiKey.trim());
          return { answer, sources };
        }
      } catch (err) {
        console.warn('AI Answer API error, using local synthesis:', err);
      }
    }

    // Offline / Fallback answer
    const preview = relevantNotes.map((n) => `• [${n.para}] ${n.summary || n.title}: "${n.body.slice(0, 90)}..."`).join('\n');
    return {
      answer: `Based on your captured notes, here are the most relevant matches for "${question}":\n\n${preview}`,
      sources,
    };
  },

  async _synthesizeWithGemini(question: string, context: string, apiKey: string): Promise<string> {
    const prompt = `You are SecondSelf, a personal knowledge assistant.
Answer the user's question clearly, thoroughly, and concisely using ONLY the provided note context below.
Cite sources naturally (e.g. "[Source 1]"). If the context doesn't contain the answer, say what related info was found.

Notes Context:
${context}

Question:
${question}`;

    const url = `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`;
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ parts: [{ text: prompt }] }],
        generationConfig: { temperature: 0.3 },
      }),
    });

    if (!response.ok) {
      throw new Error(`Gemini synthesize error: ${response.status}`);
    }

    const data = await response.json();
    return data.candidates?.[0]?.content?.parts?.[0]?.text?.trim() || 'No answer generated.';
  },

  async _synthesizeWithGroq(question: string, context: string, apiKey: string): Promise<string> {
    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'llama-3.1-8b-instant',
        messages: [
          { role: 'system', content: 'You are SecondSelf, an intelligent personal second brain assistant.' },
          {
            role: 'user',
            content: `Context notes:\n${context}\n\nQuestion: ${question}\n\nAnswer concisely citing sources:`,
          },
        ],
        temperature: 0.3,
      }),
    });

    if (!response.ok) {
      throw new Error(`Groq synthesize error: ${response.status}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content?.trim() || 'No answer generated.';
  },
};
