/**
 * Simple test script for RAG API
 * Tests context-based responses by sending requests to the messages API
 */

import axios from 'axios';

// Configuration
const API_URL = process.env.API_URL || 'http://localhost:3000/api';
const TEST_THREAD_ID = "6834becca32a04b1e44f1d17";  // User's actual thread ID
const USER_ID = "user_2xdTnz6ZkFCbDxHWRMOzVY3XP6K";  // User's actual user ID

// Test contexts
const TEST_CONTEXT = "I made a project that is an lca based dashboard of iot\n---\nmy name is gaurav and i have made eoxs ai\n---\nmy name is gaurav and i have made eoxs ai\n---\ni have made eoxs ai and my name is Gaurav\n---\nThe eoxs ai project is continuously evolving";

// Utility functions
const sendMessage = async (threadId, content, userId, context) => {
  try {
    console.log('Sending request to:', `${API_URL}/messages`);
    console.log('With payload:', { threadId, content, userId, context });
    
    const response = await axios.post(`${API_URL}/messages`, {
      threadId,
      content,
      userId,
      context
    });
    return response.data;
  } catch (error) {
    console.error('Error sending message:', error.response?.data || error.message);
    throw error;
  }
};

// Run test
const runTest = async () => {
  console.log('🧪 Starting test with actual user values');
  
  try {
    // Test message
    const query = "remeber i made a project of iot";
    console.log(`\n📝 Testing query: "${query}"`);
    
    // Test with the messages endpoint
    console.log('\n🔍 Testing messages endpoint:');
    const result = await sendMessage(TEST_THREAD_ID, query, USER_ID, TEST_CONTEXT);
    
    console.log('\n✅ Result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Compare with expected output
    const expectedOutput = {
      "answer": "Yes, you made a project that is an LCA-based dashboard of IoT.",
      "context": TEST_CONTEXT
    };
    
    console.log('\n🔍 Expected format:');
    console.log(JSON.stringify(expectedOutput, null, 2));
    
    // Check similarity
    const isSimilar = result.answer.toLowerCase().includes("yes") && 
                      result.answer.toLowerCase().includes("iot") &&
                      result.context === TEST_CONTEXT;
    
    console.log(`\n✅ Output matches expected format: ${isSimilar ? 'YES' : 'NO'}`);
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  console.log('\n🏁 Test completed');
};

// Run the test
runTest().catch(console.error);