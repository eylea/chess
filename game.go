package main

import (
	"encoding/json"
	"fmt"
	"log"

	"github.com/google/uuid"
	"github.com/notnil/chess"
	"github.com/samber/lo"
)

type Game struct {
	clients    map[*Client]bool
	broadcast  chan Message
	register   chan *Client
	unregister chan *Client
	game       *chess.Game
	id         string
	players    map[Player]*Client
}

func newGame() *Game {
	return &Game{
		clients:    make(map[*Client]bool),
		broadcast:  make(chan Message),
		register:   make(chan *Client),
		unregister: make(chan *Client),
		game:       chess.NewGame(),
		id:         uuid.New().String(),
		players:    make(map[Player]*Client),
	}
}

func (g *Game) run() {
	for {
		select {
		case client := <-g.register:
			g.handleRegisterClient(client)
		case client := <-g.unregister:
			if _, ok := g.clients[client]; ok {
				log.Println("unregistering client")
				delete(g.clients, client)
				close(client.send)
			}
		case message := <-g.broadcast:
			msg := g.handleClientMove(&message)
			en, err := json.Marshal(msg)
			if err != nil {
				log.Println("error marshalling message", err)
				en = []byte{}
			}

			for client := range g.clients {
				select {
				case client.send <- []byte(en):
				default:
					close(client.send)
					delete(g.clients, client)
				}
			}
		}
	}
}

func (g *Game) handleClientMove(msg *Message) *ServerMessage {
	log.Printf("broadcasting message: %+v", msg)
	move, found := lo.Find(g.game.ValidMoves(), func(m *chess.Move) bool {
		return m.String() == msg.Data
	})

	if !found {
		err := fmt.Errorf("move: %s not found in valid moves: %v", msg.Data, g.game.ValidMoves())
		log.Println(err)
		return NewServerError(err)
	}

	if err := g.game.Move(move); err != nil {
		log.Println("error moving", err)
		return NewServerError(err)
	}

	log.Printf("game state: %s", g.game.Position().Board().Draw())

	return NewServerMoveMessage(
		g.game.FEN(),
		g.getLegalMoves(),
	)

}

func (g *Game) getLegalMoves() []string {
	return lo.Map(
		g.game.ValidMoves(),
		func(m *chess.Move, _ int) string {
			return m.String()
		})
}

func (g *Game) handleRegisterClient(client *Client) {
	log.Println("registering client")
	// TODO allow spectators
	if len(g.clients) == 2 {
		log.Println("game is full")
		en, err := NewServerError(fmt.Errorf("game is full")).Type.MarshalJSON()
		if err != nil {
			log.Println("error marshalling message", err)
			en = []byte{}
		}
		client.send <- en
		close(client.send)
	}

	msg := &ServerMessage{
		Type: Initial,
		Data: &ServerInitialMessage{
			Fen:        g.game.FEN(),
			LegalMoves: g.getLegalMoves(),
		},
	}

	if len(g.clients) == 0 {
		color := randomPlayer()
		g.players[color] = client
		msg.Data.(*ServerInitialMessage).Player = color
	} else {
		for color, c := range g.players {
			if c == nil {
				g.players[color] = client
				msg.Data.(*ServerInitialMessage).Player = color
			}
		}
	}

	en, err := json.Marshal(msg)
	if err != nil {
		log.Println("error marshalling message", err)
		en = []byte{}
	}
	client.send <- []byte(en)
	g.clients[client] = true
}

func (g *Game) String() string {
	return fmt.Sprintf("id: %s\tclients: %d\tfen: %s", g.id, len(g.clients), g.game.FEN())
}
