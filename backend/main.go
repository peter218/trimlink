package main

import (
	"os"
	"url-shortener-backend/controllers"
	"url-shortener-backend/database"

	"github.com/gin-contrib/cors"
	"github.com/gin-gonic/gin"
)

func main() {
	database.ConnectDB()
	database.ConnectRedis()

	r := gin.Default()

	// CORS config for frontend connection
	r.Use(cors.New(cors.Config{
		AllowOrigins:     []string{"*"}, // For production, replace with frontend domain
		AllowMethods:     []string{"GET", "POST", "OPTIONS"},
		AllowHeaders:     []string{"Origin", "Content-Type", "Accept"},
		ExposeHeaders:    []string{"Content-Length"},
		AllowCredentials: false,
	}))

	// API Routes
	api := r.Group("/api")
	{
		api.POST("/shorten", controllers.ShortenURL)
		api.GET("/stats/:code", controllers.GetStats)
	}

	// Redirect Route
	r.GET("/:code", controllers.RedirectURL)

	port := os.Getenv("PORT")
	if port == "" {
		port = "8081"
	}

	r.Run(":" + port)
}
