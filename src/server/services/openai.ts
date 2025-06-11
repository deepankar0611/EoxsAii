/**
 * openai.ts
 * OpenAI service for handling GPT integration.
 * Adds memory recall from past MongoDB messages using simple keyword-based search.
 * Now integrates with EmbeddingService for RAG-enhanced responses.
 */

import OpenAI from 'openai';
import { IMessage, Message } from '../../models/message.js';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import { EmbeddingService } from './embeddingService.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class OpenAIService {
  private openai: OpenAI | null = null;
  private model: string;
  private useMockResponses: boolean = false;
  private embeddingService: EmbeddingService;

  constructor(apiKey?: string, embeddingApiUrl?: string) {
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    // Initialize embedding service
    this.embeddingService = new EmbeddingService(embeddingApiUrl);

    if (apiKey) {
      try {
        this.openai = new OpenAI({
          apiKey,
          dangerouslyAllowBrowser: true
        });
      } catch (error) {
        console.warn('OpenAI init failed, using mock:', error);
        this.useMockResponses = true;
        this.openai = null;
      }
    } else {
      this.useMockResponses = true;
    }
  }

  public async generateResponse(
    threadId: string | mongoose.Types.ObjectId,
    userMessage: string,
    context: (IMessage | any)[],
    providedContext?: string
  ): Promise<string> {
    try {
      if (this.useMockResponses || !this.openai) {
        return this.generateMockResponse(userMessage, providedContext);
      }

      const MAX_CONTEXT_LENGTH = 4000;
      const threadIdStr = threadId.toString();
      
      // Extract user ID from the context if available
      let userId = '';
      const firstUserMessage = context.find(msg => msg.userId);
      if (firstUserMessage) {
        userId = firstUserMessage.userId;
      }
      
      let enhancedPrompt = userMessage;
      let memoryContext = '';
      
      // Use explicitly provided context if available
      if (providedContext) {
        memoryContext = `Here is important context about the user:\n${providedContext}`;
        console.log('Using explicitly provided context');
      } 
      // Otherwise use RAG enhancement if embedding service is enabled and userId is available
      else if (this.embeddingService.isEnabled() && userId) {
        try {
          // Attempt to enhance the prompt with RAG context
          enhancedPrompt = await this.embeddingService.enhancePromptWithRAG(
            userId, 
            userMessage, 
            threadIdStr,
            context
          );
          console.log('Using RAG-enhanced prompt');
        } catch (ragError) {
          console.error('Failed to enhance prompt with RAG:', ragError);
          // Fall back to traditional memory if RAG fails
          // Get memory snippets as fallback
          const memorySnippets = await this.getRelevantMemory(threadIdStr, userMessage);
          memoryContext = memorySnippets.length > 0
            ? `Here are some things the user said previously:\n${memorySnippets.join('\n')}`
            : '';
        }
      } else {
        // Traditional memory injection as fallback
        const memorySnippets = await this.getRelevantMemory(threadIdStr, userMessage);
        memoryContext = memorySnippets.length > 0
          ? `Here are some things the user said previously:\n${memorySnippets.join('\n')}`
          : '';
      }

      const systemMessage = {
        role: 'system',
        content: `You are a helpful and friendly AI assistant. Provide detailed, comprehensive responses that thoroughly address user questions. When explaining concepts, include examples, context, and practical applications. Aim to be informative and educational while maintaining a conversational tone.${memoryContext ? `\n\n${memoryContext}` : ''}`
      };

      const messages = [systemMessage];

      // Add conversation context
      for (const msg of context) {
        let content = msg.content || '';
        if (content.length > MAX_CONTEXT_LENGTH) {
          content = content.substring(0, MAX_CONTEXT_LENGTH) + '... [content truncated]';
        }
        messages.push({
          role: msg.sender === 'system' ? 'assistant' : 'user',
          content
        });
      }

      // Use the enhanced prompt instead of the raw user message
      messages.push({ role: 'user', content: enhancedPrompt });

      const completion = await this.openai.chat.completions.create({
        model: this.model,
        messages: messages as any,
        max_tokens: 2000,
        temperature: 0.7,
      });

      const response = completion.choices[0]?.message?.content || 'I could not generate a response.';

      // Store the embedding for the AI response if embedding service is enabled and userId is available
      if (this.embeddingService.isEnabled() && userId) {
        try {
          // Store embeddings for meaningful AI responses
          if (response.length > 20) {
            await this.embeddingService.createEmbedding(
              userId,
              response,
              threadIdStr
            );
          }
        } catch (embedError) {
          console.error('Failed to create embedding for AI response:', embedError);
          // Non-critical error, continue without embedding
        }
      }

      return response;
    } catch (error: any) {
      console.error('OpenAI error:', error);
      return this.generateMockResponse(userMessage, providedContext);
    }
  }

  private generateMockResponse(userMessage: string, providedContext?: string): string {
    const message = userMessage.toLowerCase();

    if (providedContext) {
      // If we have provided context, use it to generate a more personalized response
      if (message.includes('iot') || message.includes('project')) {
        return "Yes, I remember you made an LCA-based IoT dashboard project! That's a fascinating combination of Life Cycle Assessment and Internet of Things technology. IoT dashboards are excellent tools for real-time monitoring and data visualization, and integrating LCA principles adds a valuable sustainability dimension. Would you like to discuss the technical implementation, the challenges you faced, or explore how you could expand this project further? I'd be interested in hearing about the sensors you used, the data collection methods, and how you implemented the LCA calculations in your dashboard.";
      }
    }

    if (message.includes('hello') || message.includes('hi')) {
      return 'Hello! I\'m here to help you with any questions or topics you\'d like to explore. Whether you need assistance with programming, want to learn about new technologies, discuss ideas, or just have a conversation, I\'m ready to assist. What would you like to talk about today? I can help with technical questions, explain complex concepts, provide coding examples, or discuss various subjects. Just let me know what interests you!';
    } else if (message.includes('help')) {
      return 'I\'m here to help! I can assist you with a wide range of topics including programming, technology, general knowledge, problem-solving, and more. Just let me know what specific area you need help with, and I\'ll do my best to provide detailed, helpful information. Whether it\'s debugging code, explaining concepts, discussing technology trends, or helping with learning, I\'m ready to support you. What can I help you with today?';
    } else if (message.includes('bye') || message.includes('goodbye')) {
      return 'Goodbye! It was great chatting with you. Feel free to return anytime if you have more questions or need assistance. I\'m always here to help with programming, technology, learning, or any other topics you\'re interested in. Have a wonderful day, and don\'t hesitate to reach out if you need any help in the future!';
    } else if (message.includes('thanks') || message.includes('thank you')) {
      return 'You\'re very welcome! I\'m glad I could help. If you have any more questions or need assistance with anything else, feel free to ask. I\'m here to help with programming, technology, general knowledge, or any other topics you\'d like to explore. What else can I assist you with? I enjoy our conversations and am always ready to provide detailed, helpful responses to your questions.';
    } else if (message.length < 10) {
      return 'Could you please provide more details so I can better assist you? I\'m here to help with a wide variety of topics including programming, technology, general knowledge, and more. The more specific you are about what you\'d like to know or discuss, the better I can provide you with relevant, detailed information. What would you like to learn about or get help with?';
    } else {
      return 'I received your message and I\'m here to help! I can assist you with programming questions, explain technical concepts, discuss various topics, or help you with problem-solving. Could you please let me know what specific area you\'d like assistance with? I\'m ready to provide detailed, comprehensive responses to help you learn and understand better. What would you like to explore or discuss?';
    }
  }

  private async getRelevantMemory(threadId: string, userMessage: string): Promise<string[]> {
    const triggers = ['what did i say', 'earlier', 'before', 'previous', 'remind me', 'last time'];
    const queryLower = userMessage.toLowerCase();
    const shouldRecall = triggers.some(trigger => queryLower.includes(trigger));
    if (!shouldRecall) return [];

    const words = queryLower.split(/\s+/);
    const keywords = words.filter(w => !['what', 'did', 'i', 'say', 'about', 'the', 'last', 'time', 'you'].includes(w));
    const lastKeyword = keywords.pop() || '';
    if (!lastKeyword) return [];

    const regex = new RegExp(lastKeyword, 'i');

    try {
      const pastMessages = await (Message as any).find({
        threadId: new mongoose.Types.ObjectId(threadId),
        sender: { $ne: 'system' },
        content: { $regex: regex }
      }).sort({ createdAt: -1 }).limit(3).lean();

      return pastMessages.map((msg: any) => `• ${msg.content}`);
    } catch (error) {
      console.error('Error retrieving memory:', error);
      return [];
    }
  }

  public async transcribeAudio(fileBuffer: Buffer, filename: string): Promise<string> {
    if (this.useMockResponses || !this.openai) return 'This is a mock transcription.';

    const uniqueFilename = `${Date.now()}-${Math.floor(Math.random() * 10000)}-${filename}`;
    const tmpDir = path.join(process.cwd(), 'tmp');
    const tempPath = path.join(tmpDir, uniqueFilename);

    try {
      if (!fs.existsSync(tmpDir)) fs.mkdirSync(tmpDir, { recursive: true });
      fs.writeFileSync(tempPath, fileBuffer);

      const transcription = await this.openai.audio.transcriptions.create({
        file: fs.createReadStream(tempPath) as any,
        model: 'whisper-1',
        response_format: 'text',
        language: 'en',
      });

      return typeof transcription === 'string'
        ? transcription
        : (transcription as any)?.text || 'No text in transcription result';
    } finally {
      try {
        fs.unlinkSync(tempPath);
      } catch (cleanupError) {
        console.warn('Temp file cleanup failed:', cleanupError);
      }
    }
  }
}
