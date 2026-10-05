# Telegram Stars API qo‘llanma: to‘lovni qayta yubormaydigan integratsiya

Auditoriya: backend dasturchilar. Teglar: `python`, `api`, `telegram`, `xavfsizlik`.
Holat: tayyor qoralama, hali nashr qilinmagan. Matn AI yordamida tayyorlangan;
inson yozgan maqola sifatida yoki AI matn taqiqlangan platformaga yuborilmasin.

## Maqola

Fragment Donor — mustaqil servis va SDK loyihasi. U Telegram, Fragment yoki TON
rasmiy mahsuloti emas. Bu qo‘llanmada haqiqiy Stars/Premium xaridi bajarilmaydi,
hamyon xavfsizligi yoki Google’da chiqish kafolatlanmaydi.

`https://fragment.donor.uz` to‘g‘ridan-to‘g‘ri API’si servis loginini, account,
`Authorization`, `X-Api-Key` yoki service API key talab qilmaydi. Ammo xarid uchun
o‘zingizning Fragment sessiya `Cookie`’si va hamyon `Mnemonic`’i kerak. Ixtiyoriy
`Api-Key` TonConsole provayder kaliti, servisga kirish kaliti emas. “Service auth
yo‘q” degani “hamyon credentiallari kerak emas” degani emas.

Avval bitta, secretsiz username so‘rovidan boshlang:

```python
from fragment_donor_sdk import FragmentDonorClient

client = FragmentDonorClient(timeout=30)
user = client.get_user_info("durov")
print(user.username, user.is_premium)
```

Python SDK 3.10+ uchun, versiya 0.1.0. PyPI nashri tasdiqlanmaguncha toza source
repo ichidan `python -m pip install ./python` orqali o‘rnating. Registry’da haqiqiy
release chiqqach `python -m pip install fragment-donor-sdk==0.1.0` ishlatiladi.
Source mavjudligi paket registry’da chiqqanini anglatmaydi.

API’da to‘rtta amal bor: username uchun GET `/get-user-info/`; Stars uchun POST
`/buy-stars/`; Premium uchun POST `/buy-premium/`; balans uchun GET
`/wallet-balance/`. Backend balansni POST bilan ham qabul qiladi. Xarid body’si
JSON emas, form-urlencoded bo‘ladi.

Stars miqdori butun 50–1 000 000; Premium muddati 3, 6 yoki 12 oy. To‘lov usuli
`usdt_ton` (default) yoki `ton`; wallet version `auto`, `v5r1`, `v4r2`, `v3r2`.
Balans qiymatlari decimal string bo‘lib qoladi: pul hisobida `float` yoki JS
`Number` bilan raqamlarni yo‘qotmang.

```python
# Faqat ishonchli server va ataylab tasdiqlangan xarid uchun.
# Misollar kommentda: bu qo‘llanma hech qanday mablag‘ sarflamaydi.
# stars = client.buy_stars("durov", 50, payment_method="usdt_ton")
# premium = client.buy_premium("durov", 3, payment_method="ton")
```

Odatdagi limit barcha endpoint uchun umumiy: IP boshiga daqiqada 30 so‘rov.
429’da `FLOOD_WAIT`, `Retry-After`, `retry_after` va `flood_wait` kelishi mumkin.
SDK sekund yoki HTTP-date ko‘rinishidagi headerni tushunadi va mos waitlarning
eng kattasini oladi. Avtomatik kutish default o‘chiq. Faqat read-only amallar
uchun aniq yoqilganda maksimum ikki retry va har kutishda 60 sekund chegarasi bor;
server ko‘proq kut desa, muddat sun’iy qisqartirilmaydi.

Stars/Premium xaridi hech qanday xatoda avtomatik qayta yuborilmaydi: timeout,
429, 503 yoki 5xx’da ham. Birinchi so‘rov pul sarflagan, javob esa yo‘qolgan
bo‘lishi mumkin. Backend idempotency kafolati yoki purchase-status endpoint
bermaydi. Natijani “noma’lum” deb belgilang, hamyon tranzaksiyalari va oluvchini
tekshiring, keyin yangi xarid kerakligini ongli ravishda hal qiling.

Muhim xavf: tekshirilgan backend yuborilgan credentiallarni bazada saqlaydi.
SDK loglaridagi redaction server saqlashini bekor qilmaydi va servisni
non-custodial qilmaydi. Alohida, minimal mablag‘li hamyon, server secret manager
va operatorga ishonch chegarasini baholash kerak. Mnemonic/cookie’ni frontend,
localStorage, repo, screenshot yoki ochiq Postman muhitiga joylamang.

[O‘zbekcha docs](https://usnuz.github.io/fragment-donor-sdk/uz/) ·
[Source va release holati](https://github.com/usnuz/fragment-donor-sdk) ·
[Flood wait](https://usnuz.github.io/fragment-donor-sdk/uz/guides/rate-limit-flood-wait/).
