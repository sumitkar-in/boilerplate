import {
  BadRequestException,
  Inject,
  Injectable,
  Logger,
  OnModuleInit,
} from '@nestjs/common';
import {
  DeleteObjectCommand,
  GetObjectCommand,
  PutObjectCommand,
  S3Client,
} from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import * as fs from 'fs/promises';
import * as path from 'path';
import { storageConfig, type StorageConfig } from '../config';

export interface UploadFileInput {
  tenantId?: string | null;
  path: string;
  content: Buffer | Uint8Array;
  contentType?: string;
}

export interface UploadFileResult {
  url: string;
  key: string;
}

@Injectable()
export class StorageService implements OnModuleInit {
  private readonly logger = new Logger(StorageService.name);
  private driver: 'local' | 's3';
  private s3Client?: S3Client;
  private s3Bucket: string;
  private localBasePath: string;

  constructor(
    @Inject(storageConfig.KEY) private readonly storage: StorageConfig,
  ) {
    this.driver = this.storage.driver;
    this.s3Bucket = this.storage.s3.bucket;
    this.localBasePath = path.resolve(process.cwd(), this.storage.localPath);
  }

  async onModuleInit(): Promise<void> {
    if (this.driver === 's3') {
      const s3Config = this.storage.s3;
      this.s3Client = new S3Client({
        region: s3Config.region,
        ...(s3Config.endpoint && { endpoint: s3Config.endpoint }),
        forcePathStyle: s3Config.forcePathStyle,
        ...(s3Config.accessKeyId &&
          s3Config.secretAccessKey && {
            credentials: {
              accessKeyId: s3Config.accessKeyId,
              secretAccessKey: s3Config.secretAccessKey,
            },
          }),
      });
      this.logger.log(
        `Initialized S3 Storage driver (bucket: ${this.s3Bucket}, endpoint: ${s3Config.endpoint || 'AWS S3'})`,
      );
    } else {
      await fs.mkdir(this.localBasePath, { recursive: true });
      this.logger.log(
        `Initialized Local Storage driver (path: ${this.localBasePath})`,
      );
    }
  }

  private normalizeKey(inputPath: string, tenantId?: string | null): string {
    if (inputPath.includes('\0')) {
      throw new BadRequestException('Invalid storage path');
    }
    // Normalize backslashes so Windows-style traversal (..\..\) is caught by
    // the posix.normalize() below, then strip leading slashes to keep the
    // key relative.
    const cleanPath = inputPath.replace(/\\/g, '/').replace(/^\/+/, '');
    const normalized = path.posix.normalize(cleanPath);
    if (
      normalized === '..' ||
      normalized.startsWith('../') ||
      path.posix.isAbsolute(normalized)
    ) {
      throw new BadRequestException('Invalid storage path');
    }
    return tenantId ? `${tenantId}/${normalized}` : normalized;
  }

  // Second line of defense for the local driver: even a validated key should
  // never resolve outside the configured upload root once joined with it.
  private resolveLocalPath(key: string): string {
    const filePath = path.resolve(this.localBasePath, key);
    const relative = path.relative(this.localBasePath, filePath);
    if (relative.startsWith('..') || path.isAbsolute(relative)) {
      throw new BadRequestException('Invalid storage path');
    }
    return filePath;
  }

  async uploadFile(input: UploadFileInput): Promise<UploadFileResult> {
    const key = this.normalizeKey(input.path, input.tenantId);

    if (this.driver === 's3' && this.s3Client) {
      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
          Body: input.content,
          ContentType: input.contentType || 'application/octet-stream',
        }),
      );
      const url = await this.getPresignedUrl(key);
      return { url, key };
    } else {
      const filePath = this.resolveLocalPath(key);
      await fs.mkdir(path.dirname(filePath), { recursive: true });
      await fs.writeFile(filePath, input.content);
      const url = `/uploads/${key}`;
      return { url, key };
    }
  }

  async getFileBuffer(
    key: string,
  ): Promise<{ buffer: Buffer; contentType?: string }> {
    if (this.driver === 's3' && this.s3Client) {
      const response = await this.s3Client.send(
        new GetObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
        }),
      );
      const stream = response.Body as unknown as AsyncIterable<Uint8Array>;
      const chunks: Uint8Array[] = [];
      for await (const chunk of stream) {
        chunks.push(chunk);
      }
      return {
        buffer: Buffer.concat(chunks),
        contentType: response.ContentType,
      };
    } else {
      const filePath = this.resolveLocalPath(key);
      const buffer = await fs.readFile(filePath);
      return { buffer };
    }
  }

  async deleteFile(key: string): Promise<void> {
    if (this.driver === 's3' && this.s3Client) {
      await this.s3Client.send(
        new DeleteObjectCommand({
          Bucket: this.s3Bucket,
          Key: key,
        }),
      );
    } else {
      const filePath = this.resolveLocalPath(key);
      try {
        await fs.unlink(filePath);
      } catch (err: unknown) {
        if ((err as NodeJS.ErrnoException).code !== 'ENOENT') {
          throw err;
        }
      }
    }
  }

  // NOTE: unlike the S3 branch, the local driver has no static file server
  // wired up (no ServeStaticModule, no nginx /uploads location), and this
  // URL is NOT time-limited or authenticated. Do not return it to clients
  // for private files — proxy downloads through an authenticated route
  // that calls getFileBuffer(key) instead, as the employees CSV export
  // download endpoint does.
  async getPresignedUrl(
    key: string,
    expiresInSeconds?: number,
  ): Promise<string> {
    if (this.driver === 's3' && this.s3Client) {
      const command = new GetObjectCommand({
        Bucket: this.s3Bucket,
        Key: key,
      });
      const ttl = expiresInSeconds ?? this.storage.presignTtlSeconds;
      return getSignedUrl(this.s3Client, command, {
        expiresIn: ttl,
      });
    } else {
      return `${this.storage.publicBaseUrl}/uploads/${key}`;
    }
  }
}
