package main

import (
	"encoding/json"
	"flag"
	"log"

	"embed"
	"net/http"
)

// serveGame handles websocket requests from the peer.
func serveGame(hub *Game, w http.ResponseWriter, r *http.Request) {
	conn, err := upgrader.Upgrade(w, r, nil)
	if err != nil {
		log.Println(err)
		return
	}
	client := &Client{game: hub, conn: conn, send: make(chan []byte, 256)}
	client.game.register <- client

	// Allow collection of memory referenced by the caller by doing all work in
	// new goroutines.
	go client.writePump()
	go client.readPump()
}

func serveHome(w http.ResponseWriter, r *http.Request) {
	log.Println(r.URL)
	if r.URL.Path != "/" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}
	http.Redirect(w, r, "/static/home.html", http.StatusFound)
}

func serveCreateGame(gh *GameHub, w http.ResponseWriter, r *http.Request) {
	log.Println(r.URL)
	if r.URL.Path != "/game" {
		http.Error(w, "Not found", http.StatusNotFound)
		return
	}
	if r.Method != http.MethodGet {
		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
		return
	}

	g := gh.NewGame()
	go g.run()

	p, err := json.Marshal(map[string]string{"game_id": g.id})
	if err != nil {
		panic(err)
	}
	w.WriteHeader(200)
	w.Write(p)
}

var addr = flag.String("addr", ":8080", "http service address")

//go:embed static/*
var staticFs embed.FS

func main() {
	flag.Parse()

	gh := NewGameHub()

	fs := http.FileServer(http.FS(staticFs))
	http.Handle("/static/", fs)

	http.HandleFunc("/", serveHome)
	http.HandleFunc("/game", func(w http.ResponseWriter, r *http.Request) {
		serveCreateGame(gh, w, r)
	})

	http.HandleFunc("/game/{id}", func(w http.ResponseWriter, r *http.Request) {
		gameId := r.PathValue("id")
		g, err := gh.GetGame(gameId)
		if err != nil {
			w.WriteHeader(404)
			return
		}

		serveGame(g, w, r)
	})

	http.ListenAndServe(*addr, nil)
}
