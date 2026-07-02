import os

MOVIES_DIR_ABS = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath('.')), "Movies"))

def _slugify_name(name):
    return ''.join(ch for ch in name.lower() if ch.isalnum())

def _match_video_to_subtitle(video_base, subtitle_name):
    video_slug = _slugify_name(video_base)
    subtitle_slug = _slugify_name(subtitle_name)
    if not video_slug or not subtitle_slug:
        return False
    if video_slug == subtitle_slug:
        return True
    if video_slug in subtitle_slug or subtitle_slug in video_slug:
        return True
    if video_slug.endswith('s') and video_slug[:-1] == subtitle_slug:
        return True
    if subtitle_slug.endswith('s') and subtitle_slug[:-1] == video_slug:
        return True
    return False

def _lang_from_srt_filename(filename):
    normalized = filename.lower()
    if "english" in normalized or ".en." in normalized or normalized.endswith(".en.srt") or "_en" in normalized or "-en" in normalized:
        return "en"
    if "russian" in normalized or "рус" in normalized or ".ru." in normalized or normalized.endswith(".ru.srt") or "_ru" in normalized or "-ru" in normalized:
        return "ru"
    if "uzbek" in normalized or "o'zbek" in normalized or ".uz." in normalized or normalized.endswith(".uz.srt") or "_uz" in normalized or "-uz" in normalized:
        return "uz"
    return None

def detect_subtitle_urls(video_url):
    if not video_url:
        return {}
    video_base = os.path.splitext(video_url)[0]
    search_dir = MOVIES_DIR_ABS
    if not os.path.isdir(search_dir):
        return {}
    
    matched = {}
    unmatched_generic = {}
    
    for entry in os.listdir(search_dir):
        if not entry.lower().endswith(".srt"):
            continue
        lang = _lang_from_srt_filename(entry)
        if not lang:
            continue
        
        entry_base = os.path.splitext(entry)[0]
        subtitle_url = f"/media/{entry}"
        
        if _match_video_to_subtitle(video_base, entry_base):
            matched[lang] = subtitle_url
        else:
            unmatched_generic.setdefault(lang, subtitle_url)
    
    if not matched:
        return unmatched_generic
    
    for lang, url in unmatched_generic.items():
        matched.setdefault(lang, url)
    
    return matched

# Test with actual files
for vid in ['Avengers.mp4', 'Avenger.mp4', 'Dastur_720.mp4']:
    result = detect_subtitle_urls(vid)
    print(f'{vid}: {result}')

# Show what's in Movies dir
print()
print('Files in Movies dir:')
for f in os.listdir(MOVIES_DIR_ABS):
    print(f'  {f}')
