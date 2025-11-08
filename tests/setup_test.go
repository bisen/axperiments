package tests

import (
	"html/template"
	"io/fs"
	"os"
	"path/filepath"
	"testing"

	"github.com/bisen/axperiments/handlers"
)

// TestMain sets up the test environment
func TestMain(m *testing.M) {
	// Initialize templates for testing
	// Collect all template files first
	var files []string

	templateDir := "../templates"
	err := filepath.Walk(templateDir, func(path string, info fs.FileInfo, err error) error {
		if err != nil {
			return err
		}

		if !info.IsDir() && filepath.Ext(path) == ".html" {
			files = append(files, path)
		}

		return nil
	})

	if err != nil {
		panic("Failed to find templates: " + err.Error())
	}

	// Parse all templates together so they can reference each other
	tmpl, err := template.ParseFiles(files...)
	if err != nil {
		panic("Failed to parse templates: " + err.Error())
	}

	// Create aliases with path-based names (e.g., "pages/home.html")
	// so handlers can reference them consistently
	for _, path := range files {
		relPath, _ := filepath.Rel(templateDir, path)
		relPath = filepath.ToSlash(relPath)

		// Get the actual parsed template by filename
		filename := filepath.Base(path)
		t := tmpl.Lookup(filename)
		if t != nil {
			// Clone it with the path-based name
			tmpl.AddParseTree(relPath, t.Tree)
		}
	}

	handlers.SetTemplates(tmpl)

	// Run tests
	code := m.Run()

	os.Exit(code)
}
