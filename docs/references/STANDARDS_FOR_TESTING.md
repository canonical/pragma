# Testing Standards Reference

This document outlines the standards and conventions for writing tests within the Canonical Design System. It aims to ensure consistency, maintainability, and reliability across all test suites.

## Introduction

Our testing practices are guided by the following core principles:

* **Reliability:** Tests should be stable and provide consistent results.
* **Maintainability:** Tests should be easy to understand and modify.
* **Coverage:** Critical paths and edge cases should be thoroughly tested.
* **Performance:** Tests should run quickly and efficiently.

## Test Organization (`testing/organization`)

### File Placement (`testing/organization/file-placement`)

Tests **shall** be placed directly next to the code they test:

```
src/
  └── components/
      ├── button.<ext>
      └── button.tests.<ext>
```

> ✅ **Do**
> 
> + Place test files directly next to the code they test
> + Use `.tests.<ext>` suffix for test files
> + Group related tests together within the test file
> + Follow the Arrange-Act-Assert pattern

> ❌ **Don't**
>
> + Place tests in a separate directory structure
> + Create deep test hierarchies
> + Use vague test names
> + Skip test organization

## Test Structure (`testing/structure`)

### Test Cases (`testing/structure/test-cases`)

Each test case **shall** follow a clear structure:

1. **Arrange**: Set up the test conditions
2. **Act**: Execute the code being tested
3. **Assert**: Verify the results

```typescript
describe('MyComponent', () => {
  it('should handle user input correctly', () => {
    // Arrange
    const input = 'test value';
    const expectedOutput = 'processed: test value';
    
    // Act
    const result = processInput(input);
    
    // Assert
    expect(result).toBe(expectedOutput);
  });

  it('should handle empty input', () => {
    // Arrange
    const input = '';
    const expectedOutput = '';
    
    // Act
    const result = processInput(input);
    
    // Assert
    expect(result).toBe(expectedOutput);
  });
});
```

> ✅ **Do**
> 
> + Use descriptive test names that explain the behavior being tested
> + Follow the Arrange-Act-Assert pattern
> + Keep test cases focused and atomic
> + Use appropriate test doubles (mocks, stubs, spies) when needed

> ❌ **Don't**
>
> + Write tests that depend on other tests
> + Include complex setup in test cases
> + Use magic numbers or strings without explanation
> + Skip assertions or verifications

### Test Doubles (`testing/structure/test-doubles`)

Test doubles **shall** be used appropriately to isolate the code being tested:

1. **Mocks**: Verify interactions
2. **Stubs**: Provide predefined responses
3. **Spies**: Monitor function calls

```typescript
describe('UserService', () => {
  it('should call API with correct parameters', () => {
    // Arrange
    const mockApi = vi.fn();
    const userService = new UserService(mockApi);
    const userId = '123';

    // Act
    userService.getUser(userId);

    // Assert
    expect(mockApi).toHaveBeenCalledWith('/users/123');
  });

  it('should handle API errors', () => {
    // Arrange
    const mockApi = vi.fn().mockRejectedValue(new Error('API Error'));
    const userService = new UserService(mockApi);
    const userId = '123';

    // Act & Assert
    expect(userService.getUser(userId)).rejects.toThrow('API Error');
  });
});
```

> ✅ **Do**
> 
> + Use mocks to verify important interactions
> + Use stubs to control test conditions
> + Use spies to monitor behavior
> + Keep test doubles simple and focused

> ❌ **Don't**
>
> + Overuse test doubles
> + Mock implementation details
> + Create complex mock behaviors
> + Use test doubles when real objects would work better

## Test Coverage (`testing/coverage`)

Code **shall** maintain appropriate test coverage:

1. **Unit Tests**: Core business logic
2. **Integration Tests**: Component interactions
3. **E2E Tests**: Critical user journeys

```typescript
// Unit Test Example
describe('Calculator', () => {
  it('should add two numbers correctly', () => {
    const calculator = new Calculator();
    expect(calculator.add(2, 3)).toBe(5);
  });
});

// Integration Test Example
describe('UserProfile', () => {
  it('should display user data from API', async () => {
    const { getByText } = render(<UserProfile userId="123" />);
    await waitFor(() => {
      expect(getByText('John Doe')).toBeInTheDocument();
    });
  });
});

// E2E Test Example
describe('User Registration', () => {
  it('should complete registration flow', async () => {
    await page.goto('/register');
    await page.fill('input[name="email"]', 'test@example.com');
    await page.fill('input[name="password"]', 'password123');
    await page.click('button[type="submit"]');
    await expect(page).toHaveURL('/dashboard');
  });
});
```

> ✅ **Do**
> 
> + Write tests for all business logic
> + Test edge cases and error conditions
> + Include integration tests for critical paths
> + Focus on behavior, not implementation

> ❌ **Don't**
>
> + Skip testing error conditions
> + Ignore edge cases
> + Write tests that don't add value
> + Focus only on happy paths

## Test Performance (`testing/performance`)

Tests **shall** be optimized for performance:

1. **Speed**: Tests should run quickly
2. **Isolation**: Tests should not depend on external services
3. **Parallelization**: Tests should be able to run in parallel

```typescript
// Fast, isolated test
describe('StringUtils', () => {
  it('should capitalize first letter', () => {
    expect(capitalize('hello')).toBe('Hello');
  });
});

// Slow test with external dependency (avoid this)
describe('WeatherService', () => {
  it('should fetch weather data', async () => {
    const weather = await fetchWeather('London');
    expect(weather.temperature).toBeDefined();
  });
});

// Better: Mocked external dependency
describe('WeatherService', () => {
  it('should process weather data', async () => {
    const mockWeatherData = { temperature: 20 };
    const weatherService = new WeatherService(mockWeatherApi);
    const result = await weatherService.getWeather('London');
    expect(result.temperature).toBe(20);
  });
});
```

> ✅ **Do**
> 
> + Keep tests fast and focused
> + Mock external dependencies
> + Use appropriate test doubles
> + Design tests for parallel execution

> ❌ **Don't**
>
> + Include unnecessary setup
> + Depend on external services
> + Create test dependencies
> + Write slow tests without good reason
