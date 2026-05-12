package utils

import (
	"math/rand"
	"strings"
	"time"
)

const base62Chars = "0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ"

// GenerateShortCode generates a random Base62 string of a given length.
// For SaaS with high scale, we use an alternative approach of ID mapping, but a fast random string with uniqueness check also works well for a start.
func GenerateShortCode(length int) string {
	r := rand.New(rand.NewSource(time.Now().UnixNano()))
	var builder strings.Builder
	for i := 0; i < length; i++ {
		builder.WriteByte(base62Chars[r.Intn(62)])
	}
	return builder.String()
}
