package main

import (
	"github.com/notnil/chess"
)

type MessageType string

const (
	Move        MessageType = "move"
	Resign                  = "resign"
	OfferDraw               = "offer_draw"
	AcceptDraw              = "accept_draw"
	DeclineDraw             = "decline_draw"
)

// Message is a struct that represents a message sent by a client.
type Message struct {
	Player Player      `json:"player"`
	Type   MessageType `json:"type"`
	Data   int         `json:"data"`
}

func (m *Message) toMove(g *chess.Game) *chess.Move {
	return g.ValidMoves()[m.Data]
}

func NewMessage(player Player, messageType MessageType, data int) Message {
	return Message{
		Player: player,
		Type:   messageType,
		Data:   data,
	}
}

type ServerMessage struct {
	Fen        string      `json:"fen"`
	ValidMoves []string    `json:"valid_moves"`
	Turn       chess.Color `json:"turn"`
}

func NewServerMessage(fen string, validMoves []string, turn chess.Color) ServerMessage {
	return ServerMessage{
		Fen:        fen,
		ValidMoves: validMoves,
		Turn:       turn,
	}
}
