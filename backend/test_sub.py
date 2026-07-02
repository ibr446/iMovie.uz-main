import sys
sys.path.insert(0, '.')
from routers.movies_router import _lang_from_srt_filename, _match_video_to_subtitle

# Test with actual file names
test_files = ['Russian.srt', 'English.srt', 'ru.srt', 'rus.srt', 'movie_ru.srt', 'movie.ru.srt', 'movie.russian.srt']
for f in test_files:
    print(f'  {f}: lang={_lang_from_srt_filename(f)}')

print()
print('Matching tests:')
print(f'  Avengers vs English: {_match_video_to_subtitle("Avengers", "English")}')
print(f'  Avengers vs Russian: {_match_video_to_subtitle("Avengers", "Russian")}')
print(f'  Avengers vs rus: {_match_video_to_subtitle("Avengers", "rus")}')
