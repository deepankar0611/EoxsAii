# Context Enhancement for EoxsAI

This feature allows EoxsAI to use provided context in responses, making it appear as if the AI has memory of past interactions, even when they weren't part of the same conversation.

## Implementation Details

The following components have been modified to support context enhancement:

1. **OpenAI Service**: 
   - Now accepts a `providedContext` parameter in the `generateResponse` function
   - Uses this context to inform AI responses
   - Falls back to RAG or traditional memory if no context is provided

2. **Message Routes**:
   - Both `/api/messages` and `/api/messages/generate` endpoints now accept a `context` parameter
   - The context is passed to the OpenAI service
   - The response includes the context that was used

3. **Test Script**:
   - A test script (`rag_test.js`) has been created to verify context-based responses
   - Tests both main message endpoints with IoT project context

## Usage Instructions

### API Usage

#### POST /api/messages

```json
{
  "threadId": "thread_id_here",
  "content": "remember i made a project of iot",
  "userId": "user_id_here",
  "context": "I made a project that is an lca based dashboard of iot\nmy name is gaurav and i have made eoxs ai\nThe eoxs ai project is continuously evolving"
}
```

#### POST /api/messages/generate

```json
{
  "threadId": "thread_id_here",
  "userMessage": "remember i made a project of iot",
  "context": "I made a project that is an lca based dashboard of iot\nmy name is gaurav and i have made eoxs ai\nThe eoxs ai project is continuously evolving"
}
```

### Response Format

```json
{
  "answer": "Yes, I remember you made an LCA-based IoT dashboard project. Would you like to discuss it further?",
  "context": "I made a project that is an lca based dashboard of iot\nmy name is gaurav and i have made eoxs ai\nThe eoxs ai project is continuously evolving"
}
```

## Testing

To test the context enhancement feature:

1. Start the EoxsAI server:
   ```bash
   npm run dev
   ```

2. Run the test script:
   ```bash
   node rag_test.js
   ```

3. Verify that the responses use the provided context.

## Example Context Strings

Here are some example context strings that can be used:

```
I made a project that is an lca based dashboard of iot
my name is gaurav and i have made eoxs ai
The eoxs ai project is continuously evolving
```

```
I have made eoxs ai and my name is Gaurav
I made a project that is an lca based dashboard of iot
```

You can format the context string with multiple lines separated by `\n` characters. The context can include any information you want the AI to "remember" about the user. 