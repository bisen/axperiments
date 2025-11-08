package tests

import (
	"testing"

	"github.com/bisen/axperiments/models"
	"github.com/bisen/axperiments/store"
)

func TestStoreInit(t *testing.T) {
	store.Init()

	experiments, err := store.GetAll()
	if err != nil {
		t.Fatalf("GetAll failed: %v", err)
	}

	if len(experiments) == 0 {
		t.Error("Init should create at least one sample experiment")
	}
}

func TestStoreCreate(t *testing.T) {
	store.Init()

	exp := &models.Experiment{
		Name:        "Test Store Experiment",
		Description: "Test description",
		Signature:   "test:string -> result:string",
		Input:       `{"test": "value"}`,
		Provider:    "openai",
		Model:       "gpt-4o-mini",
	}

	err := store.Create(exp)
	if err != nil {
		t.Fatalf("Create failed: %v", err)
	}

	if exp.ID == "" {
		t.Error("Create should set an ID")
	}

	if exp.Status != "pending" {
		t.Error("Create should set status to pending")
	}
}

func TestStoreGet(t *testing.T) {
	store.Init()

	// Create an experiment
	exp := &models.Experiment{
		Name:      "Get Test",
		Signature: "test:string -> result:string",
		Provider:  "openai",
		Model:     "gpt-4o-mini",
	}

	store.Create(exp)

	// Retrieve it
	retrieved, err := store.Get(exp.ID)
	if err != nil {
		t.Fatalf("Get failed: %v", err)
	}

	if retrieved.Name != exp.Name {
		t.Errorf("Expected name %s, got %s", exp.Name, retrieved.Name)
	}
}

func TestStoreGetNotFound(t *testing.T) {
	store.Init()

	_, err := store.Get("nonexistent-id")
	if err == nil {
		t.Error("Get should return error for nonexistent ID")
	}
}

func TestStoreUpdate(t *testing.T) {
	store.Init()

	// Create an experiment
	exp := &models.Experiment{
		Name:      "Update Test",
		Signature: "test:string -> result:string",
		Provider:  "openai",
		Model:     "gpt-4o-mini",
	}

	store.Create(exp)

	// Update it
	exp.Name = "Updated Name"
	err := store.Update(exp)
	if err != nil {
		t.Fatalf("Update failed: %v", err)
	}

	// Verify update
	retrieved, _ := store.Get(exp.ID)
	if retrieved.Name != "Updated Name" {
		t.Error("Update should change the experiment name")
	}
}

func TestStoreDelete(t *testing.T) {
	store.Init()

	// Create an experiment
	exp := &models.Experiment{
		Name:      "Delete Test",
		Signature: "test:string -> result:string",
		Provider:  "openai",
		Model:     "gpt-4o-mini",
	}

	store.Create(exp)

	// Delete it
	err := store.Delete(exp.ID)
	if err != nil {
		t.Fatalf("Delete failed: %v", err)
	}

	// Verify deletion
	_, err = store.Get(exp.ID)
	if err == nil {
		t.Error("Get should return error after deletion")
	}
}

func TestStoreDeleteNotFound(t *testing.T) {
	store.Init()

	err := store.Delete("nonexistent-id")
	if err == nil {
		t.Error("Delete should return error for nonexistent ID")
	}
}

func TestStoreUpdateNotFound(t *testing.T) {
	store.Init()

	exp := &models.Experiment{
		ID:        "nonexistent-id",
		Name:      "Test",
		Signature: "test:string -> result:string",
		Provider:  "openai",
		Model:     "gpt-4o-mini",
	}

	err := store.Update(exp)
	if err == nil {
		t.Error("Update should return error for nonexistent ID")
	}
}

func TestStoreConcurrency(t *testing.T) {
	store.Init()

	// Test concurrent reads and writes
	done := make(chan bool)

	// Concurrent reads
	for i := 0; i < 10; i++ {
		go func() {
			_, _ = store.GetAll()
			done <- true
		}()
	}

	// Concurrent writes
	for i := 0; i < 5; i++ {
		go func(n int) {
			exp := &models.Experiment{
				Name:      "Concurrent Test",
				Signature: "test:string -> result:string",
				Provider:  "openai",
				Model:     "gpt-4o-mini",
			}
			_ = store.Create(exp)
			done <- true
		}(i)
	}

	// Wait for all goroutines
	for i := 0; i < 15; i++ {
		<-done
	}

	// Verify no data corruption
	experiments, _ := store.GetAll()
	if len(experiments) < 5 {
		t.Error("Concurrent writes should have created at least 5 experiments")
	}
}
