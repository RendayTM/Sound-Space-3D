import { Vector3 } from '../public/Vector3';

interface MeshJSON {
  metadata?: {
    position?: number;
    type?: string;
    generator?: string;
    version?: number;
  };
  data?: {
    attributes?: {
      position?: {
        itemSize: number;
        type?: string;
        array: number[];
      };
    };
    index?: {
      itemSize?: number;
      type?: string;
      array: number[];
    };
  };
}

export class Mesh {
  Position: Vector3;
  Rotation: Vector3;
  Scale: number;

  Vertices: Vector3[];
  UVs: { x: number; y: number }[] = [];
  Normals: Vector3[] = [];
  Indices: number[];

  Texture: HTMLImageElement | null;
  texturePixels: ImageData | null;
  RenderType: 'Texture' | 'Plain' | 'Wireframe';
  Shade: boolean;

  constructor(
    public name: string,
    verticesCount: number,
    RenderType: 'Texture' | 'Plain' | 'Wireframe'
  ) {
    this.Vertices = new Array(verticesCount);
    this.Indices = [];
    this.RenderType = RenderType;

    this.Rotation = Vector3.zero();
    this.Position = Vector3.zero();
    this.Scale = 1;

    this.Texture = null;
    this.texturePixels = null;
    this.Shade = true;
  }

  /**
   * Creates a Mesh from parsed JSON data.
   */
  static fromJSON(name: string, json: MeshJSON): Mesh {
    const positionData = json.data?.attributes?.position;

    if (!positionData || !Array.isArray(positionData.array)) {
      throw new Error('Invalid mesh JSON: missing position vertex data.');
    }

    if (positionData.itemSize !== 3) {
      throw new Error('Invalid mesh JSON: position itemSize must be 3.');
    }

    const positions = positionData.array;

    if (positions.length % 3 !== 0) {
      throw new Error(
        'Invalid mesh JSON: position array length must be divisible by 3.'
      );
    }

    const vertexCount = positions.length / 3;
    const mesh = new Mesh(name, vertexCount, 'Texture');

    // Load vertices.
    for (let i = 0; i < positions.length; i += 3) {
      const x = positions[i];
      const y = positions[i + 1];
      const z = positions[i + 2];

      if (!Number.isFinite(x) || !Number.isFinite(y) || !Number.isFinite(z)) {
        throw new Error(`Invalid vertex coordinates at array index ${i}.`);
      }

      mesh.Vertices[i / 3] = new Vector3(x, y, z);
    }

    // Load triangle indices.
    const indexData = json.data?.index;

    if (indexData) {
      if (!Array.isArray(indexData.array)) {
        throw new Error('Invalid mesh JSON: index array is invalid.');
      }

      const indices = indexData.array;

      if (indices.length % 3 !== 0) {
        throw new Error(
          'Invalid mesh JSON: index count must be divisible by 3.'
        );
      }

      for (const index of indices) {
        if (!Number.isInteger(index) || index < 0 || index >= vertexCount) {
          throw new Error(
            `Invalid mesh index: ${index}. Vertex count is ${vertexCount}.`
          );
        }
      }

      mesh.Indices = [...indices];
    }

    return mesh;
  }

  /**
   * Loads a Mesh from a JSON file URL in the browser.
   */
  static async loadJSON(name: string, url: string): Promise<Mesh> {
    const response = await fetch(url);

    if (!response.ok) {
      throw new Error(`Failed to load mesh "${name}": HTTP ${response.status}`);
    }

    const json = (await response.json()) as MeshJSON;

    return Mesh.fromJSON(name, json);
  }

  generateSphericalUVs(): void {
    if (this.Vertices.length === 0) {
      this.UVs = [];
      return;
    }

    // Find the center of the mesh.
    let centerX = 0;
    let centerY = 0;
    let centerZ = 0;

    for (const vertex of this.Vertices) {
      centerX += vertex.x;
      centerY += vertex.y;
      centerZ += vertex.z;
    }

    centerX /= this.Vertices.length;
    centerY /= this.Vertices.length;
    centerZ /= this.Vertices.length;

    this.UVs = this.Vertices.map((vertex) => {
      const x = vertex.x - centerX;
      const y = vertex.y - centerY;
      const z = vertex.z - centerZ;

      // Convert the direction into longitude and latitude.
      const u = 0.5 + Math.atan2(z, x) / (2 * Math.PI);

      const length = Math.sqrt(x * x + y * y + z * z);
      const safeY = length > 0 ? y / length : 0;

      const v = 0.5 - Math.asin(Math.max(-1, Math.min(1, safeY))) / Math.PI;

      return { x: u, y: v };
    });
  }

  exportUVWireframe(size: number = 1024): void {
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;

    const uvCtx = canvas.getContext('2d');
    if (!uvCtx) {
      throw new Error('Could not create canvas context.');
    }

    const padding = 16;
    const usableSize = size - padding * 2;

    // Background.
    uvCtx.fillStyle = '#202020';
    uvCtx.fillRect(0, 0, size, size);

    // Draw each triangle using its UV coordinates.
    uvCtx.strokeStyle = '#00ff88';
    uvCtx.lineWidth = 1;
    uvCtx.beginPath();

    for (let i = 0; i < this.Indices.length; i += 3) {
      const ia = this.Indices[i];
      const ib = this.Indices[i + 1];
      const ic = this.Indices[i + 2];

      const uvA = this.UVs[ia];
      const uvB = this.UVs[ib];
      const uvC = this.UVs[ic];

      if (!uvA || !uvB || !uvC) continue;

      // UV (0, 0) is displayed at the top-left.
      const ax = padding + uvA.x * usableSize;
      const ay = padding + uvA.y * usableSize;

      const bx = padding + uvB.x * usableSize;
      const by = padding + uvB.y * usableSize;

      const cx = padding + uvC.x * usableSize;
      const cy = padding + uvC.y * usableSize;

      uvCtx.moveTo(ax, ay);
      uvCtx.lineTo(bx, by);
      uvCtx.lineTo(cx, cy);
      uvCtx.closePath();
    }

    uvCtx.stroke();

    // Download the canvas as a PNG.
    const link = document.createElement('a');
    link.download = `${this.name}-uv-wireframe.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  }

  generateVertexNormals(): void {
    this.Normals = this.Vertices.map(() => Vector3.zero());

    // Accumulate each triangle's normal at its vertices.
    for (let i = 0; i < this.Indices.length; i += 3) {
      const ia = this.Indices[i];
      const ib = this.Indices[i + 1];
      const ic = this.Indices[i + 2];

      const a = this.Vertices[ia].clone();
      const b = this.Vertices[ib].clone();
      const c = this.Vertices[ic].clone();

      const edge1 = b.subtract(a);
      const edge2 = c.subtract(a);
      const normal = edge1.cross(edge2);

      this.Normals[ia] = this.Normals[ia].add(normal);
      this.Normals[ib] = this.Normals[ib].add(normal);
      this.Normals[ic] = this.Normals[ic].add(normal);
    }

    // Normalize the accumulated normals.
    this.Normals = this.Normals.map((normal) => normal.normalize());
  }

  private getTexturePixels(texture: HTMLImageElement): ImageData {
    const canvas = document.createElement('canvas');

    canvas.width = texture.width;
    canvas.height = texture.height;

    const textureCtx = canvas.getContext('2d');

    if (!textureCtx) {
      throw new Error('Could not create texture context');
    }

    textureCtx.drawImage(texture, 0, 0);

    return textureCtx.getImageData(0, 0, texture.width, texture.height);
  }

  private uploadTexture(texture: HTMLImageElement) {
    this.Texture = texture;
    this.texturePixels = this.getTexturePixels(texture);
  }

  async loadTexture(url: string): Promise<HTMLImageElement> {
    const image = new Image();

    image.src = url;

    await image.decode();

    this.uploadTexture(image);

    return image;
  }
  static async LoadMesh(meshPath: string, texturePath: string) {
    const Name = /([^/]+)\.[^.]+$/.exec(meshPath);
    if (!Name) throw Error('Could not make out name of path');
    const NewMesh = await Mesh.loadJSON(Name[1], meshPath);
    NewMesh.generateSphericalUVs();
    await NewMesh.loadTexture(texturePath);
    return NewMesh;
  }
  Clone(): Mesh {
    const mesh = new Mesh(this.name, this.Vertices.length, this.RenderType);

    mesh.Position = this.Position.clone();
    mesh.Rotation = this.Rotation.clone();
    mesh.Scale = this.Scale;

    mesh.Vertices = this.Vertices.map((vertex) => vertex.clone());
    mesh.UVs = this.UVs.map((uv) => ({ x: uv.x, y: uv.y }));
    mesh.Normals = this.Normals.map((normal) => normal.clone());
    mesh.Indices = [...this.Indices];

    mesh.Shade = this.Shade;

    mesh.Texture = this.Texture;
    mesh.texturePixels = this.texturePixels;

    return mesh;
  }
}
