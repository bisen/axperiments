package tests

import (
	"net/http"
	"net/http/httptest"
	"net/url"
	"strings"
	"testing"

	"github.com/bisen/axperiments/handlers"
	"github.com/bisen/axperiments/store"
	"github.com/go-chi/chi/v5"
)

// setupTestRouter creates a router with all routes for testing
func setupTestRouter() *chi.Mux {
	store.Init()

	r := chi.NewRouter()

	// Full page routes
	r.Get("/", handlers.Home)
	r.Get("/experiments", handlers.ListExperiments)
	r.Get("/experiments/{id}", handlers.ViewExperiment)

	// Partials routes
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

	return r
}

func TestHomeHandler(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest("GET", "/", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "Ax Experiments") {
		t.Errorf("Response should contain 'Ax Experiments'. Body length: %d, Body: '%s'", len(body), body)
	}
}

func TestListExperimentsHandler(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest("GET", "/experiments", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "All Experiments") || !strings.Contains(body, "Sentiment Analysis") {
		t.Error("Response should contain experiment list")
	}
}

func TestPartialListExperiments(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest("GET", "/partials/experiments", nil)
	req.Header.Set("X-Alpine-Request", "true")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	// Should return partial HTML without full layout
	if strings.Contains(body, "<!DOCTYPE html>") {
		t.Error("Partial should not contain full HTML document")
	}

	if !strings.Contains(body, "experiment-card") {
		t.Error("Partial should contain experiment cards")
	}
}

func TestPartialNewExperiment(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest("GET", "/partials/experiments/new", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "Create New Experiment") {
		t.Error("Response should contain new experiment form")
	}

	if !strings.Contains(body, `name="name"`) {
		t.Error("Form should contain name field")
	}

	if !strings.Contains(body, `name="signature"`) {
		t.Error("Form should contain signature field")
	}
}

func TestPartialCreateExperiment(t *testing.T) {
	router := setupTestRouter()

	formData := url.Values{}
	formData.Set("name", "Test Experiment")
	formData.Set("description", "Test description")
	formData.Set("signature", `text:string -> result:string`)
	formData.Set("input", `{"text": "test"}`)
	formData.Set("provider", "openai")
	formData.Set("model", "gpt-4o-mini")

	req := httptest.NewRequest("POST", "/partials/experiments", strings.NewReader(formData.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "Test Experiment") {
		t.Error("Response should contain the created experiment")
	}
}

func TestPartialUpdateExperiment(t *testing.T) {
	router := setupTestRouter()

	// First, get an experiment ID
	experiments, _ := store.GetAll()
	if len(experiments) == 0 {
		t.Skip("No experiments to update")
	}

	exp := experiments[0]

	formData := url.Values{}
	formData.Set("name", "Updated Experiment")
	formData.Set("description", "Updated description")
	formData.Set("signature", exp.Signature)
	formData.Set("input", exp.Input)
	formData.Set("provider", exp.Provider)
	formData.Set("model", exp.Model)

	req := httptest.NewRequest("PUT", "/partials/experiments/"+exp.ID, strings.NewReader(formData.Encode()))
	req.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "Updated Experiment") {
		t.Error("Response should contain the updated experiment name")
	}
}

func TestPartialDeleteExperiment(t *testing.T) {
	router := setupTestRouter()

	// Create a new experiment to delete
	formData := url.Values{}
	formData.Set("name", "To Delete")
	formData.Set("description", "Will be deleted")
	formData.Set("signature", `text:string -> result:string`)
	formData.Set("input", `{"text": "test"}`)
	formData.Set("provider", "openai")
	formData.Set("model", "gpt-4o-mini")

	createReq := httptest.NewRequest("POST", "/partials/experiments", strings.NewReader(formData.Encode()))
	createReq.Header.Set("Content-Type", "application/x-www-form-urlencoded")
	createW := httptest.NewRecorder()
	router.ServeHTTP(createW, createReq)

	// Get the created experiment
	experiments, _ := store.GetAll()
	var expID string
	for _, exp := range experiments {
		if exp.Name == "To Delete" {
			expID = exp.ID
			break
		}
	}

	if expID == "" {
		t.Fatal("Failed to create experiment for deletion")
	}

	// Delete the experiment
	req := httptest.NewRequest("DELETE", "/partials/experiments/"+expID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	// Verify it's deleted
	_, err := store.Get(expID)
	if err == nil {
		t.Error("Experiment should be deleted")
	}
}

func TestPartialExecuteExperiment(t *testing.T) {
	router := setupTestRouter()

	experiments, _ := store.GetAll()
	if len(experiments) == 0 {
		t.Skip("No experiments to execute")
	}

	exp := experiments[0]

	req := httptest.NewRequest("POST", "/partials/experiments/"+exp.ID+"/execute", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "completed") || !strings.Contains(body, "sentiment") {
		t.Error("Response should contain completed status and output")
	}
}

func TestViewExperimentNotFound(t *testing.T) {
	router := setupTestRouter()

	req := httptest.NewRequest("GET", "/experiments/nonexistent-id", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusNotFound {
		t.Errorf("Expected status 404, got %d", w.Code)
	}
}

func TestPartialViewExperiment(t *testing.T) {
	router := setupTestRouter()

	experiments, _ := store.GetAll()
	if len(experiments) == 0 {
		t.Skip("No experiments to view")
	}

	exp := experiments[0]

	req := httptest.NewRequest("GET", "/partials/experiments/"+exp.ID, nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, exp.Name) {
		t.Error("Response should contain experiment name")
	}
}

func TestPartialEditExperiment(t *testing.T) {
	router := setupTestRouter()

	experiments, _ := store.GetAll()
	if len(experiments) == 0 {
		t.Skip("No experiments to edit")
	}

	exp := experiments[0]

	req := httptest.NewRequest("GET", "/partials/experiments/"+exp.ID+"/edit", nil)
	w := httptest.NewRecorder()

	router.ServeHTTP(w, req)

	if w.Code != http.StatusOK {
		t.Errorf("Expected status 200, got %d", w.Code)
	}

	body := w.Body.String()
	if !strings.Contains(body, "Edit Experiment") {
		t.Error("Response should contain edit form")
	}

	if !strings.Contains(body, exp.Name) {
		t.Error("Form should be pre-filled with experiment data")
	}
}
