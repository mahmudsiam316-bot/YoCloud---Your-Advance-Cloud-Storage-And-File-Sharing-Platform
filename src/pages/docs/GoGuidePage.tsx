import { useState, useEffect } from "react";
import { Check, AlertTriangle, FolderPlus, Play, Package, Shield, Server, Database } from "lucide-react";
import DocsLayout, { CodeBlock, useDocsContext } from "@/components/docs/DocsLayout";
import goIcon from "@/assets/go-icon.png";

const SECTION_IDS = [
  "go-overview", "go-setup-gin", "go-env", "go-client",
  "go-gin-handlers", "go-gin-routes", "go-gin-middleware",
  "go-fiber-setup", "go-fiber-handlers", "go-fiber-upload",
  "go-error-handling", "go-run", "go-structure", "go-tips"
];

export default function GoGuidePage() {
  const [activeSection, setActiveSection] = useState("go-overview");

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
      <section id="go-overview">
        <div className="flex items-center gap-3 mb-3">
          <img src={goIcon} alt="Go" className="w-8 h-8 rounded-lg" />
          <div>
            <h2 className="text-xl md:text-2xl font-bold text-foreground">Go (Gin/Fiber) Integration Guide</h2>
            <p className="text-xs text-muted-foreground">Complete guide to integrate YoCloud API with Gin & Fiber</p>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-4">
          This guide covers two popular Go web frameworks — <strong>Gin</strong> (the most widely used) and <strong>Fiber</strong> (Express-inspired, built on Fasthttp).
          You'll learn how to initialize a Go module, create a reusable HTTP client for YoCloud, build route handlers for file operations,
          implement middleware for error handling and logging, and deploy your application. Go's compiled nature makes it
          exceptionally fast — perfect for high-throughput API proxies and backend services.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { icon: Server, title: "Gin", desc: "Most popular Go framework. Fast, middleware-driven, great community and docs." },
            { icon: Package, title: "Fiber", desc: "Express-inspired framework built on Fasthttp — ultra-low latency." },
            { icon: Shield, title: "Type-Safe", desc: "Go's static typing catches errors at compile time — no runtime surprises." },
          ].map(item => (
            <div key={item.title} className="p-3 rounded-xl border border-border bg-card">
              <item.icon className="w-5 h-5 text-primary mb-2" />
              <p className="text-xs font-bold text-foreground">{item.title}</p>
              <p className="text-[10px] text-muted-foreground mt-0.5">{item.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Gin Setup */}
      <section id="go-setup-gin" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <FolderPlus className="w-5 h-5 text-primary" /> 1. Gin Project Setup
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Initialize a new Go module and install Gin along with the required dependencies.
          Go modules handle dependency management automatically — no separate package manager needed.
        </p>
        <CodeBlock lang="bash" code={`# Create project directory
mkdir yocloud-gin && cd yocloud-gin

# Initialize Go module
go mod init github.com/yourname/yocloud-gin

# Install dependencies
go get github.com/gin-gonic/gin
go get github.com/joho/godotenv

# Create project structure
mkdir -p handlers middleware models
touch main.go client.go .env

# Project layout:
# ├── main.go          # Entry point & router
# ├── client.go        # YoCloud API client
# ├── .env             # API credentials
# ├── handlers/        # Route handlers
# ├── middleware/       # Custom middleware
# └── models/          # Data structures`} {...codeProps} />
      </section>

      {/* Environment Variables */}
      <section id="go-env" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> 2. Environment Variables
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Store credentials in a <code className="text-xs bg-secondary px-1 py-0.5 rounded">.env</code> file.
          The <code className="text-xs bg-secondary px-1 py-0.5 rounded">godotenv</code> package loads these at startup.
          In production, use your platform's native env config instead.
        </p>
        <CodeBlock lang="bash" code={`# .env
YOCLOUD_API_KEY={{API_KEY}}
YOCLOUD_BASE_URL={{BASE_URL}}
PORT=8080`} {...codeProps} />
        <div className="mt-3 p-3 rounded-xl border border-border bg-card">
          <p className="text-xs font-bold text-foreground mb-1 flex items-center gap-1.5">
            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> Security Note
          </p>
          <p className="text-[10px] text-muted-foreground leading-relaxed">
            Never commit <code>.env</code> to version control. Add it to <code>.gitignore</code>.
            In production (Docker, Kubernetes, cloud platforms), inject secrets via environment variables directly.
          </p>
        </div>
      </section>

      {/* Shared API Client */}
      <section id="go-client" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Database className="w-5 h-5 text-primary" /> 3. YoCloud API Client
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Create a reusable, thread-safe HTTP client struct. Go's <code className="text-xs bg-secondary px-1 py-0.5 rounded">net/http</code> package
          is production-grade out of the box — connection pooling, timeouts, and TLS are all handled automatically.
          Both Gin and Fiber handlers will use this same client.
        </p>
        <CodeBlock lang="go" code={`// client.go — Shared YoCloud API Client
package main

import (
	"bytes"
	"encoding/json"
	"fmt"
	"io"
	"mime/multipart"
	"net/http"
	"os"
	"time"
)

// YoCloudClient handles all API communication.
type YoCloudClient struct {
	BaseURL    string
	APIKey     string
	HTTPClient *http.Client
}

// YoCloudError represents an API error response.
type YoCloudError struct {
	Status  int    \`json:"status"\`
	Message string \`json:"error"\`
}

func (e *YoCloudError) Error() string {
	return fmt.Sprintf("[%d] %s", e.Status, e.Message)
}

// NewYoCloudClient creates a configured client instance.
func NewYoCloudClient() *YoCloudClient {
	return &YoCloudClient{
		BaseURL: os.Getenv("YOCLOUD_BASE_URL"),
		APIKey:  os.Getenv("YOCLOUD_API_KEY"),
		HTTPClient: &http.Client{
			Timeout: 30 * time.Second,
		},
	}
}

// request performs an authenticated HTTP request.
func (c *YoCloudClient) request(method, endpoint string, body interface{}) ([]byte, error) {
	var reqBody io.Reader
	if body != nil {
		jsonData, err := json.Marshal(body)
		if err != nil {
			return nil, fmt.Errorf("marshal error: %w", err)
		}
		reqBody = bytes.NewBuffer(jsonData)
	}

	req, err := http.NewRequest(method, c.BaseURL+endpoint, reqBody)
	if err != nil {
		return nil, fmt.Errorf("request creation error: %w", err)
	}

	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Content-Type", "application/json")

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, fmt.Errorf("request failed: %w", err)
	}
	defer resp.Body.Close()

	data, err := io.ReadAll(resp.Body)
	if err != nil {
		return nil, fmt.Errorf("read error: %w", err)
	}

	if resp.StatusCode >= 400 {
		var apiErr YoCloudError
		json.Unmarshal(data, &apiErr)
		apiErr.Status = resp.StatusCode
		return nil, &apiErr
	}

	return data, nil
}

// ─── File Operations ─────────────────────────────────────

// FileResponse represents a file from the API.
type FileResponse struct {
	ID        string \`json:"id"\`
	Name      string \`json:"name"\`
	Size      int64  \`json:"size"\`
	MimeType  string \`json:"mime_type"\`
	URL       string \`json:"cloudinary_url"\`
	CreatedAt string \`json:"created_at"\`
	IsFolder  bool   \`json:"is_folder"\`
}

// ListFilesResponse wraps paginated file results.
type ListFilesResponse struct {
	Data    []FileResponse \`json:"data"\`
	Total   int            \`json:"total"\`
	HasNext bool           \`json:"has_next"\`
}

func (c *YoCloudClient) ListFiles(folderID string, page, limit int) (*ListFilesResponse, error) {
	endpoint := fmt.Sprintf("/files?page=%d&limit=%d", page, limit)
	if folderID != "" {
		endpoint += "&folder_id=" + folderID
	}
	data, err := c.request("GET", endpoint, nil)
	if err != nil {
		return nil, err
	}
	var result ListFilesResponse
	json.Unmarshal(data, &result)
	return &result, nil
}

func (c *YoCloudClient) GetFile(fileID string) (*FileResponse, error) {
	data, err := c.request("GET", "/files/"+fileID, nil)
	if err != nil {
		return nil, err
	}
	var file FileResponse
	json.Unmarshal(data, &file)
	return &file, nil
}

func (c *YoCloudClient) DeleteFile(fileID string) error {
	_, err := c.request("DELETE", "/files/"+fileID, nil)
	return err
}

func (c *YoCloudClient) UploadFile(filePath, folderID string) (*FileResponse, error) {
	file, err := os.Open(filePath)
	if err != nil {
		return nil, err
	}
	defer file.Close()

	body := &bytes.Buffer{}
	writer := multipart.NewWriter(body)
	part, _ := writer.CreateFormFile("file", filePath)
	io.Copy(part, file)
	if folderID != "" {
		writer.WriteField("folder_id", folderID)
	}
	writer.Close()

	req, _ := http.NewRequest("POST", c.BaseURL+"/files", body)
	req.Header.Set("Authorization", "Bearer "+c.APIKey)
	req.Header.Set("Content-Type", writer.FormDataContentType())

	resp, err := c.HTTPClient.Do(req)
	if err != nil {
		return nil, err
	}
	defer resp.Body.Close()

	respData, _ := io.ReadAll(resp.Body)
	if resp.StatusCode >= 400 {
		return nil, fmt.Errorf("upload failed: %s", string(respData))
	}

	var result FileResponse
	json.Unmarshal(respData, &result)
	return &result, nil
}

// ─── Folders, Shares, Tags ───────────────────────────────

func (c *YoCloudClient) CreateFolder(name, parentID string) ([]byte, error) {
	body := map[string]string{"name": name}
	if parentID != "" {
		body["parent_id"] = parentID
	}
	return c.request("POST", "/folders", body)
}

func (c *YoCloudClient) ListShares() ([]byte, error) {
	return c.request("GET", "/shares", nil)
}

func (c *YoCloudClient) CreateShare(fileID, accessType string) ([]byte, error) {
	return c.request("POST", "/shares", map[string]string{
		"file_id":     fileID,
		"access_type": accessType,
	})
}

func (c *YoCloudClient) ListTags() ([]byte, error) {
	return c.request("GET", "/tags", nil)
}

func (c *YoCloudClient) GetUsage() ([]byte, error) {
	return c.request("GET", "/usage", nil)
}`} {...codeProps} />
      </section>

      {/* Gin Handlers */}
      <section id="go-gin-handlers" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" /> 4. Gin Route Handlers
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Create handler functions for each API operation. Gin's context object provides
          convenient methods for reading query params, binding JSON bodies, and sending responses.
          Each handler is a thin wrapper around the shared client.
        </p>
        <CodeBlock lang="go" code={`// handlers/files.go — Gin handlers for file operations
package handlers

import (
	"net/http"
	"strconv"

	"github.com/gin-gonic/gin"
)

// FileHandler holds the YoCloud client reference.
type FileHandler struct {
	Client *YoCloudClient // imported from main package
}

// ListFiles handles GET /api/files
func (h *FileHandler) ListFiles(c *gin.Context) {
	page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
	limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
	folderID := c.Query("folder_id")

	result, err := h.Client.ListFiles(folderID, page, limit)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, result)
}

// GetFile handles GET /api/files/:id
func (h *FileHandler) GetFile(c *gin.Context) {
	fileID := c.Param("id")

	file, err := h.Client.GetFile(fileID)
	if err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, file)
}

// UploadFile handles POST /api/files
func (h *FileHandler) UploadFile(c *gin.Context) {
	file, err := c.FormFile("file")
	if err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "No file provided"})
		return
	}

	folderID := c.PostForm("folder_id")

	// Save to temp file
	tmpPath := "/tmp/" + file.Filename
	if err := c.SaveUploadedFile(file, tmpPath); err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Failed to save file"})
		return
	}

	result, err := h.Client.UploadFile(tmpPath, folderID)
	if err != nil {
		handleError(c, err)
		return
	}

	// Clean up temp file
	os.Remove(tmpPath)

	c.JSON(http.StatusCreated, result)
}

// DeleteFile handles DELETE /api/files/:id
func (h *FileHandler) DeleteFile(c *gin.Context) {
	fileID := c.Param("id")

	if err := h.Client.DeleteFile(fileID); err != nil {
		handleError(c, err)
		return
	}

	c.JSON(http.StatusOK, gin.H{"message": "File deleted successfully"})
}

// handleError extracts status from YoCloudError or defaults to 500.
func handleError(c *gin.Context, err error) {
	if apiErr, ok := err.(*YoCloudError); ok {
		c.JSON(apiErr.Status, gin.H{"error": apiErr.Message})
		return
	}
	c.JSON(http.StatusInternalServerError, gin.H{"error": err.Error()})
}`} {...codeProps} />
      </section>

      {/* Gin Routes & Main */}
      <section id="go-gin-routes" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <FolderPlus className="w-5 h-5 text-primary" /> 5. Gin Router & Main Entry
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Wire everything together in <code className="text-xs bg-secondary px-1 py-0.5 rounded">main.go</code>.
          Gin's router groups let you organize endpoints cleanly and apply middleware at different levels.
        </p>
        <CodeBlock lang="go" code={`// main.go — Gin application entry point
package main

import (
	"log"
	"os"

	"github.com/gin-gonic/gin"
	"github.com/joho/godotenv"
)

func main() {
	// Load environment variables
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using system env")
	}

	// Initialize API client
	client := NewYoCloudClient()

	// Create Gin router
	r := gin.Default()

	// Apply global middleware
	r.Use(gin.Recovery())
	r.Use(CORSMiddleware())
	r.Use(LoggerMiddleware())

	// API routes
	api := r.Group("/api")
	{
		// Files
		api.GET("/files", func(c *gin.Context) {
			page, _ := strconv.Atoi(c.DefaultQuery("page", "1"))
			limit, _ := strconv.Atoi(c.DefaultQuery("limit", "20"))
			result, err := client.ListFiles(c.Query("folder_id"), page, limit)
			if err != nil {
				handleGinError(c, err)
				return
			}
			c.JSON(200, result)
		})

		api.GET("/files/:id", func(c *gin.Context) {
			file, err := client.GetFile(c.Param("id"))
			if err != nil {
				handleGinError(c, err)
				return
			}
			c.JSON(200, file)
		})

		api.POST("/files", func(c *gin.Context) {
			file, err := c.FormFile("file")
			if err != nil {
				c.JSON(400, gin.H{"error": "No file provided"})
				return
			}
			tmpPath := "/tmp/" + file.Filename
			c.SaveUploadedFile(file, tmpPath)
			defer os.Remove(tmpPath)

			result, err := client.UploadFile(tmpPath, c.PostForm("folder_id"))
			if err != nil {
				handleGinError(c, err)
				return
			}
			c.JSON(201, result)
		})

		api.DELETE("/files/:id", func(c *gin.Context) {
			if err := client.DeleteFile(c.Param("id")); err != nil {
				handleGinError(c, err)
				return
			}
			c.JSON(200, gin.H{"message": "Deleted"})
		})

		// Folders
		api.POST("/folders", func(c *gin.Context) {
			var body struct {
				Name     string \`json:"name" binding:"required"\`
				ParentID string \`json:"parent_id"\`
			}
			if err := c.ShouldBindJSON(&body); err != nil {
				c.JSON(400, gin.H{"error": "Name is required"})
				return
			}
			data, err := client.CreateFolder(body.Name, body.ParentID)
			if err != nil {
				handleGinError(c, err)
				return
			}
			c.Data(201, "application/json", data)
		})

		// Shares
		api.GET("/shares", func(c *gin.Context) {
			data, err := client.ListShares()
			if err != nil {
				handleGinError(c, err)
				return
			}
			c.Data(200, "application/json", data)
		})

		// Tags
		api.GET("/tags", func(c *gin.Context) {
			data, err := client.ListTags()
			if err != nil {
				handleGinError(c, err)
				return
			}
			c.Data(200, "application/json", data)
		})

		// Usage
		api.GET("/usage", func(c *gin.Context) {
			data, err := client.GetUsage()
			if err != nil {
				handleGinError(c, err)
				return
			}
			c.Data(200, "application/json", data)
		})
	}

	// Start server
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Printf("🚀 Server running on http://localhost:%s", port)
	r.Run(":" + port)
}

func handleGinError(c *gin.Context, err error) {
	if apiErr, ok := err.(*YoCloudError); ok {
		c.JSON(apiErr.Status, gin.H{"error": apiErr.Message})
		return
	}
	c.JSON(500, gin.H{"error": err.Error()})
}`} {...codeProps} />
      </section>

      {/* Gin Middleware */}
      <section id="go-gin-middleware" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Shield className="w-5 h-5 text-primary" /> 6. Gin Middleware
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Add middleware for CORS headers, request logging, and rate limiting.
          Middleware runs before your handlers and can modify requests/responses or short-circuit the chain.
        </p>
        <CodeBlock lang="go" code={`// middleware/cors.go — CORS & Logging middleware
package main

import (
	"log"
	"time"

	"github.com/gin-gonic/gin"
)

// CORSMiddleware allows cross-origin requests.
func CORSMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		c.Header("Access-Control-Allow-Origin", "*")
		c.Header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS")
		c.Header("Access-Control-Allow-Headers", "Content-Type, Authorization")

		if c.Request.Method == "OPTIONS" {
			c.AbortWithStatus(204)
			return
		}

		c.Next()
	}
}

// LoggerMiddleware logs request details and response time.
func LoggerMiddleware() gin.HandlerFunc {
	return func(c *gin.Context) {
		start := time.Now()

		// Process request
		c.Next()

		// Log after response
		duration := time.Since(start)
		log.Printf(
			"[%s] %s %s → %d (%v)",
			c.Request.Method,
			c.Request.URL.Path,
			c.ClientIP(),
			c.Writer.Status(),
			duration,
		)
	}
}

// RateLimitMiddleware limits requests per IP (simple in-memory).
func RateLimitMiddleware(maxPerMinute int) gin.HandlerFunc {
	type visitor struct {
		count    int
		lastSeen time.Time
	}
	visitors := make(map[string]*visitor)

	return func(c *gin.Context) {
		ip := c.ClientIP()
		v, exists := visitors[ip]

		if !exists || time.Since(v.lastSeen) > time.Minute {
			visitors[ip] = &visitor{count: 1, lastSeen: time.Now()}
			c.Next()
			return
		}

		v.count++
		v.lastSeen = time.Now()

		if v.count > maxPerMinute {
			c.JSON(429, gin.H{
				"error":       "Rate limit exceeded",
				"retry_after": "60s",
			})
			c.Abort()
			return
		}

		c.Next()
	}
}`} {...codeProps} />
      </section>

      {/* Fiber Setup */}
      <section id="go-fiber-setup" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Package className="w-5 h-5 text-primary" /> 7. Fiber Project Setup
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Fiber is an Express.js-inspired Go framework built on Fasthttp — significantly faster than net/http for raw throughput.
          If you're coming from Node.js/Express, Fiber's API will feel immediately familiar.
        </p>
        <CodeBlock lang="bash" code={`# Create project directory
mkdir yocloud-fiber && cd yocloud-fiber

# Initialize Go module
go mod init github.com/yourname/yocloud-fiber

# Install dependencies
go get github.com/gofiber/fiber/v2
go get github.com/joho/godotenv

# Create files
touch main.go client.go .env

# You can reuse the SAME client.go from the Gin setup!
# Only main.go and route handlers differ.`} {...codeProps} />
      </section>

      {/* Fiber Handlers */}
      <section id="go-fiber-handlers" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Server className="w-5 h-5 text-primary" /> 8. Fiber Route Handlers
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Fiber uses its own context type instead of net/http. The API is cleaner and more concise.
          Notice how similar the structure is to Express.js — <code className="text-xs bg-secondary px-1 py-0.5 rounded">c.Query()</code>,
          <code className="text-xs bg-secondary px-1 py-0.5 rounded">c.Params()</code>, and <code className="text-xs bg-secondary px-1 py-0.5 rounded">c.JSON()</code> work exactly as you'd expect.
        </p>
        <CodeBlock lang="go" code={`// main.go — Fiber application
package main

import (
	"log"
	"os"
	"strconv"

	"github.com/gofiber/fiber/v2"
	"github.com/gofiber/fiber/v2/middleware/cors"
	"github.com/gofiber/fiber/v2/middleware/logger"
	"github.com/gofiber/fiber/v2/middleware/recover"
	"github.com/joho/godotenv"
)

func main() {
	godotenv.Load()

	client := NewYoCloudClient()

	app := fiber.New(fiber.Config{
		AppName:   "YoCloud Fiber API",
		BodyLimit: 50 * 1024 * 1024, // 50MB upload limit
	})

	// Middleware
	app.Use(recover.New())
	app.Use(logger.New())
	app.Use(cors.New())

	// API routes
	api := app.Group("/api")

	// List files
	api.Get("/files", func(c *fiber.Ctx) error {
		page, _ := strconv.Atoi(c.Query("page", "1"))
		limit, _ := strconv.Atoi(c.Query("limit", "20"))
		folderID := c.Query("folder_id")

		result, err := client.ListFiles(folderID, page, limit)
		if err != nil {
			return handleFiberError(c, err)
		}
		return c.JSON(result)
	})

	// Get single file
	api.Get("/files/:id", func(c *fiber.Ctx) error {
		file, err := client.GetFile(c.Params("id"))
		if err != nil {
			return handleFiberError(c, err)
		}
		return c.JSON(file)
	})

	// Upload file
	api.Post("/files", func(c *fiber.Ctx) error {
		file, err := c.FormFile("file")
		if err != nil {
			return c.Status(400).JSON(fiber.Map{"error": "No file provided"})
		}

		tmpPath := "/tmp/" + file.Filename
		if err := c.SaveFile(file, tmpPath); err != nil {
			return c.Status(500).JSON(fiber.Map{"error": "Save failed"})
		}
		defer os.Remove(tmpPath)

		result, err := client.UploadFile(tmpPath, c.FormValue("folder_id"))
		if err != nil {
			return handleFiberError(c, err)
		}
		return c.Status(201).JSON(result)
	})

	// Delete file
	api.Delete("/files/:id", func(c *fiber.Ctx) error {
		if err := client.DeleteFile(c.Params("id")); err != nil {
			return handleFiberError(c, err)
		}
		return c.JSON(fiber.Map{"message": "Deleted"})
	})

	// Create folder
	api.Post("/folders", func(c *fiber.Ctx) error {
		var body struct {
			Name     string \`json:"name"\`
			ParentID string \`json:"parent_id"\`
		}
		if err := c.BodyParser(&body); err != nil || body.Name == "" {
			return c.Status(400).JSON(fiber.Map{"error": "Name required"})
		}
		data, err := client.CreateFolder(body.Name, body.ParentID)
		if err != nil {
			return handleFiberError(c, err)
		}
		return c.Status(201).Send(data)
	})

	// Shares, Tags, Usage
	api.Get("/shares", func(c *fiber.Ctx) error {
		data, err := client.ListShares()
		if err != nil {
			return handleFiberError(c, err)
		}
		return c.Send(data)
	})

	api.Get("/tags", func(c *fiber.Ctx) error {
		data, err := client.ListTags()
		if err != nil {
			return handleFiberError(c, err)
		}
		return c.Send(data)
	})

	api.Get("/usage", func(c *fiber.Ctx) error {
		data, err := client.GetUsage()
		if err != nil {
			return handleFiberError(c, err)
		}
		return c.Send(data)
	})

	// Start
	port := os.Getenv("PORT")
	if port == "" {
		port = "8080"
	}
	log.Fatal(app.Listen(":" + port))
}

func handleFiberError(c *fiber.Ctx, err error) error {
	if apiErr, ok := err.(*YoCloudError); ok {
		return c.Status(apiErr.Status).JSON(fiber.Map{"error": apiErr.Message})
	}
	return c.Status(500).JSON(fiber.Map{"error": err.Error()})
}`} {...codeProps} />
      </section>

      {/* Fiber Upload with streaming */}
      <section id="go-fiber-upload" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" /> 9. Testing Your API
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Test your Go backend with cURL. Both Gin and Fiber serve on the same port and expose identical endpoints,
          so these commands work for either framework.
        </p>
        <CodeBlock lang="bash" code={`# List files
curl http://localhost:8080/api/files

# List files with pagination
curl "http://localhost:8080/api/files?page=1&limit=10"

# Get a specific file
curl http://localhost:8080/api/files/FILE_ID_HERE

# Upload a file
curl -X POST http://localhost:8080/api/files \\
  -F "file=@./document.pdf" \\
  -F "folder_id=FOLDER_ID"

# Delete a file
curl -X DELETE http://localhost:8080/api/files/FILE_ID_HERE

# Create a folder
curl -X POST http://localhost:8080/api/folders \\
  -H "Content-Type: application/json" \\
  -d '{"name": "My Folder"}'

# List shares
curl http://localhost:8080/api/shares

# Check usage
curl http://localhost:8080/api/usage`} {...codeProps} />
      </section>

      {/* Error Handling */}
      <section id="go-error-handling" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <AlertTriangle className="w-5 h-5 text-amber-500" /> 10. Error Handling & Retry
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Add exponential backoff retry logic for transient failures. Go's explicit error handling
          makes it easy to implement robust retry patterns without hiding errors.
        </p>
        <CodeBlock lang="go" code={`// retry.go — Retry logic with exponential backoff
package main

import (
	"fmt"
	"math"
	"time"
)

// RetryConfig configures retry behavior.
type RetryConfig struct {
	MaxRetries int
	BaseDelay  time.Duration
	MaxDelay   time.Duration
}

// DefaultRetryConfig returns sensible defaults.
func DefaultRetryConfig() RetryConfig {
	return RetryConfig{
		MaxRetries: 3,
		BaseDelay:  500 * time.Millisecond,
		MaxDelay:   10 * time.Second,
	}
}

// WithRetry executes fn with automatic retry on server errors.
func WithRetry[T any](config RetryConfig, fn func() (T, error)) (T, error) {
	var lastErr error
	var zero T

	for attempt := 0; attempt <= config.MaxRetries; attempt++ {
		result, err := fn()
		if err == nil {
			return result, nil
		}

		lastErr = err

		// Don't retry client errors (4xx)
		if apiErr, ok := err.(*YoCloudError); ok {
			if apiErr.Status >= 400 && apiErr.Status < 500 {
				return zero, err
			}
		}

		// Calculate backoff delay
		if attempt < config.MaxRetries {
			delay := time.Duration(
				math.Min(
					float64(config.BaseDelay)*math.Pow(2, float64(attempt)),
					float64(config.MaxDelay),
				),
			)
			time.Sleep(delay)
		}
	}

	return zero, fmt.Errorf("all %d retries failed: %w", config.MaxRetries, lastErr)
}

// Usage example:
// result, err := WithRetry(DefaultRetryConfig(), func() (*ListFilesResponse, error) {
//     return client.ListFiles("", 1, 20)
// })`} {...codeProps} />
      </section>

      {/* Run */}
      <section id="go-run" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Play className="w-5 h-5 text-primary" /> 11. Running & Building
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Go compiles to a single binary — no runtime dependencies needed for deployment.
          Build once, deploy anywhere.
        </p>
        <div className="space-y-3">
          <div>
            <p className="text-xs font-bold text-foreground mb-1.5">Development:</p>
            <CodeBlock lang="bash" code={`# Run with hot-reload (install air first)
go install github.com/air-verse/air@latest
air

# Or run directly
go run .

# Server starts at http://localhost:8080`} {...codeProps} />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground mb-1.5">Production Build:</p>
            <CodeBlock lang="bash" code={`# Build optimized binary
CGO_ENABLED=0 GOOS=linux GOARCH=amd64 \\
  go build -ldflags="-s -w" -o yocloud-server .

# Run the binary
./yocloud-server

# Docker deployment
# FROM golang:1.22-alpine AS builder
# WORKDIR /app
# COPY . .
# RUN go build -o server .
#
# FROM alpine:latest
# COPY --from=builder /app/server /server
# COPY .env .
# EXPOSE 8080
# CMD ["/server"]`} {...codeProps} />
          </div>
        </div>
      </section>

      {/* Project Structure */}
      <section id="go-structure" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <FolderPlus className="w-5 h-5 text-primary" /> 12. Project Structure
        </h3>
        <p className="text-sm text-muted-foreground mb-3">
          Recommended file structure for both frameworks.
        </p>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <p className="text-xs font-bold text-foreground mb-1.5">Gin:</p>
            <CodeBlock lang="bash" code={`yocloud-gin/
├── main.go           # Router & entry
├── client.go         # YoCloud API client
├── retry.go          # Retry logic
├── handlers/
│   ├── files.go      # File handlers
│   ├── folders.go    # Folder handlers
│   └── shares.go     # Share handlers
├── middleware/
│   ├── cors.go       # CORS middleware
│   ├── logger.go     # Request logger
│   └── ratelimit.go  # Rate limiter
├── models/
│   └── types.go      # Shared structs
├── .env
├── go.mod
├── go.sum
├── Dockerfile
└── README.md`} {...codeProps} />
          </div>
          <div>
            <p className="text-xs font-bold text-foreground mb-1.5">Fiber:</p>
            <CodeBlock lang="bash" code={`yocloud-fiber/
├── main.go           # Router & entry
├── client.go         # YoCloud API client
├── retry.go          # Retry logic
├── handlers/
│   ├── files.go
│   ├── folders.go
│   └── shares.go
├── models/
│   └── types.go
├── .env
├── go.mod
├── go.sum
├── Dockerfile
└── README.md

# Note: Fiber has built-in
# middleware (cors, logger,
# recover) — no custom
# middleware files needed!`} {...codeProps} />
          </div>
        </div>
      </section>

      {/* Tips */}
      <section id="go-tips" className="pt-8">
        <h3 className="text-lg font-bold text-foreground mb-2 flex items-center gap-2">
          <Check className="w-5 h-5 text-emerald-500" /> 13. Production Tips
        </h3>
        <div className="space-y-2">
          {[
            { title: "Use context.Context for timeouts", desc: "Pass context through handlers to enforce request deadlines: ctx, cancel := context.WithTimeout(c.Request.Context(), 10*time.Second)" },
            { title: "Connection pooling is automatic", desc: "Go's http.Client reuses TCP connections by default. Create ONE client instance and share it across all handlers." },
            { title: "Graceful shutdown", desc: "Handle SIGINT/SIGTERM to drain in-flight requests before stopping: signal.Notify(quit, syscall.SIGINT, syscall.SIGTERM)" },
            { title: "Structured logging", desc: "Use zerolog or zap instead of log.Printf for JSON-structured logs that integrate with monitoring tools." },
            { title: "Compile-time checks", desc: "Go catches type mismatches, missing imports, and unused variables at build time — fewer runtime errors." },
            { title: "Docker multi-stage builds", desc: "Use a multi-stage Dockerfile: build in golang:alpine, deploy from scratch or alpine. Final image can be under 15MB." },
            { title: "Benchmark your handlers", desc: "Use Go's built-in benchmarking: go test -bench=. -benchmem to measure handler performance." },
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
