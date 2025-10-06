import axios from "axios";
import { BACKEND_URL } from "../config";

/**
 * Verifies an auth token with the backend to ensure it is valid and 
 * generates a custom token.
 * @param authToken - The Firebase ID token provided by the client.
 * @returns The verified UID and a customToken from the backend.
 */

export const authenticateToken = async (authToken: string) => {
  console.log("Authenticating token: ", authToken);
  try {
    const response = await axios.get<{ verifiedUID: string; customToken: string }>(
      `${BACKEND_URL}/auth/authenticateToken`,
      {
        headers: { Authorization: `Bearer ${authToken}` },
        timeout: 30000
      },
    );
    return response.data;
  } catch (error) {
    console.error("Failed to authenticate token:", error);
    throw error;
  }
};

export const verifyToken = async (authToken: string) => {
    console.log("Verifying auth token: ", authToken);
    try {
        const response = await axios.get<string>(`${BACKEND_URL}/auth/verify`, {
            headers: { Authorization: `Bearer ${authToken}` },
            timeout: 30000
        });
        const uid = response.data;
        return uid;
    } catch (error) {
        console.error("Failed to verify token:", error);
        throw error;
    }
};
