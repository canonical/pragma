# Storybook Addon DS Baseline Grid

Displays the baseline grid overlay in the Storybook preview.

## Usage 

### Installation

```bash
npm install @canonical/storybook-addon-baseline-grid
```

In your `.storybook/main.js` file, add the following:

```js
module.exports = {
  addons: ['@canonical/storybook-addon-baseline-grid'],
};
```

Please note that this addon does rely on ESM only and does not have a cjs build at all. This means you need a version of node >= 20 and a modern browser to use it.

## Local Testing Guide

## Prerequisites

1. First, ensure you have the MSW service worker file initialized:

```bash
# Run this in your addon directory
npx msw init public/
```

This creates `public/mockServiceWorker.js` which is necessary for MSW to intercept requests.

## Building and Testing Locally

### 1. Build the Addon

```bash
# Build the addon
bun run build
```

This will compile your TypeScript files to the `dist/` directory.

### 2. Run Storybook with the Addon

```bash
# Start Storybook
bun run storybook
```

Your Storybook should now be running at `http://localhost:6007`.

### 3. Verify the Addon is Working

1. **Check the Toolbar**: You should see a lightning bolt icon in the Storybook toolbar. This toggles MSW on/off globally.

2. **Check the Panel**: When viewing a story with MSW handlers, you should see an "MSW" tab in the addon panel (bottom of the screen). This shows information about active handlers.

3. **Test the Stories**: Navigate to "Addon/MSW Test" in the sidebar. You should see various test scenarios:
   - **Success Response**: Shows a successful API response
   - **Error Response**: Demonstrates error handling
   - **Delayed Response**: Shows loading states with a 2-second delay
   - **Multiple Handlers**: Tests multiple MSW handlers
   - **No Handlers**: Shows what happens when no handlers are defined
   - **Disabled MSW**: Tests the disable functionality
   - **Dynamic Response**: Interactive example with search functionality

## Troubleshooting

### "Failed to fetch" errors

If you see network errors, check:

1. The MSW service worker is loaded (check DevTools > Application > Service Workers)
2. The `mockServiceWorker.js` file exists in your `public/` directory
3. MSW is enabled (lightning bolt icon should be active/blue)

### Handlers not working

1. Check the MSW panel to see if handlers are registered
2. Ensure the request URLs match exactly (including leading slashes)
3. Check the browser console for any MSW-related warnings

### TypeScript errors

If you still see TypeScript errors after the fixes:

1. Ensure all dependencies are installed: `bun install`
2. Try cleaning and rebuilding: `rm -rf dist/ && bun run build`
3. Restart your TypeScript language server in your editor

## Understanding the Test Stories

Each test story demonstrates a different aspect of the MSW addon:

### Success Response
This is the simplest case - it intercepts a GET request to `/api/user` and returns a successful JSON response. Use this to verify basic MSW functionality.

### Error Response
Shows how to simulate API errors. The handler returns a 404 status with an error message. This is useful for testing error states in your components.

### Delayed Response
Demonstrates async handlers with artificial delays. This is perfect for testing loading states and ensuring your UI handles slow networks gracefully.

### Multiple Handlers
Shows that you can define multiple handlers for different endpoints. This mimics a real API with multiple routes.

### Dynamic Response
The most complex example - it shows how MSW can read request parameters and return dynamic responses based on user input. The search functionality demonstrates real-world usage.

## Next Steps

Once you've verified the addon works locally:

1. **Add more test cases**: Create stories that test specific scenarios you need
2. **Test with your components**: Import your actual components and test them with mocked APIs
3. **Add to your main project**: Install the addon in your main Storybook project
4. **Customize the Panel**: Enhance the panel to show more detailed handler information

## Development Tips

### Debugging MSW Handlers

Add console logs to your handlers to debug:

```typescript
http.get("/api/test", ({ request }) => {
  console.log("MSW: Intercepted request to", request.url);
  return HttpResponse.json({ success: true });
})
```

### Testing POST/PUT/DELETE

Create interactive stories that trigger different HTTP methods:

```typescript
http.post("/api/users", async ({ request }) => {
  const body = await request.json();
  console.log("MSW: Received POST data:", body);
  return HttpResponse.json({ id: 1, ...body }, { status: 201 });
})
```

### Simulating Network Conditions

Test different scenarios:

```typescript
// Random failures
http.get("/api/flaky", () => {
  if (Math.random() > 0.5) {
    return HttpResponse.json({ data: "Success!" });
  }
  return HttpResponse.error();
})

// Timeout simulation
http.get("/api/timeout", async () => {
  await new Promise(resolve => setTimeout(resolve, 30000));
  return HttpResponse.json({ data: "Too late!" });
})
```
