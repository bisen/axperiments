package handlers

import (
	"html/template"
	"net/http"

	"github.com/bisen/axperiments/models"
	"github.com/bisen/axperiments/store"
	"github.com/go-chi/chi/v5"
)

var tmpl *template.Template

// SetTemplates sets the template instance
func SetTemplates(t *template.Template) {
	tmpl = t
}

// Home renders the main experiments page
func Home(w http.ResponseWriter, r *http.Request) {
	experiments, err := store.GetAll()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	data := struct {
		Title       string
		Experiments []*models.Experiment
	}{
		Title:       "Ax Experiments",
		Experiments: experiments,
	}

	tmpl.ExecuteTemplate(w, "pages/home.html", data)
}

// ListExperiments renders the full experiments list page
func ListExperiments(w http.ResponseWriter, r *http.Request) {
	experiments, err := store.GetAll()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	data := struct {
		Title       string
		Experiments []*models.Experiment
	}{
		Title:       "Experiments",
		Experiments: experiments,
	}

	tmpl.ExecuteTemplate(w, "pages/experiments.html", data)
}

// ViewExperiment renders a single experiment page
func ViewExperiment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	exp, err := store.Get(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	data := struct {
		Title      string
		Experiment *models.Experiment
	}{
		Title:      exp.Name,
		Experiment: exp,
	}

	tmpl.ExecuteTemplate(w, "pages/experiment.html", data)
}

// PartialListExperiments returns just the experiments list partial
func PartialListExperiments(w http.ResponseWriter, r *http.Request) {
	experiments, err := store.GetAll()
	if err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	tmpl.ExecuteTemplate(w, "partials/experiment-list.html", experiments)
}

// PartialNewExperiment returns the new experiment form
func PartialNewExperiment(w http.ResponseWriter, r *http.Request) {
	tmpl.ExecuteTemplate(w, "partials/experiment-new.html", nil)
}

// PartialViewExperiment returns a single experiment partial
func PartialViewExperiment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	exp, err := store.Get(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	tmpl.ExecuteTemplate(w, "partials/experiment-view.html", exp)
}

// PartialEditExperiment returns the edit form partial
func PartialEditExperiment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	exp, err := store.Get(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	tmpl.ExecuteTemplate(w, "partials/experiment-edit.html", exp)
}

// PartialCreateExperiment creates a new experiment and returns the partial
func PartialCreateExperiment(w http.ResponseWriter, r *http.Request) {
	exp := &models.Experiment{
		Name:        r.FormValue("name"),
		Description: r.FormValue("description"),
		Signature:   r.FormValue("signature"),
		Input:       r.FormValue("input"),
		Provider:    r.FormValue("provider"),
		Model:       r.FormValue("model"),
		Status:      "pending",
	}

	if err := store.Create(exp); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	// Return the updated list
	experiments, _ := store.GetAll()
	tmpl.ExecuteTemplate(w, "partials/experiment-list.html", experiments)
}

// PartialUpdateExperiment updates an experiment and returns the updated view
func PartialUpdateExperiment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	exp, err := store.Get(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	exp.Name = r.FormValue("name")
	exp.Description = r.FormValue("description")
	exp.Signature = r.FormValue("signature")
	exp.Input = r.FormValue("input")
	exp.Provider = r.FormValue("provider")
	exp.Model = r.FormValue("model")

	if err := store.Update(exp); err != nil {
		http.Error(w, err.Error(), http.StatusBadRequest)
		return
	}

	tmpl.ExecuteTemplate(w, "partials/experiment-view.html", exp)
}

// PartialDeleteExperiment deletes an experiment
func PartialDeleteExperiment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	if err := store.Delete(id); err != nil {
		http.Error(w, err.Error(), http.StatusInternalServerError)
		return
	}

	w.WriteHeader(http.StatusOK)
}

// PartialExecuteExperiment executes an Ax signature (placeholder for now)
func PartialExecuteExperiment(w http.ResponseWriter, r *http.Request) {
	id := chi.URLParam(r, "id")

	exp, err := store.Get(id)
	if err != nil {
		http.Error(w, err.Error(), http.StatusNotFound)
		return
	}

	// TODO: Actual Ax execution would go here
	// For now, just mark as running then completed
	exp.Status = "running"
	store.Update(exp)

	// Simulate execution
	exp.Status = "completed"
	exp.Output = `{"sentiment": "positive", "confidence": 0.95}`
	store.Update(exp)

	tmpl.ExecuteTemplate(w, "partials/experiment-view.html", exp)
}
