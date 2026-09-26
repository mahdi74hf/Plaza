# Plaza PRD Prototypes

پروتوتایپ‌های UI پلازا دیجیتال، به‌صورت مرحله‌ای و PRDبه‌PRD.

## مرحله فعلی

`PRD-001 — ایجاد ساختار دسته‌بندی براساس CAT Tree`

پیاده‌سازی فعلی فقط شامل محدوده همین PRD است:

- مشاهده و باز/بسته‌کردن CAT Tree
- نمایش نوع و مسیر کامل هر نود
- ایجاد Vertical در ریشه
- ایجاد Category، SubCategory و LeafCat براساس Parent مجاز
- نمایش اعتبار LeafCat برای اتصال Product
- نمایش تصمیم‌های باز PRD

ویرایش، حذف، تغییر وضعیت، SEO و نمایش در سایت عمداً در این مرحله وجود ندارند.

## اجرا

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
