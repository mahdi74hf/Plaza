# Plaza PRD Prototypes

پروتوتایپ‌های UI پلازا دیجیتال، به‌صورت مرحله‌ای و PRDبه‌PRD.

## مرحله فعلی

- `PRD-001 — ایجاد ساختار دسته‌بندی براساس CAT Tree`
- Entity Product: ویژگی LeafCat (PRD-044)، برند، واریانت و SKU، ایجاد و انتشار، محصولات مرتبط و SEO
- **PRD-066 — پنل کرالر محصولات** (تب «کرالر» در بخش محصول): Job، Wizard چهار مرحله، زمان‌بندی، گزارش Excel در پنل
- **PRD-043** (Category): غیرفعال‌سازی با پیش‌نمایش اثر، حذف LeafCat دارای Product مسدود، Audit
- **PRD-032 v0.4**: Tag مارکتینgi، پیش‌نمایش انتشار
- **PRD-049**: تأیید/رد Cross-sell AI (REL-03)، حذف اتصال با تأیید
- **PRD-048 FLT-03**: فیلتر مشترک در Category والد (Shop نمونه)
- **PRD-055 v0.4**: چیدمان منعطف سه‌سطحی Shop؛ مقصد PLP اختیاری برای سطح اول و مقصد الزامی برای سطح دوم/سوم، همراه Filter برند

### لینک دمو PRD-055

- ویرایش چیدمان: `?screen=product&tab=shop-layout`
- مسیر مقصد PLP در Preview چیدمان نمایش داده می‌شود؛ پیش‌نمایش مستقل PLP از Prototype حذف شده است.

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

## Design System

UI tokens and component sizing follow **Metronic v9.5 / Plaza Design System** from Figma  
(`Metronic_v9.5.0` → page **COMPONENTS**). CSS variables live in `src/style.css` (`--ds-*`).

## Build

```bash
npm run build
```
