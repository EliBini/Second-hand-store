API — תיעוד נקודות קצה

המסמך מפרט את נקודות הקצה של השרת כפי שהוגדרו ב־backend.

הערות כלליות:
- רוב נקודות הקצה המוגנות דורשות Authorization: Bearer <JWT> בכותרת.
- תוכן בקשות JSON יש לשלוח עם Content-Type: application/json למעט העלאת קבצים (multipart/form-data).

1) Auth (/api/auth)
- POST /api/auth/register — רישום משתמש
  - גוף (JSON): { email, password, firstName, lastName, role? }
  - תשובה: { authtoken, email, role, userId }
- POST /api/auth/login — התחברות
  - גוף (JSON): { email, password }
  - תשובה: { authtoken, userName, userEmail, userRole, userId }
- PUT /api/auth/update — עדכון פרופיל (דורש אימות)
  - כותרת: Authorization: Bearer <token>
  - גוף (JSON): { name }
  - תשובה: { authtoken, role }

2) Chats (/api/chats)
- POST /api/chats/:itemId — פתיחת צ'אט עבור פריט (דורש אימות)
- GET /api/chats/ — קבלת רשימת הצ'אטים של המשתמש (דורש אימות)
- PATCH /api/chats/:chatId/approve — אישור צ'אט (מוכר או מנהל)
- GET /api/chats/:chatId/messages — שליפת הודעות צ'אט (דורש אימות)
- POST /api/chats/:chatId/messages — פרסום הודעה חדשה
  - גוף: { content: string }
- DELETE /api/chats/:chatId — מחיקת צ'אט והודעות (מותר לבעלים או מנהל)

3) Notifications (/api/notifications)
- GET /api/notifications/ — קבלת התראות של המשתמש (דורש אימות)
- POST /api/notifications/mark-read — סימון כהודעות נקראות
  - גוף: { ids: ["id1","id2"] } (ריק/לא שדה => מסמן את כל הלא נקראות)
- DELETE /api/notifications/:id — מחיקת התראה (דורש אימות)
- POST /api/notifications/preferences — שמירת העדפות התראות
  - גוף: { categories: [...] }
- GET /api/notifications/preferences — קבלת העדפות המשתמש
- GET /api/notifications/admin/unread — ספירת התראות מנהל לא נקראו (admin בלבד)

4) Search (/api/secondchance/search)
- GET /api/secondchance/search — חיפוש פריטים
  - פרמטרי שאילתה נתמכים: name, category, condition, price=free או price_max, age_years, city, area, sort.
  - תשובה: מערך פריטים התואמים.

5) Items / Marketplace (/api/secondchance/items)
- GET /api/secondchance/items — החזרת פריטים (תומך בפילטרים כמו בחיפוש)
- GET /api/secondchance/items/carousel — פריטי קרוסלה (החדשים/פופולריים)
- GET /api/secondchance/items/reservations/me — פריטים שמורים למשתמש המחובר (auth)
- GET /api/secondchance/items/mine — כל הפריטים של המשתמש המחובר (auth)
- GET /api/secondchance/items/admin/stats — סטטיסטיקות מנהל (auth + admin)
- GET /api/secondchance/items/admin/all — כל הפריטים (auth + admin)
- GET /api/secondchance/items/:id — קבלת פריט לפי id
- POST /api/secondchance/items — יצירת פריט חדש (auth)
  - סוג תוכן: multipart/form-data להעלאת תמונות (images), שדות נוספים ב‑form-data: name, description, price, city, area, lat, lng, pickupLocations (JSON string), וכו'.
  - מגבלת תמונות: עד 5.
- PUT /api/secondchance/items/:id — עדכון פריט (auth; הבעלים או admin)
- POST /api/secondchance/items/:id/request-approval — בקשת אישור איסוף פריט (auth)
- POST /api/secondchance/items/:id/approve-buyer — אישור קונה על ידי המוכר (auth)
  - גוף: { buyerId }
- GET /api/secondchance/items/:id/secure — קבלת מידע מאובטח על פריט לפי תפקיד המשתמש (auth)
- GET /api/secondchance/items/:id/pickup-options — קבלת אפשרויות איסוף ממוקמות (auth)
  - פרמטרי שאילתה: lat, lng, city, area — משמשים למיון/חישוב מרחק.
- POST /api/secondchance/items/:id/reserve — שמירת פריט על ידי משתמש מחובר (auth)
- POST /api/secondchance/items/:id/cancel-reservation — ביטול הזמנת פריט (auth)
- DELETE /api/secondchance/items/:id — מחיקת פריט על ידי הבעלים או מנהל (auth)
- DELETE /api/secondchance/items/admin/:id — מחיקת פריט על ידי מנהל (auth + admin)

6) Payments (/api/payments)
- POST /api/payments/create-order — יצירת הזמנת תשלום (auth)
  - גוף: { itemId, amount }.
  - אם PAYPAL_CLIENT_ID/PAYPAL_SECRET מוגדרים — יוצרת הזמנה ב‑PayPal Sandbox; אחרת יוצרת הזמנה מקומית מדומה.
- POST /api/payments/capture-order — אישור תשלום (auth)
  - גוף: { orderId } — קליטת תשלום ותיוג הפריט כ‑sold.
- POST /api/payments/cancel-order — ביטול הזמנה (auth)
  - גוף: { orderId }.
- GET /api/payments/my-purchases — היסטוריית רכישות של המשתמש (auth)
- GET /api/payments/my-sales — היסטוריית מכירות של המשתמש (auth)
- GET /api/payments/paypal-config — החזרת clientId של PayPal לשימוש בצד הלקוח (public)

7) Admin — Users (/api/admin/users)
- GET /api/admin/users/ — קבלת רשימת משתמשים (auth + admin)
- DELETE /api/admin/users/:id — מחיקת משתמש (auth + admin)
- POST /api/admin/users/:id/message — שליחת הודעה/התראה למשתמש (auth + admin)
  - גוף: { title?, message }

דוגמאות כותרות ובקשות נפוצות
- כותרת אימות: Authorization: Bearer <authtoken>
- קריאת JSON פשוטה:
  - GET /api/secondchance/items → Content-Type: application/json
- העלאת פריט עם תמונה (cURL דוגמא):
```
curl -X POST "http://localhost:3060/api/secondchance/items" \
  -H "Authorization: Bearer <token>" \
  -F "name=My Item" \
  -F "price=10" \
  -F "images=@./photo1.jpg"
```

הערה נוספת
- אם תרצה, אוכל ליצור קובץ API נפרד (API.md) עם דוגמאות בקשות/תגובות נוספות, סכמות JSON לשדות חשובים, וקבוצת דוגמאות Postman/Insomnia.
