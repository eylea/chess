const WHITE = 'w';
const BLACK = 'b';


/**
 * Object containing Unicode symbols for chess pieces
 * @type {Object.<string, string>}
 */
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

/**
 * Object containing filenames for chess piece SVG images
 * @type {Object.<string, string>}
 */
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

/**
 * Default FEN string for the initial chess position
 * @type {string}
 */
const DEFAULT_FEN = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR';


/**
 * Gets valid moves for the current player
 * @returns {string[]} An array of valid moves for the current player
 */
let getValidMoves = () => {
    return [];
}

/**
 * Gets the color of the current player
 * @returns {string} The color of the current player ('w' or 'b')
 */
let getColor = () => {
    return '';
}

/**
 * Gets the current player
 * @returns {string} The current player ('w' or 'b')
 */
let getCurrentPlayer = () => {
    return '';
}

/**
 * Gets the current FEN string
 * @returns {string} The current FEN string
 */
let getFen = () => {
    return '';
}

/**
 * Sends a move to the server
 * @param {string} move - The move in algebraic notation
 */
let sendMove = function(move) { console.log('Move:', move) };

/**
 * Stores the last move made
 * @type {string|null}
 */
let lastMove = null;

/**
 * Initiates a game connection based on the game ID input
 * If a game ID is provided, it connects to that game
 * Otherwise, it fetches a new game from the server
 */
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

/**
 * Fetches a new game from the server
 */
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

/**
 * Connects to a game with the given ID
 * @param {string} gameId - The ID of the game to connect to
 */
const connectToGame = (gameId) => {
    console.log(`Connecting to game: ${gameId}`);
    const url = new URL(window.location.href);
    const ws = new WebSocket(`ws://${url.host}/game/${gameId}`);

    ws.onmessage = handleOnMessage;
    ws.onopen = () => updateGameIdHeader(gameId);

    sendMove = makeSendMove(ws);
}

/**
 * Updates the game ID header in the DOM
 * @param {string} gameId - The ID of the current game
 */
const updateGameIdHeader = (gameId) => {
    let header = document.getElementById('game_id');
    if (!header) {
        document.body.insertAdjacentHTML('afterbegin', `<h1 id="game_id">Game ID: ${gameId}</h1>`);
    } else {
        header.textContent = `Game ID: ${gameId}`;
    }
}

/**
 * Loads chess piece assets
 * @returns {Promise<Object.<string, HTMLImageElement>>} - A promise that resolves to an object containing loaded image elements
 */
const loadAssets = async () => {
    const assets = {};
    const loadPromises = Object.entries(PIECE_FILES).map(([key, value]) => {
        return new Promise((resolve) => {
            const img = new Image();
            img.src = `./${value}`;
            img.alt = key;
            img.dataset.piece = key;
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

/**
 * Draws the chess board in the given container
 * @param {HTMLElement} container - The container element for the chess board
 * @returns {HTMLTableElement} The created chess board element
 */
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

/**
 * Draws chess pieces on the board based on the given FEN string
 * @param {HTMLTableElement} board - The chess board element
 * @param {Object.<string, HTMLImageElement>} assets - The loaded chess piece assets
 * @param {string} [fen=DEFAULT_FEN] - The FEN string representing the board position
 * @returns {HTMLTableElement} The updated chess board element
 */
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
/**
 * Checks if a move is a castling move
 * @param {string} startSquare - The starting square of the move
 * @param {string} endSquare - The ending square of the move
 * @returns {boolean} True if the move is a castling move, false otherwise
 */
const isCastlingMove = (startSquare, endSquare) => {
    const castlingMoves = {
        'e1g1': true, // White kingside
        'e1c1': true, // White queenside
        'e8g8': true, // Black kingside
        'e8c8': true  // Black queenside
    };
    return castlingMoves[`${startSquare}${endSquare}`] || false;
};

/**
 * Gets the rook's starting and ending squares for a castling move
 * @param {string} endSquare - The king's ending square in a castling move
 * @returns {Object|null} An object containing the rook's start and end squares, or null if not a valid castling move
 */
const getRookCastlingSquares = (endSquare) => {
    const rookMoves = {
        'g1': { start: 'h1', end: 'f1' }, // White kingside
        'c1': { start: 'a1', end: 'd1' }, // White queenside
        'g8': { start: 'h8', end: 'f8' }, // Black kingside
        'c8': { start: 'a8', end: 'd8' }  // Black queenside
    };
    return rookMoves[endSquare] || null;
};

/**
 * Moves a piece on the board
 * @param {HTMLTableElement} board - The chess board element
 * @param {string} startSquare - The starting square of the move
 * @param {string} endSquare - The ending square of the move
 */
const movePiece = (board, startSquare, endSquare) => {
    const startCell = board.querySelector(`td[data-algebraic="${startSquare}"]`);
    const endCell = board.querySelector(`td[data-algebraic="${endSquare}"]`);
    const piece = startCell.querySelector('.piece');

    if (piece) {
        endCell.innerHTML = '';
        endCell.appendChild(piece);
    }
};

/**
 * Highlights the last move on the board
 * @param {HTMLTableElement} board - The chess board element
 * @param {string} move - The move to highlight in algebraic notation
 */
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

/**
 * Gets valid moves from a given cell
 * @param {string} position - The algebraic position of the cell
 * @returns {string[]} An array of valid moves from the given cell
 */
const getValidCellsFromCell = (position) => {
    const validMoves = getValidMoves();
    return validMoves.filter(move => move.startsWith(position)).map(move => move.substring(2));
}

/**
 * Draws valid moves for a selected piece
 * @param {HTMLTableElement} board - The chess board element
 * @param {string} position - The algebraic position of the selected piece
 */
const drawValidMoves = (board, position) => {
    const cell = board.querySelector(`td[data-algebraic="${position}"]`);
    const piece = cell.querySelector('.piece');
    if (!piece) {
        console.error('No piece found in cell:', position);
    }
    const pieceColor = piece.dataset.piece === piece.dataset.piece.toLowerCase() ? BLACK : WHITE;
    if (pieceColor !== getColor()) {
        console.log('Not your piece');
        return
    }

    const validCells = getValidCellsFromCell(position);
    validCells.forEach(cell => {
        const targetCell = board.querySelector(`td[data-algebraic="${cell}"]`);
        targetCell.classList.add('valid-move');
    });
}


/**
 * Clears valid move highlights from the board
 */
const clearValidMoves = () => {
    document.querySelectorAll('.valid-move').forEach(cell => cell.classList.remove('valid-move'));
}

/**
 * Adds event listeners to chess pieces for drag-and-drop functionality
 * @param {HTMLTableElement} board - The chess board element
 */
const addPieceEventListeners = (board) => {
    const pieces = board.querySelectorAll('.piece');
    pieces.forEach((img) => {
        let isDragging = false;
        let originalCell;

        // Event handlers
        /**
         * Handles the mousedown event on a chess piece
         * @param {MouseEvent} e - The mousedown event
         */
        const handleMouseDown = (e) => {
            isDragging = true;
            originalCell = img.parentElement;
            img.style.cursor = 'grabbing';
            img.style.position = 'absolute';
            img.style.zIndex = 1000;
            img.style.left = `${e.clientX - img.width / 2}px`;
            img.style.top = `${e.clientY - img.height / 2}px`;
            drawValidMoves(board, originalCell.dataset.algebraic)
        };


        /**
         * Handles the mousemove event on a chess piece
         * @param {MouseEvent} e - The mousedown event
         */
        const handleMouseMove = (e) => {
            if (isDragging) {
                img.style.left = `${e.clientX - img.width / 2}px`;
                img.style.top = `${e.clientY - img.height / 2}px`;
            }
        };

        /**
         * Handles the mouseup event on a chess piece
         * @param {MouseEvent} e - The mousedown event
         */
        const handleMouseUp = (e) => {
            clearValidMoves();
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


/**
 * Handles incoming WebSocket messages
 * @param {MessageEvent} event - The WebSocket message event
 */
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

/**
 * Handles the initial game message
 * @param {Object} data - The initial game data
 * @param {string} data.player - The player's color
 * @param {string} data.fen - The initial FEN string
 * @param {string[]} data.moves - The list of valid moves
 */
const handleInitialMessage = (data) => {
    getColor = () => data.player[0];
    updateGameState(data.fen, data.moves);
    initializeBoard();
};

/**
 * Handles a move message
 * @param {Object} data - The move data
 * @param {string} data.fen - The new FEN string after the move
 * @param {string[]} data.moves - The new list of valid moves
 * @param {string} data.move - The move that was made
 */
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

/**
 * Handles an error message
 * @param {string} message - The error message
 */
const handleErrorMessage = (message) => {
    alert(message);
};

/**
 * Handles the game over message
 * @param {string} loser - The color of the losing player
 */
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

/**
 * Updates the game state
 * @param {string} fen - The new FEN string
 * @param {string[]} moves - The new list of valid moves
 */
const updateGameState = (fen, moves) => {
    getFen = () => fen;
    getCurrentPlayer = () => fen.split(' ')[1];
    getValidMoves = () => moves;
};

/**
 * Initializes the chess board
 */
const initializeBoard = () => {
    const container = document.getElementById('container');
    loadAssets().then((assets) => {
        const board = drawBoard(container);
        drawPieces(board, assets, getFen().split(' ')[0]);
        addPieceEventListeners(board);
    });
};

/**
 * Creates a function to send moves to the server
 * @param {WebSocket} ws - The WebSocket connection
 * @returns {function(string): void} A function that sends a move to the server
 */
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
