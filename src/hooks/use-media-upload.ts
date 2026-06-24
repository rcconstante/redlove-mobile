import { mediaService, type UploadMediaInput } from '@/services/media.service';

export function useMediaUpload() {
  return {
    upload: (input: UploadMediaInput) => mediaService.upload(input),
  };
}
