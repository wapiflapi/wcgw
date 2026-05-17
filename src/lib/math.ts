export type Vector2 = {
  x: number
  y: number
}

export function dotVector2(a: Vector2, b: Vector2) {
  return a.x * b.x + a.y * b.y
}

export function scaleVector2(vector: Vector2, scalar: number): Vector2 {
  return {
    x: vector.x * scalar,
    y: vector.y * scalar,
  }
}

export function subtractVector2(a: Vector2, b: Vector2): Vector2 {
  return {
    x: a.x - b.x,
    y: a.y - b.y,
  }
}
