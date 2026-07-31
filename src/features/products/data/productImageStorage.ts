import * as Crypto from 'expo-crypto';
import { Directory, File, Paths } from 'expo-file-system';
import { AppError } from '@/core/errors/AppError';

const PRODUCT_IMAGES_FOLDER = 'product-images';

function getProductImagesDirectory(): Directory {
  const dir = new Directory(Paths.document, PRODUCT_IMAGES_FOLDER);
  if (!dir.exists) {
    dir.create({ intermediates: true, idempotent: true });
  }
  return dir;
}

function guessExtension(uri: string): string {
  const clean = uri.split('?')[0] ?? uri;
  const match = /\.([a-zA-Z0-9]+)$/.exec(clean);
  const ext = match?.[1]?.toLowerCase();
  if (ext && ['jpg', 'jpeg', 'png', 'webp', 'heic', 'heif'].includes(ext)) {
    return ext === 'jpeg' ? 'jpg' : ext;
  }
  return 'jpg';
}

function isOwnedProductImage(uri: string): boolean {
  try {
    return uri.startsWith(getProductImagesDirectory().uri);
  } catch {
    return false;
  }
}

/**
 * Copies a picker/camera URI into the app documents folder so it survives
 * temporary cache eviction. Returns the durable file:// URI.
 */
export async function persistProductImage(sourceUri: string): Promise<string> {
  try {
    const dir = getProductImagesDirectory();
    const dest = new File(dir, `${Crypto.randomUUID()}.${guessExtension(sourceUri)}`);
    const source = new File(sourceUri);

    if (!source.exists) {
      throw AppError.validation('Image source introuvable');
    }

    source.copy(dest);
    return dest.uri;
  } catch (cause) {
    if (cause instanceof AppError) throw cause;
    throw AppError.database('Impossible d’enregistrer l’image produit', cause);
  }
}

/** Deletes a product image only when it lives in our managed folder. */
export async function deleteProductImageIfOwned(
  uri: string | null | undefined,
): Promise<void> {
  if (!uri || !isOwnedProductImage(uri)) return;

  try {
    const file = new File(uri);
    if (file.exists) {
      file.delete();
    }
  } catch {
    // Best-effort cleanup — DB update must still succeed.
  }
}
