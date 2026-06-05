# Códigos de erro estáveis do Trecho Studio

PROJECT_INVALID = "PROJECT_INVALID"
PROJECT_NOT_FOUND = "PROJECT_NOT_FOUND"
PROJECT_FILE_CORRUPTED = "PROJECT_FILE_CORRUPTED"
SOURCE_MEDIA_NOT_FOUND = "SOURCE_MEDIA_NOT_FOUND"
MEDIA_FORMAT_UNSUPPORTED = "MEDIA_FORMAT_UNSUPPORTED"
MEDIA_PROBE_FAILED = "MEDIA_PROBE_FAILED"
INVALID_CLIP_RANGE = "INVALID_CLIP_RANGE"
FFMPEG_NOT_FOUND = "FFMPEG_NOT_FOUND"
FFPROBE_NOT_FOUND = "FFPROBE_NOT_FOUND"
FFMPEG_FAILED = "FFMPEG_FAILED"
RENDER_CANCELLED = "RENDER_CANCELLED"
OUTPUT_DIRECTORY_UNAVAILABLE = "OUTPUT_DIRECTORY_UNAVAILABLE"
OUTPUT_FILE_ALREADY_EXISTS = "OUTPUT_FILE_ALREADY_EXISTS"
DISK_SPACE_INSUFFICIENT = "DISK_SPACE_INSUFFICIENT"
PERMISSION_DENIED = "PERMISSION_DENIED"


class TrechoEngineError(Exception):
    def __init__(self, code: str, message: str, details: str = ""):
        super().__init__(message)
        self.code = code
        self.message = message
        self.details = details

    def to_json(self):
        return {
            "code": self.code,
            "message": self.message,
            "details": self.details
        }
