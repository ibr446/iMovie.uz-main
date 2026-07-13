# iMovie.uz task progress

- [x] Reproducing hypothesis: admin qo‘shgan kinolar refreshdan keyin yo‘qoladi
- [x] Repo analiz: Vercel’da backend `backend/database.py` orqali `/tmp/imovie.db` ishlatyapti
- [x] Fix-1: `backend/database.py` ni `/tmp` o‘rniga project ichidagi `imovie.db` ga o‘tkazish
- [x] Fix-2: `backend/main.py` seed/sync har start’da ishlamasligi uchun `SEED_ON_STARTUP` flag bilan cheklash
- [x] Vercel environment’ga `SEED_ON_STARTUP` ni tekshirish (default false bo‘ladi, seed overwrite qilmaydi)
- [ ] Admin paneldan yangi movie qo‘shib, refreshdan keyin saqlanib qolishini test qilish

