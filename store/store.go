package store

import (
	"fmt"
	"sync"
	"time"

	"github.com/bisen/axperiments/models"
	"github.com/google/uuid"
)

var (
	experiments = make(map[string]*models.Experiment)
	mu          sync.RWMutex
)

// Init initializes the store with sample data
func Init() {
	// Create a sample experiment
	sample := &models.Experiment{
		ID:          uuid.New().String(),
		Name:        "Sentiment Analysis",
		Description: "Analyze sentiment of product reviews",
		Signature:   `review:string -> sentiment:class "positive, negative, neutral", confidence:number`,
		Input:       `{"review": "This product is amazing!"}`,
		Output:      "",
		Status:      "pending",
		Provider:    "openai",
		Model:       "gpt-4o-mini",
		CreatedAt:   time.Now(),
		UpdatedAt:   time.Now(),
	}

	mu.Lock()
	experiments[sample.ID] = sample
	mu.Unlock()
}

// GetAll returns all experiments
func GetAll() ([]*models.Experiment, error) {
	mu.RLock()
	defer mu.RUnlock()

	result := make([]*models.Experiment, 0, len(experiments))
	for _, exp := range experiments {
		result = append(result, exp)
	}

	return result, nil
}

// Get returns a single experiment by ID
func Get(id string) (*models.Experiment, error) {
	mu.RLock()
	defer mu.RUnlock()

	exp, ok := experiments[id]
	if !ok {
		return nil, fmt.Errorf("experiment not found")
	}

	return exp, nil
}

// Create creates a new experiment
func Create(exp *models.Experiment) error {
	mu.Lock()
	defer mu.Unlock()

	exp.ID = uuid.New().String()
	exp.CreatedAt = time.Now()
	exp.UpdatedAt = time.Now()
	exp.Status = "pending"

	experiments[exp.ID] = exp
	return nil
}

// Update updates an existing experiment
func Update(exp *models.Experiment) error {
	mu.Lock()
	defer mu.Unlock()

	if _, ok := experiments[exp.ID]; !ok {
		return fmt.Errorf("experiment not found")
	}

	exp.UpdatedAt = time.Now()
	experiments[exp.ID] = exp
	return nil
}

// Delete deletes an experiment
func Delete(id string) error {
	mu.Lock()
	defer mu.Unlock()

	if _, ok := experiments[id]; !ok {
		return fmt.Errorf("experiment not found")
	}

	delete(experiments, id)
	return nil
}
