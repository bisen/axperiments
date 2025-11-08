# Testing Guide

This project includes comprehensive testing at multiple levels: unit tests, handler tests, store tests, and end-to-end (E2E) browser tests.

## Test Structure

```
tests/
├── setup_test.go        # Test initialization and setup
├── store_test.go        # Store/data layer tests
├── handlers_test.go     # HTTP handler unit tests
└── e2e_test.go          # End-to-end browser tests
```

## Prerequisites

### For Unit/Handler Tests
- Go 1.21+
- No additional dependencies

### For E2E Browser Tests
- Chrome or Chromium browser installed
- chromedp package (automatically installed via go.mod)

## Running Tests

### Run All Tests
```bash
go test ./tests/...
```

### Run Specific Test Files
```bash
# Store tests only
go test ./tests/ -run TestStore

# Handler tests only
go test ./tests/ -run TestHandler

# E2E tests only
go test ./tests/ -run TestE2E
```

### Skip E2E Tests (useful in CI without browser)
```bash
go test ./tests/... -short
```

### Run with Verbose Output
```bash
go test ./tests/... -v
```

### Run with Coverage
```bash
go test ./tests/... -cover
```

### Generate Coverage Report
```bash
go test ./tests/... -coverprofile=coverage.out
go tool cover -html=coverage.out
```

## Test Categories

### 1. Store Tests (`store_test.go`)

Tests the data layer with in-memory storage:

- **TestStoreInit**: Verifies store initialization with sample data
- **TestStoreCreate**: Tests creating new experiments
- **TestStoreGet**: Tests retrieving experiments by ID
- **TestStoreGetNotFound**: Tests error handling for missing experiments
- **TestStoreUpdate**: Tests updating existing experiments
- **TestStoreDelete**: Tests deleting experiments
- **TestStoreConcurrency**: Tests thread-safe concurrent operations

Example:
```bash
go test ./tests/ -run TestStoreCreate -v
```

### 2. Handler Tests (`handlers_test.go`)

Tests HTTP handlers using httptest (no real server):

- **TestHomeHandler**: Tests home page rendering
- **TestListExperimentsHandler**: Tests full page experiment list
- **TestPartialListExperiments**: Tests AJAX partial rendering
- **TestPartialNewExperiment**: Tests new experiment form
- **TestPartialCreateExperiment**: Tests experiment creation endpoint
- **TestPartialUpdateExperiment**: Tests experiment updates
- **TestPartialDeleteExperiment**: Tests experiment deletion
- **TestPartialExecuteExperiment**: Tests signature execution
- **TestPartialViewExperiment**: Tests single experiment view
- **TestPartialEditExperiment**: Tests edit form rendering
- **TestViewExperimentNotFound**: Tests 404 handling

Example:
```bash
go test ./tests/ -run TestPartialCreate -v
```

### 3. E2E Browser Tests (`e2e_test.go`)

Tests the full application including JavaScript and Alpine AJAX using a real headless Chrome browser:

- **TestE2E_HomePage**: Tests home page loads correctly
- **TestE2E_ViewExperiments**: Verifies experiment cards appear
- **TestE2E_CreateExperiment**: Tests creating experiment via UI
- **TestE2E_EditExperiment**: Tests inline editing workflow
- **TestE2E_OpenExperimentDetail**: Tests opening detail view
- **TestE2E_ExecuteExperiment**: Tests signature execution via UI
- **TestE2E_DeleteExperiment**: Tests deletion workflow
- **TestE2E_AlpineAJAXIntegration**: Verifies Alpine.js loads correctly

Example:
```bash
# Run single E2E test
go test ./tests/ -run TestE2E_CreateExperiment -v

# Skip E2E tests
go test ./tests/... -short
```

## Writing New Tests

### Handler Test Template

```go
func TestMyNewHandler(t *testing.T) {
    router := setupTestRouter()

    req := httptest.NewRequest("GET", "/my-endpoint", nil)
    w := httptest.NewRecorder()

    router.ServeHTTP(w, req)

    if w.Code != http.StatusOK {
        t.Errorf("Expected status 200, got %d", w.Code)
    }

    body := w.Body.String()
    if !strings.Contains(body, "expected content") {
        t.Error("Response should contain expected content")
    }
}
```

### E2E Test Template

```go
func TestE2E_MyFeature(t *testing.T) {
    if testing.Short() {
        t.Skip("Skipping E2E test in short mode")
    }

    server := setupTestServer()
    defer server.Close()

    ctx, cancel := chromedp.NewContext(context.Background())
    defer cancel()

    ctx, cancel = context.WithTimeout(ctx, 15*time.Second)
    defer cancel()

    err := chromedp.Run(ctx,
        chromedp.Navigate(server.URL),
        chromedp.WaitVisible(`#my-element`, chromedp.ByQuery),
        chromedp.Click(`#my-button`, chromedp.ByQuery),
        // ... more actions
    )

    if err != nil {
        t.Fatalf("Test failed: %v", err)
    }
}
```

## CI/CD Integration

### GitHub Actions Example

```yaml
name: Tests

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest

    steps:
    - uses: actions/checkout@v3

    - name: Set up Go
      uses: actions/setup-go@v4
      with:
        go-version: '1.21'

    - name: Run unit tests
      run: go test ./tests/... -short -v

    - name: Install Chrome
      run: |
        sudo apt-get update
        sudo apt-get install -y chromium-browser

    - name: Run E2E tests
      run: go test ./tests/... -v
```

## Test Coverage Goals

- **Store Layer**: 100% (all CRUD operations)
- **Handlers**: 90%+ (all endpoints, error cases)
- **E2E**: 80%+ (critical user flows)

## Common Issues

### E2E Tests Failing

**Issue**: "chrome not found" or "context deadline exceeded"

**Solutions**:
1. Install Chrome/Chromium: `sudo apt-get install chromium-browser`
2. Increase timeout in test: `context.WithTimeout(ctx, 30*time.Second)`
3. Skip E2E tests: `go test ./tests/... -short`

### Template Parsing Errors

**Issue**: "Failed to load templates"

**Solution**: Run tests from project root:
```bash
cd /home/user/axperiments
go test ./tests/...
```

### Port Already in Use

**Issue**: Test server can't bind to port

**Solution**: Tests use httptest.Server which automatically finds available ports. No action needed.

## Best Practices

1. **Run tests before committing**
   ```bash
   go test ./tests/... -v
   ```

2. **Check coverage regularly**
   ```bash
   go test ./tests/... -cover
   ```

3. **Use table-driven tests** for similar test cases

4. **Mock external dependencies** (when we add real Ax integration)

5. **Keep tests isolated** - each test should be independent

6. **Use descriptive test names** - `TestE2E_CreateExperimentWithValidation`

7. **Add cleanup** - use `defer` to clean up resources

## Performance

- **Unit/Handler tests**: ~50-200ms total
- **Store tests**: ~10-50ms total
- **E2E tests**: ~2-5s per test (browser startup overhead)

## Future Enhancements

- [ ] Integration tests with real Ax framework execution
- [ ] API tests for JSON endpoints (when added)
- [ ] Load/stress testing for concurrent users
- [ ] Visual regression testing (screenshot comparisons)
- [ ] Accessibility testing
- [ ] Security testing (XSS, CSRF, etc.)

## Resources

- [Go Testing Package](https://pkg.go.dev/testing)
- [httptest Documentation](https://pkg.go.dev/net/http/httptest)
- [chromedp Documentation](https://github.com/chromedp/chromedp)
- [Table-Driven Tests](https://dave.cheney.net/2019/05/07/prefer-table-driven-tests)
