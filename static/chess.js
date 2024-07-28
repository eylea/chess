const WHITE = 'white';
const BLACK = 'black';

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


/**
 * ChessBoard class to create and manage a chess board
 * @example
 * Create a new ChessBoard with the default position
 * const container = document.getElementById('chess-board-container');
 * const chessBoard = new ChessBoard(container);
 */
class ChessBoard {
    /**
     * Create a new ChessBoard
     * @param {HTMLElement} container - The container element to append the board to
     * @param {string} [fen=DEFAULT_FEN] - The FEN string representing the position to set.
     * @param {function(string, string): void} [onMove] - The function to call when a move is made
     * @param {Set<string>} [legalMoves] - The set of legal moves
     * @param {string} [color=WHITE] - The color to move
     */
    constructor(
        container,
        onMove = (start, end) => { console.log(start, end) },
        fen = DEFAULT_FEN,
        legalMoves = new Set(),
        color = WHITE
    ) {
        /**
         * @property {string} fen - The FEN string representing the position of the board
         */
        this.fen = fen;

        /**
         * @property {HTMLTableElement} board - The created board element
         */
        this.board = document.createElement('table');
        this.board.className = 'no-select'
        container.appendChild(this.board);

        /**
         * @property {Map<string, HTMLImageElement>} assets - The loaded assets
         * @private
         */
        this.assets = {};
        this._loadAssets();

        this._initializeBoard();
        this._drawPosition();

        /**
         * @property {function(string, string): void} onMove - The function to call when a move is made
         * @private
         * @type {function(string, string): void}
         * @example
         * const onMove = (start, end) => console.log(start, end);
         */
        this.onMove = onMove;
        /**
         * @property {Set<string>} legalMoves - The set of legal moves
         * @private
         * @type {Set<string>}
         * @example
         * const legalMoves = new Set(['e2e4', 'd2d4']);
         * chessBoard.legalMoves = legalMoves;
         */
        this.legalMoves = legalMoves;


        /**
        * @property {string} color - The color to move
        * @private
        * @type {string}
        */
        this.color = color;
    }

    /**
     * Set the position of the board
     * @param {string} fen - The FEN string representing the position to set
     * @param {Set<string>} legalMoves - The set of legal moves
     * @param {string} color - The color of the player
     */
    update(fen = this.fen, legalMoves = this.legalMoves, color = this.color) {
        this.fen = fen;
        this.legalMoves = legalMoves
        this.color = color;
        this._drawPosition();
    }

    /**
     * Reset the board
     * @returns {ChessBoard} - The ChessBoard instance
     */
    reset() {
        this.fen = DEFAULT_FEN;
        this._drawPosition();
        return this;
    }

    _loadAssets() {
        const assets = Object.entries(PIECE_FILES);
        assets.forEach(([key, value]) => {
            const img = document.createElement('img');
            img.src = `./${value}`;
            img.alt = PIECES[key];
            img.className = 'piece';
            this.assets[key] = img;
        });

        Promise.all(Object.values(this.assets).map((img) => {
            return new Promise((resolve, reject) => {
                img.onload = resolve;
                img.onerror = reject;
            });
        }
        )).then(() => {
            console.log('Assets loaded');
        }).catch((error) => {
            console.error('Error loading assets:', error);
        });
    }

    /**
     * Initialize the chess board by creating rows and cells
     * @private
     */
    _initializeBoard() {
        for (let i = 0; i < 8; i++) {
            const row = document.createElement('tr');
            this.board.appendChild(row);

            for (let j = 0; j < 8; j++) {
                const cell = document.createElement('td');
                cell.className = this._getCellColor(i, j);
                cell.dataset.algebraic = this._indexToAlgebraic(i, j);
                row.appendChild(cell);
            }
        }

        this._initializeCellSelection()
    }

    /**
     * Draw the position on the board based on the FEN string
     * @private
     */
    _drawPosition() {
        const position = this._fenToBoard(this.fen);
        for (let i = 0; i < 8; i++) {
            for (let j = 0; j < 8; j++) {
                const cell = this.board.rows[i].cells[j];
                const piece = position[i][j];
                cell.childNodes.forEach(child => child.remove());
                if (this.assets[piece]) {
                    cell.appendChild(this.assets[piece].cloneNode(true))
                }
            }
        }
    }

    /**
     * Get the cell color based on its position
     * @param {number} row - The row index
     * @param {number} col - The column index
     * @returns {string} - The class name representing the cell color
     * @private
     * @static
     */
    _getCellColor(row, col) {
        return (row + col) % 2 === 0 ? 'white' : 'black';
    }

    /**
     * @typedef {Object} CellIndices
     * @property {number} row - The row index of the cell
     * @property {number} column - The column index of the cell
     */

    /**
     * Get the indices of a cell
     * @param {HTMLTableCellElement} cell - The cell to get indices for
     * @returns {CellIndices} - An object containing the row and column indices
     * @private
     * @static
     */
    _getCellIndices = (cell) => {
        const row = cell.parentElement.rowIndex;
        const column = cell.cellIndex;
        return { row, column };
    };

    /**
     * Initialize cell selection on the board
     * @private
     */
    _initializeCellSelection() {
        const cells = this._getAllCells();


        /**
         * Log the start and end cells of a selection
         * @param {HTMLTableCellElement} start - The start cell of the selection
         * @param {HTMLTableCellElement} end - The end cell of the selection
         * @returns {void}
         */
        const logCells = (start, end) => {
            const startIndices = this._getCellIndices(start);
            const startAlgebraic = this._indexToAlgebraic(
                startIndices.row,
                startIndices.column
            );
            const endIndices = this._getCellIndices(end);
            const endAlgebraic = this._indexToAlgebraic(
                endIndices.row,
                endIndices.column
            );
            console.log('Start Cell Indices:', startIndices, 'Algebraic:', startAlgebraic);
            console.log('End Cell Indices:', endIndices, 'Algebraic:', endAlgebraic);
        };

        /**
         * Add mouse event handlers to the cells
         * @param {Array<HTMLTableCellElement>} cells - The cells to add event handlers to
         * @returns {void}
         */
        const addMouseEventHandlers = (cells) => {
            let startCell = null;
            let endCell = null;

            /**
             * Handle the mousedown event
             * @param {MouseEvent} event - The mousedown event
             * @returns {void}
             */
            const handleMouseDown = (event) => {
                startCell = event.target.closest('td');
            };

            /**
             * Handle the mouseup event
             * @param {MouseEvent} event - The mouseup event
             * @returns {void}
             */
            const handleMouseUp = (event) => {
                endCell = event.target.closest('td');

                if ((startCell && endCell) && (startCell !== endCell)) {
                    this._handleMove(startCell, endCell);
                }
            };

            cells.forEach(cell => {
                cell.addEventListener('mousedown', handleMouseDown);
                cell.addEventListener('mouseup', handleMouseUp);
            });
        };

        addMouseEventHandlers(cells);
    }

    /**
     * Handle a move event
     * @param {HTMLTableCellElement} startCell - The start cell of the move
     * @param {HTMLTableCellElement} endCell - The end cell of the move
     * @private
     */
    _handleMove = (startCell, endCell) => {
        if (!this._isTurn()) {
            console.log('Not your turn');
            return;
        }

        const startAlgebraic = startCell.dataset.algebraic;
        const endAlgebraic = endCell.dataset.algebraic;
        if (!startAlgebraic || !endAlgebraic) {
            console.log('Invalid move:', startAlgebraic, endAlgebraic);
            return;
        }

        if (!this.legalMoves.has(startAlgebraic + endAlgebraic)) {
            console.log('Illegal move:', startAlgebraic + endAlgebraic);
            return;
        }

        this.onMove(startAlgebraic, endAlgebraic);
    }


    /** Convert a FEN string to a 2D array representing the board
      * @param {string} fen - The FEN string to convert
      * @returns {Array<Array<string>>} - A 2D array representing the board
      * @private
      * @static
      */
    _fenToBoard = (fen) => {
        // Split the FEN string into its constituent parts
        let parts = fen.split(' ');
        let boardPart = parts[0];

        // Split the board part by rows
        let rows = boardPart.split('/');

        // Initialize the board array
        let board = [];

        // Process each row
        rows.forEach(row => {
            let boardRow = [];
            for (let char of row) {
                if (isNaN(+char)) {
                    // If the character is a piece, add it to the row
                    boardRow.push(char);
                } else {
                    // If the character is a number, add that many empty squares to the row
                    for (let i = 0; i < parseInt(char); i++) {
                        boardRow.push('');
                    }
                }
            }
            // Add the processed row to the board
            board.push(boardRow);
        });

        return board;
    }

    /** Convert a cell index to algebraic notation
     * @param {number} row - The row index
     * @param {number} col - The column index
     * @returns {string} - The algebraic notation for the cell
     * @private
     * @static
     */
    _indexToAlgebraic = (row, col) => {
        const letters = 'abcdefgh';
        return letters[col] + (8 - row);
    }


    /** Function to get all cells of the table using map
      * @returns {Array<HTMLTableCellElement>} - An array of all the cell contents
      * @private
      */
    _getAllCells = () => {
        // Get all rows in the table
        const rows = Array.from(this.board.getElementsByTagName('tr'));

        // Use map to iterate over rows and cells, then flatten the result
        const allCells = rows.map(row => Array.from(row.getElementsByTagName('td'))).flat();

        return allCells;
    }

    /** Function to determine the color to move
        * @returns {boolean} - The color to move
        * @private
    */
    _isTurn = () => {
        const turn = () => {
            switch (this.fen.split(' ')[1]) {
                case 'w':
                    return WHITE;
                case 'b':
                    return BLACK;
                default:
                    return WHITE;
            }
        }

        return turn() == this.color;
    }
}

/** Function to handle a move event
  * @param {WebSocket} ws - The WebSocket connection
  * @param {string} start - The start square of the move
  * @param {string} end - The end square of the move
  * @returns {void}
  */
const handleOnMove = (ws, start, end) => {
    const data = JSON.stringify({ 'type': 'move', 'data': start + end });
    console.log('handleOnMove:', data);
    ws.send(data);
}

/** Function to create a handler for the onMove event
 * @param {WebSocket} ws - The WebSocket connection
 * @returns {function(string, string): void} - The handler function
 */
const makeHandleOnMove = (ws) => (start, end) => handleOnMove(ws, start, end);


/** Function to handle a message event
 * @param {ChessBoard} chessBoard - The ChessBoard instance
 * @returns {function(MessageEvent): void} - The handler function
 */
const handleOnMessage = (chessBoard) => (event) => {
    const data = JSON.parse(event.data);
    if (!data) {
        console.error('Invalid data:', event.data);
        return;
    }
    let legalMoves;
    console.log('handleOnMessage:', event.data)
    switch (data.type) {
        case 'initial':
            legalMoves = new Set(data.data.moves);
            chessBoard.update(data.data.fen, legalMoves, data.data.player);
            break
        case 'move':
            legalMoves = new Set(data.data.moves);
            chessBoard.update(data.data.fen, legalMoves);
            break;
        case 'error':
            console.error(data.error);
            break;
    }
}


/** Function to inspect an object
  * @param {Object} obj - The object to inspect
  * @param {function(Object, string): boolean} filter - The filter function to use
  * @returns {void}
  */
const inspect = (obj, filter) => {
    for (let key in obj) {
        if (filter(obj, key)) {
            console.log(key, obj[key]);
        }
    }
}
