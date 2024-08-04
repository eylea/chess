const WHITE = 'w';
const BLACK = 'b';

const PIECES = {
    'r': '♜',
    'n': '♞',
    'b': '♝',
    'q': '♛',
    'k': '♚',
    'p': '♟',
    'R': '♖',
    'N': '♘',
    'B': '♗',
    'Q': '♕',
    'K': '♔',
    'P': '♙',
};

const PIECE_FILES = {
    'r': 'rook-b.svg',
    'n': 'knight-b.svg',
    'b': 'bishop-b.svg',
    'q': 'queen-b.svg',
    'k': 'king-b.svg',
    'p': 'pawn-b.svg',
    'R': 'rook-w.svg',
    'N': 'knight-w.svg',
    'B': 'bishop-w.svg',
    'Q': 'queen-w.svg',
    'K': 'king-w.svg',
    'P': 'pawn-w.svg',
};

const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';

let getValidMoves = () => {
    return [];
}

let getColor = () => {
    return '';
}

let getCurrentPlayer = () => {
    return '';
}

let getFen = () => {
    return '';
}

let sendMove = function(move) { console.log('Move:', move) };

let lastMove = null;

const getGame = () => {
    const gameIdInput = document.getElementById('game-id-input');
    if (!gameIdInput) {
        console.error('Game ID input not found');
        return;
    }

    const gameId = gameIdInput.value.trim();

    if (gameId) {
        connectToGame(gameId);
    } else {
        fetchNewGame();
    }
}

const fetchNewGame = () => {
    console.log('Fetching new game...');
    fetch('/game')
        .then(response => {
            if (!response.ok) throw new Error('Failed to fetch game');
            return response.json();
        })
        .then(data => connectToGame(data.game_id))
        .catch(error => console.error(error));
}

const connectToGame = (gameId) => {
    console.log(`Connecting to game: ${gameId}`);
    const ws = new WebSocket(`ws://localhost:8080/game/${gameId}`);

    ws.onmessage = handleOnMessage;
    ws.onopen = () => updateGameIdHeader(gameId);

    sendMove = makeSendMove(ws);
}

const updateGameIdHeader = (gameId) => {
    let header = document.getElementById('game_id');
    if (!header) {
        document.body.insertAdjacentHTML('afterbegin', `<h1 id="game_id">Game ID: ${gameId}</h1>`);
    } else {
        header.textContent = `Game ID: ${gameId}`;
    }
}

const loadAssets = async () => {
    const assets = {};
    const loadPromises = Object.entries(PIECE_FILES).map(([key, value]) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = `./${value}`;
            img.alt = PIECES[key];
            img.className = 'piece no-select';
            img.onload = () => {
                assets[key] = img;
                resolve({});
            };
            img.onerror = () => {
                console.error(`Failed to load image: ${value}`);
                resolve({}); // Resolve even on error to continue loading other assets
            };
        });
    });

    await Promise.all(loadPromises);
    return assets;
};

const drawBoard = (container) => {
    if (!container) {
        throw new Error('Container not found');
    }

    let board = container.querySelector('#board');
    if (board) {
        container.removeChild(board);
    }

    board = document.createElement('table');
    board.id = 'board';

    const isBlack = getColor() === BLACK;

    for (let i = 0; i < 8; i++) {
        const row = document.createElement('tr');
        for (let j = 0; j < 8; j++) {
            const cell = document.createElement('td');
            cell.className = (i + j) % 2 === 0 ? 'white' : 'black';
            const file = isBlack ? 7 - j : j;
            const rank = isBlack ? i + 1 : 8 - i;
            cell.dataset.algebraic = `${String.fromCharCode(97 + file)}${rank}`;
            row.appendChild(cell);
        }
        board.appendChild(row);
    }

    container.appendChild(board);

    return board;
}

const drawPieces = (board, assets, fen = DEFAULT_FEN) => {
    const rows = fen.split('/');
    const isBlack = getColor() === BLACK;

    for (let i = 0; i < 8; i++) {
        const row = rows[isBlack ? 7 - i : i];
        let col = 0;
        for (let j = 0; j < row.length; j++) {
            const char = row[j];
            console.log("char", char)
            if (isNaN(char)) {
                const cell = board.rows[i].cells[isBlack ? 7 - col : col];
                let img = assets[char]
                if (!img) {
                    console.error(`Failed to find asset for piece: ${char}`);
                    img = document.createElement('span');
                    img.textContent = PIECES[char];
                    img.className = 'piece no-select';
                    continue
                }
                img.classList.add('piece');
                cell.appendChild(img.cloneNode(true));
                col++;
            } else {
                col += parseInt(char);
            }
        }
    }

    return board;
}

const isCastlingMove = (startSquare, endSquare) => {
    const castlingMoves = {
        'e1g1': true, // White kingside
        'e1c1': true, // White queenside
        'e8g8': true, // Black kingside
        'e8c8': true  // Black queenside
    };
    return castlingMoves[`${startSquare}${endSquare}`] || false;
};

const getRookCastlingSquares = (endSquare) => {
    const rookMoves = {
        'g1': { start: 'h1', end: 'f1' }, // White kingside
        'c1': { start: 'a1', end: 'd1' }, // White queenside
        'g8': { start: 'h8', end: 'f8' }, // Black kingside
        'c8': { start: 'a8', end: 'd8' }  // Black queenside
    };
    return rookMoves[endSquare] || null;
};

const movePiece = (board, startSquare, endSquare) => {
    const startCell = board.querySelector(`td[data-algebraic="${startSquare}"]`);
    const endCell = board.querySelector(`td[data-algebraic="${endSquare}"]`);
    const piece = startCell.querySelector('.piece');

    if (piece) {
        endCell.innerHTML = '';
        endCell.appendChild(piece);
    }
};

// New function to highlight the last move
const highlightLastMove = (board, move) => {
    // Remove previous highlights
    board.querySelectorAll('.highlight').forEach(cell => cell.classList.remove('highlight'));

    // Highlight new move
    const startSquare = move.substring(0, 2);
    const endSquare = move.substring(2, 4);

    const startCell = board.querySelector(`td[data-algebraic="${startSquare}"]`);
    const endCell = board.querySelector(`td[data-algebraic="${endSquare}"]`);

    if (startCell && endCell) {
        startCell.classList.add('highlight');
        endCell.classList.add('highlight');
    }
};

const addPieceEventListeners = (board) => {
    const pieces = board.querySelectorAll('.piece');
    pieces.forEach((img) => {
        let isDragging = false;
        let originalCell;

        const handleMouseDown = (e) => {
            isDragging = true;
            originalCell = img.parentElement;
            img.style.cursor = 'grabbing';
            img.style.position = 'absolute';
            img.style.zIndex = 1000;
            img.style.left = `${e.clientX - img.width / 2}px`;
            img.style.top = `${e.clientY - img.height / 2}px`;
        };

        const handleMouseMove = (e) => {
            if (isDragging) {
                img.style.left = `${e.clientX - img.width / 2}px`;
                img.style.top = `${e.clientY - img.height / 2}px`;
            }
        };

        const handleMouseUp = (e) => {
            if (isDragging) {
                isDragging = false;
                img.style.cursor = 'grab';
                img.style.position = 'static';
                img.style.zIndex = '';
                const targetElement = document.elementFromPoint(e.clientX, e.clientY);
                const cell = targetElement.closest('td');
                if (!cell) {
                    originalCell.appendChild(img);
                    return;
                }
                const startSquare = originalCell.dataset.algebraic;
                const endSquare = cell.dataset.algebraic;
                const move = `${startSquare}${endSquare}`;
                const validMoves = getValidMoves();

                if (!validMoves.includes(move)) {
                    console.log("Invalid move ", move);
                    console.log("Valid moves", validMoves);
                    originalCell.appendChild(img);
                    return;
                }

                if (getCurrentPlayer() !== getColor()) {
                    console.log('Not your turn');
                    return;
                }

                movePiece(board, startSquare, endSquare);

                if (isCastlingMove(startSquare, endSquare)) {
                    const rookSquares = getRookCastlingSquares(endSquare);
                    if (rookSquares) {
                        movePiece(board, rookSquares.start, rookSquares.end);
                    }
                }

                sendMove(move);

                // Highlight the move
                highlightLastMove(board, move);
            }
        };

        img.addEventListener('mousedown', handleMouseDown);
        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);

        img.addEventListener('dragstart', (e) => {
            e.preventDefault();
        });
    });
};

const handleOnMessage = (event) => {
    console.log('Message received:', event.data);
    const data = JSON.parse(event.data);

    const handlers = {
        initial: handleInitialMessage,
        move: handleMoveMessage,
        error: handleErrorMessage,
        gameover: handleGameOverMessage
    };

    const handler = handlers[data.type] || (() => console.warn(`Unhandled message type: ${data.type}`));
    handler(data.data);
};

const handleInitialMessage = (data) => {
    getColor = () => data.player[0];
    updateGameState(data.fen, data.moves);
    initializeBoard();
};

const handleMoveMessage = (data) => {
    updateGameState(data.fen, data.moves);
    const board = document.getElementById('board');
    movePiece(board, data.move.substring(0, 2), data.move.substring(2, 4));

    // Highlight the last move
    highlightLastMove(board, data.move);

    // Check if the game is over
    if (data.moves.length === 0) {
        handleGameOverMessage(getCurrentPlayer());
    }
};

const handleErrorMessage = (message) => {
    alert(message);
};

const handleGameOverMessage = (loser) => {
    const winner = loser === WHITE ? BLACK : WHITE;
    const messageElement = document.createElement('div');
    messageElement.id = 'game-over-message';
    messageElement.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background-color: rgba(0, 0, 0, 0.8);
        color: white;
        padding: 20px;
        border-radius: 10px;
        font-size: 24px;
        text-align: center;
        z-index: 1001;
    `;
    messageElement.innerHTML = `
        <h2>Game Over!</h2>
        <p>${winner === WHITE ? 'White' : 'Black'} wins!</p>
        <button id="new-game-btn">Start New Game</button>
    `;
    document.body.appendChild(messageElement);

    document.getElementById('new-game-btn').addEventListener('click', () => {
        document.body.removeChild(messageElement);
        fetchNewGame();
    });
};

const updateGameState = (fen, moves) => {
    getFen = () => fen;
    getCurrentPlayer = () => fen.split(' ')[1];
    getValidMoves = () => moves;
};

const initializeBoard = () => {
    const container = document.getElementById('container');
    loadAssets().then((assets) => {
        const board = drawBoard(container);
        drawPieces(board, assets, getFen().split(' ')[0]);
        addPieceEventListeners(board);
    });
};

const makeSendMove = (ws) => {
    const sendMove = (move) => {
        if (getCurrentPlayer() !== getColor()) {
            console.log('Not your turn');
            return;
        }

        const msg = {
            type: 'move',
            data: move,
            player: getColor()
        }
        ws.send(JSON.stringify(msg));
    }

    return sendMove;
}
