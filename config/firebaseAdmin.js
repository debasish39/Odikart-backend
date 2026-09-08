import dotenv from "dotenv";

dotenv.config();

import {
  initializeApp,
  cert,
  getApps,
} from "firebase-admin/app";

import {
  getAuth,
} from "firebase-admin/auth";


/* =========================================
   VALIDATE
========================================= */

if (!process.env.FIREBASE_PROJECT_ID) {

  throw new Error(
    "FIREBASE_PROJECT_ID is missing from .env"
  );

}

if (!process.env.FIREBASE_CLIENT_EMAIL) {

  throw new Error(
    "FIREBASE_CLIENT_EMAIL is missing from .env"
  );

}

if (!process.env.FIREBASE_PRIVATE_KEY) {

  throw new Error(
    "FIREBASE_PRIVATE_KEY is missing from .env"
  );

}


/* =========================================
   FIREBASE ADMIN
========================================= */

const firebaseApp =
  getApps().length > 0
    ? getApps()[0]
    : initializeApp({

        credential: cert({

          projectId:
            process.env.FIREBASE_PROJECT_ID,

          clientEmail:
            process.env.FIREBASE_CLIENT_EMAIL,

          privateKey:
            process.env.FIREBASE_PRIVATE_KEY.replace(
              /\\n/g,
              "\n"
            ),

        }),

      });


/* =========================================
   FIREBASE AUTH
========================================= */

const firebaseAuth =
  getAuth(firebaseApp);


export default firebaseAuth;