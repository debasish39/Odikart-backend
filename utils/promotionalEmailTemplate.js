export const promotionalEmailTemplate = ({
  userName,
  title,
  message,
  couponCode,
  discount,
}) => {
  return `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8" />
  <meta
    name="viewport"
    content="width=device-width, initial-scale=1.0"
  />

  <title>${title}</title>
</head>

<body style="
  margin:0;
  padding:0;
  background:#f5f5f5;
  font-family:Arial,Helvetica,sans-serif;
">

  <div style="
    max-width:600px;
    margin:30px auto;
    background:#ffffff;
    border-radius:14px;
    overflow:hidden;
  ">

    <!-- HEADER -->

    <div style="
      padding:25px;
      text-align:center;
      background:#111111;
      color:#ffffff;
    ">

      <h1 style="
        margin:0;
        font-size:28px;
      ">
        🛍️ Odikart
      </h1>

    </div>


    <!-- CONTENT -->

    <div style="
      padding:30px;
    ">

      <p style="
        font-size:16px;
        margin-bottom:20px;
      ">
        Hi ${userName},
      </p>


      <h2 style="
        font-size:24px;
        margin-bottom:15px;
      ">
        ${title}
      </h2>


      <p style="
        font-size:16px;
        line-height:1.7;
        color:#444444;
      ">
        ${message}
      </p>


      ${
        discount > 0
          ? `
            <div style="
              text-align:center;
              margin:30px 0;
              padding:20px;
              background:#f5f5f5;
              border-radius:10px;
            ">

              <div style="
                font-size:14px;
                color:#666666;
              ">
                SPECIAL OFFER
              </div>

              <div style="
                font-size:36px;
                font-weight:bold;
                margin-top:8px;
              ">
                ${discount}% OFF
              </div>

            </div>
          `
          : ""
      }


      ${
        couponCode
          ? `
            <div style="
              padding:20px;
              background:#f3f3f3;
              text-align:center;
              border-radius:10px;
              margin-top:20px;
            ">

              <p style="
                margin:0 0 8px 0;
                color:#666666;
              ">
                Use Coupon Code
              </p>

              <h2 style="
                margin:0;
                letter-spacing:2px;
              ">
                ${couponCode}
              </h2>

            </div>
          `
          : ""
      }


      <!-- SHOP BUTTON -->

      <div style="
        text-align:center;
        margin-top:30px;
      ">

        <a
          href="https://odikart.in"
          style="
            display:inline-block;
            padding:15px 30px;
            background:#111111;
            color:#ffffff;
            text-decoration:none;
            border-radius:8px;
            font-weight:bold;
          "
        >
          Shop Now
        </a>

      </div>

    </div>


    <!-- FOOTER -->

    <div style="
      padding:20px;
      text-align:center;
      font-size:12px;
      color:#777777;
      background:#fafafa;
    ">

      <p>
        You are receiving this email because you
        opted in to promotional emails from Odikart.
      </p>

      <p>
        <a
          href="https://odikart.in/unsubscribe"
          style="color:#555555;"
        >
          Unsubscribe
        </a>
      </p>

      <p>
        © ${new Date().getFullYear()} Odikart
      </p>

    </div>

  </div>

</body>
</html>
  `;
};