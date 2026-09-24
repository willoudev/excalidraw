import { useCallback, useEffect, useRef, useState } from "react";

// ═══ CODE D'ACCÈS ═══════════════════════════════════════════════
// Même mécanisme que macroplanning : le mot de passe n'est jamais stocké
// en clair, seul son hash PBKDF2-SHA256 (310 000 itérations) est comparé
// côté client. Une session valide est mémorisée sous forme chiffrée
// (AES-GCM) dans localStorage, mais la clé de déchiffrement ne vit qu'en
// sessionStorage (volatile) : fermer l'onglet invalide donc la session
// même si les 30 minutes ne sont pas écoulées.
const ACCESS_SALT_HEX =
  "4aa6c0b34bdcbc444a87680a998bc1c0";
const ACCESS_HASH_HEX =
  "0a3dc027b731d56052d94b538e0caf98e0abe14a6217d6170d198989d8365541";
const ACCESS_ITERATIONS = 310000;
const ACCESS_SESSION_KEY = "wb_access_sess_v1";
const ACCESS_SESSION_TTL = 30 * 60 * 1000; // 30 minutes
const ACCESS_MEM_KEY = "_ak";

const hexToUint8 = (hex: string): Uint8Array<ArrayBuffer> => {
  const arr = new Uint8Array(new ArrayBuffer(hex.length / 2));
  for (let i = 0; i < hex.length; i += 2) {
    arr[i / 2] = parseInt(hex.substr(i, 2), 16);
  }
  return arr;
};

const uint8ToHex = (buf: ArrayBuffer): string =>
  Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");

const deriveSessionKey = async (accessCode: string): Promise<CryptoKey> => {
  const enc = new TextEncoder();
  const baseKey = await crypto.subtle.importKey(
    "raw",
    enc.encode(accessCode),
    { name: "PBKDF2" },
    false,
    ["deriveKey"],
  );
  return crypto.subtle.deriveKey(
    {
      name: "PBKDF2",
      salt: hexToUint8(ACCESS_SALT_HEX),
      iterations: 100000,
      hash: "SHA-256",
    },
    baseKey,
    { name: "AES-GCM", length: 256 },
    false,
    ["encrypt", "decrypt"],
  );
};

const storeEncryptedSession = async (accessCode: string): Promise<void> => {
  const key = await deriveSessionKey(accessCode);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const payload = new TextEncoder().encode(Date.now().toString());
  const cipher = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, payload);
  localStorage.setItem(
    ACCESS_SESSION_KEY,
    JSON.stringify({
      iv: Array.from(iv),
      data: Array.from(new Uint8Array(cipher)),
    }),
  );
};

const verifyEncryptedSession = async (): Promise<boolean> => {
  const raw = localStorage.getItem(ACCESS_SESSION_KEY);
  if (!raw) {
    return false;
  }
  const memKey = sessionStorage.getItem(ACCESS_MEM_KEY);
  if (!memKey) {
    return false;
  }
  try {
    const { iv, data } = JSON.parse(raw);
    const key = await deriveSessionKey(memKey);
    const plain = await crypto.subtle.decrypt(
      { name: "AES-GCM", iv: new Uint8Array(iv) },
      key,
      new Uint8Array(data),
    );
    const ts = parseInt(new TextDecoder().decode(plain), 10);
    if (Date.now() - ts < ACCESS_SESSION_TTL) {
      return true;
    }
    localStorage.removeItem(ACCESS_SESSION_KEY);
    sessionStorage.removeItem(ACCESS_MEM_KEY);
    return false;
  } catch {
    localStorage.removeItem(ACCESS_SESSION_KEY);
    sessionStorage.removeItem(ACCESS_MEM_KEY);
    return false;
  }
};

const deriveAccessHash = async (code: string): Promise<string> => {
  const enc = new TextEncoder();
  const keyMat = await crypto.subtle.importKey(
    "raw",
    enc.encode(code),
    { name: "PBKDF2" },
    false,
    ["deriveBits"],
  );
  const derived = await crypto.subtle.deriveBits(
    {
      name: "PBKDF2",
      salt: hexToUint8(ACCESS_SALT_HEX),
      iterations: ACCESS_ITERATIONS,
      hash: "SHA-256",
    },
    keyMat,
    256,
  );
  return uint8ToHex(derived);
};

export const AccessGate: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [unlocked, setUnlocked] = useState<boolean | null>(null);
  const [checking, setChecking] = useState(false);
  const [error, setError] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    verifyEncryptedSession().then(setUnlocked);
  }, []);

  useEffect(() => {
    if (unlocked === false) {
      inputRef.current?.focus();
    }
  }, [unlocked]);

  const checkAccessCode = useCallback(async () => {
    const code = inputRef.current?.value.trim();
    if (!code) {
      setError(true);
      return;
    }
    setChecking(true);
    try {
      const hash = await deriveAccessHash(code);
      if (hash === ACCESS_HASH_HEX) {
        sessionStorage.setItem(ACCESS_MEM_KEY, code);
        await storeEncryptedSession(code);
        setUnlocked(true);
      } else {
        setError(true);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
        inputRef.current?.focus();
      }
    } finally {
      setChecking(false);
    }
  }, []);

  if (unlocked) {
    return <>{children}</>;
  }

  return (
    <div
      style={{
        display: "flex",
        position: "fixed",
        inset: 0,
        zIndex: 999999,
        background: "linear-gradient(135deg,#0b0f14 0%,#1a2332 100%)",
        alignItems: "center",
        justifyContent: "center",
        flexDirection: "column",
        fontFamily: "sans-serif",
        visibility: unlocked === null ? "hidden" : "visible",
      }}
    >
      <div
        style={{
          background: "#1c1b19",
          border: "1px solid #393836",
          borderRadius: 12,
          padding: "36px 40px",
          maxWidth: 360,
          width: "90%",
          boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 28, marginBottom: 8 }}>🔐</div>
        <h2
          style={{
            color: "#cdccca",
            fontSize: 16,
            fontWeight: 700,
            margin: "0 0 4px 0",
          }}
        >
          Whiteboard
        </h2>
        <p style={{ color: "#797876", fontSize: 12, margin: "0 0 24px 0" }}>
          Code d'accès requis
        </p>
        <input
          ref={inputRef}
          type="password"
          placeholder="Entrez votre code d'accès"
          style={{
            width: "100%",
            padding: "10px 14px",
            borderRadius: 6,
            border: "1px solid #393836",
            background: "#22211f",
            color: "#cdccca",
            fontSize: 14,
            outline: "none",
            boxSizing: "border-box",
            marginBottom: 8,
          }}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              checkAccessCode();
            }
          }}
          onInput={() => setError(false)}
        />
        {error && (
          <div
            style={{
              color: "#dd6974",
              fontSize: 12,
              marginBottom: 10,
              textAlign: "left",
            }}
          >
            Code incorrect, veuillez réessayer.
          </div>
        )}
        <button
          onClick={checkAccessCode}
          disabled={checking}
          style={{
            width: "100%",
            padding: 10,
            borderRadius: 6,
            border: "none",
            cursor: checking ? "default" : "pointer",
            background: "#c0392b",
            color: "#fff",
            fontSize: 14,
            fontWeight: 700,
          }}
        >
          {checking ? "⏳ Vérification..." : "Accéder"}
        </button>
        <p style={{ color: "#5a5957", fontSize: 10, margin: "16px 0 0 0" }}>
          Accès sécurisé
        </p>
      </div>
    </div>
  );
};
