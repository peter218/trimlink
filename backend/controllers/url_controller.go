package controllers

import (
	"errors"
	"net/http"
	"time"
	"url-shortener-backend/database"
	"url-shortener-backend/models"
	"url-shortener-backend/utils"

	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type ShortenRequest struct {
	OriginalURL string `json:"originalUrl" binding:"required,url"`
}

func ShortenURL(c *gin.Context) {
	var req ShortenRequest
	if err := c.ShouldBindJSON(&req); err != nil {
		c.JSON(http.StatusBadRequest, gin.H{"error": "Invalid URL"})
		return
	}

	// Check if already exists in DB
	var existingURL models.URL
	if err := database.DB.Where("original_url = ?", req.OriginalURL).First(&existingURL).Error; err == nil {
		c.JSON(http.StatusOK, existingURL)
		return
	}

	shortCode := utils.GenerateShortCode(6)

	// Ensure uniqueness
	for {
		var count int64
		database.DB.Model(&models.URL{}).Where("short_code = ?", shortCode).Count(&count)
		if count == 0 {
			break
		}
		shortCode = utils.GenerateShortCode(6)
	}

	url := models.URL{
		OriginalURL: req.OriginalURL,
		ShortCode:   shortCode,
		CreatedAt:   time.Now(),
	}

	if err := database.DB.Create(&url).Error; err != nil {
		c.JSON(http.StatusInternalServerError, gin.H{"error": "Could not save URL"})
		return
	}

	// Save to Redis and Local Memory Cache
	if database.RDB != nil {
		database.RDB.Set(database.Ctx, shortCode, req.OriginalURL, 24*time.Hour)
	}
	database.Cache.Store(shortCode, req.OriginalURL)

	c.JSON(http.StatusOK, url)
}

func RedirectURL(c *gin.Context) {
	shortCode := c.Param("code")
	var originalURL string

	// 1. Check Local Memory Cache first (fastest)
	if val, ok := database.Cache.Load(shortCode); ok {
		originalURL = val.(string)
	} else if database.RDB != nil {
		// 2. Check Redis (distributed cache)
		val, err := database.RDB.Get(database.Ctx, shortCode).Result()
		if err == nil {
			originalURL = val
			database.Cache.Store(shortCode, originalURL) // backfill local
		}
	}

	if originalURL == "" {
		// 3. Fallback to DB
		var url models.URL
		if err := database.DB.Where("short_code = ?", shortCode).First(&url).Error; err != nil {
			if errors.Is(err, gorm.ErrRecordNotFound) {
				c.JSON(http.StatusNotFound, gin.H{"error": "URL not found"})
				return
			}
			c.JSON(http.StatusInternalServerError, gin.H{"error": "Database error"})
			return
		}
		originalURL = url.OriginalURL
		// Fill caches
		database.Cache.Store(shortCode, originalURL)
		if database.RDB != nil {
			database.RDB.Set(database.Ctx, shortCode, originalURL, 24*time.Hour)
		}
	}

	// Async log click
	go func(code string, ip string, userAgent string) {
		log := models.ClickLog{
			ShortCode: code,
			IPAddress: ip,
			UserAgent: userAgent,
			CreatedAt: time.Now(),
		}
		database.DB.Create(&log)
		database.DB.Model(&models.URL{}).Where("short_code = ?", code).UpdateColumn("clicks", gorm.Expr("clicks + ?", 1))
	}(shortCode, c.ClientIP(), c.Request.UserAgent())

	c.Redirect(http.StatusFound, originalURL)
}

func GetStats(c *gin.Context) {
	shortCode := c.Param("code")

	var url models.URL
	if err := database.DB.Where("short_code = ?", shortCode).First(&url).Error; err != nil {
		c.JSON(http.StatusNotFound, gin.H{"error": "URL not found"})
		return
	}

	// Aggregate click logs by day for the chart
	type DailyStats struct {
		Date   string `json:"date"`
		Clicks int64  `json:"clicks"`
	}

	var stats []DailyStats
	database.DB.Model(&models.ClickLog{}).
		Select("DATE(created_at) as date, count(id) as clicks").
		Where("short_code = ?", shortCode).
		Group("DATE(created_at)").
		Order("date ASC").
		Scan(&stats)

	c.JSON(http.StatusOK, gin.H{
		"url":   url,
		"stats": stats,
	})
}
