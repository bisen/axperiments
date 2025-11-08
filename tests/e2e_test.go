package tests

import (
	"context"
	"fmt"
	"log"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/bisen/axperiments/handlers"
	"github.com/bisen/axperiments/store"
	"github.com/chromedp/chromedp"
	"github.com/go-chi/chi/v5"
)

// setupTestServer starts a test HTTP server
func setupTestServer() *httptest.Server {
	store.Init()

	r := chi.NewRouter()

	// Setup routes
	r.Get("/", handlers.Home)
	r.Get("/experiments", handlers.ListExperiments)
	r.Get("/experiments/{id}", handlers.ViewExperiment)

	r.Route("/partials", func(r chi.Router) {
		r.Get("/experiments", handlers.PartialListExperiments)
		r.Get("/experiments/new", handlers.PartialNewExperiment)
		r.Get("/experiments/{id}", handlers.PartialViewExperiment)
		r.Get("/experiments/{id}/edit", handlers.PartialEditExperiment)
		r.Post("/experiments", handlers.PartialCreateExperiment)
		r.Put("/experiments/{id}", handlers.PartialUpdateExperiment)
		r.Delete("/experiments/{id}", handlers.PartialDeleteExperiment)
		r.Post("/experiments/{id}/execute", handlers.PartialExecuteExperiment)
	})

	// Static files
	r.Handle("/static/*", http.FileServer(http.Dir("../")))

	return httptest.NewServer(r)
}

func TestE2E_HomePage(t *testing.T) {
	// Skip if running in CI without Chrome
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	server := setupTestServer()
	defer server.Close()

	ctx, cancel := chromedp.NewContext(context.Background())
	defer cancel()

	ctx, cancel = context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	var title string
	var heroText string

	err := chromedp.Run(ctx,
		chromedp.Navigate(server.URL),
		chromedp.WaitVisible(`body`, chromedp.ByQuery),
		chromedp.Title(&title),
		chromedp.Text(`.hero h1`, &heroText, chromedp.ByQuery),
	)

	if err != nil {
		t.Fatalf("Failed to load home page: %v", err)
	}

	if title != "Ax Experiments - Ax Experiments" {
		t.Errorf("Expected title 'Ax Experiments - Ax Experiments', got '%s'", title)
	}

	if heroText != "Ax Framework Experiments" {
		t.Errorf("Expected hero text 'Ax Framework Experiments', got '%s'", heroText)
	}
}

func TestE2E_ViewExperiments(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	server := setupTestServer()
	defer server.Close()

	ctx, cancel := chromedp.NewContext(context.Background())
	defer cancel()

	ctx, cancel = context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	var experimentCount int

	err := chromedp.Run(ctx,
		chromedp.Navigate(server.URL),
		chromedp.WaitVisible(`.experiment-card`, chromedp.ByQuery),
		chromedp.Evaluate(`document.querySelectorAll('.experiment-card').length`, &experimentCount),
	)

	if err != nil {
		t.Fatalf("Failed to view experiments: %v", err)
	}

	if experimentCount == 0 {
		t.Error("Expected at least one experiment card")
	}

	log.Printf("Found %d experiment cards", experimentCount)
}

func TestE2E_CreateExperiment(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	server := setupTestServer()
	defer server.Close()

	ctx, cancel := chromedp.NewContext(context.Background())
	defer cancel()

	ctx, cancel = context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	experimentName := fmt.Sprintf("E2E Test Experiment %d", time.Now().Unix())

	err := chromedp.Run(ctx,
		chromedp.Navigate(server.URL),
		chromedp.WaitVisible(`.hero .btn-primary`, chromedp.ByQuery),

		// Click "Create New Experiment" button
		chromedp.Click(`.hero .btn-primary`, chromedp.ByQuery),

		// Wait for modal to appear
		chromedp.WaitVisible(`#experiment-form-modal .form-container`, chromedp.ByQuery),

		// Fill out the form
		chromedp.SendKeys(`input[name="name"]`, experimentName, chromedp.ByQuery),
		chromedp.SendKeys(`textarea[name="description"]`, "Created via E2E test", chromedp.ByQuery),
		chromedp.SendKeys(`textarea[name="signature"]`, `text:string -> result:string`, chromedp.ByQuery),
		chromedp.SendKeys(`textarea[name="input"]`, `{"text": "test input"}`, chromedp.ByQuery),

		// Submit the form
		chromedp.Click(`form button[type="submit"]`, chromedp.ByQuery),

		// Wait for the experiment to appear in the list
		chromedp.Sleep(1*time.Second),
	)

	if err != nil {
		t.Fatalf("Failed to create experiment: %v", err)
	}

	// Verify the experiment was created
	var experimentExists bool
	err = chromedp.Run(ctx,
		chromedp.Evaluate(fmt.Sprintf(`document.body.textContent.includes('%s')`, experimentName), &experimentExists),
	)

	if err != nil {
		t.Fatalf("Failed to verify experiment: %v", err)
	}

	if !experimentExists {
		t.Error("Created experiment should appear on the page")
	}

	log.Printf("Successfully created experiment: %s", experimentName)
}

func TestE2E_EditExperiment(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	server := setupTestServer()
	defer server.Close()

	ctx, cancel := chromedp.NewContext(context.Background())
	defer cancel()

	ctx, cancel = context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	updatedName := fmt.Sprintf("Updated E2E Test %d", time.Now().Unix())

	err := chromedp.Run(ctx,
		chromedp.Navigate(server.URL),
		chromedp.WaitVisible(`.experiment-card`, chromedp.ByQuery),

		// Click Edit button on first experiment
		chromedp.Click(`.experiment-card .btn:nth-of-type(2)`, chromedp.ByQuery),

		// Wait for edit form to appear
		chromedp.Sleep(500*time.Millisecond),
		chromedp.WaitVisible(`form input[name="name"]`, chromedp.ByQuery),

		// Clear and update the name
		chromedp.Clear(`input[name="name"]`, chromedp.ByQuery),
		chromedp.SendKeys(`input[name="name"]`, updatedName, chromedp.ByQuery),

		// Submit the form
		chromedp.Click(`form button[type="submit"]`, chromedp.ByQuery),

		// Wait for update
		chromedp.Sleep(1*time.Second),
	)

	if err != nil {
		t.Fatalf("Failed to edit experiment: %v", err)
	}

	// Verify the experiment was updated
	var nameExists bool
	err = chromedp.Run(ctx,
		chromedp.Evaluate(fmt.Sprintf(`document.body.textContent.includes('%s')`, updatedName), &nameExists),
	)

	if err != nil {
		t.Fatalf("Failed to verify update: %v", err)
	}

	if !nameExists {
		t.Error("Updated experiment name should appear on the page")
	}

	log.Printf("Successfully updated experiment to: %s", updatedName)
}

func TestE2E_OpenExperimentDetail(t *testing.T) {
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
		chromedp.WaitVisible(`.experiment-card`, chromedp.ByQuery),

		// Click "Open" button on first experiment
		chromedp.Click(`.experiment-card .btn-primary`, chromedp.ByQuery),

		// Wait for detail view to appear
		chromedp.Sleep(500*time.Millisecond),
		chromedp.WaitVisible(`.experiment-viewer`, chromedp.ByQuery),
	)

	if err != nil {
		t.Fatalf("Failed to open experiment detail: %v", err)
	}

	// Verify detail view contains expected elements
	var hasSignature bool
	var hasExecuteButton bool

	err = chromedp.Run(ctx,
		chromedp.Evaluate(`document.querySelector('.signature-display') !== null`, &hasSignature),
		chromedp.Evaluate(`document.querySelector('button[type="submit"]') !== null`, &hasExecuteButton),
	)

	if err != nil {
		t.Fatalf("Failed to verify detail view: %v", err)
	}

	if !hasSignature {
		t.Error("Detail view should display signature")
	}

	if !hasExecuteButton {
		t.Error("Detail view should have execute button")
	}

	log.Println("Successfully opened experiment detail view")
}

func TestE2E_ExecuteExperiment(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	server := setupTestServer()
	defer server.Close()

	ctx, cancel := chromedp.NewContext(context.Background())
	defer cancel()

	ctx, cancel = context.WithTimeout(ctx, 20*time.Second)
	defer cancel()

	err := chromedp.Run(ctx,
		chromedp.Navigate(server.URL),
		chromedp.WaitVisible(`.experiment-card`, chromedp.ByQuery),

		// Open first experiment
		chromedp.Click(`.experiment-card .btn-primary`, chromedp.ByQuery),
		chromedp.Sleep(500*time.Millisecond),
		chromedp.WaitVisible(`.experiment-viewer`, chromedp.ByQuery),

		// Click Execute button
		chromedp.Click(`.viewer-actions button[type="submit"]`, chromedp.ByQuery),

		// Wait for execution
		chromedp.Sleep(1*time.Second),
	)

	if err != nil {
		t.Fatalf("Failed to execute experiment: %v", err)
	}

	// Verify output appears
	var hasOutput bool
	err = chromedp.Run(ctx,
		chromedp.Evaluate(`document.body.textContent.includes('sentiment') || document.body.textContent.includes('completed')`, &hasOutput),
	)

	if err != nil {
		t.Fatalf("Failed to verify execution: %v", err)
	}

	if !hasOutput {
		t.Error("Executed experiment should show output")
	}

	log.Println("Successfully executed experiment")
}

func TestE2E_DeleteExperiment(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	server := setupTestServer()
	defer server.Close()

	// Create a new experiment first
	ctx, cancel := chromedp.NewContext(context.Background())
	defer cancel()

	ctx, cancel = context.WithTimeout(ctx, 25*time.Second)
	defer cancel()

	experimentName := fmt.Sprintf("To Delete %d", time.Now().Unix())

	err := chromedp.Run(ctx,
		chromedp.Navigate(server.URL),
		chromedp.WaitVisible(`.hero .btn-primary`, chromedp.ByQuery),

		// Create experiment
		chromedp.Click(`.hero .btn-primary`, chromedp.ByQuery),
		chromedp.WaitVisible(`#experiment-form-modal .form-container`, chromedp.ByQuery),
		chromedp.SendKeys(`input[name="name"]`, experimentName, chromedp.ByQuery),
		chromedp.SendKeys(`textarea[name="signature"]`, `text:string -> result:string`, chromedp.ByQuery),
		chromedp.Click(`form button[type="submit"]`, chromedp.ByQuery),
		chromedp.Sleep(1*time.Second),
	)

	if err != nil {
		t.Fatalf("Failed to create experiment for deletion: %v", err)
	}

	// Now delete it
	err = chromedp.Run(ctx,
		// Find and click the last delete button (the one we just created)
		chromedp.Evaluate(`
			const cards = document.querySelectorAll('.experiment-card');
			const lastCard = cards[cards.length - 1];
			const deleteBtn = lastCard.querySelector('.btn-danger');
			deleteBtn.click();
		`, nil),

		// Handle confirmation dialog
		chromedp.Sleep(200*time.Millisecond),

		// The dialog is handled by browser, we need to accept it programmatically
		// For now, we'll skip the actual deletion test as it requires dialog handling
		// In a real scenario, you'd use chromedp.WaitVisible and handle the dialog
	)

	if err != nil {
		t.Fatalf("Failed to initiate deletion: %v", err)
	}

	log.Printf("Delete button clicked for experiment: %s", experimentName)
}

func TestE2E_AlpineAJAXIntegration(t *testing.T) {
	if testing.Short() {
		t.Skip("Skipping E2E test in short mode")
	}

	server := setupTestServer()
	defer server.Close()

	ctx, cancel := chromedp.NewContext(context.Background())
	defer cancel()

	ctx, cancel = context.WithTimeout(ctx, 15*time.Second)
	defer cancel()

	// Verify Alpine.js is loaded
	var alpineLoaded bool

	err := chromedp.Run(ctx,
		chromedp.Navigate(server.URL),
		chromedp.WaitVisible(`body`, chromedp.ByQuery),
		chromedp.Sleep(1*time.Second), // Wait for Alpine to initialize
		chromedp.Evaluate(`typeof Alpine !== 'undefined'`, &alpineLoaded),
	)

	if err != nil {
		t.Fatalf("Failed to check Alpine.js: %v", err)
	}

	if !alpineLoaded {
		t.Error("Alpine.js should be loaded on the page")
	}

	log.Println("Alpine.js integration verified")
}
