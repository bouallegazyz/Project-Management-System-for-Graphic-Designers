import path from "path";
import { v2 as cloudinary } from "cloudinary";

let lastConfigSignature = "";

const getConfigFromEnv = () => ({
  cloudName: process.env.CLOUDINARY_CLOUD_NAME,
  apiKey: process.env.CLOUDINARY_API_KEY,
  apiSecret: process.env.CLOUDINARY_API_SECRET,
});

const getDeliveryType = () => process.env.CLOUDINARY_DELIVERY_TYPE || "authenticated";

const getSignedUrlTtlSeconds = () => Number(process.env.CLOUDINARY_SIGNED_URL_TTL_SECONDS || 300);

const normalizeFormat = (value) => {
  if (typeof value !== "string") return "";
  return value.trim().replace(/^\./, "").toLowerCase();
};

const hasPublicIdExtension = (publicId) => Boolean(path.posix.extname(publicId || ""));

const configSignature = ({ cloudName, apiKey, apiSecret }) => `${cloudName || ""}|${apiKey || ""}|${apiSecret || ""}`;

const ensureConfigured = () => {
  const current = getConfigFromEnv();
  const configured = Boolean(current.cloudName && current.apiKey && current.apiSecret);

  if (!configured) {
    throw new Error(
      "Cloudinary non configuré. Définissez CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY et CLOUDINARY_API_SECRET."
    );
  }

  const nextSignature = configSignature(current);
  if (lastConfigSignature !== nextSignature) {
    cloudinary.config({
      cloud_name: current.cloudName,
      api_key: current.apiKey,
      api_secret: current.apiSecret,
      secure: true,
    });
    lastConfigSignature = nextSignature;
  }

  return current;
};

const buildPublicId = (prefix = "file") => {
  const safePrefix = prefix.replace(/[^a-z0-9_-]/gi, "").toLowerCase() || "file";
  return `${safePrefix}-${Date.now()}-${Math.round(Math.random() * 1e9)}`;
};

export const isCloudinaryConfigured = () => {
  const current = getConfigFromEnv();
  return Boolean(current.cloudName && current.apiKey && current.apiSecret);
};

export const uploadFileToCloudinary = async ({
  localFilePath,
  originalName,
  folder,
  publicIdPrefix,
}) => {
  ensureConfigured();

  const result = await cloudinary.uploader.upload(localFilePath, {
    folder,
    public_id: buildPublicId(publicIdPrefix),
    resource_type: "auto",
    type: getDeliveryType(),
    use_filename: false,
    unique_filename: false,
    overwrite: false,
    filename_override: originalName,
  });

  return {
    cloudinaryId: result.public_id,
    resourceType: result.resource_type,
    format: result.format || path.extname(originalName || "").replace(".", "") || undefined,
    bytes: result.bytes,
  };
};

export const generateSignedDownloadUrl = ({
  cloudinaryId,
  resourceType = "raw",
  format,
  expiresInSeconds = getSignedUrlTtlSeconds(),
}) => {
  ensureConfigured();

  if (!cloudinaryId) {
    throw new Error("cloudinaryId est requis pour générer une URL signée.");
  }

  const normalizedResourceType = (resourceType || "raw").toLowerCase();
  const normalizedFormat = normalizeFormat(format);
  const deliveryType = getDeliveryType();
  const defaultTtl = getSignedUrlTtlSeconds();
  const expiresAt = Math.floor(Date.now() / 1000) + Number(expiresInSeconds || defaultTtl);

  if (normalizedResourceType === "raw") {
    const extensionFromId = normalizeFormat(path.posix.extname(cloudinaryId || ""));
    const resolvedFormat = normalizedFormat || extensionFromId || undefined;

    // For authenticated raw assets, private_download_url is the reliable signed delivery endpoint.
    return cloudinary.utils.private_download_url(cloudinaryId, resolvedFormat, {
      resource_type: "raw",
      type: deliveryType,
      secure: true,
      attachment: true,
      expires_at: expiresAt,
    });
  }

  // For non-raw assets, avoid duplicating the extension in public_id.
  const resolvedPublicId =
    normalizedFormat && !hasPublicIdExtension(cloudinaryId)
      ? `${cloudinaryId}.${normalizedFormat}`
      : cloudinaryId;

  return cloudinary.url(resolvedPublicId, {
    resource_type: normalizedResourceType,
    type: deliveryType,
    sign_url: true,
    secure: true,
    expires_at: expiresAt,
    attachment: true,
    ...(normalizedFormat ? { format: normalizedFormat } : {}),
  });
};

export const deleteCloudinaryAsset = async ({ cloudinaryId, resourceType = "raw" }) => {
  ensureConfigured();

  await cloudinary.uploader.destroy(cloudinaryId, {
    resource_type: resourceType,
    type: getDeliveryType(),
    invalidate: true,
  });
};
