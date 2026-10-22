import { Matrix } from '../public/Matrix';
import { Vector3 } from '../public/Vector3';
import { Mesh } from '../public/Mesh';

function rgbToHex(r: number, g: number, b: number): string {
  const toHex = (value: number) =>
    Math.round(Math.max(0, Math.min(255, value)))
      .toString(16)
      .padStart(2, '0');

  return `#${toHex(r)}${toHex(g)}${toHex(b)}`;
}

function SecondsToMinutes(Seconds: number) {
  let S: number | string = Clamp(0, Seconds, Infinity);
  const M = Math.floor(S / 60);
  if (M == 0) S = Math.floor(S);
  else S = Math.floor(S % (M * 60));
  if (String(S).length == 1) S = '0' + S;

  return String(M + ':' + S);
}

function Average(Values: number[]) {
  const avg = Values.reduce((a, b) => a + b) / Values.length;
  return avg;
}

function Clamp(xMin: number, x: number, xMax: number) {
  return Math.min(xMax, Math.max(xMin, x));
}

function loadAudioAsync(url: string): Promise<HTMLAudioElement> {
  return new Promise<HTMLAudioElement>((resolve, reject) => {
    const audio = new Audio(url);

    audio.addEventListener(
      'canplaythrough',
      () => {
        resolve(audio);
      },
      { once: true }
    );

    audio.addEventListener(
      'error',
      () => {
        reject(new Error('Failed to load the audio file.'));
      },
      { once: true }
    );
  });
}

interface LevelJSON {
  Song: RequestInfo | URL;
  Data: string;
}

type Projection = {
  x: number;
  y: number;
  depth: number;
  invW: number; // 1 / clip-space W, used for perspective-correct UVs
  visible: boolean;
};

type ClipVertex = Projection & {
  uOverW: number;
  vOverW: number;
  normal: Vector3;
  brightness: number;
};

type Miss = {
  x: number;
  dt: number;
}

// Vertices stay in homogeneous clip space until all six frustum planes are clipped.
type FrustumVertex = {
  cx: number;
  cy: number;
  cz: number;
  cw: number;
  u: number;
  v: number;
  normal: Vector3;
  brightness: number;
};

type xy = {
  x: number;
  y: number;
};

type Note = {
  x: number;
  y: number;
  dt: number;
  model: Mesh | null | true;
  i: number;
};

class Level {
  Name: string;
  Music: HTMLAudioElement | null;
  Notes: Note[];
  CloneModel: Mesh | null;
  StartTime: number;

  constructor(Name: string) {
    this.Name = Name;
    this.Music = null;
    this.Notes = [];
    this.CloneModel = null;
    this.StartTime = 0;
  }

  async LoadLevel(url: string) {
    const response = await fetch(url);
    const json = (await response.json()) as LevelJSON;
    const regex = /(?:^|,)(\d+\|\d+\|\d+)/g;
    let match: RegExpExecArray | null;
    while ((match = regex.exec(json.Data)) !== null) {
      const output = match[1].split('|').map(Number);
      const Note: Note = {
        x: output[0],
        y: output[1],
        dt: output[2],
        model: null,
        i: 0,
      };
      this.Notes.push(Note);
    }
    this.Music = await loadAudioAsync(String(json.Song));

    this.CloneModel = await Mesh.LoadMesh(NoteMesh, NoteTexture);

    StartDt = _timestamp0 + Delay + 200;
  }

  Play(dt: number, Speed: number) {
    for (let i = 0; i < this.Notes.length; i++) {
      const Note = this.Notes[i];
      if (
        !Note.model &&
        dt <= Note.dt / Speed &&
        Note.dt / Speed - dt < (100 * SpawnDistance) / ApproachSpeed &&
        Note.dt / Speed - dt > 0 &&
        this.CloneModel
      ) {
        Note.model = true;
        Note.model = this.CloneModel.Clone();
      } else if (Note.dt / Speed - dt < 0 && Note.model instanceof Mesh) {
        const x = Note.model.Position.x;
        const y = Note.model.Position.y;
        let hit = false;
        for (let i = 0; i < MouseBuffer.length; i++) {
          if (
            Math.abs(x - MouseBuffer[i].x) <= 0.5 &&
            Math.abs(y - MouseBuffer[i].y) <= 0.5
          ) {
            hit = true;
          }
        }
        Note.i++;
        if (hit) {
          this.HitNote();
          Note.model = null;
        } else if (Note.i > 5 / (PlaySpeed / Cayote)) {
          this.MissedNote(Note.x);
          Note.model = null;
        }
      } else if (Note.model instanceof Mesh) {
        const Model = Note.model;
        const X = Note.x - 1;
        const Y = Note.y - 1;
        const Z = (ApproachSpeed * (dt - Note.dt / Speed)) / 100;
        Model.Position = new Vector3(X, Y, Z);
      }
    }
    const models = this.Notes.map((note) => note.model).filter(
      (model): model is Mesh => model instanceof Mesh
    );
    return models;
  }

  HitNote() {
    MissCombo = 0;
    HitCombo++;
    if (Multiplier == 8) MultiplierProgress = 0;
    else {
      MultiplierProgress++;
      if (MultiplierProgress >= 10) {
        Multiplier = Clamp(1, Multiplier * 2, 8);
        MultiplierProgress = 0;
      }
    }
    if (Health != 0) Health = Clamp(0, Health + Healing, 100);
    Score += 25 * Multiplier;
    Hits++;
    const Sound = HitSound.cloneNode(true) as HTMLAudioElement;
    Sound.volume = 0.3;
    Sound.play();
  }
  MissedNote(x: number) {
    HitCombo = 0;
    MissCombo++;
    Multiplier = Clamp(1, Multiplier / 2, 8);
    MultiplierProgress = 0;
    Health = Clamp(0, Health - Damage * (1 + MissCombo / 5), 100);
    Misses++;
    const Sound = MissSound.cloneNode(true) as HTMLAudioElement;
    Sound.volume = 0.3;
    MissText.push({ x: x, dt: _timestamp0 });
    Sound.play();
  }
}

class Renderer {
  private lightDirection = new Vector3(-0.4, 0.7, 1).normalize();
  private ambientLight = 1;

  private depthBuffer = new Float32Array(0);
  private bufferWidth = 0;
  private bufferHeight = 0;

  private imageData: ImageData | null = null;
  private bufferCanvas = document.createElement('canvas');
  private bufferCtx = this.bufferCanvas.getContext('2d')!;

  MPV(camera: Camera) {
    const target = camera.Position.clone().add(
      Vector3.lookVector(camera.Rotation.x, -camera.Rotation.y).scale(1)
    );
    const Projection = Matrix.perspective(radians(90), W / H, 3, SpawnDistance);
    const View = Matrix.lookAt(camera.Position, target, new Vector3(0, 1, 0));
    const Model = Matrix.identity(4);
    return Projection.multiply(View).multiply(Model);
  }

  Render(MeshList: Mesh[], camera: Camera, bgColor: string = '#111111') {
    this.clear(bgColor);
    const target = camera.Position.clone().add(
      Vector3.lookVector(camera.Rotation.x, -camera.Rotation.y).scale(1)
    );

    if (MeshList.length) {
      MeshList.forEach((mesh: Mesh) => {
        if (!mesh.texturePixels) return;
        mesh.generateVertexNormals();
        const Projection = Matrix.perspective(
          radians(90),
          W / H,
          3,
          SpawnDistance
        );

        const View = Matrix.lookAt(
          camera.Position,
          target,
          new Vector3(0, 1, 0)
        );

        const Pos = mesh.Position;
        const Dir = mesh.Rotation;
        const Scale = mesh.Scale;
        const Model = Matrix.identity(4)
          .translate(Pos.x, Pos.y, Pos.z)
          .rotateX(radians(Dir.x))
          .rotateY(radians(Dir.y))
          .rotateZ(radians(Dir.z))
          .scaleBy(Scale, Scale, Scale);

        const MVP = Projection.multiply(View).multiply(Model);

        this.plotMesh(mesh, MVP, mesh.texturePixels);
      });
      this.present();
    }
  }

  clear(color = '#111111'): void {
    this.clearDepthBuffer();
    this.clearPixelBuffer();

    ctx.fillStyle = color;
    ctx.fillRect(0, 0, W, H);
  }

  drawPolygon(polygon: xy[]) {
    ctx.strokeStyle = '#ff0000';
    ctx.fillStyle = '#00aaff';
    ctx.beginPath();
    ctx.moveTo(polygon[0].x, polygon[0].y);
    for (var i = 1; i < polygon.length; i++)
      ctx.lineTo(polygon[i].x, polygon[i].y);
    ctx.lineTo(polygon[0].x, polygon[0].y);
    ctx.fill();
    ctx.stroke();
    ctx.closePath();
  }
  Draw3DCircle(
    MVP: Matrix,
    Position: Vector3,
    Radius: number,
    Width: number,
    Progress: number,
    Color: string = '#ffffff'
  ) {
    const NewPos = this.project(Position, MVP);
    drawCircle(NewPos.x, NewPos.y, Radius * NewPos.invW, Color, 1);
    ctx.beginPath();
    ctx.lineWidth = Width * NewPos.invW;
    ctx.arc(
      NewPos.x,
      NewPos.y,
      Radius * NewPos.invW,
      radians(-90),
      radians(-90 + 360 * Progress)
    );
    ctx.stroke();
  }
  Draw3DBar(
    MVP: Matrix,
    Position1: Vector3,
    Position2: Vector3,
    Width: number,
    Progress: number,
    Color: string = '#ffffff'
  ) {
    const Pos1 = this.project(Position1, MVP);
    const Pos2 = this.project(Position2, MVP);
    const ProgPos = Position1.lerp(Position2, Progress);
    const Pos3 = this.project(ProgPos, MVP);
    drawLine(Pos1.x, Pos1.y, Pos2.x, Pos2.y, Color, 1);
    drawLine(Pos1.x, Pos1.y, Pos3.x, Pos3.y, Color, Width);
  }
  Draw3DText(
    Text: string,
    Position: Vector3,
    MVP: Matrix,
    FontSize: number,
    Color: string
  ) {
    const NewPosition = this.project(Position, MVP);
    drawText(
      Text,
      [NewPosition.x, 'center'],
      [NewPosition.y, 'center'],
      FontSize * NewPosition.invW,
      Color
    );
  }
  plotMesh(mesh: Mesh, mvp: Matrix, texture: ImageData) {
    const hex = '00aaff';
    const color = rgbToHex(
      parseInt(hex.slice(0, 2), 16),
      parseInt(hex.slice(2, 4), 16),
      parseInt(hex.slice(4, 6), 16)
    );

    for (let i = 0; i < mesh.Indices.length; i += 3) {
      const ia = mesh.Indices[i];
      const ib = mesh.Indices[i + 1];
      const ic = mesh.Indices[i + 2];
      const a = mesh.Vertices[ia];
      const b = mesh.Vertices[ib];
      const c = mesh.Vertices[ic];
      const normalA = mesh.Normals[ia];
      const normalB = mesh.Normals[ib];
      const normalC = mesh.Normals[ic];
      const uvA = mesh.UVs[ia];
      const uvB = mesh.UVs[ib];
      const uvC = mesh.UVs[ic];

      if (
        !a ||
        !b ||
        !c ||
        !normalA ||
        !normalB ||
        !normalC ||
        !uvA ||
        !uvB ||
        !uvC
      )
        continue;

      // Transform to clip space, but do not divide by W yet.
      let polygon: FrustumVertex[] = [
        this.toFrustumVertex(a, uvA.x, uvA.y, normalA, mvp),
        this.toFrustumVertex(b, uvB.x, uvB.y, normalB, mvp),
        this.toFrustumVertex(c, uvC.x, uvC.y, normalC, mvp),
      ];

      const flatBrightness =
        (polygon[0].brightness +
          polygon[1].brightness +
          polygon[2].brightness) /
        3;

      // Clip against left, right, bottom, top, near and far planes.
      polygon = this.clipAgainstFrustum(polygon);
      if (polygon.length < 3) continue;

      // Perspective divide only after clipping. This preserves the projection's
      // near/far planes and handles triangles crossing the near plane correctly.
      const clipped: ClipVertex[] = polygon.map((v) => {
        const invW = 1 / v.cw;
        const ndcX = v.cx * invW;
        const ndcY = v.cy * invW;
        const ndcZ = v.cz * invW;
        return {
          x: (ndcX + 1) * 0.5 * W,
          y: (1 - ndcY) * 0.5 * H,
          depth: ndcZ,
          invW,
          uOverW: v.u * invW,
          vOverW: v.v * invW,
          normal: v.normal,
          brightness: v.brightness,
          visible: true,
        };
      });

      for (let j = 1; j < clipped.length - 1; j++) {
        const p1 = clipped[0];
        const p2 = clipped[j];
        const p3 = clipped[j + 1];
        let brightnessA = p1.brightness;
        let brightnessB = p2.brightness;
        let brightnessC = p3.brightness;

        if (!mesh.Shade) {
          brightnessA = flatBrightness;
          brightnessB = flatBrightness;
          brightnessC = flatBrightness;
        }

        if (mesh.RenderType === 'Texture') {
          this.rasterizeTexturedTriangle(
            p1,
            p2,
            p3,
            texture,
            brightnessA,
            brightnessB,
            brightnessC
          );
        } else if (mesh.RenderType === 'Plain') {
          this.rasterizeTriangle(
            p1,
            p2,
            p3,
            color,
            brightnessA,
            brightnessB,
            brightnessC,
            mesh.Shade
          );
        } else if (mesh.RenderType === 'Wireframe') {
          ctx.beginPath();
          ctx.moveTo(p1.x, p1.y);
          ctx.lineTo(p2.x, p2.y);
          ctx.lineTo(p3.x, p3.y);
          ctx.closePath();
          ctx.strokeStyle = color;
          ctx.lineWidth = 1;
          ctx.stroke();
        }
      }
    }
  }

  private toFrustumVertex(
    vertex: Vector3,
    u: number,
    v: number,
    normal: Vector3,
    mvp: Matrix
  ): FrustumVertex {
    const cx =
      mvp.get(0, 0) * vertex.x +
      mvp.get(0, 1) * vertex.y +
      mvp.get(0, 2) * vertex.z +
      mvp.get(0, 3);
    const cy =
      mvp.get(1, 0) * vertex.x +
      mvp.get(1, 1) * vertex.y +
      mvp.get(1, 2) * vertex.z +
      mvp.get(1, 3);
    const cz =
      mvp.get(2, 0) * vertex.x +
      mvp.get(2, 1) * vertex.y +
      mvp.get(2, 2) * vertex.z +
      mvp.get(2, 3);
    const cw =
      mvp.get(3, 0) * vertex.x +
      mvp.get(3, 1) * vertex.y +
      mvp.get(3, 2) * vertex.z +
      mvp.get(3, 3);
    return {
      cx,
      cy,
      cz,
      cw,
      u,
      v,
      normal,
      brightness: this.vertexBrightness(normal),
    };
  }

  // Projects an individual point (for example drawVertex). Triangle clipping uses clip space above.
  project(vertex: Vector3, mvp: Matrix): Projection {
    const x =
      mvp.get(0, 0) * vertex.x +
      mvp.get(0, 1) * vertex.y +
      mvp.get(0, 2) * vertex.z +
      mvp.get(0, 3);

    const y =
      mvp.get(1, 0) * vertex.x +
      mvp.get(1, 1) * vertex.y +
      mvp.get(1, 2) * vertex.z +
      mvp.get(1, 3);

    const z =
      mvp.get(2, 0) * vertex.x +
      mvp.get(2, 1) * vertex.y +
      mvp.get(2, 2) * vertex.z +
      mvp.get(2, 3);

    const w =
      mvp.get(3, 0) * vertex.x +
      mvp.get(3, 1) * vertex.y +
      mvp.get(3, 2) * vertex.z +
      mvp.get(3, 3);

    if (w <= 1e-6) {
      return { x: 0, y: 0, depth: 0, invW: 0, visible: false };
    }

    const ndcX = x / w;
    const ndcY = y / w;
    const ndcZ = z / w;

    const visible =
      ndcX >= -1 &&
      ndcX <= 1 &&
      ndcY >= -1 &&
      ndcY <= 1 &&
      ndcZ >= -1 &&
      ndcZ <= 1;

    return {
      x: (ndcX + 1) * 0.5 * W,
      y: (1 - ndcY) * 0.5 * H,
      depth: ndcZ,
      invW: 1 / w,
      visible,
    };
  }

  drawVertex(
    vertex: Vector3,
    mvp: Matrix,
    color: string = '#00ff88',
    size: number = 5
  ): void {
    const point = this.project(vertex, mvp);

    if (!point.visible) return;

    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(point.x, point.y, size, 0, Math.PI * 2);
    ctx.fill();
  }

  present(): void {
    if (!this.imageData) return;

    this.bufferCanvas.width = W;
    this.bufferCanvas.height = H;

    this.bufferCtx.putImageData(this.imageData, 0, 0);
    ctx.drawImage(this.bufferCanvas, 0, 0);
  }

  private clearDepthBuffer(): void {
    if (this.bufferWidth !== W || this.bufferHeight !== H) {
      this.bufferWidth = W;
      this.bufferHeight = H;

      this.depthBuffer = new Float32Array(W * H);
      this.imageData = ctx.createImageData(W, H);
    }

    this.depthBuffer.fill(Infinity);
  }

  private clearPixelBuffer(): void {
    if (!this.imageData) return;

    const pixels = this.imageData.data;

    for (let i = 0; i < pixels.length; i += 4) {
      this.imageData.data[i] = 0;
      this.imageData.data[i + 1] = 0;
      this.imageData.data[i + 2] = 0;
      this.imageData.data[i + 3] = 0;
    }
  }

  private vertexBrightness(normal: Vector3): number {
    const n = normal.normalize();
    const diffuse = Math.max(0, n.dot(this.lightDirection));

    return this.ambientLight + (1 - this.ambientLight) * diffuse;
  }

  private rasterizeTriangle(
    p1: { x: number; y: number; depth: number },
    p2: { x: number; y: number; depth: number },
    p3: { x: number; y: number; depth: number },
    color: string,
    brightnessA: number,
    brightnessB: number,
    brightnessC: number,
    Shade: boolean
  ): void {
    // Find the rectangle surrounding the triangle.
    const minX = Math.max(0, Math.floor(Math.min(p1.x, p2.x, p3.x)));
    const maxX = Math.min(W - 1, Math.ceil(Math.max(p1.x, p2.x, p3.x)));
    const minY = Math.max(0, Math.floor(Math.min(p1.y, p2.y, p3.y)));
    const maxY = Math.min(H - 1, Math.ceil(Math.max(p1.y, p2.y, p3.y)));

    // Calculate the triangle's signed area.
    const area = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);

    // Skip triangles that have no visible area.
    if (Math.abs(area) < 1e-8) return;

    ctx.fillStyle = color;

    const colorMatch = /^#([0-9a-f]{6})$/i.exec(color);
    if (!colorMatch) return;

    const hex = colorMatch[1];

    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);
    // Check each pixel inside the surrounding rectangle.
    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        // Test the centre of the pixel.
        const px = x + 0.5;
        const py = y + 0.5;

        const w1 =
          ((p2.x - px) * (p3.y - py) - (p2.y - py) * (p3.x - px)) / area;

        const w2 =
          ((p3.x - px) * (p1.y - py) - (p3.y - py) * (p1.x - px)) / area;

        const w3 = 1 - w1 - w2;

        // If any weight is negative, the pixel is outside.
        if (w1 < 0 || w2 < 0 || w3 < 0) continue;

        // Interpolate the depth at this pixel.
        const depth = w1 * p1.depth + w2 * p2.depth + w3 * p3.depth;

        const index = y * W + x;

        // Smaller NDC depth means closer to the camera.
        if (depth < this.depthBuffer[index]) {
          this.depthBuffer[index] = depth;

          if (!this.imageData) continue;

          const pixelIndex = index * 4;
          const pixels = this.imageData.data;
          let brightness = 0;
          if (Shade)
            brightness = brightnessA * w1 + brightnessB * w2 + brightnessC * w3;
          else brightness = brightnessA;

          pixels[pixelIndex] = red * brightness;
          pixels[pixelIndex + 1] = green * brightness;
          pixels[pixelIndex + 2] = blue * brightness;
          pixels[pixelIndex + 3] = 255;
        }
      }
    }
  }

  private rasterizeTexturedTriangle(
    p1: ClipVertex,
    p2: ClipVertex,
    p3: ClipVertex,
    texture: ImageData,
    brightnessA: number,
    brightnessB: number,
    brightnessC: number
  ): void {
    const minX = Math.max(0, Math.floor(Math.min(p1.x, p2.x, p3.x)));

    const maxX = Math.min(W - 1, Math.ceil(Math.max(p1.x, p2.x, p3.x)));

    const minY = Math.max(0, Math.floor(Math.min(p1.y, p2.y, p3.y)));

    const maxY = Math.min(H - 1, Math.ceil(Math.max(p1.y, p2.y, p3.y)));

    const area = (p2.x - p1.x) * (p3.y - p1.y) - (p2.y - p1.y) * (p3.x - p1.x);

    if (Math.abs(area) < 1e-8) return;
    if (!this.imageData) return;

    const pixels = this.imageData.data;
    const texturePixels = texture.data;

    const textureWidth = texture.width;
    const textureHeight = texture.height;

    for (let y = minY; y <= maxY; y++) {
      for (let x = minX; x <= maxX; x++) {
        const px = x + 0.5;
        const py = y + 0.5;

        const w1 =
          ((p2.x - px) * (p3.y - py) - (p2.y - py) * (p3.x - px)) / area;

        const w2 =
          ((p3.x - px) * (p1.y - py) - (p3.y - py) * (p1.x - px)) / area;

        const w3 = 1 - w1 - w2;

        if (w1 < 0 || w2 < 0 || w3 < 0) {
          continue;
        }

        // Interpolate depth.
        const depth = w1 * p1.depth + w2 * p2.depth + w3 * p3.depth;

        const index = y * W + x;

        // Only draw the closest triangle at this pixel.
        if (depth >= this.depthBuffer[index]) {
          continue;
        }

        // Perspective-correct UV interpolation. Interpolate UV/W and 1/W,
        // then divide to recover the texture coordinate at this pixel.
        const interpolatedInvW = w1 * p1.invW + w2 * p2.invW + w3 * p3.invW;
        if (Math.abs(interpolatedInvW) < 1e-12) continue;

        const u =
          (w1 * p1.uOverW + w2 * p2.uOverW + w3 * p3.uOverW) / interpolatedInvW;
        const v =
          (w1 * p1.vOverW + w2 * p2.vOverW + w3 * p3.vOverW) / interpolatedInvW;

        // Wrap UVs so values outside 0..1 repeat the texture.
        const wrappedU = ((u % 1) + 1) % 1;
        const wrappedV = ((v % 1) + 1) % 1;

        const tx = Math.min(
          textureWidth - 1,
          Math.floor(wrappedU * textureWidth)
        );

        const ty = Math.min(
          textureHeight - 1,
          Math.floor(wrappedV * textureHeight)
        );

        const textureIndex = (ty * textureWidth + tx) * 4;

        const pixelIndex = index * 4;

        if (texturePixels[textureIndex + 3] == 0) continue;

        const brightness =
          brightnessA * w1 + brightnessB * w2 + brightnessC * w3;

        // Write texture color to the screen buffer.
        pixels[pixelIndex] = texturePixels[textureIndex] * brightness;

        pixels[pixelIndex + 1] = texturePixels[textureIndex + 1] * brightness;

        pixels[pixelIndex + 2] = texturePixels[textureIndex + 2] * brightness;

        pixels[pixelIndex + 3] = texturePixels[textureIndex + 3];

        // Update depth only after writing the pixel.
        this.depthBuffer[index] = depth;
      }
    }
  }

  private clipAgainstFrustum(subject: FrustumVertex[]): FrustumVertex[] {
    let output = subject;
    // OpenGL-style clip volume: -W <= X,Y,Z <= W, giving NDC Z in [-1, 1].
    const planes: Array<(v: FrustumVertex) => number> = [
      (v) => v.cw + v.cx, // left
      (v) => v.cw - v.cx, // right
      (v) => v.cw + v.cy, // bottom
      (v) => v.cw - v.cy, // top
      (v) => v.cw + v.cz, // near
      (v) => v.cw - v.cz, // far
    ];

    for (const distanceToPlane of planes) {
      const input = output;
      output = [];
      if (input.length === 0) break;

      let previous = input[input.length - 1];
      let previousDistance = distanceToPlane(previous);
      let previousInside = previousDistance >= 0;

      for (const current of input) {
        const currentDistance = distanceToPlane(current);
        const currentInside = currentDistance >= 0;

        if (currentInside !== previousInside) {
          const denominator = previousDistance - currentDistance;
          if (Math.abs(denominator) > 1e-12) {
            const t = previousDistance / denominator;
            output.push(this.interpolateFrustumVertex(previous, current, t));
          }
        }

        if (currentInside) output.push(current);
        previous = current;
        previousDistance = currentDistance;
        previousInside = currentInside;
      }
    }
    return output;
  }

  private interpolateFrustumVertex(
    a: FrustumVertex,
    b: FrustumVertex,
    t: number
  ): FrustumVertex {
    return {
      cx: a.cx + (b.cx - a.cx) * t,
      cy: a.cy + (b.cy - a.cy) * t,
      cz: a.cz + (b.cz - a.cz) * t,
      cw: a.cw + (b.cw - a.cw) * t,
      u: a.u + (b.u - a.u) * t,
      v: a.v + (b.v - a.v) * t,
      normal: new Vector3(
        a.normal.x + (b.normal.x - a.normal.x) * t,
        a.normal.y + (b.normal.y - a.normal.y) * t,
        a.normal.z + (b.normal.z - a.normal.z) * t
      ).normalize(),
      brightness: a.brightness + (b.brightness - a.brightness) * t,
    };
  }
}

class Camera {
  Position: Vector3;
  Rotation: Vector3;
  prevMouse: Vector2;

  constructor(pos: Vector3, dir: Vector3) {
    this.Position = pos;
    this.Rotation = dir;
    this.prevMouse = new Vector2(mouse.x, mouse.y);
  }

  Controlls(velocity: number, float: boolean = false) {
    const x1 = radians(this.Rotation.x);
    const y1 = radians(this.Rotation.y);
    const x2 = radians(this.Rotation.x - 90);
    const y2 = radians(this.Rotation.y - 90);
    if (keyboard.w) {
      this.Position.z += Math.cos(x1) * Math.cos(y1) * velocity;
      this.Position.y -= Math.sin(y1) * velocity;
      this.Position.x += Math.sin(x1) * Math.cos(y1) * velocity;
    }
    if (keyboard.s) {
      this.Position.z -= Math.cos(x1) * Math.cos(y1) * velocity;
      this.Position.y += Math.sin(y1) * velocity;
      this.Position.x -= Math.sin(x1) * Math.cos(y1) * velocity;
    }
    if (keyboard.d) {
      this.Position.z -= Math.cos(x2) * velocity;
      this.Position.x -= Math.sin(x2) * velocity;
    }
    if (keyboard.a) {
      this.Position.z += Math.cos(x2) * velocity;
      this.Position.x += Math.sin(x2) * velocity;
    }
    if (float) {
      if (keyboard.e) {
        this.Position.z -= Math.cos(x1) * Math.cos(y2) * velocity;
        this.Position.y += Math.sin(y2) * velocity;
        this.Position.x -= Math.sin(x1) * Math.cos(y2) * velocity;
      }
      if (keyboard.q) {
        this.Position.z += Math.cos(x1) * Math.cos(y2) * velocity;
        this.Position.y -= Math.sin(y2) * velocity;
        this.Position.x += Math.sin(x1) * Math.cos(y2) * velocity;
      }
    }
    if (mouse.left) {
      this.Rotation.x += (this.prevMouse.x - mouse.x) / 10;
      this.Rotation.y += (this.prevMouse.y - mouse.y) / 10;
    }
    this.prevMouse = new Vector2(mouse.x, mouse.y);
  }
}

function RenderScreenUI(Ratio: number) {
  const mvp = renderer.MPV(Cam);
  renderer.Draw3DText(
    String(Score),
    new Vector3(-2, 1, -3.1),
    mvp,
    100* Ratio,
    'white'
  );
  renderer.Draw3DText(
    String(Misses),
    new Vector3(-2, 0.7, -3.1),
    mvp,
    100* Ratio,
    'white'
  );
  renderer.Draw3DText(
    String(Hits + '/' + (Hits + Misses)),
    new Vector3(-2, 0.4, -3.1),
    mvp,
    100* Ratio,
    'white'
  );
  renderer.Draw3DText(
    String(Math.round((Hits / (Hits + Misses)) * 10000) / 100 + '%'),
    new Vector3(-2, 0, -3.1),
    mvp,
    100* Ratio,
    'white'
  );
  renderer.Draw3DText(
    String(HitCombo),
    new Vector3(-2, -0.4, -3.1),
    mvp,
    100* Ratio,
    'white'
  );
  renderer.Draw3DCircle(
    mvp,
    new Vector3(2.2, 0.4, -3.1),
    300 * Ratio,
    15 * Ratio,
    MultiplierProgress / 10
  );
  renderer.Draw3DText(
    String(Multiplier + 'x'),
    new Vector3(2.2, 0.4, -3.1),
    mvp,
    100* Ratio,
    'white'
  );
  renderer.Draw3DBar(
    mvp,
    new Vector3(-1, -2, -3.1),
    new Vector3(1, -2, -3.1),
    5 * Ratio,
    Health / 100
  );
  if (Song.Music) {
  }
  if (Song.Music) {
    renderer.Draw3DBar(
      mvp,
      new Vector3(-1, 2, -3.1),
      new Vector3(1, 2, -3.1),
      5 * Ratio,
      ((_timestamp0 - StartDt) / (Song.Music.duration * 1000)) * PlaySpeed
    );
    renderer.Draw3DText(
      SecondsToMinutes((_timestamp0 - StartDt) / 1000) +
        '/' +
        SecondsToMinutes(Song.Music.duration / PlaySpeed),
      new Vector3(0, 2.3, -3.1),
      mvp,
      100 * Ratio,
      'white'
    );
  }
  MissText.forEach((miss) => {
    const dt = (_timestamp0 - miss.dt) / 100 - 1;
    const Size = 1 / (1 + dt ** 2);
    renderer.Draw3DText(
      "X",
      new Vector3(miss.x - 1, -1.6, -3.1),
      mvp,
      100 * Ratio * Size,
      'red'
    );
    if (_timestamp0 - miss.dt > 2000) MissText.splice(MissText.indexOf(miss), 1);
  });
}

const renderer = new Renderer();
const Cam = new Camera(new Vector3(0, 0, 0), new Vector3(0, 180, 0));

let prevFPS: number[] = [];

let NoteMesh = '../public/models/Squaircle.json';
let NoteTexture = '../public/textures/White.png';
let Models: Mesh[] = [];

let MissText: Miss[] = [];

let BorderMesh = await Mesh.LoadMesh(
  '../public/models/SquareFrame.json',
  '../public/textures/White.png'
);
BorderMesh.Scale = 3;
BorderMesh.Position = new Vector3(0, 0, -3.1);

let MouseMesh = await Mesh.LoadMesh(
  '../public/models/Squircle0.3.json',
  '../public/textures/Red.png'
);
MouseMesh.Scale = 0.2;
MouseMesh.Position = new Vector3(0, 0, -3.1);
let MousePos = new Vector2(0, 0);
let MouseBuffer: Vector2[] = [];

const HitSound = await loadAudioAsync(
  'https://github.com/RendayTM/SoundSpaceTypescript/raw/refs/heads/main/HitSound.mp3'
);
const MissSound = await loadAudioAsync(
  'https://github.com/RendayTM/SoundSpaceTypescript/raw/refs/heads/main/MissSound.mp3'
);

let StartDt = 0;
const Delay = 2000;
const ApproachSpeed = 5;
const SpawnDistance = 25;
const PlaySpeed = 1;
let Cayote = 1;

let Health = 100;
let Damage = 15;
let Healing = 5;
let HitCombo = 0;
let MissCombo = 0;
let Hits = 0;
let Misses = 0;
let Score = 0;
let Multiplier = 1;
let MultiplierProgress = 0;

let Song: Level = new Level('Hello');
await Song.LoadLevel('../public/Levels/Flamewall.json');

update = () => {
  clearLog();
  prevFPS.push(Math.round(1000 / deltaTime));
  if (prevFPS.length > 20) prevFPS.splice(0, 1);
  const FPS = Math.round(Average(prevFPS));
  Cayote = FPS / 144;
  if (Song.Music && _timestamp0 - StartDt > -200) {
    Song.Music.playbackRate = PlaySpeed;
    Song.Music.play();
  }
  Cam.Controlls(0.002 * deltaTime, true);
  MousePos.x = Clamp(-1.5, (6 * (mouse.x - W / 2)) / H, 1.5);
  MousePos.y = Clamp(-1.5, (6 * (H / 2 - mouse.y)) / H, 1.5);
  MouseMesh.Position.x = MousePos.x;
  MouseMesh.Position.y = MousePos.y;
  MouseBuffer.push(MousePos.clone());
  if (MouseBuffer.length > 10 / (PlaySpeed / Cayote)) MouseBuffer.splice(0, 1);
  Models = Song.Play(_timestamp0 - StartDt, PlaySpeed);
  Models.push(BorderMesh);
  Models.push(MouseMesh);
  renderer.Render(Models, Cam, '#111111');

  drawText(String(FPS), 10, 20, 10, 'white');
  RenderScreenUI(H/W);
};
