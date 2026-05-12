package models

import (
	"time"
)

type URL struct {
	ID          uint      `gorm:"primaryKey" json:"id"`
	OriginalURL string    `gorm:"type:text;not null" json:"originalUrl"`
	ShortCode   string    `gorm:"type:varchar(20);uniqueIndex;not null" json:"shortCode"`
	Clicks      int64     `gorm:"default:0" json:"clicks"`
	CreatedAt   time.Time `json:"createdAt"`
}

type ClickLog struct {
	ID        uint      `gorm:"primaryKey" json:"id"`
	ShortCode string    `gorm:"type:varchar(20);index;not null" json:"shortCode"`
	IPAddress string    `gorm:"type:varchar(45)" json:"ipAddress"`
	UserAgent string    `gorm:"type:text" json:"userAgent"`
	CreatedAt time.Time `json:"createdAt"`
}
