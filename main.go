package main

import (
	"encoding/json"
	"flag"
	"fmt"
	"log"

	"net/http"

	"github.com/eylea/chess/static"
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

// func serveHome(w http.ResponseWriter, r *http.Request) {
// 	if r.URL.Path != "/" {
// 		http.Error(w, "Not found", http.StatusNotFound)
// 		return
// 	}
// 	if r.Method != http.MethodGet {
// 		http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
// 		return
// 	}
// 	http.ServeFile(w, r, "static/index.html")
// }

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

func main() {
	flag.Parse()

	fs := static.GetFS()

	http.Handle("/", http.FileServer(http.FS(fs)))

	gh := NewGameHub()
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

	go func() {
		if err := http.ListenAndServe(*addr, nil); err != nil {
			log.Fatal("ListenAndServe:", err)
		}
	}()
	log.Println("server started on ", *addr)

	cmds := make(chan string)
	go func() {
		for {
			var cmd string
			_, err := fmt.Scanln(&cmd)
			if err != nil {
				log.Println(err)
			}
			cmds <- cmd
		}
	}()

	for {
		select {
		case cmd := <-cmds:
			switch cmd {
			case "list":
				if len(gh.games) == 0 {
					fmt.Println("no games")
					break
				}
				for _, g := range gh.games {
					fmt.Println(g)
				}

			case "exit":
				return

			default:
				fmt.Println("unknown command, valid commands are: list, exit")
			}

		}
	}

}
