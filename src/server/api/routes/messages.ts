/**
 * messages.ts
 * API routes for message management. Handles CRUD operations for chat messages.
 * Implements message sending, listing, updating, and deletion.
 * Manages message threading and user associations.
 */
import express, { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Message, IMessage } from '../../../models/message.js';
import { Thread } from '../../../models/thread.js';
import { withDatabase } from '../../../lib/db.js';
import { 
  asyncHandler, 
  apiResponse, 
  ValidationError, 
  NotFoundError,
  UnauthorizedError 
} from '../middleware.js';
import { isTrivialMessage } from '../../../utils/messageUtils.js';
import { embeddingService, openaiService } from '../index.js';

// Helper function to enhance short responses
const enhanceResponse = (originalResponse: string, userQuery: string): string => {
  // If response is already substantial (more than 200 characters), return as is
  if (originalResponse.length > 200) {
    return originalResponse;
  }

  // For short responses, add more context and detail
  const enhancedResponses: { [key: string]: string } = {
    "Sorry, I could not generate a response.": 
      "I apologize, but I'm having trouble generating a response right now. This could be due to a temporary issue with my knowledge base or the complexity of your question. Could you please try rephrasing your question or ask something more specific? I'm here to help and want to provide you with the best possible assistance.",
    
    "I couldn't retrieve relevant information at the moment. How else can I assist you?":
      "I'm currently unable to access my extended knowledge base, but I'd be happy to help you with general questions or discuss topics based on my core knowledge. What would you like to know? I can assist with various subjects including technology, programming, general knowledge, and more.",
    
    "I couldn't access my extended knowledge at the moment. The embedding service is not configured.":
      "I'm currently operating with limited access to my knowledge base, but I can still help you with many topics. What specific question do you have? I can provide general information, help with programming questions, explain concepts, or assist with various other subjects.",
    
    "I received your message.":
      "Thank you for your message! I'd be happy to help you with any questions or topics you'd like to discuss. Could you please provide more details about what you'd like to know? The more specific you are, the better I can assist you."
  };

  // Check if we have a specific enhancement for this response
  if (enhancedResponses[originalResponse]) {
    return enhancedResponses[originalResponse];
  }

  // For other short responses, add context based on the user's query
  const queryLower = userQuery.toLowerCase();
  
  if (queryLower.includes('hello') || queryLower.includes('hi')) {
    return `Hello! I'm here to help you with any questions or topics you'd like to explore. Whether you need help with programming, want to learn about new technologies, discuss ideas, or just have a conversation, I'm ready to assist. What would you like to talk about today?`;
  }
  
  if (queryLower.includes('help') || queryLower.includes('assist')) {
    return `I'm here to help! I can assist you with a wide range of topics including programming, technology, general knowledge, problem-solving, and more. Just let me know what specific area you need help with, and I'll do my best to provide detailed, helpful information. What can I help you with today?`;
  }
  
  if (queryLower.includes('thanks') || queryLower.includes('thank you')) {
    return `You're very welcome! I'm glad I could help. If you have any more questions or need assistance with anything else, feel free to ask. I'm here to help with programming, technology, general knowledge, or any other topics you'd like to explore. What else can I assist you with?`;
  }
  
  if (queryLower.includes('bye') || queryLower.includes('goodbye')) {
    return `Goodbye! It was great chatting with you. Feel free to return anytime if you have more questions or need assistance. I'm always here to help with programming, technology, learning, or any other topics you're interested in. Have a wonderful day!`;
  }

  // Generic enhancement for other short responses
  return `${originalResponse} I'd be happy to provide more detailed information or help you explore this topic further. Could you please let me know what specific aspects you'd like me to elaborate on? I can provide examples, explanations, or discuss related concepts to give you a more comprehensive understanding.`;
};

const router = express.Router();

/**
 * POST /api/messages
 * Create a new message and get AI response
 * Supports two formats:
 * 1. Simple format: { userId, content } - automatically manages threads
 * 2. Thread format: { threadId, content, userId } - for specific thread usage
 */
router.post('/', asyncHandler(async (req: Request, res: Response) => {
  const { threadId, content, userId, context, files } = req.body;
  
  console.log('🚀 [MESSAGES API] POST /api/messages called with:', {
    threadId: threadId || 'auto-create',
    content: content?.substring(0, 100) + (content?.length > 100 ? '...' : ''),
    userId,
    hasContext: !!context,
    hasFiles: !!(files && files.length > 0)
  });
  
  // Validate required fields
  if (!content) {
    console.error('❌ [MESSAGES API] Validation failed: missing content');
    throw new ValidationError('content is required');
  }
  
  if (!userId) {
    console.error('❌ [MESSAGES API] Validation failed: missing userId');
    throw new ValidationError('userId is required');
  }
  
  // If threadId is provided, validate it
  if (threadId && !mongoose.Types.ObjectId.isValid(threadId)) {
    console.error('❌ [MESSAGES API] Invalid thread ID format:', threadId);
    throw new ValidationError('Invalid thread ID format');
  }
  
  const message = await withDatabase(async () => {
    let actualThreadId = threadId;
    let thread;
    
    // If no threadId provided, create or find the user's active thread
    if (!actualThreadId) {
      console.log('🔍 [MESSAGES API] No threadId provided, finding or creating active thread for user:', userId);
      
      // Try to find the user's most recent active thread
      thread = await (Thread as any).findOne({ 
        userId, 
        isActive: true 
      }).sort({ updatedAt: -1 });
      
      if (thread) {
        actualThreadId = thread._id;
        console.log('✅ [MESSAGES API] Found existing active thread:', actualThreadId.toString());
      } else {
        // Create a new thread for the user
        console.log('🆕 [MESSAGES API] Creating new thread for user:', userId);
        thread = await (Thread as any).create({
          userId,
          title: content.substring(0, 50) + (content.length > 50 ? '...' : ''),
          createdBy: userId,
          isActive: true
        });
        actualThreadId = thread._id;
        console.log('✅ [MESSAGES API] New thread created:', actualThreadId.toString());
      }
    } else {
      // Find the specified thread
      console.log('🔍 [MESSAGES API] Finding specified thread:', actualThreadId);
      thread = await (Thread as any).findById(actualThreadId);
      if (!thread) {
        console.error('❌ [MESSAGES API] Thread not found:', actualThreadId);
        throw new NotFoundError('Thread not found');
      }
      console.log('✅ [MESSAGES API] Thread found:', actualThreadId.toString());
    }
    
    // Create the user message
    console.log('💾 [MESSAGES API] Creating user message...');
    const newMessage = new (Message as any)({
      threadId: actualThreadId,
      content,
      sender: userId,
      files: files || []
    });
    await newMessage.save();
    
    console.log('✅ [MESSAGES API] User message saved:', newMessage._id.toString());

    // 1. Create embedding for the new message if embedding service is enabled
    if (embeddingService.isEnabled()) {
      console.log('🔗 [MESSAGES API] Creating embedding for user message...');
      try {
        const embeddingResult = await embeddingService.createEmbedding(
          userId,
          content,
          actualThreadId.toString(),
          newMessage._id.toString()
        );
        console.log('✅ [MESSAGES API] User message embedding created:', embeddingResult.status);
        if (embeddingResult.error) {
          console.warn('⚠️ [MESSAGES API] Embedding creation warning:', embeddingResult.error);
        }
      } catch (e) {
        console.error('❌ [MESSAGES API] Failed to create user message embedding:', e);
      }
    } else {
      console.log('⚠️ [MESSAGES API] Embedding service is disabled, skipping user message embedding');
    }

    // 2. Get RAG response using the embedding service (without threadId for RAG)
    console.log('🤖 [MESSAGES API] Getting RAG response for query:', content.substring(0, 50) + '...');
    let ragAnswer = '';
    let ragContext = '';
    let responseId = '';
    try {
      const ragResponse = await embeddingService.getRAGResponse(
        userId,
        content
        // Note: Not passing threadId to RAG - it should work with just userId and content
      );
      ragAnswer = ragResponse.answer || '';
      ragContext = ragResponse.context || '';
      responseId = ragResponse.responseId || '';
      console.log('✅ [MESSAGES API] RAG response received successfully');
      console.log('📄 [MESSAGES API] RAG Answer:', ragAnswer.substring(0, 100) + (ragAnswer.length > 100 ? '...' : ''));
      console.log('📄 [MESSAGES API] RAG Context length:', ragContext.length);
      console.log('🆔 [MESSAGES API] Response ID:', responseId);
    } catch (e) {
      console.error('❌ [MESSAGES API] Failed to fetch RAG answer/context:', e);
      console.error('❌ [MESSAGES API] RAG Error details:', {
        message: e instanceof Error ? e.message : 'Unknown error',
        stack: e instanceof Error ? e.stack : undefined
      });
    }

    // 3. Use the answer from RAG as the AI response
    const aiResponseContent = ragAnswer || 'Sorry, I could not generate a response.';
    console.log('💬 [MESSAGES API] AI Response content:', aiResponseContent.substring(0, 100) + (aiResponseContent.length > 100 ? '...' : ''));

    // 4. Enhance the response if it's too short
    const enhancedResponse = enhanceResponse(aiResponseContent, content);
    console.log('💬 [MESSAGES API] Enhanced Response content:', enhancedResponse.substring(0, 100) + (enhancedResponse.length > 100 ? '...' : ''));

    // 5. Save the AI message with enhanced content
    console.log('💾 [MESSAGES API] Creating AI message...');
    const aiMessage = new (Message as any)({
      threadId: actualThreadId,
      content: enhancedResponse,
      sender: 'system',
    });
    await aiMessage.save();
    console.log('✅ [MESSAGES API] AI message saved:', aiMessage._id.toString());

    // 6. Create embedding for the AI response if embedding service is enabled
    if (embeddingService.isEnabled()) {
      console.log('🔗 [MESSAGES API] Creating embedding for AI response...');
      try {
        const aiEmbeddingResult = await embeddingService.createEmbedding(
          userId,
          enhancedResponse,
          actualThreadId.toString(),
          aiMessage._id.toString()
        );
        console.log('✅ [MESSAGES API] AI response embedding created:', aiEmbeddingResult.status);
        if (aiEmbeddingResult.error) {
          console.warn('⚠️ [MESSAGES API] AI embedding creation warning:', aiEmbeddingResult.error);
        }
      } catch (e) {
        console.error('❌ [MESSAGES API] Failed to create AI response embedding:', e);
      }
    } else {
      console.log('⚠️ [MESSAGES API] Embedding service is disabled, skipping AI response embedding');
    }

    // Update thread's updatedAt timestamp
    await (Thread as any).findByIdAndUpdate(actualThreadId, { updatedAt: new Date() });

    const response = {
      answer: enhancedResponse,
      context: ragContext,
      responseId: responseId,
      threadId: actualThreadId.toString(),
      messageId: newMessage._id.toString()
    };
    
    console.log('🎉 [MESSAGES API] Message processing completed successfully');
    console.log('📤 [MESSAGES API] Returning response:', {
      answerLength: response.answer.length,
      contextLength: response.context.length,
      hasResponseId: !!response.responseId,
      threadId: response.threadId,
      messageId: response.messageId
    });
    
    return response;
  });
  
  // Return the message directly without wrapping in apiResponse
  console.log('✅ [MESSAGES API] Sending response to client');
  return res.status(201).json(message);
}));

/**
 * GET /api/messages/:id
 * 
 * Gets a specific message by ID
 * Also verifies that the requesting user has access to the thread
 * 
 * @param req.params.id - Message ID
 * @param req.query.userId - User ID for ownership validation
 * 
 * @returns The message object
 */
router.get('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.query.userId as string;
  
  // Check if the message ID is valid
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('Invalid message ID format');
  }
  
  const message = await withDatabase(async () => {
    // Find the message
    const msg = await (Message as any).findById(id);
    
    if (!msg) {
      throw new NotFoundError('Message not found');
    }
    
    // If userId is provided, verify thread ownership
    if (userId) {
      const thread = await (Thread as any).findById(msg.threadId);
      
      if (!thread) {
        throw new NotFoundError('Thread not found');
      }
      
      if (thread.userId !== userId) {
        throw new UnauthorizedError('You do not have permission to access this message');
      }
    }
    
    // Format message for frontend
    return {
      id: msg._id.toString(),
      threadId: msg.threadId.toString(),
      content: msg.content,
      sender: msg.sender?.toString(),
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
    };
  });
  
  return apiResponse(res, 200, message, 'Message retrieved successfully');
}));

/**
 * PUT /api/messages/:id
 * 
 * Updates a message (for edits, version control)
 * 
 * @param req.params.id - Message ID
 * @param req.body.content - New message content
 * @param req.body.userId - User ID for ownership validation
 * 
 * @returns The updated message
 */
router.put('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const { content, userId } = req.body;
  
  // Validate required fields
  if (!content) {
    throw new ValidationError('content is required');
  }
  
  // Check if the message ID is valid
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('Invalid message ID format');
  }
  
  const updatedMessage = await withDatabase(async () => {
    // Find the message
    const message = await (Message as any).findById(id);
    
    if (!message) {
      throw new NotFoundError('Message not found');
    }
    
    // If userId is provided, verify thread ownership
    if (userId) {
      const thread = await (Thread as any).findById(message.threadId);
      
      if (!thread) {
        throw new NotFoundError('Thread not found');
      }
      
      if (thread.userId !== userId) {
        throw new UnauthorizedError('You do not have permission to update this message');
      }
    }
    
    // Update the message
    message.content = content;
    await message.save();
    
    // Format message for frontend
    return {
      id: message._id.toString(),
      threadId: message.threadId.toString(),
      content: message.content,
      sender: message.sender?.toString(),
      createdAt: message.createdAt,
      updatedAt: message.updatedAt,
    };
  });
  
  return apiResponse(res, 200, updatedMessage, 'Message updated successfully');
}));

/**
 * DELETE /api/messages/:id
 * 
 * Deletes a message
 * Also verifies that the requesting user has access to the thread
 * 
 * @param req.params.id - Message ID
 * @param req.query.userId - User ID for ownership validation
 * 
 * @returns Success message
 */
router.delete('/:id', asyncHandler(async (req: Request, res: Response) => {
  const { id } = req.params;
  const userId = req.query.userId as string;
  
  // Check if the message ID is valid
  if (!mongoose.Types.ObjectId.isValid(id)) {
    throw new ValidationError('Invalid message ID format');
  }
  
  const result = await withDatabase(async () => {
    // Find the message
    const message = await (Message as any).findById(id);
    
    if (!message) {
      throw new NotFoundError('Message not found');
    }
    
    // If userId is provided, verify thread ownership
    if (userId) {
      const thread = await (Thread as any).findById(message.threadId);
      
      if (!thread) {
        throw new NotFoundError('Thread not found');
      }
      
      if (thread.userId !== userId) {
        throw new UnauthorizedError('You do not have permission to delete this message');
      }
    }
    
    // Get the thread ID before deleting the message
    const threadId = message.threadId;
    
    // Delete the message
    await (Message as any).findByIdAndDelete(id);
    
    // Return the deleted message ID in consistent format
    return {
      id: id,
      threadId: threadId.toString(),
      deleted: true
    };
  });
  
  return apiResponse(res, 200, result, 'Message deleted successfully');
}));

/**
 * POST /api/messages/batch
 * 
 * Creates multiple messages at once (for importing conversations)
 * 
 * @param req.body.threadId - Thread ID
 * @param req.body.messages - Array of message objects
 * @param req.body.userId - User ID for ownership validation
 * 
 * @returns The created messages
 */
router.post('/batch', asyncHandler(async (req: Request, res: Response) => {
  const { threadId, messages, userId } = req.body;
  
  // Validate required fields
  if (!threadId || !Array.isArray(messages) || messages.length === 0) {
    throw new ValidationError('threadId and non-empty messages array are required');
  }
  
  // Check if the thread ID is valid
  if (!mongoose.Types.ObjectId.isValid(threadId)) {
    throw new ValidationError('Invalid thread ID format');
  }
  
  const result = await withDatabase(async () => {
    // First check if thread exists and user has access
    const thread = await (Thread as any).findById(threadId);
    
    if (!thread) {
      throw new NotFoundError('Thread not found');
    }
    
    // If userId is provided, verify ownership
    if (userId && thread.userId !== userId) {
      throw new UnauthorizedError('You do not have permission to add messages to this thread');
    }
    
    // Prepare messages for insertion
    const messagesToInsert = messages.map(msg => ({
      threadId,
      content: msg.content,
      sender: msg.sender || userId || 'system',
    }));
    
    // Create all messages
    const createdMessages = await (Message as any).insertMany(messagesToInsert);
    
    // Format messages for frontend
    return createdMessages.map(msg => ({
      id: msg._id.toString(),
      threadId: msg.threadId.toString(),
      content: msg.content,
      sender: msg.sender?.toString(),
      createdAt: msg.createdAt,
      updatedAt: msg.updatedAt,
    }));
  });
  
  return apiResponse(res, 201, result, 'Messages created successfully');
}));

/**
 * POST /api/messages/generate
 * 
 * Generates an AI response to a user message using Python RAG server
 * 
 * @param req.body.threadId - Thread ID
 * @param req.body.userMessage - User message content
 * @param req.body.context - Optional context to use for AI response
 * 
 * @returns Generated AI message with context
 */
router.post('/generate', asyncHandler(async (req: Request, res: Response) => {
  const { threadId, userMessage, context } = req.body;

  if (!threadId || !userMessage) {
    throw new ValidationError('threadId and userMessage are required fields');
  }

  if (!mongoose.Types.ObjectId.isValid(threadId)) {
    throw new ValidationError('Invalid thread ID format');
  }

  console.log('Getting RAG response for query:', userMessage);

  const responsePayload = await withDatabase(async () => {
    const thread = await (Thread as any).findById(threadId);
    if (!thread) {
      throw new NotFoundError('Thread not found');
    }

    // Store the user message first
    const userMessageDoc = new (Message as any)({
      threadId,
      content: userMessage,
      sender: thread.userId || 'user',
    });
    await userMessageDoc.save();

    // 1. Create embedding for the user message if embedding service is enabled
    if (embeddingService.isEnabled()) {
      try {
        const embeddingResult = await embeddingService.createEmbedding(
          thread.userId,
          userMessage,
          threadId,
          userMessageDoc._id.toString()
        );
        console.log('Embedding created:', embeddingResult.status);
      } catch (e) {
        console.error('Failed to create embedding:', e);
      }
    }

    // 2. Get RAG answer and context from Python server
    let ragAnswer = '';
    let ragContext = '';
    let responseId = '';
    try {
      const ragRes = await embeddingService.getRAGResponse(
        thread.userId,
        userMessage,
        threadId
      );
      ragAnswer = ragRes.answer || '';
      ragContext = ragRes.context || '';
      responseId = ragRes.responseId || '';
      console.log('RAG response received successfully');
    } catch (e) {
      console.error('Failed to fetch RAG answer/context:', e);
    }

    // 3. Use the answer from RAG as the AI response
    const aiResponseContent = ragAnswer || 'Sorry, I could not generate a response.';

    // 4. Enhance the response if it's too short
    const enhancedResponse = enhanceResponse(aiResponseContent, userMessage);
    console.log('💬 [MESSAGES API] Enhanced Response content:', enhancedResponse.substring(0, 100) + (enhancedResponse.length > 100 ? '...' : ''));

    // 5. Save the AI message with enhanced content
    console.log('💾 [MESSAGES API] Creating AI message...');
    const aiMessageDoc = new (Message as any)({
      threadId,
      content: enhancedResponse,
      sender: 'system',
    });
    await aiMessageDoc.save();

    // 6. Create embedding for the AI response if embedding service is enabled
    if (embeddingService.isEnabled()) {
      try {
        const aiEmbeddingResult = await embeddingService.createEmbedding(
          thread.userId,
          enhancedResponse,
          threadId,
          aiMessageDoc._id.toString()
        );
        console.log('AI response embedding created:', aiEmbeddingResult.status);
      } catch (e) {
        console.error('Failed to create AI response embedding:', e);
      }
    }

    return {
      answer: enhancedResponse,
      context: ragContext || "RAG context not available",
      responseId: responseId
    };
  });

  // Return the response without wrapping in apiResponse
  return res.status(201).json(responsePayload);
}));

export default router; 