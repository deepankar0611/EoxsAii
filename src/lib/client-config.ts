// Client-side configuration
const clientConfig = {
  clerkKey: import.meta.env.VITE_CLERK_PUBLISHABLE_KEY,
  apiUrl: import.meta.env.VITE_API_URL || 
          (import.meta.env.PROD ? '/api' : 'http://localhost:8082/api')
};

export default clientConfig;