package static

import "embed"

//go:embed *
var fs embed.FS

func GetFS() embed.FS {
	return fs
}
