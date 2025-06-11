/**
 * embeddingService.ts
 * Service for handling embeddings, semantic search, and RAG operations.
 * Provides integration with external embedding APIs for enhanced AI responses.
 */

import axios from 'axios';
import { IMessage } from '../../models/message.js';

export interface EmbeddingResponse {
  status: string;
  vector?: number[];
  error?: string;
}

export interface RAGResponse {
  answer: string;
  context: string;
  responseId?: string;
  matches?: {
    content: string;
    score: number;
  }[];
}

export class EmbeddingService {
  private apiUrl: string | undefined;
  private enabled: boolean;

  constructor(apiUrl?: string) {
    this.apiUrl = apiUrl || process.env.EMBEDDING_API_URL;
    this.enabled = !!this.apiUrl;
    
    if (this.enabled) {
      console.log(`Embedding Service initialized with API URL: ${this.apiUrl}`);
    } else {
      console.warn('Embedding Service disabled: No API URL provided in environment variables or constructor');
    }
  }

  /**
   * Checks if the embedding service is enabled
   */
  public isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Creates an embedding for the given text
   * @param userId User ID for tracking embeddings
   * @param content Text to embed
   * @param threadId Optional thread ID for context
   * @param messageId Optional message ID for reference
   * @returns Response from the embedding API
   */
  public async createEmbedding(
    userId: string,
    content: string,
    threadId?: string,
    messageId?: string
  ): Promise<EmbeddingResponse> {
    console.log('🔗 [EMBEDDING SERVICE] createEmbedding called:', {
      userId,
      contentLength: content.length,
      threadId,
      messageId,
      enabled: this.enabled
    });

    if (!this.enabled) {
      console.warn('⚠️ [EMBEDDING SERVICE] Embedding Service is disabled: No API URL available');
      return { status: 'error', error: 'Embedding Service is disabled: No API URL available' };
    }

    try {
      console.log(`🔗 [EMBEDDING SERVICE] Calling /embed API for message: ${messageId || 'unknown'}`);
      console.log(`🔗 [EMBEDDING SERVICE] API URL: ${this.apiUrl}/embed`);
      console.log(`🔗 [EMBEDDING SERVICE] Request payload:`, {
        userId,
        threadId,
        contentLength: content.length,
        messageId
      });

      const response = await axios.post(`${this.apiUrl}/embed`, {
        userId,
        threadId,
        content,
        messageId
      });
      
      console.log(`✅ [EMBEDDING SERVICE] /embed API call successful for message: ${messageId || 'unknown'}`);
      console.log(`✅ [EMBEDDING SERVICE] Response status: ${response.status}`);
      console.log(`✅ [EMBEDDING SERVICE] Response data:`, response.data);
      
      return response.data;
    } catch (error) {
      console.error('❌ [EMBEDDING SERVICE] Error calling /embed API:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ [EMBEDDING SERVICE] Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
          message: error.message
        });
        return { 
          status: 'error',
          error: `API error: ${error.response?.status || 'unknown'} - ${error.message}` 
        };
      }
      console.error('❌ [EMBEDDING SERVICE] Non-axios error:', error);
      return { status: 'error', error: 'Failed to create embedding' };
    }
  }

  /**
   * Retrieves RAG-enhanced response for a query
   * @param userId User ID for context
   * @param query The question or query text
   * @param threadId Optional thread ID for context
   * @returns RAG-enhanced response with context
   */
  public async getRAGResponse(
    userId: string, 
    query: string,
    threadId?: string
  ): Promise<RAGResponse> {
    console.log('🤖 [EMBEDDING SERVICE] getRAGResponse called:', {
      userId,
      queryLength: query.length,
      threadId,
      enabled: this.enabled
    });

    if (!this.enabled) {
      console.warn('⚠️ [EMBEDDING SERVICE] Embedding Service is disabled: No API URL available');
      return {
        answer: "I'm currently having trouble accessing my extended knowledge base, but I'd be happy to help you with general questions or discuss topics based on my core knowledge. What would you like to know? I can assist with various subjects including technology, programming, general knowledge, and more. Just let me know what you're interested in, and I'll provide the best possible response with the information available to me.",
        context: "Embedding Service disabled: No API URL available"
      };
    }

    try {
      console.log(`🤖 [EMBEDDING SERVICE] Calling /rag-generate API for query: "${query.substring(0, 50)}..."`);
      console.log(`🤖 [EMBEDDING SERVICE] API URL: ${this.apiUrl}/rag-generate`);
      console.log(`🤖 [EMBEDDING SERVICE] Request payload:`, {
        userId,
        threadId,
        queryLength: query.length
      });

      const response = await axios.post(`${this.apiUrl}/rag-generate`, {
        userId,
        threadId,
        query
      });
      
      console.log('✅ [EMBEDDING SERVICE] /rag-generate API call successful');
      console.log(`✅ [EMBEDDING SERVICE] Response status: ${response.status}`);
      console.log(`✅ [EMBEDDING SERVICE] Response data:`, {
        answerLength: response.data?.answer?.length || 0,
        contextLength: response.data?.context?.length || 0,
        hasResponseId: !!response.data?.responseId,
        responseId: response.data?.responseId
      });
      
      return response.data;
    } catch (error) {
      console.error('❌ [EMBEDDING SERVICE] Error calling /rag-generate API:', error);
      if (axios.isAxiosError(error)) {
        console.error('❌ [EMBEDDING SERVICE] Axios error details:', {
          status: error.response?.status,
          statusText: error.response?.statusText,
          data: error.response?.data,
          url: error.config?.url,
          method: error.config?.method,
          message: error.message
        });
      }
      
      return {
        answer: "I'm currently having trouble accessing my extended knowledge base, but I'd be happy to help you with general questions or discuss topics based on my core knowledge. What would you like to know? I can assist with various subjects including technology, programming, general knowledge, and more. Just let me know what you're interested in, and I'll provide the best possible response with the information available to me.",
        context: "Error retrieving context"
      };
    }
  }
  
  /**
   * Enhances a user query with RAG context for improved AI response generation
   * @param userId User ID for context
   * @param query User's original query
   * @param threadId Thread ID for context
   * @param context Optional existing conversation context
   * @returns Enhanced prompt with RAG context
   */
  public async enhancePromptWithRAG(
    userId: string,
    query: string,
    threadId: string,
    context: (IMessage | any)[] = []
  ): Promise<string> {
    if (!this.enabled || !this.shouldUseSemanticSearch(query)) {
      // Return a basic prompt without RAG enhancement
      return query;
    }
    
    try {
      const ragResponse = await this.getRAGResponse(userId, query, threadId);
      
      // Extract only the most relevant context to avoid prompt overflow
      const relevantContext = ragResponse.context || '';
      
      // Format the enhanced prompt
      const enhancedPrompt = [
        "### Relevant Previous Information:",
        relevantContext,
        "\n### Current User Query:",
        query
      ].join("\n");
      
      return enhancedPrompt;
    } catch (error) {
      console.error('Error enhancing prompt with RAG:', error);
      return query; // Fall back to the original query
    }
  }
  
  /**
   * Checks if a message should use semantic search based on content
   * @param content Message content
   * @returns Boolean indicating if semantic search is beneficial
   */
  private shouldUseSemanticSearch(content: string): boolean {
    // Skip semantic search for very short queries
    if (content.trim().length < 10) return false;
    
    // Skip semantic search for trivial messages
    if (this.isTrivialMessage(content)) return false;
    
    // Check if it's likely a question or request for information
    const questionIndicators = [
      '?', 'what', 'how', 'why', 'when', 'where', 'who', 'which', 'can you', 'could you', 
      'tell me', 'explain', 'describe', 'find', 'search', 'help me with'
    ];
    
    return questionIndicators.some(indicator => 
      content.toLowerCase().includes(indicator));
  }
  
  /**
   * Simple implementation of isTrivialMessage
   */
  private isTrivialMessage(content: string): boolean {
    const trivialPatterns = [
      /^hi+$/i,
      /^hello+$/i,
      /^hey+$/i,
      /^yo+$/i,
      /^sup+$/i,
      /^how are you\??$/i,
      /^what's up\??$/i,
      /^ok+$/i,
      /^okay+$/i,
      /^test+$/i,
      /^ping$/i
    ];

    const trimmed = content.trim().toLowerCase();
    return trivialPatterns.some((pattern) => pattern.test(trimmed));
  }
} 