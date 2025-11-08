package main

import (
	"embed"
	"html/template"
	"log"
	"net/http"

	"github.com/bisen/axperiments/handlers"
	"github.com/bisen/axperiments/store"
	"github.com/go-chi/chi/v5"
	"github.com/go-chi/chi/v5/middleware"
)

//go:embed templates/* static/*
var content embed.FS

var tmpl *template.Template

func main() {
	// Initialize templates
	var err error
	tmpl, err = template.ParseFS(content, "templates/**/*.html")
	if err != nil {
		log.Fatal("Failed to parse templates:", err)
	}

	// Initialize store
	store.Init()

	// Initialize handlers with templates
	handlers.SetTemplates(tmpl)

	// Setup router
	r := chi.NewRouter()

	// Middleware
	r.Use(middleware.Logger)
	r.Use(middleware.Recoverer)
	r.Use(MethodOverride)

	// Static files
	r.Handle("/static/*", http.FileServer(http.FS(content)))

	// Full page routes
	r.Get("/", handlers.Home)
	r.Get("/experiments", handlers.ListExperiments)
	r.Get("/experiments/{id}", handlers.ViewExperiment)

	// Partials routes for AJAX
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

	log.Println("Server starting on :3000")
	log.Fatal(http.ListenAndServe(":3000", r))
}

// MethodOverride middleware handles _method hidden field for PUT/DELETE
func MethodOverride(next http.Handler) http.Handler {
	return http.HandlerFunc(func(w http.ResponseWriter, r *http.Request) {
		if r.Method == "POST" {
			method := r.FormValue("_method")
			if method == "PUT" || method == "DELETE" || method == "PATCH" {
				r.Method = method
			}
		}
		next.ServeHTTP(w, r)
	})
}
