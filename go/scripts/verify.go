// Build a source archive and test it from a fresh isolated consumer module.
// Go public tag/proxy verification is a separate authorized publication step.
package main

import (
	"archive/zip"
	"bytes"
	"fmt"
	"os"
	"os/exec"
	"path/filepath"
	"strings"
)

func check(err error) {
	if err != nil {
		panic(err)
	}
}

func main() {
	root, err := os.Getwd()
	check(err)
	if _, err := os.Stat(filepath.Join(root, "client.go")); err != nil {
		panic("run from go/ directory")
	}
	work, err := os.MkdirTemp("", "fragment-donor-go-source-smoke-")
	check(err)
	defer os.RemoveAll(work) // Exact exclusively owned temporary directory.
	var artifact bytes.Buffer
	archive := zip.NewWriter(&artifact)
	files := []string{"client.go", "go.mod", "README.md", "LICENSE", "CHANGELOG.md"}
	for _, name := range files {
		data, err := os.ReadFile(filepath.Join(root, name))
		check(err)
		for _, marker := range []string{"BEGIN PRIVATE KEY", "BEGIN RSA PRIVATE KEY", "SYNTHETIC_SESSION_NOT_REAL", "SYNTHETIC_PROVIDER_KEY_NOT_REAL"} {
			if bytes.Contains(data, []byte(marker)) {
				panic("sensitive/test fixture payload leaked into module archive")
			}
		}
		writer, err := archive.Create("module/" + name)
		check(err)
		_, err = writer.Write(data)
		check(err)
	}
	check(archive.Close())
	reader, err := zip.NewReader(bytes.NewReader(artifact.Bytes()), int64(artifact.Len()))
	check(err)
	if len(reader.File) != len(files) {
		panic("archive content mismatch")
	}
	for _, member := range reader.File {
		if !strings.HasPrefix(member.Name, "module/") || strings.Contains(member.Name, "..") {
			panic("unsafe source archive")
		}
		file, err := member.Open()
		check(err)
		var data bytes.Buffer
		_, err = data.ReadFrom(file)
		check(err)
		check(file.Close())
		destination := filepath.Join(work, filepath.FromSlash(member.Name))
		check(os.MkdirAll(filepath.Dir(destination), 0700))
		check(os.WriteFile(destination, data.Bytes(), 0600))
	}
	for _, name := range []string{"go.mod", "main.go"} {
		data, err := os.ReadFile(filepath.Join(root, "smoke", name))
		check(err)
		if name == "go.mod" {
			data = bytes.ReplaceAll(data, []byte("=> .."), []byte("=> ../module"))
		}
		check(os.MkdirAll(filepath.Join(work, "consumer"), 0700))
		check(os.WriteFile(filepath.Join(work, "consumer", name), data, 0600))
	}
	command := exec.Command("go", "run", ".")
	command.Dir = filepath.Join(work, "consumer")
	command.Env = append(os.Environ(), "GOPROXY=off", "GOSUMDB=off", "GOWORK=off")
	command.Stdout, command.Stderr = os.Stdout, os.Stderr
	check(command.Run())
	fmt.Printf("Go source archive allowlist/fixture-secret exclusion PASS (%d files); isolated offline consumer used extracted source module\n", len(files))
}
