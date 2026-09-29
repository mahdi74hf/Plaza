# Plaza PRD Prototypes

پروتوتایپ‌های UI پلازا دیجیتال، به‌صورت مرحله‌ای و PRDبه‌PRD.

## مرحله فعلی

- `PRD-001 — ایجاد ساختار دسته‌بندی براساس CAT Tree`
- Entity Product: ویژگی LeafCat (PRD-044)، برند، واریانت و SKU، ایجاد و انتشار، محصولات مرتبط و SEO
- **PRD-066 — پنل کرالر محصولات** (تب «کرالر» در بخش محصول): Job، Wizard چهار مرحله، زمان‌بندی، گزارش Excel در پنل

### لینک دمو PRD-066 (پس از Deploy)

- مستقیم به کرالر: `?screen=product&tab=crawler`
- Wizard جدید: `?screen=product&tab=crawler&crawler=wizard`
- گزارش Excel نمونه: `?screen=product&tab=crawler&crawler=report`
- Job زمان‌بندی‌شده: `?screen=product&tab=crawler&crawler=scheduled`

در فهرست Job دو نمونه از قبل وجود دارد (تکمیل‌شده با خطا + زمان‌بندی‌شده). برای دمو بدون انتظار، در جزئیات Job زمان‌بندی‌شده «شروع فوری (دمو)» را بزن.

از منوی کناری بین «دسته‌بندی» و «محصول» جابه‌جا شو. داده هر دو بخش در localStorage همان مرورگر می‌ماند.

پیاده‌سازی دسته‌بندی شامل این‌هاست:

- مشاهده و باز/بسته‌کردن CAT Tree
- نمایش نوع و مسیر کامل هر نود
- ایجاد Vertical در ریشه
- ایجاد Category، SubCategory و LeafCat براساس Parent مجاز
- ویرایش نام و وضعیت نود
- حذف نودهای بدون Child
- ذخیره تمام تغییرات در `localStorage` مرورگر
- نمایش اعتبار LeafCat برای اتصال Product
- نمایش تصمیم‌های باز PRD

این نسخه یک Prototype بدون Backend است؛ بنابراین داده‌ها برای همان مرورگر باقی می‌مانند. همگام‌سازی بین کاربرها و دستگاه‌ها در صورت نیاز با Supabase اضافه می‌شود. SEO صفحه دسته‌بندی در PRDهای بعدی Category است.

## اجرا

```bash
npm install
npm run dev
```

## Build

```bash
npm run build
```
