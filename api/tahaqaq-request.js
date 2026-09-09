export const config = {
  api: {
    bodyParser: false
  }
};

import formidable from "formidable";
import fs from "fs";


/* =========================================================
   أسعار خدمات أعراف تحقّق
========================================================= */

const SERVICE_PRICES = {
  "أعراف تحقّق — صحيفة أو مذكرة": 99,
  "أعراف تحقّق — إجابة قانونية": 49,
  "أعراف تحقّق — مسار القضية": 99,
  "أعراف تحقّق — ملف القضية كاملًا": 299
};


/* =========================================================
   أنواع نطاق التحقق
========================================================= */

const ALLOWED_REVIEW_MODES = new Set([
  "تحقق فقط",
  "تحقق وتصحيح"
]);


/* =========================================================
   أدوات مساعدة
========================================================= */

function first(value) {
  return Array.isArray(value)
    ? value[0]
    : value;
}


function escapeHtml(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}


function getClientIp(req) {
  return (
    req.headers["x-forwarded-for"]
      ?.split(",")[0]
      ?.trim() ||
    req.headers["x-real-ip"] ||
    "unknown"
  );
}


/* =========================================================
   Rate Limit
========================================================= */

const requestMap = new Map();


function isRateLimited(req) {
  const ip = getClientIp(req);
  const now = Date.now();

  const windowMs = 60 * 1000;
  const maxRequests = 3;

  const record =
    requestMap.get(ip) || {
      count: 0,
      start: now
    };

  if (
    now - record.start >
    windowMs
  ) {
    requestMap.set(ip, {
      count: 1,
      start: now
    });

    return false;
  }

  record.count += 1;

  requestMap.set(
    ip,
    record
  );

  return (
    record.count >
    maxRequests
  );
}


/* =========================================================
   API
========================================================= */

export default async function handler(
  req,
  res
) {

  /* -------------------------------------------------------
     السماح بنطاقات أعراف
  ------------------------------------------------------- */

  const allowedOrigins = [
    "https://araf.online",
    "https://www.araf.online",
    "https://araf-site-main.vercel.app"
  ];


  const origin =
    req.headers.origin;


  if (
    allowedOrigins.includes(
      origin
    )
  ) {
    res.setHeader(
      "Access-Control-Allow-Origin",
      origin
    );
  }


  res.setHeader(
    "Vary",
    "Origin"
  );

  res.setHeader(
    "Access-Control-Allow-Methods",
    "POST, OPTIONS"
  );

  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type"
  );

  res.setHeader(
    "Cache-Control",
    "no-store"
  );


  /* -------------------------------------------------------
     OPTIONS
  ------------------------------------------------------- */

  if (
    req.method ===
    "OPTIONS"
  ) {
    return res
      .status(200)
      .end();
  }


  /* -------------------------------------------------------
     POST فقط
  ------------------------------------------------------- */

  if (
    req.method !==
    "POST"
  ) {
    return res
      .status(405)
      .json({
        success: false,
        error:
          "Method not allowed"
      });
  }


  /* -------------------------------------------------------
     Rate Limit
  ------------------------------------------------------- */

  if (
    isRateLimited(req)
  ) {
    return res
      .status(429)
      .json({
        success: false,
        error:
          "تم تجاوز عدد المحاولات، يرجى المحاولة بعد دقيقة"
      });
  }


  /* -------------------------------------------------------
     التأكد من إعدادات Supabase
  ------------------------------------------------------- */

  if (
    !process.env.SUPABASE_URL ||
    !process.env.SUPABASE_SERVICE_ROLE_KEY
  ) {
    return res
      .status(500)
      .json({
        success: false,
        error:
          "إعدادات Supabase غير مكتملة"
      });
  }


  /* -------------------------------------------------------
     التأكد من Resend
  ------------------------------------------------------- */

  if (
    !process.env.RESEND_API_KEY
  ) {
    return res
      .status(500)
      .json({
        success: false,
        error:
          "RESEND_API_KEY غير موجود"
      });
  }


  /* =======================================================
     استقبال FormData + الملفات
  ======================================================= */

  const form = formidable({
    multiples: true,

    maxFiles: 3,

    maxFileSize:
      2 * 1024 * 1024,

    maxTotalFileSize:
      3.5 * 1024 * 1024,

    keepExtensions: true
  });


  form.parse(
    req,
    async (
      parseError,
      fields,
      files
    ) => {

      try {

        /* -------------------------------------------------
           خطأ قراءة الطلب
        ------------------------------------------------- */

        if (
          parseError
        ) {
          return res
            .status(400)
            .json({
              success: false,
              error:
                "تعذر قراءة الطلب أو أن حجم المرفقات أكبر من المسموح"
            });
        }


        /* -------------------------------------------------
           تنظيف البيانات
        ------------------------------------------------- */

        const customerName =
          String(
            first(
              fields.customer_name
            ) || ""
          )
            .trim()
            .slice(
              0,
              120
            );


        const customerPhone =
          String(
            first(
              fields.customer_phone
            ) || ""
          )
            .trim();


        const serviceName =
          String(
            first(
              fields.service_name
            ) || ""
          )
            .trim();


        const reviewMode =
          String(
            first(
              fields.review_mode
            ) ||
            "تحقق فقط"
          )
            .trim();


        const pastedContent =
          String(
            first(
              fields.pasted_content
            ) || ""
          )
            .trim()
            .slice(
              0,
              12000
            );


        const extraDetails =
          String(
            first(
              fields.extra_details
            ) || ""
          )
            .trim()
            .slice(
              0,
              3000
            );


        /* -------------------------------------------------
           التحقق من البيانات الأساسية
        ------------------------------------------------- */

        if (
          !customerName ||
          !customerPhone ||
          !serviceName
        ) {
          return res
            .status(400)
            .json({
              success: false,
              error:
                "الاسم ورقم الجوال ونوع التحقق مطلوبة"
            });
        }


        /* -------------------------------------------------
           التحقق من الجوال
        ------------------------------------------------- */

        if (
          !/^05\d{8}$/.test(
            customerPhone
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              error:
                "رقم الجوال غير صحيح"
            });
        }


        /* -------------------------------------------------
           التحقق من الخدمة
        ------------------------------------------------- */

        if (
          typeof SERVICE_PRICES[
            serviceName
          ] ===
          "undefined"
        ) {
          return res
            .status(400)
            .json({
              success: false,
              error:
                "نوع التحقق غير صحيح"
            });
        }


        /* -------------------------------------------------
           التحقق من نطاق الخدمة
        ------------------------------------------------- */

        if (
          !ALLOWED_REVIEW_MODES.has(
            reviewMode
          )
        ) {
          return res
            .status(400)
            .json({
              success: false,
              error:
                "نطاق التحقق غير صحيح"
            });
        }


        /* =================================================
           الملفات
        ================================================= */

        const uploadedFiles =
          files.files
            ? (
                Array.isArray(
                  files.files
                )
                  ? files.files
                  : [
                      files.files
                    ]
              )
            : [];


        /* -------------------------------------------------
           يجب وجود ملف أو نص
        ------------------------------------------------- */

        if (
          !pastedContent &&
          !uploadedFiles.length
        ) {
          return res
            .status(400)
            .json({
              success: false,
              error:
                "ارفع ملفًا أو الصق المحتوى المراد التحقق منه"
            });
        }


        /* =================================================
           السعر
        ================================================= */

        const price =
          SERVICE_PRICES[
            serviceName
          ];


        /* =================================================
           أسماء الملفات
        ================================================= */

        const attachmentNames =
          uploadedFiles.map(
            file =>
              file.originalFilename ||
              "attachment"
          );


        /* =================================================
           تفاصيل الطلب
        ================================================= */

        const detailsParts = [
          `نطاق الطلب: ${reviewMode}`,

          pastedContent
            ? `\nالمحتوى الملصق:\n${pastedContent}`
            : "",

          extraDetails
            ? `\nملاحظات العميل:\n${extraDetails}`
            : ""
        ]
          .filter(Boolean);


        const details =
          detailsParts
            .join("\n")
            .slice(
              0,
              16000
            );


        /* =================================================
           البيانات التي تحفظ في Supabase
        ================================================= */

        const payload = {
          customer_name:
            customerName,

          customer_phone:
            customerPhone,

          service_type:
            "أعراف تحقّق",

          service_name:
            serviceName,

          price,

          /*
            لا يوجد دفع عند الطلب.
            الدفع بعد التنفيذ.
          */
          payment_status:
            "manual_pending",

          source:
            "direct_services",

          details,

          attachments:
            attachmentNames,

          status:
            "new",

          priority:
            "normal"
        };


        /* =================================================
           حفظ الطلب في Supabase
        ================================================= */

        const supabaseRes =
          await fetch(
            `${process.env.SUPABASE_URL}/rest/v1/service_requests`,
            {
              method:
                "POST",

              headers: {
                apikey:
                  process.env.SUPABASE_SERVICE_ROLE_KEY,

                Authorization:
                  `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`,

                "Content-Type":
                  "application/json",

                Prefer:
                  "return=representation"
              },

              body:
                JSON.stringify(
                  payload
                )
            }
          );


        const savedData =
          await supabaseRes
            .json()
            .catch(
              () => []
            );


        if (
          !supabaseRes.ok
        ) {
          console.error(
            "TAHAQAQ SUPABASE ERROR:",
            savedData
          );

          return res
            .status(500)
            .json({
              success: false,
              error:
                "تعذر حفظ الطلب حاليًا"
            });
        }


        const savedRequest =
          savedData?.[0] ||
          null;


        /* =================================================
           تجهيز الملفات لإرسالها على البريد
        ================================================= */

        const emailAttachments =
          uploadedFiles.map(
            file => ({
              filename:
                file.originalFilename ||
                "attachment",

              content:
                fs
                  .readFileSync(
                    file.filepath
                  )
                  .toString(
                    "base64"
                  )
            })
          );


        /* =================================================
           محتوى البريد
        ================================================= */

        const emailHtml = `
          <div
            dir="rtl"
            style="
              font-family:Arial,Tahoma,sans-serif;
              line-height:1.9;
              color:#1B2B36;
            "
          >

            <h2
              style="
                color:#1B3A4B;
              "
            >
              طلب جديد — أعراف تحقّق
            </h2>


            <p>
              <strong>العميل:</strong>
              ${escapeHtml(customerName)}
            </p>


            <p>
              <strong>الجوال:</strong>
              ${escapeHtml(customerPhone)}
            </p>


            <p>
              <strong>الخدمة:</strong>
              ${escapeHtml(serviceName)}
            </p>


            <p>
              <strong>نطاق التحقق:</strong>
              ${escapeHtml(reviewMode)}
            </p>


            <p>
              <strong>السعر:</strong>
              ${escapeHtml(String(price))}
              ريال
              —
              السداد بعد التنفيذ
            </p>


            <hr
              style="
                border:none;
                border-top:1px solid #E5E7EB;
                margin:18px 0;
              "
            >


            ${
              pastedContent
                ? `
                  <p>
                    <strong>
                      المحتوى الملصق:
                    </strong>
                  </p>

                  <div
                    style="
                      background:#F9FAFB;
                      border:1px solid #E5E7EB;
                      border-radius:10px;
                      padding:12px;
                      white-space:pre-wrap;
                    "
                  >
                    ${escapeHtml(
                      pastedContent
                    )}
                  </div>
                `
                : ""
            }


            ${
              extraDetails
                ? `
                  <p>
                    <strong>
                      ملاحظات العميل:
                    </strong>
                  </p>

                  <div
                    style="
                      background:#F9FAFB;
                      border:1px solid #E5E7EB;
                      border-radius:10px;
                      padding:12px;
                      white-space:pre-wrap;
                    "
                  >
                    ${escapeHtml(
                      extraDetails
                    )}
                  </div>
                `
                : ""
            }


            <p>
              <strong>
                المرفقات:
              </strong>

              ${
                attachmentNames.length
                  ? attachmentNames
                      .map(
                        escapeHtml
                      )
                      .join("، ")
                  : "لا توجد"
              }
            </p>


            <p
              style="
                color:#6B7280;
                font-size:13px;
              "
            >
              ${
                savedRequest?.id
                  ? `رقم السجل: ${escapeHtml(
                      String(
                        savedRequest.id
                      )
                    )}`
                  : "تم حفظ الطلب في قاعدة البيانات."
              }
            </p>

          </div>
        `;


        /* =================================================
           إرسال الإشعار البريدي
        ================================================= */

        const emailRes =
          await fetch(
            "https://api.resend.com/emails",
            {
              method:
                "POST",

              headers: {
                Authorization:
                  `Bearer ${process.env.RESEND_API_KEY}`,

                "Content-Type":
                  "application/json"
              },

              body:
                JSON.stringify({
                  from:
                    "Araf <orders@araf.online>",

                  to: [
                    process.env.SUPPORT_EMAIL ||
                    "ka89801@gmail.com",

                    process.env.PARTNER_EMAIL ||
                    "bandaralbeshri@outlook.com"
                  ]
                    .filter(Boolean),

                  subject:
                    `أعراف تحقّق - ${serviceName}`,

                  html:
                    emailHtml,

                  attachments:
                    emailAttachments
                })
            }
          );


        const emailData =
          await emailRes
            .json()
            .catch(
              () => ({})
            );


        /* -------------------------------------------------
           الطلب محفوظ حتى لو فشل البريد
        ------------------------------------------------- */

        if (
          !emailRes.ok
        ) {
          console.error(
            "TAHAQAQ RESEND ERROR:",
            emailData
          );

          return res
            .status(200)
            .json({
              success: true,

              request:
                savedRequest,

              email_sent:
                false,

              warning:
                "تم حفظ الطلب، لكن تعذر إرسال الإشعار البريدي"
            });
        }


        /* =================================================
           نجاح كامل
        ================================================= */

        return res
          .status(200)
          .json({
            success: true,

            request:
              savedRequest,

            email_sent:
              true
          });


      } catch (error) {

        console.error(
          "tahaqaq-request error:",
          error
        );


        return res
          .status(500)
          .json({
            success: false,

            error:
              error?.message ||
              "حدث خطأ أثناء إرسال الطلب"
          });
      }
    }
  );
}
