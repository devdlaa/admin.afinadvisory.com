let cachedToken = null;
let tokenExpiry = 0;

async function getAccessToken() {
  if (cachedToken && Date.now() < tokenExpiry) {
    return cachedToken;
  }

  const resp = await fetch(
    `https://zoom.us/oauth/token?grant_type=account_credentials&account_id=${process.env.ZOOM_ACCOUNT_ID}`,
    {
      method: "POST",
      headers: {
        Authorization:
          "Basic " +
          Buffer.from(
            `${process.env.ZOOM_CLIENT_ID}:${process.env.ZOOM_CLIENT_SECRET}`,
          ).toString("base64"),
      },
    },
  );

  const data = await resp.json();

  cachedToken = data.access_token;
  tokenExpiry = Date.now() + (data.expires_in - 60) * 1000;

  return cachedToken;
}

async function zoomFetch(path, options = {}) {
  const token = await getAccessToken();

  const resp = await fetch(`https://api.zoom.us/v2${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  if (!resp.ok) {
    const err = await resp.text();
    throw new Error(`Zoom API error: ${err}`);
  }

  return resp.json();
}

export const zoomClient = {
  get: (path) => zoomFetch(path),

  post: (path, body) =>
    zoomFetch(path, {
      method: "POST",
      body: JSON.stringify(body),
    }),

  patch: (path, body) =>
    zoomFetch(path, {
      method: "PATCH",
      body: JSON.stringify(body),
    }),

  delete: (path) =>
    zoomFetch(path, {
      method: "DELETE",
    }),
};
