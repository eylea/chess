package main

import (
	"bytes"
	"encoding/json"
	"flag"
	"fmt"
	"log"
	"sync"
	"time"

	"net/http"

	"github.com/google/uuid"
	"github.com/gorilla/websocket"
	"github.com/notnil/chess"
)

var upgrader = websocket.Upgrader{
	ReadBufferSize:  1024,
	WriteBufferSize: 1024,
	CheckOrigin: func(r *http.Request) bool {
		return true
	},
}

var (
	newline = []byte{'\n'}
	space   = []byte{' '}
)

const (
	// Time allowed to write a message to the peer.
	writeWait = 10 * time.Second

	// Time allowed to read the next pong message from the peer.
	pongWait = 60 * time.Second

	// Send pings to peer with this period. Must be less than pongWait.
	pingPeriod = (pongWait * 9) / 10

	// Maximum message size allowed from peer.
	maxMessageSize = 512
)

type Client struct {
	send chan []byte
	game *Game
	conn *websocket.Conn
}

func (c *Client) readPump() {
	defer func() {
		c.game.unregister <- c
		c.conn.Close()
	}()
	c.conn.SetReadLimit(maxMessageSize)
	c.conn.SetReadDeadline(time.Now().Add(pongWait))
	c.conn.SetPongHandler(func(string) error { c.conn.SetReadDeadline(time.Now().Add(pongWait)); return nil })
	for {
		_, message, err := c.conn.ReadMessage()
		if err != nil {
			if websocket.IsUnexpectedCloseError(err, websocket.CloseGoingAway, websocket.CloseAbnormalClosure) {
				log.Printf("error: %v", err)
			}
			break
		}
		message = bytes.TrimSpace(bytes.Replace(message, newline, space, -1))
		c.game.broadcast <- message
	}
}

func (c *Client) writePump() {
	ticker := time.NewTicker(pingPeriod)
	defer func() {
		ticker.Stop()
		c.conn.Close()
	}()

	for {
		select {
		case message, ok := <-c.send:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if !ok {
				// The hub closed the channel.
				c.conn.WriteMessage(websocket.CloseMessage, []byte{})
				return
			}

			w, err := c.conn.NextWriter(websocket.TextMessage)
			if err != nil {
				return
			}
			w.Write(message)

			// Add queued chat messages to the current websocket message.
			n := len(c.send)
			for i := 0; i < n; i++ {
				w.Write(newline)
				w.Write(<-c.send)
			}

			if err := w.Close(); err != nil {
				return
			}
		case <-ticker.C:
			c.conn.SetWriteDeadline(time.Now().Add(writeWait))
			if err := c.conn.WriteMessage(websocket.PingMessage, nil); err != nil {
				return
			}
		}
	}
}

type Game struct {
	clients    map[*Client]bool
	broadcast  chan []byte
	register   chan *Client
	unregister chan *Client
	game       *chess.Game
	id         string
}

func newGame() *Game {
	return &Game{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan []byte),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		game:       chess.NewGame(),
		id:         uuid.New().String(),
	}
}

func (h *Game) run() {
	for {
		select {
		case client := <-h.register:
			log.Println("registering client")
			h.clients[client] = true
		case client := <-h.unregister:
			if _, ok := h.clients[client]; ok {
				log.Println("unregistering client")
				delete(h.clients, client)
				close(client.send)
			}
		case message := <-h.broadcast:
			log.Printf("broadcasting msg %s", message)
			for client := range h.clients {
				select {
				case client.send <- message:
				default:
					close(client.send)
					delete(h.clients, client)
				}
			}
		}
	}
}

// serveWs handles websocket requests from the peer.
func serveWs(hub *Game, w http.ResponseWriter, r *http.Request) {
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
	http.ServeFile(w, r, "home.html")
}

type GameHub struct {
	mu    *sync.Mutex
	games map[string]*Game
}

func NewGameHub() *GameHub {
	return &GameHub{
		games: make(map[string]*Game),
		mu:    &sync.Mutex{},
	}
}

func (gh *GameHub) NewGame() *Game {
	gh.mu.Lock()
	defer gh.mu.Unlock()
	g := newGame()
	gh.games[g.id] = g
	return g
}

func (gh *GameHub) DeleteGame(id string) {
	gh.mu.Lock()
	defer gh.mu.Unlock()

	if _, ok := gh.games[id]; ok {
		delete(gh.games, id)
	}
}

func (gh *GameHub) GetGame(id string) (*Game, error) {
	gh.mu.Lock()
	defer gh.mu.Unlock()

	if g, ok := gh.games[id]; ok {
		return g, nil
	}

	return nil, fmt.Errorf("gamehub: could not find game with id: %s", id)
}

func serveGame(gh *GameHub, w http.ResponseWriter, r *http.Request) {
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

	gh := NewGameHub()

	http.HandleFunc("/", serveHome)
	http.HandleFunc("/game", func(w http.ResponseWriter, r *http.Request) {
		serveGame(gh, w, r)
	})
	http.HandleFunc("/game/{id}", func(w http.ResponseWriter, r *http.Request) {

		gameId := r.PathValue("id")
		g, err := gh.GetGame(gameId)
		if err != nil {
			w.WriteHeader(404)
			return
		}

		serveWs(g, w, r)
	})

	http.ListenAndServe(*addr, nil)
}
