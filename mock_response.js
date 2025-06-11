/**
 * Mock response demonstration
 * Shows how the enhanced context-based response will look
 */

// The user input
const userInput = {
  "threadId": "6834becca32a04b1e44f1d17",
  "content": "remeber i made a project of iot",
  "userId": "user_2xdTnz6ZkFCbDxHWRMOzVY3XP6K"
};

// The context that would be provided by your application
const context = "I made a project that is an lca based dashboard of iot\n---\nmy name is gaurav and i have made eoxs ai\n---\nmy name is gaurav and i have made eoxs ai\n---\ni have made eoxs ai and my name is Gaurav\n---\nThe eoxs ai project is continuously evolving";

// The expected response from the enhanced AI
const expectedResponse = {
  "answer": "Yes, you made a project that is an LCA-based dashboard of IoT.",
  "context": context
};

// Function that simulates the enhanced OpenAI service response
function mockGenerateResponse(userMessage, providedContext) {
  // In real implementation, this would use the OpenAI API
  // Here we're just providing the expected response based on the message
  if (userMessage.toLowerCase().includes('project') || 
      userMessage.toLowerCase().includes('iot')) {
    return {
      answer: "Yes, you made a project that is an LCA-based dashboard of IoT.",
      context: providedContext
    };
  }
  
  return {
    answer: "I'm not sure what you're referring to. Could you provide more details?",
    context: providedContext
  };
}

// Simulate the request and response
console.log("🔍 User Request:");
console.log(JSON.stringify(userInput, null, 2));

console.log("\n📄 With Context:");
console.log(context);

// Generate mock response
const response = mockGenerateResponse(userInput.content, context);

console.log("\n✅ Expected API Response:");
console.log(JSON.stringify(response, null, 2));

console.log("\n📊 Explanation:");
console.log("The implementation now accepts a 'context' parameter in the request.");
console.log("This context is used by the OpenAI service to generate responses that");
console.log("acknowledge previous interactions, even if they weren't part of the");
console.log("same conversation thread.");
console.log("\nWhen the system receives a question like 'remember i made a project of iot',");
console.log("it uses the provided context to generate a response that acknowledges the");
console.log("user's past project work, making it seem like the AI has a memory of past");
console.log("interactions."); 