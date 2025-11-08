package models

import "time"

// Experiment represents an Ax framework experiment with signature and execution
type Experiment struct {
	ID          string    `json:"id"`
	Name        string    `json:"name"`
	Description string    `json:"description"`
	Signature   string    `json:"signature"` // Ax signature string
	Input       string    `json:"input"`     // JSON input for the signature
	Output      string    `json:"output"`    // Output from execution
	Status      string    `json:"status"`    // pending, running, completed, error
	Error       string    `json:"error,omitempty"`
	CreatedAt   time.Time `json:"created_at"`
	UpdatedAt   time.Time `json:"updated_at"`
	Provider    string    `json:"provider"`    // AI provider (openai, anthropic, etc)
	Model       string    `json:"model"`       // Model name
}

// Cell represents a single cell in the notebook-style interface
type Cell struct {
	ID        string    `json:"id"`
	Type      string    `json:"type"` // signature, markdown
	Content   string    `json:"content"`
	Output    string    `json:"output,omitempty"`
	Status    string    `json:"status"` // idle, running, completed, error
	Order     int       `json:"order"`
	CreatedAt time.Time `json:"created_at"`
}
