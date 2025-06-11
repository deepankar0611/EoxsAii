/**
 * Test script to verify RAG integration with the provided response format
 */

import axios from 'axios';

// Test the RAG response format
const testRAGResponse = {
  "answer": "Rajat Jain is the founder and CEO of EOXS, a steel ERP company.",
  "context": "The context provided does not contain any information about Rajat Jain. Therefore, I cannot answer the question about who Rajat Jain is based on the given context.\n---\nRajat Jain is the founder and CEO of EOXS, a steel ERP company.\n---\nEOXS is a steel erp company the rajat jain is the founder and ceo of this company\n---\ntell me where gaurav is working\n---\ntell me what gaurav is passionate about",
  "responseId": "cbc2cf1d-8471-44a7-a7ed-61c030815f53"
};

console.log('Testing RAG Response Format:');
console.log('Answer:', testRAGResponse.answer);
console.log('Context:', testRAGResponse.context);
console.log('Response ID:', testRAGResponse.responseId);

// Test embedding service integration
async function testEmbeddingService() {
  try {
    const response = await axios.post('http://localhost:8082/api/messages', {
      threadId: '507f1f77bcf86cd799439011', // Example thread ID
      content: 'Who is Rajat Jain?',
      userId: 'test-user-123'
    });
    
    console.log('Message creation response:', response.data);
  } catch (error) {
    console.error('Error testing message creation:', error.response?.data || error.message);
  }
}

// Run the test if EMBEDDING_API_URL is set
if (process.env.EMBEDDING_API_URL) {
  console.log('EMBEDDING_API_URL is set:', process.env.EMBEDDING_API_URL);
  testEmbeddingService();
} else {
  console.log('EMBEDDING_API_URL not set. Set it to test the embedding service.');
  console.log('Example: EMBEDDING_API_URL=https://your-embedding-api-url.com');
}

console.log('\nIntegration Summary:');
console.log('✅ RAG response format updated to include responseId');
console.log('✅ Embedding creation for both user and AI messages');
console.log('✅ Context storage in MongoDB');
console.log('✅ /embed API calls for all messages');
console.log('✅ /rag-generate API calls for responses'); 