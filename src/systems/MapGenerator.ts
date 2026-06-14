import { MAP, VIEW } from "../config.ts";

export const enum Tile {
  Floor = 0,
  Wall = 1,
}

export interface GridPoint {
  col: number;
  row: number;
}

/**
 * A generated night map: a bordered arena with scattered obstacle clusters.
 * Returns the tile grid plus useful spawn points in world coordinates.
 */
export interface GameMap {
  cols: number;
  rows: number;
  tiles: Tile[][];
  /** All walkable cells, in grid coordinates. */
  floorCells: GridPoint[];
  playerSpawn: Phaser.Types.Math.Vector2Like;
  coffinSpawn: Phaser.Types.Math.Vector2Like;
}

/** Convert a grid cell center to world pixel coordinates. */
export function cellToWorld(col: number, row: number): Phaser.Types.Math.Vector2Like {
  return {
    x: col * VIEW.tile + VIEW.tile / 2,
    y: row * VIEW.tile + VIEW.tile / 2,
  };
}

function pick<T>(rng: Phaser.Math.RandomDataGenerator, arr: T[]): T {
  return arr[rng.between(0, arr.length - 1)];
}

/**
 * Generate a map. The border is solid wall; the interior is mostly floor with
 * a few small obstacle clusters. Player spawns top-left, coffin bottom-right,
 * so the player must traverse the map (and survive) to reach safety by dawn.
 */
export function generateMap(rng: Phaser.Math.RandomDataGenerator): GameMap {
  const { cols, rows, obstacleDensity } = MAP;
  const tiles: Tile[][] = [];

  for (let r = 0; r < rows; r++) {
    tiles[r] = [];
    for (let c = 0; c < cols; c++) {
      const isBorder = r === 0 || c === 0 || r === rows - 1 || c === cols - 1;
      tiles[r][c] = isBorder ? Tile.Wall : Tile.Floor;
    }
  }

  // Scatter small obstacle clusters in the interior, away from the edges.
  const clusterCount = Math.floor(cols * rows * obstacleDensity);
  for (let i = 0; i < clusterCount; i++) {
    const cc = rng.between(3, cols - 4);
    const cr = rng.between(3, rows - 4);
    const size = rng.between(1, 2);
    for (let dr = 0; dr <= size; dr++) {
      for (let dc = 0; dc <= size; dc++) {
        if (rng.frac() < 0.6) tiles[cr + dr][cc + dc] = Tile.Wall;
      }
    }
  }

  // Keep spawn and coffin corners clear so they are always reachable.
  const clearArea = (col: number, row: number) => {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        tiles[row + dr][col + dc] = Tile.Floor;
      }
    }
  };
  const spawnCell: GridPoint = { col: 2, row: 2 };
  const coffinCell: GridPoint = { col: cols - 3, row: rows - 3 };
  clearArea(spawnCell.col, spawnCell.row);
  clearArea(coffinCell.col, coffinCell.row);

  const floorCells: GridPoint[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      if (tiles[r][c] === Tile.Floor) floorCells.push({ col: c, row: r });
    }
  }

  return {
    cols,
    rows,
    tiles,
    floorCells,
    playerSpawn: cellToWorld(spawnCell.col, spawnCell.row),
    coffinSpawn: cellToWorld(coffinCell.col, coffinCell.row),
  };
}

/**
 * Pick a random floor cell that is at least `minDistCells` away from a point,
 * so spawns do not appear on top of the player.
 */
export function randomFloorAway(
  rng: Phaser.Math.RandomDataGenerator,
  map: GameMap,
  from: Phaser.Types.Math.Vector2Like,
  minDistCells: number
): Phaser.Types.Math.Vector2Like {
  const fromCol = Math.floor((from.x ?? 0) / VIEW.tile);
  const fromRow = Math.floor((from.y ?? 0) / VIEW.tile);
  const minSq = minDistCells * minDistCells;
  const candidates = map.floorCells.filter((cell) => {
    const dc = cell.col - fromCol;
    const dr = cell.row - fromRow;
    return dc * dc + dr * dr >= minSq;
  });
  const cell = pick(rng, candidates.length > 0 ? candidates : map.floorCells);
  return cellToWorld(cell.col, cell.row);
}
