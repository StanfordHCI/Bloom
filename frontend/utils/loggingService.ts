import { doc, collection, setDoc } from "firebase/firestore";
import { firestore, auth } from "../firebase";
import { STUDY_ID, LOG_UPLOAD_ENABLED } from "../config";
import * as util from 'util'

const originalLog = console.log;
const originalWarn = console.warn;
const originalError = console.error;

export type LogPayload = {
  timestamp: string;
  eventType: string; 
  [key: string]: unknown;
};

// offline queue if Firestore is unreachable or not authenticated
const logsQueue: LogPayload[] = [];

async function uploadLog(log: LogPayload) {
  if (!LOG_UPLOAD_ENABLED) return;

  const user = auth.currentUser;
  if (!user) { 
    logsQueue.push(log);
    return;
  }

  const uid = user.uid;
  const userDocRef = doc(firestore, `studies/${STUDY_ID}/users/${uid}`);
  const logsRef = collection(userDocRef, "logs");

  const docRef = doc(logsRef, log.timestamp);
  await setDoc(docRef, log);
}

async function flushLogsQueue() {
  if (logsQueue.length === 0) return;

  const pending = [...logsQueue];
  logsQueue.length = 0;          // clear the queue

  for (const logItem of pending) {
      try {
        await uploadLog(logItem);
      } catch (err) {
        originalError("Failed to upload log item:", err);
        logsQueue.push(logItem);
      }
    }
}

if (LOG_UPLOAD_ENABLED) {
  setInterval(() => {
    flushLogsQueue().catch((err) => {
      originalError("Error flushing logs queue:", err);
    });
  }, 10 * 60 * 1000); // every 10 minutes
}

export async function logEvent(eventType: string, data: Omit<LogPayload, "timestamp">) {
  const payload: LogPayload = {
    timestamp: new Date().toISOString(),
    eventType,
    ...data,
  };

  try {
    await uploadLog(payload);
  } catch {
    logsQueue.push(payload);
  }
}

function handleConsole(level: "log"|"warn"|"error", args: unknown[]) {
  const messages = args.map((arg) => {
    if (arg instanceof Error) {
      return arg.stack || arg.message;
    }
    return typeof arg === "object" ? util.inspect(arg) : String(arg);
  });

  logEvent(
    "console",
    {
      level,
      messages,
  }).catch(() => {
    return;
  });
}

export function initConsoleInterceptor() {
  if (!LOG_UPLOAD_ENABLED) return;
  
  console.log = (...args: unknown[]) => {
    originalLog(...args);
    handleConsole("log", args);
  };
  console.warn = (...args: unknown[]) => {
    originalWarn(...args);
    handleConsole("warn", args);
  };
  console.error = (...args: unknown[]) => {
    originalError(...args);
    handleConsole("error", args);
  };
}
