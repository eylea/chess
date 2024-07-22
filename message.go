package main

import "github.com/notnil/chess"

type MessageType int

const (
	Move MessageType = iota
	Resign
	OfferDraw
	AcceptDraw
	DeclineDraw
)

// Message is a struct that represents a message sent by a client.
type Message struct {
	Player Player      `json:"player"`
	Type   MessageType `json:"type"`
	Data   []byte      `json:"data"`
}

func NewMessage(player Player, messageType MessageType, data []byte) Message {
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
