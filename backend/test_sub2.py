import sys, os
sys.path.insert(0, '.')
from routers.movies_router import _detect_subtitle_urls, _lang_from_srt_filename

MOVIES_DIR = os.path.join(os.path.dirname(os.path.abspath('.')), "Movies")

# Simulate what happens for different video URLs
for vid in ['Avengers.mp4', 'Avenger.mp4', 'Dastur_720.mp4']:
    result = _detect_subtitle_urls(vid)
    print(f'{vid}: {result}')
