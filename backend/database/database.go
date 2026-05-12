package database

import (
	"context"
	"fmt"
	"log"
	"os"
	"strconv"
	"sync"
	"url-shortener-backend/models"

	"github.com/go-redis/redis/v8"
	"gorm.io/driver/mysql"
	"gorm.io/gorm"
)

var (
	DB    *gorm.DB
	RDB   *redis.Client
	Cache sync.Map // Still keep local cache for super fast local access
	Ctx   = context.Background()
)

func ConnectDB() {
	dsn := os.Getenv("MYSQL_DSN")
	if dsn == "" {
		// Default MySQL connection string for the local Docker stack.
		dsn = "user:123456@tcp(127.0.0.1:3306)/shortener?charset=utf8mb4&parseTime=True&loc=Local"
	}
	db, err := gorm.Open(mysql.Open(dsn), &gorm.Config{})
	if err != nil {
		log.Fatalf("Failed to connect to MySQL: %v", err)
	}

	// Auto Migration
	db.AutoMigrate(&models.URL{}, &models.ClickLog{})

	DB = db
	fmt.Println("MySQL connected successfully via OrbStack")
}

func ConnectRedis() {
	redisDB := 0
	if raw := os.Getenv("REDIS_DB"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			log.Printf("Warning: Invalid REDIS_DB=%q, falling back to DB 0.", raw)
		} else {
			redisDB = parsed
		}
	}

	redisAddr := os.Getenv("REDIS_ADDR")
	if redisAddr == "" {
		redisAddr = "127.0.0.1:6379"
	}

	RDB = redis.NewClient(&redis.Options{
		Addr:     redisAddr,
		Password: os.Getenv("REDIS_PASSWORD"),
		DB:       redisDB,
	})

	_, err := RDB.Ping(Ctx).Result()
	if err != nil {
		log.Printf("Warning: Failed to connect to Redis: %v. Falling back to Memory Cache only.", err)
	} else {
		fmt.Println("Redis connected successfully via OrbStack")
	}
}
