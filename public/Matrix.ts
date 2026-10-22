import { Vector3 } from './Vector3';

export class Matrix {
  public readonly rows: number;
  public readonly columns: number;
  public readonly data: Float32Array;

  constructor(rows: number = 4, columns: number = 4) {
    if (
      !Number.isInteger(rows) ||
      !Number.isInteger(columns) ||
      rows < 1 ||
      columns < 1
    ) {
      throw new Error('Matrix dimensions must be positive integers.');
    }

    this.rows = rows;
    this.columns = columns;
    this.data = new Float32Array(rows * columns);
  }

  // --------------------------------------------------
  // Access
  // --------------------------------------------------

  // Column-major storage:
  // index = column * rows + row

  get(row: number, column: number): number {
    this.validateIndex(row, column);
    return this.data[column * this.rows + row];
  }

  set(row: number, column: number, value: number): this {
    this.validateIndex(row, column);
    this.data[column * this.rows + row] = value;
    return this;
  }

  private validateIndex(row: number, column: number): void {
    if (
      !Number.isInteger(row) ||
      !Number.isInteger(column) ||
      row < 0 ||
      row >= this.rows ||
      column < 0 ||
      column >= this.columns
    ) {
      throw new RangeError(`Index (${row}, ${column}) is outside the matrix.`);
    }
  }

  private require4x4(): void {
    if (this.rows !== 4 || this.columns !== 4) {
      throw new Error('This operation requires a 4x4 matrix.');
    }
  }

  private requireSquare(): void {
    if (this.rows !== this.columns) {
      throw new Error('This operation requires a square matrix.');
    }
  }

  // --------------------------------------------------
  // Basic operations
  // --------------------------------------------------

  clone(): Matrix {
    const result = new Matrix(this.rows, this.columns);
    result.data.set(this.data);
    return result;
  }

  copyFrom(other: Matrix): this {
    this.requireSameDimensions(other);
    this.data.set(other.data);
    return this;
  }

  private requireSameDimensions(other: Matrix): void {
    if (this.rows !== other.rows || this.columns !== other.columns) {
      throw new Error('Matrix dimensions must match.');
    }
  }

  fill(value: number): this {
    this.data.fill(value);
    return this;
  }

  zero(): this {
    return this.fill(0);
  }

  identity(): this {
    this.requireSquare();
    this.zero();

    for (let i = 0; i < this.rows; i++) {
      this.set(i, i, 1);
    }

    return this;
  }

  static identity(size: number = 4): Matrix {
    return new Matrix(size, size).identity();
  }

  static zero(rows: number = 4, columns: number = 4): Matrix {
    return new Matrix(rows, columns);
  }

  static fromVector3(v: Vector3): Matrix {
    const result = new Matrix(4, 1);

    result.set(0, 0, v.x);
    result.set(1, 0, v.y);
    result.set(2, 0, v.z);
    result.set(3, 0, 1);

    return result;
  }

  // --------------------------------------------------
  // Addition and subtraction
  // --------------------------------------------------

  add(other: Matrix): Matrix {
    this.requireSameDimensions(other);

    const result = new Matrix(this.rows, this.columns);

    for (let i = 0; i < this.data.length; i++) {
      result.data[i] = this.data[i] + other.data[i];
    }

    return result;
  }

  subtract(other: Matrix): Matrix {
    this.requireSameDimensions(other);

    const result = new Matrix(this.rows, this.columns);

    for (let i = 0; i < this.data.length; i++) {
      result.data[i] = this.data[i] - other.data[i];
    }

    return result;
  }

  scale(scalar: number): Matrix {
    const result = new Matrix(this.rows, this.columns);

    for (let i = 0; i < this.data.length; i++) {
      result.data[i] = this.data[i] * (i == this.data.length - 1 ? 1 : scalar);
    }

    return result;
  }

  // --------------------------------------------------
  // Matrix multiplication
  // --------------------------------------------------

  // Returns a new matrix. Does not modify either input.
  multiply(other: Matrix): Matrix {
    if (this.columns !== other.rows) {
      throw new Error(
        `Cannot multiply ${this.rows}x${this.columns} by ` +
          `${other.rows}x${other.columns}.`
      );
    }

    const result = new Matrix(this.rows, other.columns);

    // Column-major multiplication.
    for (let column = 0; column < other.columns; column++) {
      for (let k = 0; k < this.columns; k++) {
        const b = other.data[column * other.rows + k];

        const resultColumn = column * result.rows;
        const thisColumn = k * this.rows;

        for (let row = 0; row < this.rows; row++) {
          result.data[resultColumn + row] += this.data[thisColumn + row] * b;
        }
      }
    }

    return result;
  }

  // Modifies this matrix: this = this * other.
  multiplyInPlace(other: Matrix): this {
    const result = this.multiply(other);
    this.data.set(result.data);
    return this;
  }

  static multiply(a: Matrix, b: Matrix): Matrix {
    return a.multiply(b);
  }

  // --------------------------------------------------
  // Transpose
  // --------------------------------------------------

  transpose(): Matrix {
    const result = new Matrix(this.columns, this.rows);

    for (let row = 0; row < this.rows; row++) {
      for (let column = 0; column < this.columns; column++) {
        result.set(column, row, this.get(row, column));
      }
    }

    return result;
  }

  // --------------------------------------------------
  // Translation, rotation and scaling
  // All transformation matrices are 4x4.
  // --------------------------------------------------

  static translation(x: number, y: number, z: number): Matrix {
    const result = Matrix.identity(4);

    result.set(0, 3, x);
    result.set(1, 3, y);
    result.set(2, 3, z);

    return result;
  }

  static scaling(x: number, y: number, z: number): Matrix {
    const result = Matrix.identity(4);

    result.set(0, 0, x);
    result.set(1, 1, y);
    result.set(2, 2, z);

    return result;
  }

  static rotationX(radians: number): Matrix {
    const result = Matrix.identity(4);
    const c = Math.cos(radians);
    const s = Math.sin(radians);

    result.set(1, 1, c);
    result.set(1, 2, -s);
    result.set(2, 1, s);
    result.set(2, 2, c);

    return result;
  }

  static rotationY(radians: number): Matrix {
    const result = Matrix.identity(4);
    const c = Math.cos(radians);
    const s = Math.sin(radians);

    result.set(0, 0, c);
    result.set(0, 2, s);
    result.set(2, 0, -s);
    result.set(2, 2, c);

    return result;
  }

  static rotationZ(radians: number): Matrix {
    const result = Matrix.identity(4);
    const c = Math.cos(radians);
    const s = Math.sin(radians);

    result.set(0, 0, c);
    result.set(0, 1, -s);
    result.set(1, 0, s);
    result.set(1, 1, c);

    return result;
  }

  // Applies a translation after the existing transform.
  translate(x: number, y: number, z: number): this {
    return this.multiplyInPlace(Matrix.translation(x, y, z));
  }

  // Applies scaling after the existing transform.
  scaleBy(x: number, y: number, z: number): this {
    return this.multiplyInPlace(Matrix.scaling(x, y, z));
  }

  rotateX(radians: number): this {
    return this.multiplyInPlace(Matrix.rotationX(radians));
  }

  rotateY(radians: number): this {
    return this.multiplyInPlace(Matrix.rotationY(radians));
  }

  rotateZ(radians: number): this {
    return this.multiplyInPlace(Matrix.rotationZ(radians));
  }

  // --------------------------------------------------
  // Camera: LookAt
  // Right-handed coordinate system.
  // Camera looks along its local -Z axis.
  // --------------------------------------------------

  static lookAt(
    eye: Vector3,
    target: Vector3,
    up: Vector3 = Vector3.up()
  ): Matrix {
    const fx = target.x - eye.x;
    const fy = target.y - eye.y;
    const fz = target.z - eye.z;

    const fLength = Math.hypot(fx, fy, fz);

    if (fLength === 0) {
      throw new Error('Camera eye and target must differ.');
    }

    const fxn = fx / fLength;
    const fyn = fy / fLength;
    const fzn = fz / fLength;

    // Right = forward x up
    let sx = fyn * up.z - fzn * up.y;
    let sy = fzn * up.x - fxn * up.z;
    let sz = fxn * up.y - fyn * up.x;

    const sLength = Math.max(Math.hypot(sx, sy, sz), 1e-10);

    sx /= sLength;
    sy /= sLength;
    sz /= sLength;

    // Corrected up = right x forward
    const ux = sy * fzn - sz * fyn;
    const uy = sz * fxn - sx * fzn;
    const uz = sx * fyn - sy * fxn;

    const result = Matrix.identity(4);

    result.set(0, 0, sx);
    result.set(0, 1, sy);
    result.set(0, 2, sz);
    result.set(0, 3, -(sx * eye.x + sy * eye.y + sz * eye.z));

    result.set(1, 0, ux);
    result.set(1, 1, uy);
    result.set(1, 2, uz);
    result.set(1, 3, -(ux * eye.x + uy * eye.y + uz * eye.z));

    result.set(2, 0, -fxn);
    result.set(2, 1, -fyn);
    result.set(2, 2, -fzn);
    result.set(2, 3, fxn * eye.x + fyn * eye.y + fzn * eye.z);

    return result;
  }

  // --------------------------------------------------
  // Perspective projection
  // FOV is in radians.
  // Uses OpenGL-style clip-space depth (-1 to 1).
  // --------------------------------------------------

  static perspective(
    fovRadians: number,
    aspectRatio: number,
    near: number,
    far: number
  ): Matrix {
    if (
      !Number.isFinite(fovRadians) ||
      fovRadians <= 0 ||
      fovRadians >= Math.PI
    ) {
      throw new Error('FOV must be between 0 and PI radians.');
    }

    if (!Number.isFinite(aspectRatio) || aspectRatio <= 0) {
      throw new Error('Aspect ratio must be positive.');
    }

    if (
      !Number.isFinite(near) ||
      !Number.isFinite(far) ||
      near <= 0 ||
      far <= near
    ) {
      throw new Error('Require 0 < near < far.');
    }

    const f = 1 / Math.tan(fovRadians / 2);
    const result = new Matrix(4, 4);

    result.set(0, 0, f / aspectRatio);
    result.set(1, 1, f);
    result.set(2, 2, -(far + near) / (far - near));
    result.set(2, 3, -(2 * far * near) / (far - near));
    result.set(3, 2, -1);

    return result;
  }

  // --------------------------------------------------
  // Orthographic projection
  // --------------------------------------------------

  static orthographic(
    left: number,
    right: number,
    bottom: number,
    top: number,
    near: number,
    far: number
  ): Matrix {
    if (left === right || bottom === top || near === far) {
      throw new Error('Orthographic bounds must not be equal.');
    }

    const result = Matrix.identity(4);

    result.set(0, 0, 2 / (right - left));
    result.set(1, 1, 2 / (top - bottom));
    result.set(2, 2, -2 / (far - near));

    result.set(0, 3, -(right + left) / (right - left));
    result.set(1, 3, -(top + bottom) / (top - bottom));
    result.set(2, 3, -(far + near) / (far - near));

    return result;
  }

  // --------------------------------------------------
  // Transform a Vector3
  // --------------------------------------------------

  // Transforms a point, including translation and perspective divide.
  transformPoint(v: Vector3): Vector3 {
    this.require4x4();

    const x = v.x;
    const y = v.y;
    const z = v.z;

    const tx =
      this.get(0, 0) * x +
      this.get(0, 1) * y +
      this.get(0, 2) * z +
      this.get(0, 3);

    const ty =
      this.get(1, 0) * x +
      this.get(1, 1) * y +
      this.get(1, 2) * z +
      this.get(1, 3);

    const tz =
      this.get(2, 0) * x +
      this.get(2, 1) * y +
      this.get(2, 2) * z +
      this.get(2, 3);

    const tw =
      this.get(3, 0) * x +
      this.get(3, 1) * y +
      this.get(3, 2) * z +
      this.get(3, 3);

    if (Math.abs(tw) < 1e-10) {
      throw new Error('Cannot transform point: homogeneous w is zero.');
    }

    return new Vector3(tx / tw, ty / tw, tz / tw);
  }

  // Transforms a direction, ignoring translation.
  transformDirection(v: Vector3): Vector3 {
    this.require4x4();

    return new Vector3(
      this.get(0, 0) * v.x + this.get(0, 1) * v.y + this.get(0, 2) * v.z,

      this.get(1, 0) * v.x + this.get(1, 1) * v.y + this.get(1, 2) * v.z,

      this.get(2, 0) * v.x + this.get(2, 1) * v.y + this.get(2, 2) * v.z
    );
  }

  // --------------------------------------------------
  // Debugging and conversion
  // --------------------------------------------------

  toArray(): number[] {
    return Array.from(this.data);
  }

  toRows(): number[][] {
    const result: number[][] = [];

    for (let row = 0; row < this.rows; row++) {
      const values: number[] = [];

      for (let column = 0; column < this.columns; column++) {
        values.push(this.get(row, column));
      }

      result.push(values);
    }

    return result;
  }

  log(): void {
    console.table(this.toRows());
  }

  toString(): string {
    return this.toRows()
      .map((row) => `[${row.join(', ')}]`)
      .join('\n');
  }
}

// class Matrix {
//   Rows: number;
//   Columns: number;
//   Matrix: number[][];
//   constructor(rows: number, columns: number) {
//     this.Rows = rows;
//     this.Columns = columns;
//     this.Matrix = this.CreateMatrix(rows, columns);
//   }
//   CreateMatrix(Rows: number, Columns: number) {
//     this.Rows = Rows;
//     this.Columns = Columns;
//     const NewMatrix: number[][] = [];
//     for (let i = 0; i < Rows; i++) {
//       NewMatrix.push([]);
//       for (let j = 0; j < Columns; j++) {
//         NewMatrix[i].push(0);
//       }
//     }
//     return NewMatrix;
//   }
//   Multiply(MultMatrix: Matrix): Matrix {
//     const NewMatrix = new Matrix(this.Rows, MultMatrix.Columns);
//     const Rows = NewMatrix.Rows;
//     const Columns = NewMatrix.Columns;
//     for (let i = 0; i < Rows; i++) {
//       for (let j = 0; j < Columns; j++) {
//         for (let k = 0; k < this.Columns; k++) {
//           NewMatrix.Matrix[i][j] += this.Matrix[i][k] * MultMatrix.Matrix[k][j];
//         }
//       }
//     }
//     return NewMatrix;
//   }
//   Randomize(Min: number, Max: number) {
//     for (let i = 0; i < this.Rows; i++) {
//       for (let j = 0; j < this.Columns; j++) {
//         this.Matrix[i][j] = randomNumber(Min, Max);
//       }
//     }
//   }
//   Identity(Positional: boolean) {
//     for (let i = 0; i < this.Rows; i++) {
//       for (let j = 0; j < this.Columns; j++) {
//         if (i == this.Rows - 1 && j == this.Columns - 1)
//           this.Matrix[i][j] = +Positional;
//         else this.Matrix[i][j] = i == j ? 1 : 0;
//       }
//     }
//   }
//   Log() {
//     for (let i = 0; i < this.Rows; i++) {
//       console.log(this.Matrix[i]);
//     }
//   }
//   Translate(x: number, y: number, z: number) {
//     const M = new Matrix(4, 1);
//     M.Matrix[0][0] = x;
//     M.Matrix[1][0] = y;
//     M.Matrix[2][0] = z;
//     M.Matrix[3][0] = this.Matrix[3][3];
//     this.Matrix = this.Multiply(M).Matrix;
//   }
//   Rotation(x: Vector3, y: Vector3, z: Vector3) {
//     const V = [x, y, z];
//     const M = new Matrix(4, 4);
//     for (let i = 0; i < 3; i++) {
//       for (let j = 0; j < 3; j++) {
//         const dir = j == 0 ? 'x' : j == 1 ? 'y' : 'z';
//         M.Matrix[i][j] = V[i][dir];
//       }
//     }
//     M.Matrix[3][3] = 1
//     return M
//   }
//   LookAt(Eye: Vector3, Center: Vector3, Up: Vector3 = Vector3.up()) {
//     const M1 = new Matrix(4, 4);
//     const M2 = new Matrix(4, 4)
//     const z = Eye.subtract(Center).normalize();
//     const x = z.multiply(Up).normalize();
//     const y = z.multiply(x);
//     M1.Matrix = this.Rotation(x, y, z).Matrix
//     M2.Identity(true)
//     M2.Matrix[0][0] = -Eye.x
//     M2.Matrix[1][0] = -Eye.y
//     M2.Matrix[2][0] = -Eye.z
//     M1.Multiply(M2)
//   }
//   Perspective(FOV: number, AR: number, zNear: number, zFar: number) {
//     const M = new Matrix(4, 4);
//     const TanFOV = Math.tan(FOV / 2);
//     M.Matrix[0][0] = 1 / (AR * TanFOV);
//     M.Matrix[1][1] = 1 / TanFOV;
//     M.Matrix[2][2] = -(zFar + zNear) / (zFar - zNear);
//     M.Matrix[3][2] = -(2 * zFar * zNear) / (zFar - zNear);
//     M.Matrix[2][3] = -1;
//     this.Matrix = M.Matrix;
//   }
// }
