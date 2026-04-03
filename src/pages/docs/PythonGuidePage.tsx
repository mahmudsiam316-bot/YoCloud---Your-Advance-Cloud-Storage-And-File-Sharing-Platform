import { useState, useEffect } from "react";
import { Check, AlertTriangle, FolderPlus, Play, Package, Shield, Server, Database } from "lucide-react";
import DocsLayout, { CodeBlock, useDocsContext } from "@/components/docs/DocsLayout";
import pythonIcon from "@/assets/python-icon.png";

const SECTION_IDS = [
  "python-overview", "python-setup-django", "python-env", "python-client",
  "python-django-views", "python-django-urls", "python-django-templates",
  "python-flask-setup", "python-flask-routes", "python-flask-upload",
  "python-error-handling", "python-run", "python-structure", "python-tips"
];

export default function PythonGuidePage() {
  const [activeSection, setActiveSection] = useState("python-overview");

  useEffect(() => {
    const observer = new IntersectionObserver(
      entries => { for (const e of entries) if (e.isIntersecting) setActiveSection(e.target.id); },
      { rootMargin: "-80px 0px -60% 0px", threshold: 0.1 }
    );
    SECTION_IDS.forEach(id => { const el = document.getElementById(id); if (el) observer.observe(el); });
    return () => observer.disconnect();
  }, []);

  return (
    <DocsLayout sectionIds={SECTION_IDS} activeSection={activeSection} onSectionChange={setActiveSection}>
      <Content />
    </DocsLayout>
  );
}

function Content() {
  const { selectedLang, showApiKey, setShowApiKey, activeKey, apiKeyDisplay, baseUrl, rawKeyAvailable } = useDocsContext();
  const codeProps = { showApiKey, onToggleKey: () => setShowApiKey(!showApiKey), hasKey: !!activeKey, baseUrl, apiKey: apiKeyDisplay, rawKeyAvailable };

  return (
    <>
      {/* Overview */}
      <section id="python-overview">
        <div className="flex items-center gap-3 mb-3">
          <img src={pythonIcon} alt="Python" className="w-8 h-8 rounded-lg" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Python (Django/Flask) Integration Guide</h2>
            <p className="text-xs text-muted-foreground">Complete guide to integrate YoCloud API with Django & Flask</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          This guide covers two popular Python web frameworks — <strong>Django</strong> and <strong>Flask</strong>. 
          You'll learn how to set up your project, create a reusable API client, build views/routes for listing and uploading files, 
          handle errors gracefully, and run everything locally. Both frameworks connect to the same YoCloud REST API, 
          so the core HTTP logic is shared — only the routing and template patterns differ.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Server, title: "Django", desc: "Batteries-included framework with ORM, admin panel, and template engine." },
            { icon: Package, title: "Flask", desc: "Lightweight micro-framework — flexible, minimal, easy to extend." },
            { icon: Shield, title: "Secure Keys", desc: "API keys stay on the server — never exposed to the browser." },
          ].map(item => (
            <div key={item.title} className="p-3 rounded-xl border border-border bg-card">
              <item.icon className="w-5 h-5 text-primary mb-2" />
              <p className="text-xs font-bold text-foreground">{item.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Django Setup */}
      <section id="python-setup-django" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <FolderPlus className="w-5 h-5 text-primary" /> 1. Django Project Setup
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Start by creating a new Django project. We'll use a virtual environment to keep dependencies isolated, 
          then install Django and the <code className="text-xs bg-secondary px-1 py-0.5 rounded">requests</code> library for HTTP calls.
        </p>
        <CodeBlock lang="bash" code={`# Create project directory and virtual environment
mkdir yocloud-django && cd yocloud-django
python3 -m venv venv
source venv/bin/activate   # Windows: venv\\Scripts\\activate

# Install dependencies
pip install django requests python-dotenv

# Create Django project and app
django-admin startproject config .
python manage.py startapp files

# Add 'files' to INSTALLED_APPS in config/settings.py
# INSTALLED_APPS = [ ..., 'files', ]`} {...codeProps} />
      </section>

      {/* Environment Variables */}
      <section id="python-env" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> 2. Environment Variables
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Store your API key securely in a <code className="text-xs bg-secondary px-1 py-0.5 rounded">.env</code> file at the project root. 
          Never commit this file to version control — add it to <code className="text-xs bg-secondary px-1 py-0.5 rounded">.gitignore</code>. 
          Both Django and Flask will read from this same file.
        </p>
        <CodeBlock lang="bash" code={`# .env
YOCLOUD_API_KEY={{API_KEY}}
YOCLOUD_BASE_URL={{BASE_URL}}`} {...codeProps} />
        <div className="mt-3 p-3 rounded-xl border border-border bg-card">
          <p className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Security Note
          </p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Your API key is a <strong>server-side secret</strong>. It should never be included in client-side JavaScript, 
            HTML templates, or API responses. Always keep it in environment variables and access it only from your Python backend code.
          </p>
        </div>
      </section>

      {/* Shared API Client */}
      <section id="python-client" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" /> 3. Shared API Client
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Create a reusable API client module that both Django views and Flask routes can import. 
          This centralizes authentication, error handling, and base URL configuration in one place. 
          Any change to the API integration only needs to be made once.
        </p>
        <CodeBlock lang="python" code={`# yocloud_client.py — Shared API Client
import os
import requests
from dotenv import load_dotenv

load_dotenv()

class YoCloudClient:
    """Reusable client for YoCloud REST API."""
    
    def __init__(self):
        self.base_url = os.getenv("YOCLOUD_BASE_URL", "{{BASE_URL}}")
        self.api_key = os.getenv("YOCLOUD_API_KEY", "{{API_KEY}}")
        self.session = requests.Session()
        self.session.headers.update({
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json",
        })
    
    def _request(self, method, endpoint, **kwargs):
        """Make an authenticated request with error handling."""
        url = f"{self.base_url}{endpoint}"
        try:
            response = self.session.request(method, url, **kwargs)
            response.raise_for_status()
            return response.json()
        except requests.exceptions.HTTPError as e:
            error_body = e.response.json() if e.response else {}
            raise YoCloudError(
                status=e.response.status_code if e.response else 500,
                message=error_body.get("error", str(e)),
            )
        except requests.exceptions.ConnectionError:
            raise YoCloudError(status=503, message="Cannot reach YoCloud API")
    
    # ─── Files ────────────────────────────────────────────
    def list_files(self, folder_id=None, page=1, limit=20):
        params = {"page": page, "limit": limit}
        if folder_id:
            params["folder_id"] = folder_id
        return self._request("GET", "/files", params=params)
    
    def get_file(self, file_id):
        return self._request("GET", f"/files/{file_id}")
    
    def upload_file(self, file_path, folder_id=None):
        with open(file_path, "rb") as f:
            files = {"file": f}
            data = {}
            if folder_id:
                data["folder_id"] = folder_id
            # Remove Content-Type for multipart
            headers = {"Authorization": f"Bearer {self.api_key}"}
            url = f"{self.base_url}/files"
            resp = requests.post(url, headers=headers, files=files, data=data)
            resp.raise_for_status()
            return resp.json()
    
    def delete_file(self, file_id):
        return self._request("DELETE", f"/files/{file_id}")
    
    # ─── Folders ──────────────────────────────────────────
    def create_folder(self, name, parent_id=None):
        body = {"name": name}
        if parent_id:
            body["parent_id"] = parent_id
        return self._request("POST", "/folders", json=body)
    
    # ─── Shares ───────────────────────────────────────────
    def list_shares(self):
        return self._request("GET", "/shares")
    
    def create_share(self, file_id, access_type="public", expires_in=None):
        body = {"file_id": file_id, "access_type": access_type}
        if expires_in:
            body["expires_in"] = expires_in
        return self._request("POST", "/shares", json=body)
    
    # ─── Tags ─────────────────────────────────────────────
    def list_tags(self):
        return self._request("GET", "/tags")
    
    def create_tag(self, name, color="#3B82F6"):
        return self._request("POST", "/tags", json={"name": name, "color": color})
    
    # ─── Usage ────────────────────────────────────────────
    def get_usage(self):
        return self._request("GET", "/usage")


class YoCloudError(Exception):
    """Custom exception for YoCloud API errors."""
    def __init__(self, status, message):
        self.status = status
        self.message = message
        super().__init__(f"[{status}] {message}")


# Singleton instance
client = YoCloudClient()`} {...codeProps} />
      </section>

      {/* Django Views */}
      <section id="python-django-views" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" /> 4. Django Views
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Create views in your <code className="text-xs bg-secondary px-1 py-0.5 rounded">files/views.py</code> that use the shared client. 
          Each view handles a specific operation — listing files, uploading, deleting. 
          Django's class-based views or function views both work; we'll use function views for clarity.
        </p>
        <CodeBlock lang="python" code={`# files/views.py
from django.shortcuts import render, redirect
from django.http import JsonResponse
from django.views.decorators.http import require_http_methods
from django.contrib import messages
from yocloud_client import client, YoCloudError


def file_list(request):
    """List all files with pagination."""
    page = int(request.GET.get("page", 1))
    folder_id = request.GET.get("folder_id")
    
    try:
        result = client.list_files(folder_id=folder_id, page=page)
        return render(request, "files/list.html", {
            "files": result.get("data", []),
            "total": result.get("total", 0),
            "page": page,
            "has_next": result.get("has_next", False),
        })
    except YoCloudError as e:
        messages.error(request, f"Failed to load files: {e.message}")
        return render(request, "files/list.html", {"files": [], "error": str(e)})


@require_http_methods(["POST"])
def file_upload(request):
    """Handle file upload via form submission."""
    uploaded = request.FILES.get("file")
    folder_id = request.POST.get("folder_id")
    
    if not uploaded:
        messages.error(request, "No file selected.")
        return redirect("file_list")
    
    # Save temp file
    import tempfile, os
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f"_{uploaded.name}")
    for chunk in uploaded.chunks():
        tmp.write(chunk)
    tmp.close()
    
    try:
        result = client.upload_file(tmp.name, folder_id=folder_id)
        messages.success(request, f"Uploaded: {result.get('name', uploaded.name)}")
    except YoCloudError as e:
        messages.error(request, f"Upload failed: {e.message}")
    finally:
        os.unlink(tmp.name)
    
    return redirect("file_list")


@require_http_methods(["POST"])
def file_delete(request, file_id):
    """Delete a file by ID."""
    try:
        client.delete_file(file_id)
        messages.success(request, "File deleted successfully.")
    except YoCloudError as e:
        messages.error(request, f"Delete failed: {e.message}")
    return redirect("file_list")


def usage_stats(request):
    """Display API usage statistics."""
    try:
        usage = client.get_usage()
        return render(request, "files/usage.html", {"usage": usage})
    except YoCloudError as e:
        messages.error(request, f"Could not load usage: {e.message}")
        return render(request, "files/usage.html", {"usage": {}})`} {...codeProps} />
      </section>

      {/* Django URLs */}
      <section id="python-django-urls" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <FolderPlus className="w-5 h-5 text-primary" /> 5. Django URL Configuration
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Wire up the views to URL patterns. Include these in your project's main <code className="text-xs bg-secondary px-1 py-0.5 rounded">urls.py</code> 
          or keep them in the app's <code className="text-xs bg-secondary px-1 py-0.5 rounded">files/urls.py</code> and include from the project level.
        </p>
        <CodeBlock lang="python" code={`# files/urls.py
from django.urls import path
from . import views

urlpatterns = [
    path("", views.file_list, name="file_list"),
    path("upload/", views.file_upload, name="file_upload"),
    path("delete/<str:file_id>/", views.file_delete, name="file_delete"),
    path("usage/", views.usage_stats, name="usage_stats"),
]

# config/urls.py
from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path("admin/", admin.site.urls),
    path("files/", include("files.urls")),
]`} {...codeProps} />
      </section>

      {/* Django Templates */}
      <section id="python-django-templates" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" /> 6. Django Templates
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Create HTML templates that render file data. Django's template engine lets you loop through files, 
          display messages, and build forms — all server-rendered for fast initial loads.
        </p>
        <CodeBlock lang="python" code={`<!-- files/templates/files/list.html -->
<!DOCTYPE html>
<html>
<head><title>My Files — YoCloud</title></head>
<body>
  <h1>My Files ({{ total }} total)</h1>
  
  {% if messages %}
    {% for msg in messages %}
      <div class="alert alert-{{ msg.tags }}">{{ msg }}</div>
    {% endfor %}
  {% endif %}
  
  <!-- Upload Form -->
  <form method="POST" action="{% url 'file_upload' %}" enctype="multipart/form-data">
    {% csrf_token %}
    <input type="file" name="file" required />
    <button type="submit">Upload File</button>
  </form>
  
  <!-- File List -->
  <table>
    <thead>
      <tr>
        <th>Name</th>
        <th>Size</th>
        <th>Type</th>
        <th>Created</th>
        <th>Actions</th>
      </tr>
    </thead>
    <tbody>
      {% for file in files %}
      <tr>
        <td>{{ file.name }}</td>
        <td>{{ file.size|filesizeformat }}</td>
        <td>{{ file.mime_type }}</td>
        <td>{{ file.created_at }}</td>
        <td>
          <form method="POST" action="{% url 'file_delete' file.id %}">
            {% csrf_token %}
            <button type="submit" onclick="return confirm('Delete?')">
              Delete
            </button>
          </form>
        </td>
      </tr>
      {% empty %}
      <tr><td colspan="5">No files yet. Upload one above!</td></tr>
      {% endfor %}
    </tbody>
  </table>
  
  <!-- Pagination -->
  {% if has_next %}
    <a href="?page={{ page|add:1 }}">Next Page →</a>
  {% endif %}
</body>
</html>`} {...codeProps} />
      </section>

      {/* Flask Setup */}
      <section id="python-flask-setup" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" /> 7. Flask Project Setup
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Flask is a lighter alternative — perfect for APIs, microservices, or smaller projects. 
          The setup is minimal: create a virtual environment, install Flask and requests, then create your app file.
        </p>
        <CodeBlock lang="bash" code={`# Create project directory and virtual environment
mkdir yocloud-flask && cd yocloud-flask
python3 -m venv venv
source venv/bin/activate

# Install dependencies
pip install flask requests python-dotenv

# Create project structure
mkdir templates static
touch app.py yocloud_client.py .env

# Your .env file (same as Django)
# YOCLOUD_API_KEY={{API_KEY}}
# YOCLOUD_BASE_URL={{BASE_URL}}`} {...codeProps} />
      </section>

      {/* Flask Routes */}
      <section id="python-flask-routes" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" /> 8. Flask Routes
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Define your Flask routes using the same shared API client. Flask's decorator-based routing 
          is concise and easy to read. Each route maps directly to a YoCloud API operation.
        </p>
        <CodeBlock lang="python" code={`# app.py — Flask Application
from flask import Flask, render_template, request, redirect, url_for, flash, jsonify
from yocloud_client import client, YoCloudError
import tempfile
import os

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET", "dev-secret-key")


@app.route("/")
def file_list():
    """List all files with pagination."""
    page = int(request.args.get("page", 1))
    folder_id = request.args.get("folder_id")
    
    try:
        result = client.list_files(folder_id=folder_id, page=page)
        return render_template("list.html",
            files=result.get("data", []),
            total=result.get("total", 0),
            page=page,
            has_next=result.get("has_next", False),
        )
    except YoCloudError as e:
        flash(f"Error: {e.message}", "error")
        return render_template("list.html", files=[], total=0, page=1)


@app.route("/upload", methods=["POST"])
def file_upload():
    """Handle file upload."""
    uploaded = request.files.get("file")
    folder_id = request.form.get("folder_id")
    
    if not uploaded or uploaded.filename == "":
        flash("No file selected.", "error")
        return redirect(url_for("file_list"))
    
    # Save to temp file
    tmp = tempfile.NamedTemporaryFile(delete=False, suffix=f"_{uploaded.filename}")
    uploaded.save(tmp.name)
    
    try:
        result = client.upload_file(tmp.name, folder_id=folder_id)
        flash(f"Uploaded: {result.get('name', uploaded.filename)}", "success")
    except YoCloudError as e:
        flash(f"Upload failed: {e.message}", "error")
    finally:
        os.unlink(tmp.name)
    
    return redirect(url_for("file_list"))


@app.route("/delete/<file_id>", methods=["POST"])
def file_delete(file_id):
    """Delete a file."""
    try:
        client.delete_file(file_id)
        flash("File deleted.", "success")
    except YoCloudError as e:
        flash(f"Delete failed: {e.message}", "error")
    return redirect(url_for("file_list"))


@app.route("/shares")
def list_shares():
    """List all shared links."""
    try:
        shares = client.list_shares()
        return render_template("shares.html", shares=shares.get("data", []))
    except YoCloudError as e:
        flash(f"Error: {e.message}", "error")
        return render_template("shares.html", shares=[])


@app.route("/tags")
def list_tags():
    """List all tags."""
    try:
        tags = client.list_tags()
        return render_template("tags.html", tags=tags.get("data", []))
    except YoCloudError as e:
        flash(f"Error: {e.message}", "error")
        return render_template("tags.html", tags=[])


@app.route("/usage")
def usage_stats():
    """Show API usage statistics."""
    try:
        usage = client.get_usage()
        return render_template("usage.html", usage=usage)
    except YoCloudError as e:
        flash(f"Error: {e.message}", "error")
        return render_template("usage.html", usage={})


# ─── JSON API Endpoints ──────────────────────────────────
@app.route("/api/files")
def api_files():
    """JSON endpoint for SPA frontends."""
    try:
        result = client.list_files(
            page=int(request.args.get("page", 1)),
            limit=int(request.args.get("limit", 20)),
        )
        return jsonify(result)
    except YoCloudError as e:
        return jsonify({"error": e.message}), e.status


if __name__ == "__main__":
    app.run(debug=True, port=5000)`} {...codeProps} />
      </section>

      {/* Flask Upload with Progress */}
      <section id="python-flask-upload" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" /> 9. Flask Templates
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Flask uses Jinja2 templates — very similar to Django's template engine. Create a base layout 
          and extend it for each page. Here's a complete file listing template with upload form.
        </p>
        <CodeBlock lang="python" code={`<!-- templates/base.html -->
<!DOCTYPE html>
<html>
<head>
  <title>{% block title %}YoCloud{% endblock %}</title>
  <style>
    body { font-family: system-ui, sans-serif; max-width: 900px; margin: 0 auto; padding: 20px; }
    .flash { padding: 10px; margin: 10px 0; border-radius: 6px; }
    .flash.success { background: #d1fae5; color: #065f46; }
    .flash.error { background: #fee2e2; color: #991b1b; }
    table { width: 100%; border-collapse: collapse; }
    th, td { text-align: left; padding: 8px; border-bottom: 1px solid #e5e7eb; }
    button { padding: 6px 12px; border-radius: 6px; border: 1px solid #d1d5db; cursor: pointer; }
    button:hover { background: #f3f4f6; }
    .btn-primary { background: #3b82f6; color: white; border: none; }
    .btn-danger { background: #ef4444; color: white; border: none; }
  </style>
</head>
<body>
  <nav>
    <a href="{{ url_for('file_list') }}">Files</a> |
    <a href="{{ url_for('list_shares') }}">Shares</a> |
    <a href="{{ url_for('list_tags') }}">Tags</a> |
    <a href="{{ url_for('usage_stats') }}">Usage</a>
  </nav>
  
  {% with messages = get_flashed_messages(with_categories=true) %}
    {% for category, msg in messages %}
      <div class="flash {{ category }}">{{ msg }}</div>
    {% endfor %}
  {% endwith %}
  
  {% block content %}{% endblock %}
</body>
</html>

<!-- templates/list.html -->
{% extends "base.html" %}
{% block title %}My Files{% endblock %}
{% block content %}
  <h1>My Files ({{ total }} total)</h1>
  
  <form method="POST" action="{{ url_for('file_upload') }}" enctype="multipart/form-data">
    <input type="file" name="file" required />
    <button type="submit" class="btn-primary">Upload</button>
  </form>
  
  <table>
    <thead>
      <tr><th>Name</th><th>Size</th><th>Type</th><th>Actions</th></tr>
    </thead>
    <tbody>
      {% for file in files %}
      <tr>
        <td>{{ file.name }}</td>
        <td>{{ file.size }}</td>
        <td>{{ file.mime_type }}</td>
        <td>
          <form method="POST" action="{{ url_for('file_delete', file_id=file.id) }}" style="display:inline">
            <button type="submit" class="btn-danger" onclick="return confirm('Delete?')">Delete</button>
          </form>
        </td>
      </tr>
      {% else %}
      <tr><td colspan="4">No files yet.</td></tr>
      {% endfor %}
    </tbody>
  </table>
  
  {% if has_next %}
    <a href="?page={{ page + 1 }}">Next Page →</a>
  {% endif %}
{% endblock %}`} {...codeProps} />
      </section>

      {/* Error Handling */}
      <section id="python-error-handling" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" /> 10. Error Handling & Retry Logic
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Production applications need robust error handling. Here's a decorator for automatic retries 
          on transient failures, plus middleware patterns for both Django and Flask.
        </p>
        <CodeBlock lang="python" code={`# utils.py — Retry decorator & error helpers
import time
import functools
from yocloud_client import YoCloudError


def retry_on_failure(max_retries=3, delay=1.0, backoff=2.0):
    """Retry decorator for transient API failures."""
    def decorator(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            last_error = None
            for attempt in range(max_retries):
                try:
                    return func(*args, **kwargs)
                except YoCloudError as e:
                    last_error = e
                    # Don't retry client errors (4xx)
                    if 400 <= e.status < 500:
                        raise
                    # Wait before retrying server errors (5xx)
                    if attempt < max_retries - 1:
                        time.sleep(delay * (backoff ** attempt))
            raise last_error
        return wrapper
    return decorator


# Usage example:
@retry_on_failure(max_retries=3)
def safe_list_files(folder_id=None):
    from yocloud_client import client
    return client.list_files(folder_id=folder_id)


# ─── Django Middleware ────────────────────────────────────
# files/middleware.py
class YoCloudErrorMiddleware:
    """Catch YoCloudError and render friendly error pages."""
    def __init__(self, get_response):
        self.get_response = get_response
    
    def __call__(self, request):
        return self.get_response(request)
    
    def process_exception(self, request, exception):
        if isinstance(exception, YoCloudError):
            from django.shortcuts import render
            return render(request, "files/error.html", {
                "status": exception.status,
                "message": exception.message,
            }, status=exception.status)
        return None


# ─── Flask Error Handler ─────────────────────────────────
# In app.py:
# @app.errorhandler(YoCloudError)
# def handle_yocloud_error(e):
#     return render_template("error.html",
#         status=e.status, message=e.message), e.status`} {...codeProps} />
      </section>

      {/* Run */}
      <section id="python-run" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" /> 11. Running the Server
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Start your development server and test the integration. Both frameworks provide hot-reload in development mode.
        </p>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold text-foreground mb-1.5">Django:</p>
            <CodeBlock lang="bash" code={`# Apply migrations (if using Django models)
python manage.py migrate

# Run development server
python manage.py runserver

# Server starts at http://127.0.0.1:8000/
# Visit http://127.0.0.1:8000/files/ to see your files`} {...codeProps} />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground mb-1.5">Flask:</p>
            <CodeBlock lang="bash" code={`# Run Flask development server
python app.py

# Or use the Flask CLI:
export FLASK_APP=app.py
export FLASK_DEBUG=1
flask run --port 5000

# Server starts at http://127.0.0.1:5000/`} {...codeProps} />
          </div>
        </div>
      </section>

      {/* Project Structure */}
      <section id="python-structure" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <FolderPlus className="w-5 h-5 text-primary" /> 12. Project Structure
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Here's the recommended file structure for both frameworks after completing the setup.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-bold text-foreground mb-1.5">Django:</p>
            <CodeBlock lang="bash" code={`yocloud-django/
├── config/
│   ├── __init__.py
│   ├── settings.py
│   ├── urls.py
│   └── wsgi.py
├── files/
│   ├── __init__.py
│   ├── views.py
│   ├── urls.py
│   ├── middleware.py
│   └── templates/
│       └── files/
│           ├── list.html
│           ├── usage.html
│           └── error.html
├── yocloud_client.py
├── utils.py
├── .env
├── manage.py
└── requirements.txt`} {...codeProps} />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground mb-1.5">Flask:</p>
            <CodeBlock lang="bash" code={`yocloud-flask/
├── app.py
├── yocloud_client.py
├── utils.py
├── .env
├── requirements.txt
├── templates/
│   ├── base.html
│   ├── list.html
│   ├── shares.html
│   ├── tags.html
│   ├── usage.html
│   └── error.html
└── static/
    ├── css/
    └── js/`} {...codeProps} />
          </div>
        </div>
      </section>

      {/* Tips */}
      <section id="python-tips" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-500" /> 13. Production Tips
        </h3>
        <div className="space-y-2">
          {[
            { title: "Use Gunicorn / uWSGI in production", desc: "Django's runserver and Flask's built-in server are for development only. Deploy with Gunicorn: gunicorn config.wsgi:application --bind 0.0.0.0:8000" },
            { title: "Cache API responses", desc: "Use Django's cache framework or Flask-Caching to reduce API calls. Cache file listings for 30-60 seconds." },
            { title: "Rate limit awareness", desc: "YoCloud allows 100 requests/minute. Implement request queuing or debouncing for high-traffic apps." },
            { title: "Use requirements.txt", desc: "Pin your dependencies: pip freeze > requirements.txt. This ensures reproducible builds." },
            { title: "Environment management", desc: "Use python-dotenv for local dev, and your hosting platform's env config for production (Heroku, Railway, etc.)." },
            { title: "Logging", desc: "Configure Python's logging module to track API calls, errors, and response times for debugging." },
            { title: "Type hints", desc: "Add type annotations to your client methods for better IDE support and fewer runtime errors." },
          ].map(tip => (
            <div key={tip.title} className="flex gap-2 p-2.5 rounded-lg border border-border bg-card">
              <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
              <div>
                <p className="text-xs font-bold text-foreground">{tip.title}</p>
                <p className="text-[10px] text-muted-foreground mt-0.5">{tip.desc}</p>
              </div>
            </div>
          ))}
        </div>
      </section>
    </>
  );
}
