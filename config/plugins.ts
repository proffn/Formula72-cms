import type { Core } from '@strapi/strapi';

function resolveCloudinaryEnv(env: Core.Config.Shared.ConfigParams['env']) {
  const cloudName = env('CLOUDINARY_NAME') || env('CLOUDINARY_CLOUD_NAME');
  const apiKey = env('CLOUDINARY_KEY') || env('CLOUDINARY_API_KEY');
  const apiSecret = env('CLOUDINARY_SECRET') || env('CLOUDINARY_API_SECRET');

  return { cloudName, apiKey, apiSecret };
}

const config = ({ env }: Core.Config.Shared.ConfigParams): Core.Config.Plugin => {
  const { cloudName, apiKey, apiSecret } = resolveCloudinaryEnv(env);
  const hasCloudinaryCredentials = Boolean(cloudName) && Boolean(apiKey) && Boolean(apiSecret);
  const videoSizeLimit = env.int('UPLOAD_SIZE_LIMIT', 512 * 1024 * 1024);

  if (!hasCloudinaryCredentials) {
    if (env('NODE_ENV') === 'production') {
      const presentKeys = [
        env('CLOUDINARY_NAME') ? 'CLOUDINARY_NAME' : null,
        env('CLOUDINARY_CLOUD_NAME') ? 'CLOUDINARY_CLOUD_NAME' : null,
        env('CLOUDINARY_KEY') ? 'CLOUDINARY_KEY' : null,
        env('CLOUDINARY_API_KEY') ? 'CLOUDINARY_API_KEY' : null,
        env('CLOUDINARY_SECRET') ? 'CLOUDINARY_SECRET' : null,
        env('CLOUDINARY_API_SECRET') ? 'CLOUDINARY_API_SECRET' : null,
      ].filter(Boolean);

      console.warn(
        `[formula72-cms] Cloudinary upload provider is disabled. Missing credentials. Present env keys: ${
          presentKeys.length > 0 ? presentKeys.join(', ') : 'none'
        }`,
      );
    }

    return {
      upload: {
        config: {
          sizeLimit: videoSizeLimit,
          providerOptions: {
            sizeLimit: videoSizeLimit,
          },
        },
      },
    };
  }

  const folder = env('CLOUDINARY_FOLDER', '');
  const uploadOptions = folder ? { folder } : {};

  console.info(
    `[formula72-cms] Cloudinary upload provider is enabled${folder ? ` (folder: ${folder})` : ''}.`,
  );

  return {
    upload: {
      config: {
        sizeLimit: videoSizeLimit,
        provider: 'cloudinary',
        providerOptions: {
          cloud_name: cloudName,
          api_key: apiKey,
          api_secret: apiSecret,
        },
        actionOptions: {
          upload: uploadOptions,
          uploadStream: uploadOptions,
          delete: {},
        },
      },
    },
  };
};

export default config;
