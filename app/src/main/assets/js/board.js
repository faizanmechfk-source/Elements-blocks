(function (global) {
  'use strict';

  const EB = (global.EB = global.EB || {});

  const GRID_SIZE = 8;

  class Board {
    constructor(serialized) {
      this.size = GRID_SIZE;
      this.grid = this.createEmptyGrid();
      if (serialized && Array.isArray(serialized) && serialized.length === GRID_SIZE) {
        for (let r = 0; r < GRID_SIZE; r++) {
          for (let c = 0; c < GRID_SIZE; c++) {
            const cell = serialized[r] && serialized[r][c];
            if (cell && typeof cell === 'object') {
              this.grid[r][c] = {
                element: cell.element || null,
                hasStar: Boolean(cell.hasStar)
              };
            }
          }
        }
      }
    }

    createEmptyGrid() {
      const g = [];
      for (let r = 0; r < GRID_SIZE; r++) {
        const row = [];
        for (let c = 0; c < GRID_SIZE; c++) {
          row.push({ element: null, hasStar: false });
        }
        g.push(row);
      }
      return g;
    }

    reset() {
      this.grid = this.createEmptyGrid();
    }

    isOccupied(r, c) {
      if (r < 0 || r >= this.size || c < 0 || c >= this.size) return true;
      return this.grid[r][c].element !== null;
    }

    canPlace(piece, anchorRow, anchorCol) {
      if (!piece || !piece.cells) return false;
      for (let i = 0; i < piece.cells.length; i++) {
        const r = anchorRow + piece.cells[i][0];
        const c = anchorCol + piece.cells[i][1];
        if (r < 0 || r >= this.size || c < 0 || c >= this.size) return false;
        if (this.grid[r][c].element !== null) return false;
      }
      return true;
    }

    canPieceFitAnywhere(piece) {
      if (!piece) return false;
      for (let r = 0; r <= this.size - piece.height; r++) {
        for (let c = 0; c <= this.size - piece.width; c++) {
          if (this.canPlace(piece, r, c)) return true;
        }
      }
      return false;
    }

    hasAnyValidMove(trayPieces) {
      if (!trayPieces) return false;
      return trayPieces.some((p) => p !== null && this.canPieceFitAnywhere(p));
    }

    placePiece(piece, anchorRow, anchorCol) {
      if (!this.canPlace(piece, anchorRow, anchorCol)) return null;
      const placedCells = [];
      let starsCollectedOnPlace = 0;

      for (let i = 0; i < piece.cells.length; i++) {
        const r = anchorRow + piece.cells[i][0];
        const c = anchorCol + piece.cells[i][1];
        const hadStar = this.grid[r][c].hasStar;
        if (hadStar) {
          starsCollectedOnPlace++;
          this.grid[r][c].hasStar = false;
        }
        this.grid[r][c].element = piece.element;
        placedCells.push({ r, c, element: piece.element, hadStar });
      }
      return { placedCells, starsCollectedOnPlace };
    }

    previewLineClears(piece, anchorRow, anchorCol) {
      if (!this.canPlace(piece, anchorRow, anchorCol)) {
        return { rows: [], cols: [] };
      }
      const tempSet = new Set();
      piece.cells.forEach(([dr, dc]) => {
        tempSet.add(`${anchorRow + dr},${anchorCol + dc}`);
      });

      const rows = [];
      const cols = [];
      for (let r = 0; r < this.size; r++) {
        let full = true;
        for (let c = 0; c < this.size; c++) {
          if (this.grid[r][c].element === null && !tempSet.has(`${r},${c}`)) {
            full = false;
            break;
          }
        }
        if (full) rows.push(r);
      }

      for (let c = 0; c < this.size; c++) {
        let full = true;
        for (let r = 0; r < this.size; r++) {
          if (this.grid[r][c].element === null && !tempSet.has(`${r},${c}`)) {
            full = false;
            break;
          }
        }
        if (full) cols.push(c);
      }

      return { rows, cols };
    }

    clearCompletedLines() {
      const fullRows = [];
      const fullCols = [];

      for (let r = 0; r < this.size; r++) {
        let full = true;
        for (let c = 0; c < this.size; c++) {
          if (this.grid[r][c].element === null) {
            full = false;
            break;
          }
        }
        if (full) fullRows.push(r);
      }

      for (let c = 0; c < this.size; c++) {
        let full = true;
        for (let r = 0; r < this.size; r++) {
          if (this.grid[r][c].element === null) {
            full = false;
            break;
          }
        }
        if (full) fullCols.push(c);
      }

      const uniqueMap = new Map();
      fullRows.forEach((r) => {
        for (let c = 0; c < this.size; c++) {
          uniqueMap.set(`${r},${c}`, { r, c });
        }
      });
      fullCols.forEach((c) => {
        for (let r = 0; r < this.size; r++) {
          uniqueMap.set(`${r},${c}`, { r, c });
        }
      });

      const clearedCells = [];
      let starsCollected = 0;

      uniqueMap.forEach(({ r, c }) => {
        const cell = this.grid[r][c];
        const hadStar = Boolean(cell.hasStar);
        if (hadStar) {
          starsCollected++;
        }
        clearedCells.push({
          r,
          c,
          element: cell.element,
          hadStar
        });
        // Clear cell and star cleanly to prevent duplicate rewards
        this.grid[r][c] = { element: null, hasStar: false };
      });

      return {
        fullRows,
        fullCols,
        totalLines: fullRows.length + fullCols.length,
        clearedCells,
        starsCollected
      };
    }

    countStars() {
      let count = 0;
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (this.grid[r][c].hasStar) count++;
        }
      }
      return count;
    }

    spawnStarOnBoard() {
      if (this.countStars() >= 2) return null;
      const candidates = [];
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (!this.grid[r][c].hasStar) {
            candidates.push({ r, c, occupied: this.grid[r][c].element !== null });
          }
        }
      }
      if (candidates.length === 0) return null;
      // Prefer empty or occupied cells fairly; empty cells encourage building lines through them
      const emptyOnes = candidates.filter((x) => !x.occupied);
      const pool = emptyOnes.length > 0 ? emptyOnes : candidates;
      const pick = pool[Math.floor(Math.random() * pool.length)];
      this.grid[pick.r][pick.c].hasStar = true;
      return { r: pick.r, c: pick.c };
    }

    clearArea3x3(centerR, centerC) {
      const removed = [];
      let starsCollected = 0;
      for (let dr = -1; dr <= 1; dr++) {
        for (let dc = -1; dc <= 1; dc++) {
          const r = centerR + dr;
          const c = centerC + dc;
          if (r >= 0 && r < this.size && c >= 0 && c < this.size) {
            const cell = this.grid[r][c];
            if (cell.element !== null || cell.hasStar) {
              if (cell.hasStar) starsCollected++;
              if (cell.element !== null) {
                removed.push({ r, c, element: cell.element, hadStar: cell.hasStar });
              }
              this.grid[r][c] = { element: null, hasStar: false };
            }
          }
        }
      }
      return { removed, starsCollected };
    }

    clearByElement(element) {
      const removed = [];
      let starsCollected = 0;
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          const cell = this.grid[r][c];
          if (cell.element === element) {
            if (cell.hasStar) starsCollected++;
            removed.push({ r, c, element: cell.element, hadStar: cell.hasStar });
            this.grid[r][c] = { element: null, hasStar: false };
          }
        }
      }
      return { removed, starsCollected };
    }

    clearSingleCell(r, c) {
      if (r < 0 || r >= this.size || c < 0 || c >= this.size) return null;
      const cell = this.grid[r][c];
      if (cell.element === null) return null;
      const hadStar = Boolean(cell.hasStar);
      const result = { r, c, element: cell.element, hadStar };
      this.grid[r][c] = { element: null, hasStar: false };
      return result;
    }

    hasAnyOccupiedCell() {
      for (let r = 0; r < this.size; r++) {
        for (let c = 0; c < this.size; c++) {
          if (this.grid[r][c].element !== null) return true;
        }
      }
      return false;
    }

    serialize() {
      return this.grid.map((row) => row.map((cell) => ({ element: cell.element, hasStar: cell.hasStar })));
    }
  }

  EB.Board = Board;
  EB.GRID_SIZE = GRID_SIZE;
})(window);
