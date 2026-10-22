export class Vector3 {
  public x: number;
  public y: number;
  public z: number;

  constructor(x: number = 0, y: number = 0, z: number = 0) {
    this.x = x;
    this.y = y;
    this.z = z;
  }

  // Create common vectors
  static zero(): Vector3 {
    return new Vector3(0, 0, 0);
  }

  static one(): Vector3 {
    return new Vector3(1, 1, 1);
  }

  static up(): Vector3 {
    return new Vector3(0, 1, 0);
  }

  static right(): Vector3 {
    return new Vector3(1, 0, 0);
  }

  static forward(): Vector3 {
    return new Vector3(0, 0, 1);
  }

  // Create a copy of this vector
  clone(): Vector3 {
    return new Vector3(this.x, this.y, this.z);
  }

  // Set all components
  set(x: number, y: number, z: number): this {
    this.x = x;
    this.y = y;
    this.z = z;
    return this;
  }

  // Add another vector
  add(v: Vector3): this {
    this.x += v.x;
    this.y += v.y;
    this.z += v.z;
    return this;
  }

  // Subtract another vector
  subtract(v: Vector3): this {
    this.x -= v.x;
    this.y -= v.y;
    this.z -= v.z;
    return this;
  }

  // Multiply each component by another vector
  multiply(v: Vector3): this {
    this.x *= v.x;
    this.y *= v.y;
    this.z *= v.z;
    return this;
  }

  // Divide each component by another vector
  divide(v: Vector3): this {
    if (v.x === 0 || v.y === 0 || v.z === 0) {
      throw new Error('Cannot divide a Vector3 by a vector containing zero.');
    }
    this.x /= v.x;
    this.y /= v.y;
    this.z /= v.z;
    return this;
  }
  // Multiply each component by a scalar
  scale(scalar: number): this {
    this.x *= scalar;
    this.y *= scalar;
    this.z *= scalar;
    return this;
  }

  // Negate the vector
  negate(): this {
    this.x = -this.x;
    this.y = -this.y;
    this.z = -this.z;
    return this;
  }

  // Calculate the squared length
  lengthSquared(): number {
    return this.x * this.x + this.y * this.y + this.z * this.z;
  }

  // Calculate the length (magnitude)
  length(): number {
    return Math.sqrt(this.lengthSquared());
  }

  // Normalize the vector to length 1
  normalize(): this {
    const len = this.length();

    // Avoid division by zero
    if (len > 0) {
      this.scale(1 / len);
    }

    return this;
  }

  // Set the vector to a specific length
  setLength(length: number): this {
    const currentLength = this.length();

    if (currentLength > 0) {
      this.scale(length / currentLength);
    }

    return this;
  }

  // Calculate the dot product
  dot(v: Vector3): number {
    return this.x * v.x + this.y * v.y + this.z * v.z;
  }

  // Calculate the cross product
  cross(v: Vector3): this {
    const x = this.y * v.z - this.z * v.y;
    const y = this.z * v.x - this.x * v.z;
    const z = this.x * v.y - this.y * v.x;

    this.x = x;
    this.y = y;
    this.z = z;

    return this;
  }

  // Calculate the distance to another vector
  distanceTo(v: Vector3): number {
    return Math.sqrt(this.distanceToSquared(v));
  }

  // Calculate the squared distance to another vector
  distanceToSquared(v: Vector3): number {
    const dx = this.x - v.x;
    const dy = this.y - v.y;
    const dz = this.z - v.z;

    return dx * dx + dy * dy + dz * dz;
  }

  // Calculate the angle between two vectors, in radians
  angleTo(v: Vector3): number {
    const denominator = this.length() * v.length();

    if (denominator === 0) {
      return 0;
    }

    const cosine = this.dot(v) / denominator;

    // Clamp to avoid floating-point errors
    const clamped = Math.max(-1, Math.min(1, cosine));

    return Math.acos(clamped);
  }

  // Check whether two vectors are equal
  equals(v: Vector3): boolean {
    return this.x === v.x && this.y === v.y && this.z === v.z;
  }

  // Check whether all components are approximately equal
  approximatelyEquals(v: Vector3, epsilon: number = 1e-6): boolean {
    return (
      Math.abs(this.x - v.x) <= epsilon &&
      Math.abs(this.y - v.y) <= epsilon &&
      Math.abs(this.z - v.z) <= epsilon
    );
  }

  // Linear interpolation between this vector and another
  lerp(v: Vector3, t: number): this {
    this.x += (v.x - this.x) * t;
    this.y += (v.y - this.y) * t;
    this.z += (v.z - this.z) * t;
    return this;
  }

  // Limit the vector's length
  clampLength(maxLength: number): this {
    const len = this.length();

    if (len > maxLength && len > 0) {
      this.scale(maxLength / len);
    }

    return this;
  }

  // Convert to an array
  toArray(): [number, number, number] {
    return [this.x, this.y, this.z];
  }

  // Convert to a readable string
  toString(): string {
    return `Vector3(${this.x}, ${this.y}, ${this.z})`;
  }

  // Static operations that return new vectors

  static add(a: Vector3, b: Vector3): Vector3 {
    return new Vector3(a.x + b.x, a.y + b.y, a.z + b.z);
  }

  static subtract(a: Vector3, b: Vector3): Vector3 {
    return new Vector3(a.x - b.x, a.y - b.y, a.z - b.z);
  }

  static scale(v: Vector3, scalar: number): Vector3 {
    return new Vector3(v.x * scalar, v.y * scalar, v.z * scalar);
  }

  static dot(a: Vector3, b: Vector3): number {
    return a.x * b.x + a.y * b.y + a.z * b.z;
  }

  static cross(a: Vector3, b: Vector3): Vector3 {
    return new Vector3(
      a.y * b.z - a.z * b.y,
      a.z * b.x - a.x * b.z,
      a.x * b.y - a.y * b.x
    );
  }

  static distance(a: Vector3, b: Vector3): number {
    return a.distanceTo(b);
  }

  static normalize(v: Vector3): Vector3 {
    return v.clone().normalize();
  }

  static lookVector(yaw: number, pitch: number): Vector3 {
    const yawRad = (yaw * Math.PI) / 180;
    const pitchRad = (pitch * Math.PI) / 180;

    return new Vector3(
      Math.sin(yawRad) * Math.cos(pitchRad),
      Math.sin(pitchRad),
      Math.cos(yawRad) * Math.cos(pitchRad)
    );
  }

  static lerp(a: Vector3, b: Vector3, t: number): Vector3 {
    return a.clone().lerp(b, t);
  }
}
